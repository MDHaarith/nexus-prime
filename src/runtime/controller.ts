// Nexus-Prime 4.1.0 — controller.ts

import { randomUUID } from 'node:crypto';

import type { Handoff } from '../types/handoff.js';
import type { SubTask, TaskGraph } from '../types/task-graph.js';
import {
  createTaskGraph,
  getNextResumePoint,
  getReadyTasks,
  isGraphComplete,
  updateTaskStatus,
} from './task-graph.js';
import { loadGraph, persistGraph, persistHandoff } from './checkpoint.js';

export type TaskExecutionResult = {
  status: 'complete' | 'partial' | 'blocked';
  result: string;
  artifacts?: string[];
  context_delta?: Record<string, unknown>;
  blocking_reason?: string;
};

export type TaskExecutor = (task: SubTask) => Promise<TaskExecutionResult>;

export class RuntimeController {
  private readonly objective: string;
  private readonly tasks: SubTask[];
  private readonly executor: TaskExecutor;

  constructor(objective: string, tasks: SubTask[], executor: TaskExecutor) {
    this.objective = objective;
    this.tasks = tasks;
    this.executor = executor;
  }

  async startFresh(): Promise<TaskGraph> {
    const graph = createTaskGraph(this.objective, this.tasks);
    return this.runUntilHalt(graph);
  }

  async resumeFromCheckpoint(graphId?: string): Promise<TaskGraph> {
    const graph = this.loadGraphOrFresh(graphId);
    if (!graphId || graph.id !== graphId) return this.runUntilHalt(graph);

    const resumeTask = getNextResumePoint(graph);
    if (!resumeTask) return this.runUntilHalt(graph);

    const completedTasks = Object.values(graph.tasks).filter((task) => task.status === 'done').length;
    console.log(
      `Resuming 4.1.0 graph ${graph.id} — skipping ${completedTasks} completed tasks, resuming from task ${resumeTask.id}`,
    );
    const afterResume = await this.executeTaskById(graph, resumeTask.id);
    return this.runUntilHalt(afterResume);
  }

  private loadGraphOrFresh(graphId?: string): TaskGraph {
    if (!graphId) return createTaskGraph(this.objective, this.tasks);
    try {
      const graph = loadGraph(graphId);
      return graph ?? createTaskGraph(this.objective, this.tasks);
    } catch {
      return createTaskGraph(this.objective, this.tasks);
    }
  }

  private async runUntilHalt(initialGraph: TaskGraph): Promise<TaskGraph> {
    let graph = initialGraph;
    while (true) {
      if (isGraphComplete(graph)) return graph;
      const [task] = getReadyTasks(graph);
      if (!task) return graph;
      graph = await this.executeTaskById(graph, task.id);
    }
  }

  private async executeTaskById(graph: TaskGraph, taskId: string): Promise<TaskGraph> {
    const current = graph.tasks[taskId];
    if (!current || current.status === 'done') return graph;

    persistGraph(graph);
    let next = updateTaskStatus(graph, taskId, 'running');
    next = this.patchTask(next, taskId, { started_at: Date.now() });

    try {
      const outcome = await this.executor(next.tasks[taskId]);
      return this.applyOutcome(next, taskId, outcome);
    } catch (error) {
      return this.applyFailure(next, taskId, error);
    }
  }

  private applyOutcome(graph: TaskGraph, taskId: string, outcome: TaskExecutionResult): TaskGraph {
    if (outcome.status === 'blocked') {
      const reason = outcome.blocking_reason ?? 'Task blocked without reason';
      const blockedGraph = updateTaskStatus(this.patchTask(graph, taskId, { error: reason }), taskId, 'blocked');
      persistGraph(blockedGraph);
      return blockedGraph;
    }

    const handoff = this.createHandoff(graph.tasks[taskId], outcome);
    const completed = this.patchTask(graph, taskId, { completed_at: Date.now() });
    const doneGraph = updateTaskStatus(completed, taskId, 'done', handoff);
    persistGraph(doneGraph);
    persistHandoff(handoff);
    return doneGraph;
  }

  private applyFailure(graph: TaskGraph, taskId: string, error: unknown): TaskGraph {
    const message = error instanceof Error ? error.message : String(error);
    const failed = updateTaskStatus(this.patchTask(graph, taskId, { error: message }), taskId, 'failed');
    persistGraph(failed);
    return failed;
  }

  private patchTask(graph: TaskGraph, taskId: string, patch: Partial<SubTask>): TaskGraph {
    const task = graph.tasks[taskId];
    if (!task) return graph;
    return {
      ...graph,
      tasks: { ...graph.tasks, [taskId]: { ...task, ...patch } },
      updated_at: Date.now(),
    };
  }

  private createHandoff(task: SubTask, outcome: TaskExecutionResult): Handoff {
    return {
      id: randomUUID(),
      from: task.assigned_agent,
      to: 'runtime-controller',
      task: task.description,
      result: outcome.result,
      artifacts: outcome.artifacts ?? [],
      context_delta: outcome.context_delta ?? {},
      status: outcome.status,
      blocking_reason: outcome.blocking_reason,
      timestamp: Date.now(),
    };
  }
}
