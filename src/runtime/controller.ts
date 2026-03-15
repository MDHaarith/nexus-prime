import { ExecutionBus } from '../core/ExecutionBus.js';
import { InteractivityGate } from '../core/InteractivityGate.js';
import { Logger } from '../core/Logger.js';
import { Orchestrator } from '../core/Orchestrator.js';
import { SmartRouter } from '../core/SmartRouter.js';
import { TaskStore } from '../core/TaskStore.js';
import type { Handoff, OrchestrationState, RegistrySnapshot, RuntimeConfig, Task } from '../types/index.js';
import type { Handoff as GraphHandoff } from '../types/handoff.js';
import type { TaskGraph } from '../types/task-graph.js';
import type { NexusMemoryService } from './memory.js';
import type { NexusPersistence } from './persistence.js';
import { createAssimilationPlan } from './planner.js';
import { NexusExecutionAdapter } from './executor.js';
import { persistGraph, loadGraph, persistHandoff } from './checkpoint.js';
import { createTaskGraph, updateTaskStatus, getReadyTasks, getNextResumePoint, isGraphComplete } from './task-graph.js';

function createInitialState(config: RuntimeConfig): OrchestrationState {
  const timestamp = new Date().toISOString();
  return {
    session_id: `nexus-4-1-0-${timestamp.replace(/[:.]/g, '-')}`,
    current_phase: 'design',
    tasks: [],
    phases: [],
    metadata: {
      objective: config.objective
    },
    execution_mode: config.executionMode,
    run_status: 'idle',
    created_at: timestamp,
    updated_at: timestamp
  };
}

export class NexusRuntimeController {
  private readonly logger = Logger.getInstance();
  private readonly router: SmartRouter;
  private readonly bus: ExecutionBus;
  private readonly orchestrator: Orchestrator;
  private readonly executor: NexusExecutionAdapter;
  private started = false;
  private taskGraph: TaskGraph | null = null;

  constructor(
    private readonly config: RuntimeConfig,
    private readonly registry: RegistrySnapshot,
    private readonly store: TaskStore,
    private readonly memory: NexusMemoryService,
    private readonly persistence: NexusPersistence,
    private readonly interactivity: InteractivityGate
  ) {
    this.router = new SmartRouter(registry);
    this.orchestrator = new Orchestrator(store);
    this.bus = new ExecutionBus(store, config.maxContextWindow, config.maxContextLength);
    this.executor = new NexusExecutionAdapter(config, registry, memory, this.router, interactivity);
  }

  public static createStore(config: RuntimeConfig, restored?: OrchestrationState): TaskStore {
    return new TaskStore(restored || createInitialState(config));
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;

    this.store.setRunStatus('booting');
    const memoryStatus = this.memory.bootstrap();
    this.persistence.bootstrap();
    this.populatePlanIfNeeded();
    this.store.updateMetadata('registrySummary', {
      commands: this.registry.commands.length,
      agents: this.registry.agents.length,
      skills: this.registry.skills.length,
      specialistPacks: this.registry.specialistPacks.length,
      designCommands: this.registry.designSuiteCommandIds.length,
      memoryCommands: this.registry.memoryCommandIds.length
    });
    this.store.updateMetadata('memoryStatus', memoryStatus);

    this.logger.info('Nexus runtime bootstrapped', {
      sessionId: this.store.getState().session_id,
      memoryBackend: memoryStatus.backend,
      commands: this.registry.commands.length
    });

    this.store.setRunStatus('running');

    // Initialise a TaskGraph mirroring the orchestration phases
    if (this.taskGraph === null) {
      const allTasks = (this.store.getState().phases ?? []).flatMap((p) =>
        p.tasks.map((t) => ({
          id: t.id,
          description: t.description,
          depends_on: t.dependencies,
          assigned_agent: t.agent,
          attention: 'low' as const,
          model_tier: 'flash' as const,
          token_budget: 4096,
          status: t.status === 'completed' ? 'done' as const : 'pending' as const,
        }))
      );
      try {
        this.taskGraph = createTaskGraph(this.config.objective, allTasks);
        persistGraph(this.taskGraph);
      } catch {
        // non-fatal — checkpointing best-effort
      }
    }

    for (const phase of this.store.getState().phases || []) {
      if (phase.status === 'completed') {
        continue;
      }
      await this.executePhase(phase.id);
      const currentPhase = this.store.getState().phases?.find((candidate) => candidate.id === phase.id);
      if (currentPhase?.status === 'failed') {
        this.store.setRunStatus('failed');
        this.persist();
        return;
      }
    }

    this.store.setRunStatus('completed');
    this.persist();
    this.persistence.archiveSession(this.store.getState());
  }

  /**
   * Resume execution from a previously persisted TaskGraph checkpoint.
   * If graphId is omitted or the graph is not found, starts a fresh run.
   */
  public async resumeFromCheckpoint(graphId?: string): Promise<void> {
    if (graphId) {
      const loaded = loadGraph(graphId);
      if (loaded) {
        this.taskGraph = loaded;
        const resumePoint = getNextResumePoint(loaded);
        const doneCount = Object.values(loaded.tasks).filter((t) => t.status === 'done').length;
        const resumeId = resumePoint?.id ?? '(none — graph complete)';
        this.logger.info(
          `Resuming 4.1.0 graph ${graphId} — skipping ${doneCount} completed tasks, resuming from task ${resumeId}`
        );
      } else {
        this.logger.warn(`Graph ${graphId} not found — starting fresh`);
      }
    }
    return this.start();
  }

