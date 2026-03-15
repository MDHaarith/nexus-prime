import { Task, Handoff } from '../types/index.js';
import { TaskStore } from './TaskStore.js';
import { Logger } from './Logger.js';
import { ValidationEngine } from '../validator/index.js';

export type AgentExecutor = (task: Task, contextWindow: Handoff[]) => Promise<Handoff>;

export class ExecutionBus {
  private handoffHistory: Handoff[] = [];
  private readonly windowSize: number;
  private readonly maxContextLength: number;
  private taskStore: TaskStore;
  private logger = Logger.getInstance();
  private currentWindowSize: number = 0;

  constructor(taskStore: TaskStore, windowSize: number = 3, maxContextLength: number = 8000) {
    this.taskStore = taskStore;
    this.windowSize = windowSize;
    this.maxContextLength = maxContextLength;
  }

  /**
   * Retrieves the sliding window of the most recent completed task handoffs.
   * Prunes context if it exceeds the maximum length threshold.
   */
  public getSlidingWindow(): Handoff[] {
    let window = this.handoffHistory.slice(-this.windowSize);
    
    // Recalculate size only when window changes significantly or on initialization
    this.currentWindowSize = this.calculateContextSize(window);

    // Context pruning logic
    while (window.length > 1 && this.currentWindowSize > this.maxContextLength) {
      this.logger.debug(`Pruning context window due to length (${this.currentWindowSize} > ${this.maxContextLength})`);
      const removed = window.shift();
      if (removed) {
          this.currentWindowSize -= JSON.stringify(removed).length;
      }
    }
    
    return window;
  }

  /**
   * Calculates a rough estimate of the context size (e.g., string length).
   */
  private calculateContextSize(handoffs: Handoff[]): number {
    return JSON.stringify(handoffs).length;
  }

  /**
   * Dispatches a task to an agent executor, providing it with the current context window.
   * Updates task status and collects the resulting handoff.
   */
  public async dispatchTask(task: Task, execute: AgentExecutor): Promise<Handoff> {
    const context = this.getSlidingWindow();
    const startTime = Date.now();
    
    this.logger.info(`Dispatching task ${task.id} to agent ${task.agent}`, { taskId: task.id, agent: task.agent });
    this.logger.metric('active_context_size', this.currentWindowSize, { taskId: task.id });
    
    // Mark task as running
    this.taskStore.updateTaskStatus(task.id, 'running');
    
    try {
      // Execute the task via the provided agent executor callback
      const resultHandoff = await execute(task, context);
      const duration = Date.now() - startTime;
      
      this.logger.metric('task_latency', duration, { taskId: task.id, agent: task.agent });
      this.logger.info(`Task ${task.id} completed successfully`, { taskId: task.id, duration_ms: duration });
      
      if (resultHandoff.report.token_usage) {
        this.logger.tokens(task.id, resultHandoff.report.token_usage);
      }
      
      // Validate task and get comparison
      const validationEngine = ValidationEngine.getInstance();
      const { taskMetrics, comparison } = validationEngine.validateTask(task, resultHandoff.report, duration);
      
      // Attach metrics to report
      resultHandoff.report.validation = taskMetrics;
      
      // Update global session deltas
      if (this.taskStore.setComparison) {
        this.taskStore.setComparison(comparison);
      }
      
      // Update task with results
      this.taskStore.completeTask(task.id, resultHandoff.report);
      
      // Add the new handoff to the history
      this.handoffHistory.push(resultHandoff);
      
      return resultHandoff;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error(`Task ${task.id} failed after ${duration}ms`, { 
        taskId: task.id, 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      // Handle execution failure
      this.taskStore.updateTaskStatus(task.id, 'failed', error instanceof Error ? error.message : String(error));
      
      throw error;
    }
  }

  /**
   * Retrieves the entire handoff history for auditing or full context needs.
   */
  public getFullHistory(): Handoff[] {
    return [...this.handoffHistory];
  }
}
