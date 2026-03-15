// Nexus-Prime 4.1.0 — runtime.test.ts

import assert from 'node:assert/strict';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import test, { type TestContext } from 'node:test';

import { RuntimeController } from './controller.js';
import { listGraphs, loadGraph, persistGraph, persistHandoff } from './checkpoint.js';
import {
  createTaskGraph,
  getNextResumePoint,
  getReadyTasks,
  updateTaskStatus,
} from './task-graph.js';
import type { Handoff } from '../types/handoff.js';
import type { SubTask, TaskGraph, TaskStatus } from '../types/task-graph.js';

const graphsDir = path.join(process.cwd(), '.nexus', 'graphs');
const handoffsDir = path.join(process.cwd(), '.nexus', 'handoffs');

let uniqueCounter = 0;

const uniqueId = (prefix: string): string => `${prefix}-${process.pid}-${uniqueCounter++}`;

const buildTask = (
  id: string,
  dependsOn: string[] = [],
  status: TaskStatus = 'pending',
): SubTask => ({
  id,
  description: `Task ${id}`,
  depends_on: dependsOn,
  assigned_agent: `agent-${id}`,
  attention: 'low',
  model_tier: 'flash',
  token_budget: 100,
  status,
});

const buildHandoff = (from: string, to: string, timestamp: number): Handoff => ({
  id: uniqueId(`handoff-${from}-${to}`),
  from,
  to,
  task: `Handoff from ${from}`,
  result: 'ok',
  artifacts: [],
  context_delta: {},
  status: 'complete',
  timestamp,
});

const markDone = (graph: TaskGraph, taskId: string, handoffFrom: string): TaskGraph => {
  const handoff = buildHandoff(handoffFrom, 'runtime-controller', 10);
  return updateTaskStatus(graph, taskId, 'done', handoff);
};

const registerCleanup = (t: TestContext) => {
  const files = new Set<string>();

  t.after(() => {
    for (const filePath of files) {
      if (existsSync(filePath)) unlinkSync(filePath);
    }
  });

  return {
    trackGraph(graphId: string): string {
      const filePath = path.join(graphsDir, `${graphId}.json`);
      files.add(filePath);
      return filePath;
    },
    trackHandoff(from: string, to: string): string {
      const filePath = path.join(handoffsDir, `${from}-${to}.jsonl`);
      files.add(filePath);
      return filePath;
    },
  };
};

const buildResumeSeededGraph = (graphId: string): TaskGraph => ({
  id: graphId,
  objective: 'resume objective',
  tasks: {
    t1: {
      ...buildTask('t1'),
      status: 'done',
      handoff: buildHandoff('agent-t1', 'runtime-controller', 100),
      started_at: 101,
      completed_at: 102,
    },
    t2: {
      ...buildTask('t2', ['t1']),
      assigned_agent: uniqueId('resume-agent-2'),
    },
    t3: {
      ...buildTask('t3', ['t2']),
      assigned_agent: uniqueId('resume-agent-3'),
    },
  },
  created_at: 100,
  updated_at: 100,
});

test('createTaskGraph with valid input produces correct structure', () => {
  const tasks = [buildTask('a'), buildTask('b', ['a'])];
  const graph = createTaskGraph('ship feature', tasks);

  assert.equal(typeof graph.id, 'string');
  assert.ok(graph.id.length > 0);
  assert.equal(graph.objective, 'ship feature');
  assert.deepEqual(Object.keys(graph.tasks).sort(), ['a', 'b']);
  assert.equal(graph.tasks.a.status, 'pending');
  assert.equal(graph.tasks.b.status, 'pending');
  assert.equal(graph.tasks.b.depends_on[0], 'a');
  assert.equal(graph.created_at, graph.updated_at);
});

test('createTaskGraph throws on circular dependency', () => {
  const tasks = [buildTask('a', ['b']), buildTask('b', ['a'])];

  assert.throws(
    () => createTaskGraph('cycle', tasks),
    /Task graph contains a dependency cycle/,
  );
});

test('createTaskGraph throws when depends_on references unknown id', () => {
  const tasks = [buildTask('a', ['missing'])];

  assert.throws(
    () => createTaskGraph('unknown dependency', tasks),
    /depends on missing task missing/,
  );
});

test('getReadyTasks returns only tasks whose dependencies are done', () => {
  const tasks = [buildTask('a'), buildTask('b', ['a']), buildTask('c', ['b']), buildTask('d')];
  const graph = createTaskGraph('ready tasks', tasks);
  const withDoneA = markDone(graph, 'a', 'agent-a');

  const readyIds = getReadyTasks(withDoneA).map((task) => task.id).sort();
  assert.deepEqual(readyIds, ['b', 'd']);
});

