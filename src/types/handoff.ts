// Nexus-Prime 4.1.0 — handoff.ts

export type AgentId = string;

export type HandoffStatus = 'complete' | 'partial' | 'blocked';

export type Handoff = {
  id: string;
  from: AgentId;
  to: AgentId;
  task: string;
  result: string;
  artifacts: string[];
  context_delta: Record<string, unknown>;
  status: HandoffStatus;
  blocking_reason?: string;
  timestamp: number;
};
