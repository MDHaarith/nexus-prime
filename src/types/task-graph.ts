// Nexus-Prime 4.1.0 — types/task-graph.ts

import type { AgentId, Handoff } from './handoff.js';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked';

export type AttentionLevel = 'low' | 'high';

export type ModelTier = 'flash' | 'pro'; // used in Phase 3 (4.3.0), defined now

export type SubTask = {
  id: string;
  description: string;
  depends_on: string[];                // ids of tasks that must be done first
  assigned_agent: AgentId;
  attention: AttentionLevel;
  model_tier: ModelTier;
  token_budget: number;
  status: TaskStatus;
  handoff?: Handoff;              // populated when task completes
  error?: string;                      // populated when status = failed
  started_at?: number;
  completed_at?: number;
};

export type TaskGraph = {
  id: string;                          // uuid, one per top-level task
  objective: string;
  tasks: Record<string, SubTask>;      // keyed by task id
  created_at: number;
  updated_at: number;
};
