export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

export interface TokenUsage {
  input: number;
  output: number;
  cached?: number;
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

export interface TaskReport {
  status: 'success' | 'partial' | 'failure';
  objective_achieved: string;
  files_created: string[];
  files_modified: string[];
  files_deleted: string[];
  decisions_made: string[];
  validation?: ValidationMetrics | 'pass' | 'fail' | 'skipped';
  validation_output?: string;
  errors: string[];
  scope_deviations: string[];
  token_usage?: TokenUsage;
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
  input?: any;
  output?: TaskReport;
  error?: string;
  start_time?: number;
  end_time?: number;
}

export interface Phase {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tasks: Task[];
  execution_mode?: 'parallel' | 'sequential';
}

export interface OrchestrationState {
  session_id: string;
  task?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed';
  current_phase: string;
  tasks: Task[];
  phases?: Phase[];
  metadata: Record<string, any>;
  execution_mode?: 'parallel' | 'sequential';
  comparison?: ComparativeMetrics;
}

export interface QuestionOption {
  label: string;
  description: string;
}

export interface Question {
  question: string;
  header: string;
  type: 'choice' | 'text' | 'yesno';
  options?: QuestionOption[];
  multiSelect?: boolean;
  placeholder?: string;
}

export interface AskUserPayload {
  questions: Question[];
}

export type UserAnswer = string | string[] | boolean | null;

export type PromptHandler = (payload: AskUserPayload) => Promise<UserAnswer[]>;
