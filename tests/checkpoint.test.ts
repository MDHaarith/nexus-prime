import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

// Override NEXUS_STATE_DIR before importing the module under test
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-checkpoint-'));
process.env['NEXUS_STATE_DIR'] = tempDir;

// Dynamic import after env var is set
const { persistGraph, loadGraph, listGraphs, persistHandoff } = await import('../src/runtime/checkpoint.js');
import type { TaskGraph } from '../src/types/task-graph.js';
import type { Handoff as GraphHandoff } from '../src/types/handoff.js';

function makeGraph(objective: string): TaskGraph {
  return {
    id: `graph-${Math.random().toString(36).slice(2, 8)}`,
    objective,
    tasks: {},
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

test('persistGraph + loadGraph round-trip preserves all fields', () => {
  const graph = makeGraph('test objective');
  persistGraph(graph);
  const loaded = loadGraph(graph.id);
  assert.ok(loaded !== null);
  assert.equal(loaded!.id, graph.id);
  assert.equal(loaded!.objective, graph.objective);
  assert.equal(loaded!.created_at, graph.created_at);
});

test('loadGraph returns null for unknown id', () => {
  const result = loadGraph('nonexistent-graph-id');
  assert.equal(result, null);
});

test('loadGraph returns null for malformed json', async () => {
  const graphId = `graph-invalid-${Date.now()}`;
  const filePath = path.join(process.env['NEXUS_STATE_DIR']!, 'graphs', `${graphId}.json`);

  // Write invalid JSON
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, '{ invalid_json: true ', 'utf8');

  const loaded = await loadGraph(graphId);
  assert.strictEqual(loaded, null);
});

test('listGraphs returns ids sorted newest first', async () => {
  const g1 = { ...makeGraph('first'), created_at: 1000 };
  const g2 = { ...makeGraph('second'), created_at: 3000 };
  const g3 = { ...makeGraph('third'), created_at: 2000 };
  persistGraph(g1);
  persistGraph(g2);
  persistGraph(g3);

  const ids = listGraphs();
  const positions = [g1.id, g2.id, g3.id].map((id) => ids.indexOf(id));
  // g2 (created_at=3000) should come before g3 (2000) before g1 (1000)
  assert.ok(positions[1]! < positions[2]!);
  assert.ok(positions[2]! < positions[0]!);
});

test('persistHandoff appends correctly across multiple calls', () => {
  const handoff1: GraphHandoff = {
    id: 'h1', from: 'agent-a', to: 'agent-b', task: 't1',
    result: 'r1', artifacts: [], context_delta: {}, status: 'complete', timestamp: 100,
  };
  const handoff2: GraphHandoff = {
    id: 'h2', from: 'agent-a', to: 'agent-b', task: 't2',
    result: 'r2', artifacts: [], context_delta: {}, status: 'complete', timestamp: 200,
  };

  persistHandoff(handoff1);
  persistHandoff(handoff2);

  const filePath = path.join(tempDir, 'handoffs', 'agent-a-agent-b.jsonl');
  assert.ok(fs.existsSync(filePath));
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  const parsed1 = JSON.parse(lines[0]!) as GraphHandoff;
  const parsed2 = JSON.parse(lines[1]!) as GraphHandoff;
  assert.equal(parsed1.id, 'h1');
  assert.equal(parsed2.id, 'h2');
});
