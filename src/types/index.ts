export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';
export type ExecutionMode = 'parallel' | 'sequential';
export type PhaseStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RunStatus = 'idle' | 'booting' | 'running' | 'awaiting_input' | 'completed' | 'failed';
export type ExportTarget = 'gemini' | 'codex' | 'claude-code' | 'cursor' | 'opencode';
export type ExecutorMode = 'deterministic' | 'gemini-cli';
export type MemoryRecordKind = 'session' | 'resource' | 'skill' | 'agent' | 'command' | 'specialist-pack' | 'reference';

export interface TokenUsage {
  input: number;
  output: number;
  cached?: number;
}

export interface TaskReport {
  status: 'success' | 'partial' | 'failure';
  objective_achieved: string;
  files_created: string[];
  files_modified: string[];
  files_deleted: string[];
  decisions_made: string[];
  validation: 'pass' | 'fail' | 'skipped';
  validation_output?: string;
  errors: string[];
  scope_deviations: string[];
  token_usage?: TokenUsage;
  artifacts?: string[];
}

export interface DownstreamContext {
  key_interfaces_introduced: string[];
  patterns_established: string[];
  integration_points: string[];
  assumptions: string[];
  warnings: string[];
}

export interface Handoff {
  task_id: string;
  status: TaskStatus;
  report: TaskReport;
  downstream_context: DownstreamContext;
}

export interface Task {
  id: string;
  name: string;
  agent: string;
  description: string;
  status: TaskStatus;
  dependencies: string[];
  phase_id?: string;
  input?: Record<string, unknown>;
  output?: TaskReport;
  error?: string;
  start_time?: number;
  end_time?: number;
  retry_count?: number;
  artifacts?: string[];
}

export interface Phase {
  id: string;
  name: string;
  status: PhaseStatus;
  tasks: Task[];
  execution_mode?: ExecutionMode;
  objective?: string;
}

export interface OrchestrationState {
  session_id: string;
  current_phase: string;
  tasks: Task[];
  phases?: Phase[];
  metadata: Record<string, unknown>;
  execution_mode?: ExecutionMode;
  run_status?: RunStatus;
  created_at?: string;
  updated_at?: string;
}

export interface InteractiveQuestionOption {
  label: string;
  description: string;
}

export interface InteractiveQuestion {
  id: string;
  question: string;
  header: string;
  type: 'choice' | 'text' | 'yesno';
  options?: InteractiveQuestionOption[];
  multiSelect?: boolean;
  placeholder?: string;
}

export interface AskUserPayload {
  agent?: string;
  reason?: string;
  questions: InteractiveQuestion[];
}

export type UserAnswer = string | string[] | boolean | null;

export interface RuntimeConfig {
  workspaceRoot: string;
  stateDir: string;
  executionMode: ExecutionMode;
  executorMode: ExecutorMode;
  maxRetries: number;
  maxContextWindow: number;
  maxContextLength: number;
  enableConsoleLogs: boolean;
  objective: string;
  exportTargets: ExportTarget[];
  memory: {
    enabled: boolean;
    autoIndex: boolean;
    backend: string;
    vendoredContextPath: string;
  };
}

export interface AgentDefinition {
  id: string;
  displayName: string;
  description: string;
  path: string;
  model?: string;
  kind?: string;
  source: 'nexus-core' | 'nexus-specialist';
  capabilities: string[];
  aliases: string[];
}

export interface CommandDefinition {
  id: string;
  name: string;
  description: string;
  prompt: string;
  path: string;
  namespace: 'core';
  source: 'nexus-core';
  aliases: string[];
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  path: string;
  source: 'nexus-core';
  referencePaths: string[];
  aliases: string[];
}

export interface SpecialistPackDefinition {
  id: string;
  title: string;
  category: string;
  description: string;
  path: string;
  featured: boolean;
}

export interface RegistrySnapshot {
  agents: AgentDefinition[];
  commands: CommandDefinition[];
  skills: SkillDefinition[];
  specialistPacks: SpecialistPackDefinition[];
  aliases: Record<string, string>;
  curatedCoreReplacements: string[];
  designSuiteCommandIds: string[];
  memoryCommandIds: string[];
}

export interface MemoryRecord {
  id: string;
  kind: MemoryRecordKind;
  title: string;
  text: string;
  path?: string;
  tags: string[];
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MemorySearchResult {
  record: MemoryRecord;
  score: number;
  snippet: string;
}

export interface MemoryStatus {
  backend: string;
  vendored: boolean;
  records: number;
  sessions: number;
  agents: number;
  skills: number;
  commands: number;
  specialists: number;
  lastIndexedAt?: string;
}

export interface PersistedRuntimeSnapshot {
  state: OrchestrationState;
  logs: string[];
  handoffs: Handoff[];
}

export interface ValidationMetrics {
  cost: number;
  input_tokens: number;
  output_tokens: number;
  cache_tokens: number;
  quality_score: number;
  latency_ms: number;
}

export interface ComparativeMetrics {
  current: ValidationMetrics;
  baseline?: ValidationMetrics;
  deltas: {
    cost: number;
    usage: number;
    quality: number;
  };
}
