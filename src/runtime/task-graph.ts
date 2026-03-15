// Nexus-Prime 4.1.0 — runtime/task-graph.ts

import type { Handoff as GraphHandoff } from '../types/handoff.js';
import type { Phase } from '../types/index.js';
import type { SubTask, TaskGraph, TaskStatus as GraphTaskStatus } from '../types/task-graph.js';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function detectCycle(taskId: string, tasks: Record<string, SubTask>, visited: Set<string>, stack: Set<string>): boolean {
  visited.add(taskId);
  stack.add(taskId);
  for (const depId of tasks[taskId]?.depends_on ?? []) {
    if (!visited.has(depId)) {
      if (detectCycle(depId, tasks, visited, stack)) return true;
    } else if (stack.has(depId)) {
      return true;
    }
  }
  stack.delete(taskId);
  return false;
}

export function createTaskGraph(objective: string, taskList: SubTask[]): TaskGraph {
  const tasks: Record<string, SubTask> = {};
  for (const task of taskList) {
    tasks[task.id] = { ...task, status: 'pending' };
  }

  const ids = new Set(Object.keys(tasks));
  for (const task of taskList) {
    for (const depId of task.depends_on) {
      if (!ids.has(depId)) {
        throw new Error(`Task "${task.id}" depends on unknown id "${depId}"`);
      }
    }
  }

  const visited = new Set<string>();
  const stack = new Set<string>();
  for (const id of Object.keys(tasks)) {
    if (!visited.has(id) && detectCycle(id, tasks, visited, stack)) {
      throw new Error(`Circular dependency detected involving task "${id}"`);
    }
  }

  const now = Date.now();
  return { id: generateId(), objective, tasks, created_at: now, updated_at: now };
}

export function updateTaskStatus(
  graph: TaskGraph,
  taskId: string,
  status: GraphTaskStatus,
  handoff?: GraphHandoff
): TaskGraph {
  const existing = graph.tasks[taskId];
  if (!existing) throw new Error(`Task "${taskId}" not found in graph`);

  const updatedTask: SubTask = {
    ...existing,
    status,
    ...(handoff !== undefined && status === 'done' ? { handoff } : {}),
  };

  return {
    ...graph,
    tasks: { ...graph.tasks, [taskId]: updatedTask },
    updated_at: Date.now(),
  };
}

export function getReadyTasks(graph: TaskGraph): SubTask[] {
  return Object.values(graph.tasks).filter((task) => {
    if (task.status !== 'pending') return false;
    return task.depends_on.every((depId) => graph.tasks[depId]?.status === 'done');
  });
}

export function getNextResumePoint(graph: TaskGraph): SubTask | null {
  const running = Object.values(graph.tasks).find((t) => t.status === 'running');
  if (running) return running;

  const ready = getReadyTasks(graph);
  return ready.length > 0 ? ready[0] : null;
}

export function isGraphComplete(graph: TaskGraph): boolean {
  return Object.values(graph.tasks).every((t) => t.status === 'done' || t.status === 'failed');
}
