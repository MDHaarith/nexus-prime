import fs from 'fs';
import path from 'path';
import type { Handoff, PersistedRuntimeSnapshot, RuntimeConfig, OrchestrationState } from '../types/index.js';
import type { LogEntry } from '../core/Logger.js';

function ensureDir(directory: string): void {
  fs.mkdirSync(directory, { recursive: true });
}

function safeReadJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export class NexusPersistence {
  private readonly runtimeRoot: string;
  private readonly sessionsRoot: string;
  private readonly archiveRoot: string;
  private readonly activePointerPath: string;

  constructor(private readonly config: RuntimeConfig) {
    this.runtimeRoot = path.join(config.stateDir, 'runtime');
    this.sessionsRoot = path.join(this.runtimeRoot, 'sessions');
    this.archiveRoot = path.join(this.runtimeRoot, 'archive');
    this.activePointerPath = path.join(this.runtimeRoot, 'active-session.json');
  }

  public bootstrap(): void {
    ensureDir(this.runtimeRoot);
    ensureDir(this.sessionsRoot);
    ensureDir(this.archiveRoot);
  }

  public loadActiveSnapshot(): PersistedRuntimeSnapshot | null {
    const pointer = safeReadJson<{ session_id?: string }>(this.activePointerPath, {});
    if (!pointer.session_id) {
      return null;
    }

    const sessionDir = path.join(this.sessionsRoot, pointer.session_id);
    const state = safeReadJson<OrchestrationState | null>(path.join(sessionDir, 'state.json'), null);
    if (!state) {
      return null;
    }

    return {
      state,
      logs: safeReadJson<string[]>(path.join(sessionDir, 'logs.json'), []),
      handoffs: safeReadJson<Handoff[]>(path.join(sessionDir, 'handoffs.json'), [])
    };
  }

  public saveSnapshot(state: OrchestrationState, logs: LogEntry[], handoffs: Handoff[]): void {
    const sessionDir = path.join(this.sessionsRoot, state.session_id);
    ensureDir(sessionDir);
    fs.writeFileSync(path.join(sessionDir, 'state.json'), JSON.stringify(state, null, 2), 'utf8');
    fs.writeFileSync(
      path.join(sessionDir, 'logs.json'),
      JSON.stringify(logs.map((entry) => `${entry.timestamp} ${entry.level} ${entry.message}`), null, 2),
      'utf8'
    );
    fs.writeFileSync(path.join(sessionDir, 'handoffs.json'), JSON.stringify(handoffs, null, 2), 'utf8');
    fs.writeFileSync(this.activePointerPath, JSON.stringify({ session_id: state.session_id }, null, 2), 'utf8');
  }

  public archiveSession(state: OrchestrationState): void {
    const sessionDir = path.join(this.sessionsRoot, state.session_id);
    if (!fs.existsSync(sessionDir)) {
      return;
    }

    const archiveDir = path.join(
      this.archiveRoot,
      `${state.session_id}-${new Date().toISOString().replace(/[:.]/g, '-')}`
    );
    ensureDir(this.archiveRoot);
    fs.renameSync(sessionDir, archiveDir);

    const pointer = safeReadJson<{ session_id?: string }>(this.activePointerPath, {});
    if (pointer.session_id === state.session_id) {
      fs.writeFileSync(this.activePointerPath, JSON.stringify({}, null, 2), 'utf8');
    }
  }
}
