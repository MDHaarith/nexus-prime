// Nexus-Prime 4.1.0 — task-graph.ts

import { randomUUID } from 'node:crypto';

import type { Handoff } from '../types/handoff.js';
import type { SubTask, TaskGraph, TaskStatus } from '../types/task-graph.js';

const detectCycle = (tasks: Record<string, SubTask>): boolean => {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const depId of tasks[id].depends_on) {
      if (dfs(depId)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  for (const id of Object.keys(tasks)) {
    if (dfs(id)) return true;
  }
  return false;
};

export const createTaskGraph = (objective: string, tasks: SubTask[]): TaskGraph => {
  const ids = new Set<string>();
  const taskMap: Record<string, SubTask> = {};

  for (const task of tasks) {
    if (ids.has(task.id)) throw new Error(`Duplicate task id: ${task.id}`);
    ids.add(task.id);
    taskMap[task.id] = { ...task, status: 'pending' };
  }

  for (const task of Object.values(taskMap)) {
    for (const depId of task.depends_on) {
      if (!ids.has(depId)) throw new Error(`Task ${task.id} depends on missing task ${depId}`);
    }
  }

  if (detectCycle(taskMap)) throw new Error('Task graph contains a dependency cycle');
  const now = Date.now();
  return { id: randomUUID(), objective, tasks: taskMap, created_at: now, updated_at: now };
};

export const updateTaskStatus = (
  graph: TaskGraph,
  taskId: string,
  status: TaskStatus,
  handoff?: Handoff,
): TaskGraph => {
  const task = graph.tasks[taskId];
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const nextTask: SubTask = status === 'done' ? { ...task, status, handoff } : { ...task, status };
  return {
    ...graph,
    tasks: { ...graph.tasks, [taskId]: nextTask },
    updated_at: Date.now(),
  };
};

export const getReadyTasks = (graph: TaskGraph): SubTask[] => {
  return Object.values(graph.tasks).filter((task) => {
    if (task.status !== 'pending') return false;
    return task.depends_on.every((depId) => graph.tasks[depId]?.status === 'done');
  });
};

export const getNextResumePoint = (graph: TaskGraph): SubTask | null => {
  const running = Object.values(graph.tasks).find((task) => task.status === 'running');
  if (running) return running;
  const [firstReady] = getReadyTasks(graph);
  return firstReady ?? null;
};

export const isGraphComplete = (graph: TaskGraph): boolean => {
  return Object.values(graph.tasks).every((task) => task.status === 'done' || task.status === 'failed');
};
