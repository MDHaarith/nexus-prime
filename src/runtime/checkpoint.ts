// Nexus-Prime 4.1.0 — checkpoint.ts

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';

import type { TaskGraph } from '../types/task-graph.js';
import type { Handoff } from '../types/handoff.js';

const NEXUS_DIR = path.join(process.cwd(), '.nexus');
const GRAPHS_DIR = path.join(NEXUS_DIR, 'graphs');
const HANDOFFS_DIR = path.join(NEXUS_DIR, 'handoffs');

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function isTaskGraph(value: unknown): value is TaskGraph {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.objective !== 'string') return false;
  if (!isRecord(value.tasks)) return false;
  if (typeof value.created_at !== 'number') return false;
  return typeof value.updated_at === 'number';
}

function getCreatedAt(value: unknown): number {
  if (!isRecord(value)) return Number.NEGATIVE_INFINITY;
  return typeof value.created_at === 'number'
    ? value.created_at
    : Number.NEGATIVE_INFINITY;
}

export function persistGraph(graph: TaskGraph): void {
  mkdirSync(GRAPHS_DIR, { recursive: true });
  const filePath = path.join(GRAPHS_DIR, `${graph.id}.json`);
  const body = `${JSON.stringify(graph, null, 2)}\n`;
  writeFileSync(filePath, body, 'utf8');
}

export function loadGraph(graphId: string): TaskGraph | null {
  const filePath = path.join(GRAPHS_DIR, `${graphId}.json`);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!isTaskGraph(parsed)) {
    throw new Error(`Invalid graph format: ${filePath}`);
  }
  return parsed;
}

export function listGraphs(): string[] {
  if (!existsSync(GRAPHS_DIR)) return [];

  const items = readdirSync(GRAPHS_DIR)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const filePath = path.join(GRAPHS_DIR, name);
      const id = name.slice(0, -'.json'.length);
      try {
        const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
        return { id, createdAt: getCreatedAt(parsed) };
      } catch {
        return { id, createdAt: Number.NEGATIVE_INFINITY };
      }
    });

  items.sort((a, b) => b.createdAt - a.createdAt || a.id.localeCompare(b.id));
  return items.map((item) => item.id);
}

export function persistHandoff(handoff: Handoff): void {
  mkdirSync(HANDOFFS_DIR, { recursive: true });
  const filePath = path.join(HANDOFFS_DIR, `${handoff.from}-${handoff.to}.jsonl`);
  const line = `${JSON.stringify(handoff)}\n`;
  appendFileSync(filePath, line, 'utf8');
}
