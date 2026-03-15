import type { DownstreamContext, Handoff, Task, TaskReport } from '../types/index.js';

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item));
}

function toValidation(value: unknown): TaskReport['validation'] {
  return value === 'fail' || value === 'skipped' ? value : 'pass';
}

function emptyDownstreamContext(): DownstreamContext {
  return {
    key_interfaces_introduced: [],
    patterns_established: [],
    integration_points: [],
    assumptions: [],
    warnings: []
  };
}

export function parseStructuredHandoff(response: string, task: Task): Handoff | null {
  const matches = [...response.matchAll(/```json\s*([\s\S]*?)```/g)];
  if (matches.length === 0) {
    return null;
  }

  const rawJson = matches[matches.length - 1][1];

  try {
    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    const downstream = (parsed.downstream_context || {}) as Record<string, unknown>;
    const report: TaskReport = {
      status: parsed.status === 'failure' ? 'failure' : parsed.status === 'partial' ? 'partial' : 'success',
      objective_achieved: String(parsed.objective_achieved || `Completed ${task.name}`),
      files_created: toStringArray(parsed.files_created),
      files_modified: toStringArray(parsed.files_modified),
      files_deleted: toStringArray(parsed.files_deleted),
      decisions_made: toStringArray(parsed.decisions_made || parsed.key_decisions),
      validation: toValidation(parsed.validation),
      validation_output: parsed.validation_output ? String(parsed.validation_output) : undefined,
      errors: toStringArray(parsed.errors || parsed.blockers),
      scope_deviations: toStringArray(parsed.scope_deviations),
      artifacts: toStringArray(parsed.artifacts),
      token_usage: undefined
    };

    return {
      task_id: task.id,
      status: report.status === 'failure' ? 'failed' : 'completed',
      report,
      downstream_context: {
        key_interfaces_introduced: toStringArray(downstream.key_interfaces_introduced),
        patterns_established: toStringArray(downstream.patterns_established),
        integration_points: toStringArray(downstream.integration_points),
        assumptions: toStringArray(downstream.assumptions),
        warnings: toStringArray(downstream.warnings)
      }
    };
  } catch {
    return null;
  }
}

export function synthesizeHandoff(task: Task, summary: string, warnings: string[] = []): Handoff {
  return {
    task_id: task.id,
    status: 'completed',
    report: {
      status: 'success',
      objective_achieved: summary,
      files_created: [],
      files_modified: [],
      files_deleted: [],
      decisions_made: [],
      validation: 'pass',
      errors: [],
      scope_deviations: [],
      artifacts: [],
      token_usage: {
        input: Math.max(64, task.description.length),
        output: 128
      }
    },
    downstream_context: {
      ...emptyDownstreamContext(),
      warnings
    }
  };
}
