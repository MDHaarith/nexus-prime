import { produce } from 'immer';
import { OrchestrationState, Task, TaskStatus, TaskReport, Phase } from '../types/index.js';

export type StateListener = (state: OrchestrationState) => void;

export class TaskStore {
  private state: OrchestrationState;
  private listeners: Set<StateListener> = new Set();

  constructor(initialState: OrchestrationState) {
    this.state = initialState;
  }

  public getState(): Readonly<OrchestrationState> {
    return this.state;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private updateState(recipe: (draft: OrchestrationState) => void): void {
    this.state = produce(this.state, recipe);
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public updateMetadata(key: string, value: any): void {
    this.updateState((draft: OrchestrationState) => {
      draft.metadata[key] = value;
    });
  }

  public setPhases(phases: Phase[]): void {
    this.updateState((draft: OrchestrationState) => {
      draft.phases = phases;
    });
  }

  public setTasks(tasks: Task[]): void {
    this.updateState((draft: OrchestrationState) => {
      draft.tasks = tasks;
    });
  }

  public addTask(task: Task): void {
    this.updateState((draft: OrchestrationState) => {
      draft.tasks.push(task);
    });
  }

  public updateTaskStatus(taskId: string, status: TaskStatus, error?: string): void {
    this.updateState((draft: OrchestrationState) => {
      const task = draft.tasks.find((t: Task) => t.id === taskId);
      if (task) {
        task.status = status;
        if (error !== undefined) {
          task.error = error;
        }
        
        const now = Date.now();
        if (status === 'running' && !task.start_time) {
          task.start_time = now;
        } else if (['completed', 'failed'].includes(status) && !task.end_time) {
          task.end_time = now;
        }
      }

      if (draft.phases) {
        for (const phase of draft.phases) {
          const phaseTask = phase.tasks.find((t: Task) => t.id === taskId);
          if (phaseTask) {
            phaseTask.status = status;
            if (error !== undefined) phaseTask.error = error;
            if (task?.start_time) phaseTask.start_time = task.start_time;
            if (task?.end_time) phaseTask.end_time = task.end_time;
          }
        }
      }
    });
  }

  public completeTask(taskId: string, report: TaskReport): void {
    this.updateState((draft: OrchestrationState) => {
      const task = draft.tasks.find((t: Task) => t.id === taskId);
      const status = report.status === 'failure' ? 'failed' : 'completed';
      const now = Date.now();

      if (task) {
        task.status = status;
        task.output = report;
        task.end_time = now;
      }

      if (draft.phases) {
        for (const phase of draft.phases) {
          const phaseTask = phase.tasks.find((t: Task) => t.id === taskId);
          if (phaseTask) {
            phaseTask.status = status;
            phaseTask.output = report;
            phaseTask.end_time = now;
          }
        }
      }
    });
  }

  public setCurrentPhase(phaseId: string): void {
    this.updateState((draft: OrchestrationState) => {
      draft.current_phase = phaseId;
      if (draft.phases) {
         const phase = draft.phases.find((p: Phase) => p.id === phaseId);
         if (phase && phase.status === 'pending') {
             phase.status = 'running';
         }
      }
    });
  }

  public setPhaseStatus(phaseId: string, status: Phase['status']): void {
    this.updateState((draft: OrchestrationState) => {
      if (draft.phases) {
        const phase = draft.phases.find((p: Phase) => p.id === phaseId);
        if (phase) {
          phase.status = status;
        }
      }
    });
  }
}