test('getReadyTasks returns nothing when dependencies are pending', () => {
  const graph: TaskGraph = {
    id: uniqueId('pending-deps-graph'),
    objective: 'pending deps',
    tasks: {
      a: buildTask('a', ['b']),
      b: buildTask('b', ['a']),
    },
    created_at: 1,
    updated_at: 1,
  };

  assert.deepEqual(getReadyTasks(graph), []);
});

test("getNextResumePoint returns 'running' task before 'pending' tasks", () => {
  const graph = createTaskGraph('resume running first', [buildTask('a'), buildTask('b')]);
  const runningGraph = updateTaskStatus(graph, 'a', 'running');

  const next = getNextResumePoint(runningGraph);
  assert.equal(next?.id, 'a');
  assert.equal(next?.status, 'running');
});

test('getNextResumePoint returns null when graph is complete', () => {
  const graph = createTaskGraph('complete graph', [buildTask('a')]);
  const completeGraph = markDone(graph, 'a', 'agent-a-complete');

  assert.equal(getNextResumePoint(completeGraph), null);
});

test('persistGraph + loadGraph round-trip preserves all fields', (t) => {
  const cleanup = registerCleanup(t);
  const graphId = uniqueId('round-trip-graph');
  const graph: TaskGraph = {
    id: graphId,
    objective: 'round trip',
    tasks: {
      a: {
        ...buildTask('a'),
        status: 'done',
        handoff: buildHandoff('agent-a', 'runtime-controller', 20),
        started_at: 21,
        completed_at: 22,
      },
      b: {
        ...buildTask('b', ['a']),
        status: 'failed',
        error: 'executor error',
        started_at: 23,
      },
    },
    created_at: 100,
    updated_at: 200,
  };

  const graphPath = cleanup.trackGraph(graphId);
  persistGraph(graph);
  assert.equal(existsSync(graphPath), true);

  const loaded = loadGraph(graphId);
  assert.deepEqual(loaded, graph);
});

test('listGraphs returns ids sorted newest first', (t) => {
  const cleanup = registerCleanup(t);

  const first: TaskGraph = {
    id: uniqueId('list-oldest'),
    objective: 'oldest',
    tasks: { a: buildTask('a') },
    created_at: 10,
    updated_at: 10,
  };
  const second: TaskGraph = {
    id: uniqueId('list-middle'),
    objective: 'middle',
    tasks: { b: buildTask('b') },
    created_at: 20,
    updated_at: 20,
  };
  const third: TaskGraph = {
    id: uniqueId('list-newest'),
    objective: 'newest',
    tasks: { c: buildTask('c') },
    created_at: 30,
    updated_at: 30,
  };

  cleanup.trackGraph(first.id);
  cleanup.trackGraph(second.id);
  cleanup.trackGraph(third.id);
  persistGraph(first);
  persistGraph(third);
  persistGraph(second);

  const expected = [third.id, second.id, first.id];
  const createdIds = new Set(expected);
  const actualSubset = listGraphs().filter((id) => createdIds.has(id));
  assert.deepEqual(actualSubset, expected);
});

test('persistHandoff appends correctly across multiple calls', (t) => {
  const cleanup = registerCleanup(t);
  const from = uniqueId('handoff-from');
  const to = uniqueId('handoff-to');

  const handoffFilePath = cleanup.trackHandoff(from, to);
  const first = buildHandoff(from, to, 1);
  const second = buildHandoff(from, to, 2);

  persistHandoff(first);
  persistHandoff(second);

  const lines = readFileSync(handoffFilePath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]) as Handoff, first);
  assert.deepEqual(JSON.parse(lines[1]) as Handoff, second);
});

test('controller skips done tasks and resumes from correct node', async (t) => {
  const cleanup = registerCleanup(t);
  const graphId = uniqueId('controller-resume-graph');
  const seededGraph = buildResumeSeededGraph(graphId);

  const executed: string[] = [];
  const controller = new RuntimeController(
    seededGraph.objective,
    Object.values(seededGraph.tasks),
    async (task) => {
      executed.push(task.id);
      return { status: 'complete', result: `finished-${task.id}` };
    },
  );

  const graphPath = cleanup.trackGraph(graphId);
  cleanup.trackHandoff(seededGraph.tasks.t2.assigned_agent, 'runtime-controller');
  cleanup.trackHandoff(seededGraph.tasks.t3.assigned_agent, 'runtime-controller');
  persistGraph(seededGraph);
  assert.equal(existsSync(graphPath), true);

  const result = await controller.resumeFromCheckpoint(graphId);

  assert.deepEqual(executed, ['t2', 't3']);
  assert.equal(result.tasks.t1.status, 'done');
  assert.equal(result.tasks.t2.status, 'done');
  assert.equal(result.tasks.t3.status, 'done');
});
