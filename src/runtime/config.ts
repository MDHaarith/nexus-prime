import path from 'path';
import type { ExportTarget, RuntimeConfig } from '../types/index.js';
import { DEFAULT_EXPORT_TARGETS } from './product.js';

const VALID_EXPORT_TARGETS = new Set<ExportTarget>([
  'gemini',
  'codex',
  'claude-code',
  'cursor',
  'opencode'
]);

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseTargets(value: string | undefined): ExportTarget[] {
  if (!value) {
    return DEFAULT_EXPORT_TARGETS;
  }

  const parsed = value
    .split(',')
    .map((item) => item.trim() as ExportTarget)
    .filter((item) => VALID_EXPORT_TARGETS.has(item));

  return parsed.length > 0 ? parsed : DEFAULT_EXPORT_TARGETS;
}

export function loadRuntimeConfig(workspaceRoot: string = process.cwd(), env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    workspaceRoot,
    stateDir: env.NEXUS_STATE_DIR || path.join(workspaceRoot, '.nexus'),
    executionMode: env.NEXUS_EXECUTION_MODE === 'parallel' ? 'parallel' : 'sequential',
    executorMode: env.NEXUS_EXECUTOR_MODE === 'gemini-cli' ? 'gemini-cli' : 'deterministic',
    maxRetries: parseNumber(env.NEXUS_MAX_RETRIES, 1),
    maxContextWindow: parseNumber(env.NEXUS_CONTEXT_WINDOW, 3),
    maxContextLength: parseNumber(env.NEXUS_MAX_CONTEXT_LENGTH, 8000),
    enableConsoleLogs: parseBoolean(env.NEXUS_CONSOLE_LOGS, false),
    objective: env.NEXUS_OBJECTIVE || 'Assimilate Nexus Memory, Nexus Design Suite, and Nexus Specialist Packs into a unified 4-phase runtime.',
    exportTargets: parseTargets(env.NEXUS_EXPORT_TARGETS),
    memory: {
      enabled: parseBoolean(env.NEXUS_MEMORY_ENABLED, true),
      autoIndex: parseBoolean(env.NEXUS_MEMORY_AUTO_INDEX, true),
      backend: env.NEXUS_MEMORY_BACKEND || 'nexus-context-engine',
      vendoredContextPath: path.join(workspaceRoot, 'context-manager')
    }
  };
}
