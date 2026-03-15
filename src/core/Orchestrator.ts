import { TaskStore } from './TaskStore.js';
import { Task, Phase, TaskReport, ExecutionMode } from '../types/index.js';
import { Logger } from './Logger.js';

export class Orchestrator {
  private store: TaskStore;
  private logger = Logger.getInstance();

  constructor(store: TaskStore) {
    this.store = store;
  }

  public getStore(): TaskStore {
    return this.store;
  }

  /**
   * Plans a new phase with the given tasks and execution mode.
   */
  public planPhase(phaseId: string, name: string, tasks: Task[], execution_mode: ExecutionMode = 'sequential', objective?: string): void {
    this.logger.info(`Planning phase ${phaseId}: ${name}`, { phaseId, taskCount: tasks.length });
    const normalizedTasks = tasks.map((task: Task) => ({
      ...task,
      phase_id: phaseId
    }));
    const phase: Phase = {
      id: phaseId,
      name,
      status: 'pending',
      tasks: normalizedTasks,
      execution_mode,
      objective
    };
    
    const state = this.store.getState();
    const currentPhases = state.phases || [];
    
    // Ensure all tasks are in the master task list
    const currentTasks = state.tasks;
    const newTasks = normalizedTasks.filter((t: Task) => !currentTasks.find((ct: Task) => ct.id === t.id));
    if (newTasks.length > 0) {
      this.store.setTasks([...currentTasks, ...newTasks]);
    }

    const updatedPhases = [...currentPhases, phase];
    this.store.setPhases(updatedPhases);
  }

  /**
   * Starts the execution of a phase.
   * In Phase 3, this primarily manages state transitions.
   */
  public async runPhase(phaseId: string): Promise<void> {
    const startTime = Date.now();
    this.store.setCurrentPhase(phaseId);
    
    const state = this.store.getState();
    const phase = state.phases?.find((p: Phase) => p.id === phaseId);
    
    if (!phase) {
      this.logger.error(`Failed to run phase ${phaseId}: Not found`);
      throw new Error(`Phase ${phaseId} not found`);
    }

    this.logger.info(`Starting phase ${phaseId}`, { phaseId, executionMode: phase.execution_mode });
    this.store.setPhaseStatus(phaseId, 'running');
    await this.processNextTasks(phaseId);
    this.logger.metric('phase_start_latency', Date.now() - startTime, { phaseId });
  }

  /**
   * Identifies and transitions the next set of runnable tasks.
   */
  private async processNextTasks(phaseId: string): Promise<void> {
    const startTime = Date.now();
    const state = this.store.getState();
    const phase = state.phases?.find((p: Phase) => p.id === phaseId);
    if (!phase || phase.status !== 'running') return;

    let runnableTasks = this.getNextRunnableTasks();
    if (runnableTasks.length === 0) {
      this.checkPhaseCompletion(phaseId);
      return;
    }

    let tasksInjected = false;
    for (const task of runnableTasks) {
      if (this.needsResearch(task)) {
        this.injectResearchTask(task, phaseId);
        tasksInjected = true;
      }
    }

    if (tasksInjected) {
      runnableTasks = this.getNextRunnableTasks();
      if (runnableTasks.length === 0) {
        return;
      }
    }

    const executionMode = phase.execution_mode || state.execution_mode || 'sequential';
    
    this.logger.info(`Processing ${runnableTasks.length} runnable tasks in phase ${phaseId}`, { 
      phaseId, 
      count: runnableTasks.length,
      mode: executionMode 
    });

    if (executionMode === 'sequential') {
      // In sequential mode, we only run the first runnable task
      const task = runnableTasks[0];
      this.store.updateTaskStatus(task.id, 'running');
    } else {
      // In parallel mode, we run all runnable tasks
      for (const task of runnableTasks) {
        this.store.updateTaskStatus(task.id, 'running');
      }
    }
    this.logger.metric('planning_latency', Date.now() - startTime, { phaseId });
  }

  private needsResearch(task: Task): boolean {
    if (task.id.startsWith('research-')) return false;
    if (task.agent === 'codebase_investigator' || task.agent === 'generalist') return false;

    const desc = task.description.toLowerCase();
    const isUnderSpecified = desc.length < 50;
    const coversNewModule = desc.includes('new module') || desc.includes('from scratch') || desc.includes('initial setup');
    const explicitlyNeedsResearch = desc.includes('investigate') || desc.includes('explore') || desc.includes('research');

    return isUnderSpecified || coversNewModule || explicitlyNeedsResearch;
  }

