// Nexus-Prime 4.1.0 — task-graph.ts

import type { AgentId, Handoff } from './handoff.js';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'blocked';

export type AttentionLevel = 'low' | 'high';

export type ModelTier = 'flash' | 'pro';

export type SubTask = {
  id: string;
  description: string;
  depends_on: string[];
  assigned_agent: AgentId;
  attention: AttentionLevel;
  model_tier: ModelTier;
  token_budget: number;
  status: TaskStatus;
  handoff?: Handoff;
  error?: string;
  started_at?: number;
  completed_at?: number;
};

export type TaskGraph = {
  id: string;
  objective: string;
  tasks: Record<string, SubTask>;
  created_at: number;
  updated_at: number;
};
