export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'blocked';

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
  current_phase: string;
  tasks: Task[];
  phases?: Phase[];
  metadata: Record<string, any>;
  execution_mode?: 'parallel' | 'sequential';
}
