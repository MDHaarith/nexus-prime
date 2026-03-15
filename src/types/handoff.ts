// Nexus-Prime 4.1.0 — types/handoff.ts

export type AgentId = string;

export type HandoffStatus = 'complete' | 'partial' | 'blocked';

export type Handoff = {
  id: string;                              // uuid
  from: AgentId;
  to: AgentId;
  task: string;                            // what was requested
  result: string;                          // what was produced (empty if blocked)
  artifacts: string[];                     // file paths or output references created
  context_delta: Record<string, unknown>;  // only what changed, not full history
  status: HandoffStatus;
  blocking_reason?: string;               // required when status = 'blocked'
  timestamp: number;                      // Date.now()
};
