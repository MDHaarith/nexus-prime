import { TaskStore } from './TaskStore.js';
import { ExecutionBus, AgentExecutor } from './ExecutionBus.js';
import { SmartRouter } from './SmartRouter.js';
import { InteractivityGate } from './InteractivityGate.js';
import { Task, Phase, TaskReport } from '../types/index.js';
import { Logger } from './Logger.js';

export class Orchestrator {
  private store: TaskStore;
  private executionBus: ExecutionBus;
  private smartRouter: SmartRouter;
  private interactivityGate: InteractivityGate;
  private logger = Logger.getInstance();

  constructor(
    store: TaskStore,
    executionBus: ExecutionBus,
    smartRouter: SmartRouter,
    interactivityGate: InteractivityGate
  ) {
    this.store = store;
    this.executionBus = executionBus;
    this.smartRouter = smartRouter;
    this.interactivityGate = interactivityGate;
  }

  public getStore(): TaskStore {
    return this.store;
  }

  public async design(executor?: AgentExecutor): Promise<void> {
    this.logger.info('Entering DESIGN phase');
    this.store.setGlobalStatus('running');
    this.store.setCurrentPhase('DESIGN');
    
    // In a real implementation, this would trigger the API Designer, Architect, etc.
    // For now, we transition to CLARIFY
    const defaultExecutor: AgentExecutor = async (task) => ({
      task_id: task.id,
      agent: task.agent,
      status: 'completed',
      report: {
        status: 'success',
        objective_achieved: 'Auto-completed',
        files_created: [],
        files_modified: [],
        files_deleted: [],
        decisions_made: [],
        validation: 'pass',
        errors: [],
        scope_deviations: []
      },
      downstream_context: {
        key_interfaces_introduced: [],
        patterns_established: [],
        integration_points: [],
        assumptions: [],
        warnings: []
      }
    });

    await this.clarify(executor || defaultExecutor);
  }

  public async clarify(executor: AgentExecutor): Promise<void> {
    this.logger.info('Entering CLARIFY phase');
    this.store.setCurrentPhase('CLARIFY');
    
    const clarifyTask: Task = {
      id: `clarify-${Date.now()}`,
      name: 'Clarify Design Document',
      agent: 'qa_engineer',
      description: "Analyze the current Design Document and identify any 'doubts or voids' (ambiguities, missing requirements, or logical gaps). Use ask_user to clarify these with the user.",
      status: 'pending',
      dependencies: []
    };

    this.planPhase('CLARIFY', 'Clarification Phase', [clarifyTask], 'sequential');
    await this.runPhase('CLARIFY', executor);
    
    // Once the QA task is successfully completed, transition to plan()
    await this.plan(executor);
  }

  public async plan(executor: AgentExecutor): Promise<void> {
    this.logger.info('Entering PLAN phase');
    this.store.setCurrentPhase('PLAN');
    
    // In a real implementation, this would trigger the Coder, Planner, etc.
    // For now, we transition to EXECUTE
    await this.execute(executor);
  }

  public async execute(executor: AgentExecutor): Promise<void> {
    await this.resolveExecutionMode();
    this.logger.info('Entering EXECUTE phase');
    this.store.setCurrentPhase('EXECUTE');
    
    // Run the current phase tasks
    const state = this.store.getState();
    if (state.phases && state.phases.length > 0) {
      for (const phase of state.phases) {
        await this.runPhase(phase.id, executor);
      }
    }
    
    await this.complete();
  }

  private async resolveExecutionMode(): Promise<void> {
    const state = this.store.getState();
    const phases = state.phases || [];
    
    const tasks = phases.flatMap(p => p.tasks);
    const M = tasks.length;
    
    if (M === 0) return;

    const depths = new Map<string, number>();
    const completedTasks = new Set(state.tasks.filter(t => t.status === 'completed').map(t => t.id));
    
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 1000) {
      changed = false;
      iterations++;
      for (const task of tasks) {
        if (depths.has(task.id)) continue;
        
        if (!task.dependencies || task.dependencies.length === 0) {
          depths.set(task.id, 0);
          changed = true;
        } else {
          let allDepsResolved = true;
          let maxDepDepth = -1;
          
          for (const depId of task.dependencies) {
            if (completedTasks.has(depId)) {
              continue;
            }
            const depDepth = depths.get(depId);
            if (depDepth === undefined) {
              allDepsResolved = false;
              break;
            }
            if (depDepth > maxDepDepth) {
              maxDepDepth = depDepth;
            }
          }
          
          if (allDepsResolved) {
            depths.set(task.id, maxDepDepth + 1);
            changed = true;
          }
        }
      }
    }
    
    const N = Array.from(depths.values()).filter(d => d === 0).length;
    const B = new Set(depths.values()).size;
    
    const recommendParallel = N > (M / 2);
    
    const options = recommendParallel 
      ? [
          { label: 'Parallel', description: 'Recommended: Execute independent phases concurrently' },
          { label: 'Sequential', description: 'Execute phases one by one' }
        ]
      : [
          { label: 'Sequential', description: 'Recommended: Execute phases one by one' },
          { label: 'Parallel', description: 'Execute independent phases concurrently' }
        ];