  private injectResearchTask(task: Task, phaseId: string): void {
    const state = this.store.getState();
    const phase = state.phases?.find((p: Phase) => p.id === phaseId);
    if (!phase) return;

    const researchTaskId = `research-${task.id}`;
    
    if (state.tasks.some(t => t.id === researchTaskId)) return;

    this.logger.info(`Injecting research task for ${task.id}`, { originalTaskId: task.id, researchTaskId });

    const researchTask: Task = {
      id: researchTaskId,
      name: `Research for ${task.name}`,
      agent: 'codebase_investigator',
      description: `Gather codebase context for task: ${task.description}`,
      status: 'pending',
      dependencies: [...(task.dependencies || [])],
      phase_id: phaseId
    };

    const updatedTask = {
      ...task,
      dependencies: [...(task.dependencies || []), researchTaskId]
    };

    const updatedTasks = state.tasks.map(t => t.id === task.id ? updatedTask : t);
    updatedTasks.push(researchTask);
    this.store.setTasks(updatedTasks);

    const updatedPhaseTasks = phase.tasks.map(t => t.id === task.id ? updatedTask : t);
    updatedPhaseTasks.push(researchTask);
    
    const updatedPhases = state.phases?.map(p => p.id === phaseId ? { ...p, tasks: updatedPhaseTasks } : p) || [];
    this.store.setPhases(updatedPhases);
  }

  /**
   * Checks if a phase is completed or failed based on its tasks.
   */
  public checkPhaseCompletion(phaseId: string): void {
    const state = this.store.getState();
    const phase = state.phases?.find((p: Phase) => p.id === phaseId);
    if (!phase) return;

    // Get the latest status of tasks belonging to this phase from the master list
    const phaseTaskIds = new Set(phase.tasks.map((t: Task) => t.id));
    const phaseTasks = state.tasks.filter((t: Task) => phaseTaskIds.has(t.id));

    if (phaseTasks.length === 0) return;

    const allCompleted = phaseTasks.every((t: Task) => t.status === 'completed');
    const anyFailed = phaseTasks.some((t: Task) => t.status === 'failed');
    
    if (anyFailed) {
      this.logger.warn(`Phase ${phaseId} failed due to task failure`, { phaseId });
      this.store.setPhaseStatus(phaseId, 'failed');
    } else if (allCompleted) {
      this.logger.info(`Phase ${phaseId} completed successfully`, { phaseId });
      this.store.setPhaseStatus(phaseId, 'completed');
    }
  }

  /**
   * Returns tasks that are ready to be executed (pending and dependencies met).
   */
  public getNextRunnableTasks(): Task[] {
    const state = this.store.getState();
    const currentPhaseId = state.current_phase;
    if (!currentPhaseId) return [];

    const currentPhase = state.phases?.find((p: Phase) => p.id === currentPhaseId);
    if (!currentPhase) return [];

    const phaseTaskIds = new Set(currentPhase.tasks.map((t: Task) => t.id));
    const phaseTasks = state.tasks.filter((t: Task) => phaseTaskIds.has(t.id));

    // If sequential, check if any task is already running
    const executionMode = currentPhase.execution_mode || state.execution_mode || 'sequential';
    if (executionMode === 'sequential') {
      const isAnyTaskRunning = phaseTasks.some((t: Task) => t.status === 'running');
      if (isAnyTaskRunning) return [];
    }

    // Optimization: Pre-map completed task IDs for O(1) dependency checking
    const completedTaskIds = new Set(
        state.tasks.filter(t => t.status === 'completed').map(t => t.id)
    );

    return phaseTasks.filter((task: Task) => {
      if (task.status !== 'pending') return false;
      
      // O(1) Dependency check
      if (task.dependencies && task.dependencies.length > 0) {
        const unmetDependencies = task.dependencies.some((depId: string) => !completedTaskIds.has(depId));
        if (unmetDependencies) return false;
      }

      return true;
    });
  }

  /**
   * Signal that a task has finished. This will trigger the next set of tasks.
   */
  public async onTaskFinished(taskId: string, report: TaskReport): Promise<void> {
    this.store.completeTask(taskId, report);
    
    const state = this.store.getState();
    if (state.current_phase) {
      await this.processNextTasks(state.current_phase);
    }
  }

  public getRunningTasks(phaseId: string): Task[] {
    return this.store
      .getState()
      .tasks
      .filter((task: Task) => task.phase_id === phaseId && task.status === 'running');
  }

  public async continuePhase(phaseId: string): Promise<void> {
    await this.processNextTasks(phaseId);
  }
}