  public getStore(): TaskStore {
    return this.store;
  }

  public getInteractivityGate(): InteractivityGate {
    return this.interactivity;
  }

  private populatePlanIfNeeded(): void {
    const state = this.store.getState();
    if ((state.phases || []).length > 0) {
      return;
    }

    for (const phase of createAssimilationPlan(this.config, this.registry)) {
      this.orchestrator.planPhase(phase.id, phase.name, phase.tasks, phase.execution_mode || 'sequential', phase.objective);
    }
  }

  private async executePhase(phaseId: string): Promise<void> {
    await this.orchestrator.runPhase(phaseId);
    this.persist();

    while (true) {
      const phase = this.store.getState().phases?.find((candidate) => candidate.id === phaseId);
      if (!phase || phase.status === 'completed' || phase.status === 'failed') {
        break;
      }

      const runningTasks = this.orchestrator.getRunningTasks(phaseId);
      if (runningTasks.length === 0) {
        this.orchestrator.checkPhaseCompletion(phaseId);
        await this.orchestrator.continuePhase(phaseId);
        this.persist();
        await new Promise((resolve) => setTimeout(resolve, 25));
        continue;
      }

      const batch = phase.execution_mode === 'parallel' ? runningTasks : runningTasks.slice(0, 1);
      await Promise.all(batch.map((task) => this.executeTask(task, phaseId)));
    }
  }

  private async executeTask(task: Task, phaseId: string): Promise<void> {
    this.store.updateMetadata('activeTaskId', task.id);

    // 4.1.0: checkpoint before execution
    if (this.taskGraph && this.taskGraph.tasks[task.id]) {
      this.taskGraph = updateTaskStatus(this.taskGraph, task.id, 'running');
      this.taskGraph = { ...this.taskGraph, tasks: {
        ...this.taskGraph.tasks,
        [task.id]: { ...this.taskGraph.tasks[task.id]!, started_at: Date.now() } } };
      persistGraph(this.taskGraph);
    }

    try {
      const handoff = await this.bus.dispatchTask(task, (currentTask, context) => this.executor.execute(currentTask, context));
      await this.orchestrator.onTaskFinished(task.id, handoff.report);

      // 4.1.0: build GraphHandoff and persist after success
      if (this.taskGraph && this.taskGraph.tasks[task.id]) {
        const graphHandoff: GraphHandoff = {
          id: `${task.id}-${Date.now()}`,
          from: task.agent,
          to: task.agent,
          task: task.description,
          result: handoff.report.objective_achieved,
          artifacts: handoff.report.artifacts ?? [],
          context_delta: {},
          status: 'complete',
          timestamp: Date.now(),
        };
        const completedAt = Date.now();
        this.taskGraph = updateTaskStatus(this.taskGraph, task.id, 'done', graphHandoff);
        this.taskGraph = { ...this.taskGraph, tasks: {
          ...this.taskGraph.tasks,
          [task.id]: { ...this.taskGraph.tasks[task.id]!, completed_at: completedAt } } };
        persistGraph(this.taskGraph);
        persistHandoff(graphHandoff);
      }
    } catch (error) {
      const retries = (task.retry_count || 0) + 1;
      if (retries <= this.config.maxRetries) {
        this.logger.warn(`Retrying task ${task.id}`, { taskId: task.id, retry: retries });
        this.store.bumpTaskRetry(task.id);
        this.store.updateTaskStatus(task.id, 'pending');
        await this.orchestrator.continuePhase(phaseId);
      } else {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Task ${task.id} exhausted retries`, { taskId: task.id, error: errorMsg });
        this.store.updateTaskStatus(task.id, 'failed', errorMsg);
        this.orchestrator.checkPhaseCompletion(phaseId);

        // 4.1.0: persist failed status; continue if other tasks are still ready
        if (this.taskGraph && this.taskGraph.tasks[task.id]) {
          this.taskGraph = { ...this.taskGraph, tasks: {
            ...this.taskGraph.tasks,
            [task.id]: { ...this.taskGraph.tasks[task.id]!, error: errorMsg } } };
          this.taskGraph = updateTaskStatus(this.taskGraph, task.id, 'failed');
          persistGraph(this.taskGraph);
          if (isGraphComplete(this.taskGraph) || getReadyTasks(this.taskGraph).length === 0) {
            this.logger.warn(`No ready tasks remain after failure of ${task.id}`);
          }
        }
      }
    } finally {
      this.store.updateMetadata('activeTaskId', null);
      this.persist();
    }
  }

  private persist(): void {
    const logs = this.logger.getEntries();
    const handoffs: Handoff[] = this.bus.getFullHistory();
    this.persistence.saveSnapshot(this.store.getState(), logs, handoffs);
    this.memory.recordSession(this.store.getState(), logs, handoffs);
  }
}
