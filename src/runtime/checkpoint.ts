// Nexus-Prime 4.1.0 — runtime/checkpoint.ts

import fs from 'node:fs';
import path from 'node:path';
import type { Handoff as GraphHandoff } from '../types/handoff.js';
import type { TaskGraph } from '../types/task-graph.js';

const STATE_DIR = process.env['NEXUS_STATE_DIR'] ?? '.nexus';

function graphsDir(): string {
  return path.join(STATE_DIR, 'graphs');
}

function handoffsDir(): string {
  return path.join(STATE_DIR, 'handoffs');
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function persistGraph(graph: TaskGraph): void {
  const dir = graphsDir();
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, `${graph.id}.json`), JSON.stringify(graph, null, 2), 'utf8');
}

export function loadGraph(graphId: string): TaskGraph | null {
  const filePath = path.join(graphsDir(), `${graphId}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as TaskGraph;
  } catch {
    return null;
  }
}

export function listGraphs(): string[] {
  const dir = graphsDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  const graphs: Array<{ id: string; created_at: number }> = [];

  for (const file of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as TaskGraph;
      graphs.push({ id: parsed.id, created_at: parsed.created_at });
    } catch {
      // skip malformed files
    }
  }

  return graphs.sort((a, b) => b.created_at - a.created_at).map((g) => g.id);
}

export function persistHandoff(handoff: GraphHandoff): void {
  const dir = handoffsDir();
  ensureDir(dir);
  const filePath = path.join(dir, `${handoff.from}-${handoff.to}.jsonl`);
  fs.appendFileSync(filePath, JSON.stringify(handoff) + '\n', 'utf8');
}
