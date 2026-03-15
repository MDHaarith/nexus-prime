import { test } from 'node:test';
import assert from 'node:assert';
import { createTaskGraph, updateTaskStatus, getReadyTasks, getNextResumePoint, isGraphComplete } from '../src/runtime/task-graph.js';
import type { SubTask } from '../src/types/task-graph.js';
import type { Phase } from '../src/types/index.js';
import type { TaskStatus as GraphTaskStatus } from '../src/types/task-graph.js';
import type { Handoff as GraphHandoff } from '../src/types/handoff.js';

function makeTask(id: string, depends_on: string[] = []): SubTask {
  return {
    id,
    description: `Task ${id}`,
    depends_on,
    assigned_agent: 'coder',
    attention: 'low',
    model_tier: 'flash',
    token_budget: 1024,
    status: 'pending',
  };
}

test('createTaskGraph produces correct structure', () => {
  const tasks = [makeTask('a'), makeTask('b', ['a'])];
  const graph = createTaskGraph('test objective', tasks);
  assert.equal(graph.objective, 'test objective');
  assert.equal(Object.keys(graph.tasks).length, 2);
  assert.equal(graph.tasks['a']?.status, 'pending');
  assert.equal(graph.tasks['b']?.status, 'pending');
  assert.ok(graph.id.length > 0);
  assert.ok(typeof graph.created_at === 'number');
});

test('createTaskGraph throws on circular dependency', () => {
  const tasks = [makeTask('a', ['b']), makeTask('b', ['a'])];
  assert.throws(() => createTaskGraph('circular', tasks), /[Cc]ircular/);
});

test('createTaskGraph throws when depends_on references unknown id', () => {
  const tasks = [makeTask('a', ['nonexistent'])];
  assert.throws(() => createTaskGraph('bad dep', tasks), /unknown id/);
});

test('getReadyTasks returns only tasks whose dependencies are done', () => {
  let graph = createTaskGraph('obj', [makeTask('a'), makeTask('b', ['a'])]);
  graph = updateTaskStatus(graph, 'a', 'done');
  const ready = getReadyTasks(graph);
  assert.equal(ready.length, 1);
  assert.equal(ready[0]?.id, 'b');
});

test('getReadyTasks returns nothing when dependencies are pending', () => {
  const graph = createTaskGraph('obj', [makeTask('a'), makeTask('b', ['a'])]);
  const ready = getReadyTasks(graph);
  assert.equal(ready.length, 1);
  assert.equal(ready[0]?.id, 'a');
});

test('getNextResumePoint returns running task before pending tasks', () => {
  let graph = createTaskGraph('obj', [makeTask('a'), makeTask('b')]);
  graph = updateTaskStatus(graph, 'a', 'running');
  const next = getNextResumePoint(graph);
  assert.equal(next?.id, 'a');
});

test('getNextResumePoint returns null when graph is complete', () => {
  let graph = createTaskGraph('obj', [makeTask('a')]);
  graph = updateTaskStatus(graph, 'a', 'done');
  assert.equal(getNextResumePoint(graph), null);
});

test('isGraphComplete returns true when all tasks are done or failed', () => {
  let graph = createTaskGraph('obj', [makeTask('a'), makeTask('b')]);
  graph = updateTaskStatus(graph, 'a', 'done');
  graph = updateTaskStatus(graph, 'b', 'failed');
  assert.equal(isGraphComplete(graph), true);
});

test('isGraphComplete returns false while tasks are pending', () => {
  const graph = createTaskGraph('obj', [makeTask('a')]);
  assert.equal(isGraphComplete(graph), false);
});

test('updateTaskStatus attaches handoff when status is done', () => {
  let graph = createTaskGraph('obj', [makeTask('a')]);
  const handoff = {
    id: 'h1',
    from: 'coder',
    to: 'tester',
    task: 'do stuff',
    result: 'done',
    artifacts: [],
    context_delta: {},
    status: 'complete' as const,
    timestamp: Date.now(),
  };
  graph = updateTaskStatus(graph, 'a', 'done', handoff);
  assert.deepEqual(graph.tasks['a']?.handoff, handoff);
});