    const payload = {
      questions: [
        {
          header: 'Exec mode',
          question: `Execution Mode: ${N} of ${M} phases are parallelizable in ${B} batches. How should phases be executed?`,
          type: 'choice' as const,
          options
        }
      ]
    };

    const answers = await this.interactivityGate.requestUserInput(payload);
    const choice = answers[0] as string;
    
    const mode = choice.toLowerCase().includes('parallel') ? 'parallel' : 'sequential';
    this.store.setExecutionMode(mode);
  }

  public async complete(): Promise<void> {
    this.logger.info('Entering COMPLETE phase');
    this.store.setCurrentPhase('COMPLETE');
    this.store.setGlobalStatus('completed');
  }

  /**
   * Plans a new phase with the given tasks and execution mode.
   */
  public planPhase(phaseId: string, name: string, tasks: Task[], execution_mode: 'parallel' | 'sequential' = 'sequential'): void {
    this.logger.info(`Planning phase ${phaseId}: ${name}`, { phaseId, taskCount: tasks.length });
    const phase: Phase = {
      id: phaseId,
      name,
      status: 'pending',
      tasks,
      execution_mode
    };
    
    const state = this.store.getState();
    const currentPhases = state.phases || [];
    this.store.setPhases([...currentPhases, phase]);
    
    // Ensure all tasks are in the master task list
    const currentTasks = state.tasks;
    const newTasks = tasks.filter((t: Task) => !currentTasks.find((ct: Task) => ct.id === t.id));
    if (newTasks.length > 0) {
      this.store.setTasks([...currentTasks, ...newTasks]);
    }
  }

  /**
   * Starts the execution of a phase.
   * In Phase 3, this primarily manages state transitions.
   */
  public async runPhase(phaseId: string, executor: AgentExecutor): Promise<void> {
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
    await this.processNextTasks(phaseId, executor);
    this.logger.metric('phase_start_latency', Date.now() - startTime, { phaseId });
  }

  /**
   * Identifies and transitions the next set of runnable tasks.
   */
  private async processNextTasks(phaseId: string, executor: AgentExecutor): Promise<void> {
    const startTime = Date.now();
    const state = this.store.getState();
    const phase = state.phases?.find((p: Phase) => p.id === phaseId);
    if (!phase || phase.status !== 'running') return;

    let runnableTasks = this.getNextRunnableTasks();
    if (runnableTasks.length === 0) {
      this.checkPhaseCompletion(phaseId);
      
      // Check if checkPhaseCompletion injected a validation task
      runnableTasks = this.getNextRunnableTasks();
      if (runnableTasks.length === 0) {
        return;
      }
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
      await this.dispatchTask(task, executor);
    } else {
      // In parallel mode, we run all runnable tasks
      const dispatchPromises = runnableTasks.map(task => this.dispatchTask(task, executor));
      await Promise.all(dispatchPromises);
    }
    this.logger.metric('planning_latency', Date.now() - startTime, { phaseId });
  }

  private async dispatchTask(task: Task, executor: AgentExecutor): Promise<void> {
    try {
      // Route task to determine model tier
      const tier = this.smartRouter.routeTask(task);
      this.logger.info(`Task ${task.id} routed to tier: ${tier}`);

      // Dispatch task through ExecutionBus
      const handoff = await this.executionBus.dispatchTask(task, executor);
      
      // Handle task completion
      await this.onTaskFinished(task.id, handoff.report, executor);
    } catch (error) {
      this.logger.error(`Failed to dispatch task ${task.id}`, { error });
      this.store.updateTaskStatus(task.id, 'failed', error instanceof Error ? error.message : String(error));
      
      // Check if phase failed
      const state = this.store.getState();
      if (state.current_phase) {
        this.checkPhaseCompletion(state.current_phase);
      }
    }
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
      dependencies: [...(task.dependencies || [])]
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
      const isExecutionPhase = !['DESIGN', 'CLARIFY', 'PLAN'].includes(phaseId);
      const validationTaskId = `validate-${phaseId}`;
      const hasValidationTask = phaseTasks.some((t: Task) => t.id === validationTaskId);

      if (isExecutionPhase && !hasValidationTask) {
        this.logger.info(`Injecting validation task for phase ${phaseId}`);
        
        const validationTask: Task = {
          id: validationTaskId,
          name: `Validate Phase ${phaseId}`,
          agent: 'validation_agent',
          description: `Perform a technical validation of the results for phase ${phaseId}. Verify all deliverables against the PRD/Design and ensure no regressions.`,
          status: 'pending',
          dependencies: phaseTasks.map(t => t.id)
        };

        this.store.setTasks([...state.tasks, validationTask]);

        const updatedPhaseTasks = [...phase.tasks, validationTask];
        const updatedPhases = state.phases?.map(p => 
          p.id === phaseId ? { ...p, tasks: updatedPhaseTasks } : p
        ) || [];
        this.store.setPhases(updatedPhases);
      } else {
        this.logger.info(`Phase ${phaseId} completed successfully`, { phaseId });
        this.store.setPhaseStatus(phaseId, 'completed');
      }
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
  public async onTaskFinished(taskId: string, report: TaskReport, executor: AgentExecutor): Promise<void> {
    this.store.completeTask(taskId, report);
    
    const updatedState = this.store.getState();
    if (updatedState.current_phase) {
      await this.processNextTasks(updatedState.current_phase, executor);
    }
  }
}
