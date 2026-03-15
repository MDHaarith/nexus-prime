import fs from 'fs';
import path from 'path';
import type {
  MemoryRecord,
  MemorySearchResult,
  MemoryStatus,
  OrchestrationState,
  RegistrySnapshot,
  RuntimeConfig,
  Task
} from '../types/index.js';
import type { LogEntry } from '../core/Logger.js';
import type { Handoff } from '../types/index.js';

interface MemoryIndex {
  records: MemoryRecord[];
  lastIndexedAt?: string;
}

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

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function makeSnippet(text: string, query: string): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index === -1) {
    return text.slice(0, 160);
  }

  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + query.length + 100);
  return text.slice(start, end).trim();
}

export class NexusMemoryService {
  private readonly memoryRoot: string;
  private readonly indexPath: string;
  private readonly sessionsRoot: string;
  private index: MemoryIndex = { records: [] };

  constructor(
    private readonly config: RuntimeConfig,
    private readonly registry: RegistrySnapshot
  ) {
    this.memoryRoot = path.join(config.stateDir, 'memory');
    this.indexPath = path.join(this.memoryRoot, 'index.json');
    this.sessionsRoot = path.join(this.memoryRoot, 'sessions');
  }

  public bootstrap(): MemoryStatus {
    ensureDir(this.memoryRoot);
    ensureDir(this.sessionsRoot);
    this.index = safeReadJson<MemoryIndex>(this.indexPath, { records: [] });

    if (this.config.memory.autoIndex) {
      this.indexRegistry();
    }

    return this.status();
  }

  public status(): MemoryStatus {
    const records = this.index.records;
    return {
      backend: this.config.memory.backend,
      vendored: fs.existsSync(this.config.memory.vendoredContextPath),
      records: records.length,
      sessions: records.filter((record) => record.kind === 'session').length,
      agents: records.filter((record) => record.kind === 'agent').length,
      skills: records.filter((record) => record.kind === 'skill').length,
      commands: records.filter((record) => record.kind === 'command').length,
      specialists: records.filter((record) => record.kind === 'specialist-pack').length,
      lastIndexedAt: this.index.lastIndexedAt
    };
  }

  public async getRelevantContext(task: Task): Promise<string> {
    const query = `${task.name} ${task.description} ${Object.values(task.input || {}).join(' ')}`;
    
    if (this.config.memory.backend === 'nexus-context-engine') {
      return this.getNexusContext(query);
    }

    const results = this.search(query, 3);
    if (results.length === 0) {
      return '';
    }

    return [
      '### Nexus Memory Context (Pre-run)',
      ...results.map((res) => `- [${res.record.kind}] ${res.record.title}: ${res.snippet}...`)
    ].join('\n');
  }

  private async getNexusContext(query: string): Promise<string> {
    // Nexus Context Engine tiered loading (L0/L1/L2)
    const results = this.search(query, 5);
    if (results.length === 0) {
      return '';
    }

    const tieredContext = results.map((res) => {
      const level = res.score > 0.8 ? 'L2 (Detailed)' : res.score > 0.5 ? 'L1 (Overview)' : 'L0 (Abstract)';
      return `[${level}] ${res.record.title} (URI: nexus://context/${res.record.id}): ${res.snippet}`;
    });

    return [
      '### Nexus Context Engine (Recursive Retrieval)',
      ...tieredContext
    ].join('\n');
  }

  public search(query: string, limit: number = 5): MemorySearchResult[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    const scored = this.index.records
      .map((record) => {
        const haystack = `${record.title}\n${record.text}\n${record.tags.join(' ')}`.toLowerCase();
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        return { record, score };
      })
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map((result) => ({
        ...result,
        snippet: makeSnippet(result.record.text, query)
      }));

    return scored;
  }

  public recordSession(state: OrchestrationState, logs: LogEntry[], handoffs: Handoff[]): void {
    const sessionPath = path.join(this.sessionsRoot, `${state.session_id}.json`);
    writeJson(sessionPath, {
      session_id: state.session_id,
      current_phase: state.current_phase,
      run_status: state.run_status,
      updated_at: state.updated_at,
      logs,
      handoffs
    });

    const summary = [
      `Session ${state.session_id}`,
      `Run status: ${state.run_status || 'unknown'}`,
      `Current phase: ${state.current_phase}`,
      `Tasks: ${state.tasks.length}`,
      ...handoffs.slice(-3).map((handoff) => `${handoff.task_id}: ${handoff.report.objective_achieved}`)
    ].join('\n');

    this.upsertRecord({
      id: `session:${state.session_id}`,
      kind: 'session',
      title: `Session ${state.session_id}`,
      text: summary,
      path: sessionPath,
      tags: ['session', state.current_phase, state.run_status || 'unknown'],
      updatedAt: new Date().toISOString(),
      metadata: {
        taskCount: state.tasks.length
      }
    });
  }

  private indexRegistry(): void {
    const now = new Date().toISOString();

    for (const agent of this.registry.agents) {
      this.upsertRecord({
        id: `agent:${agent.id}`,
        kind: 'agent',
        title: agent.displayName,
        text: `${agent.description}\n${agent.capabilities.join('\n')}`,
        path: agent.path,
        tags: ['agent', agent.id, agent.source],
        updatedAt: now
      });
    }

    for (const skill of this.registry.skills) {
      this.upsertRecord({
        id: `skill:${skill.id}`,
        kind: 'skill',
        title: skill.name,
        text: skill.description,
        path: skill.path,
        tags: ['skill', skill.id, skill.source],
        updatedAt: now
      });
    }

    for (const command of this.registry.commands) {
      this.upsertRecord({
        id: `command:${command.id}`,
        kind: 'command',
        title: command.name,
        text: `${command.description}\n${command.prompt}`,
        path: command.path,
        tags: ['command', command.namespace, command.source],
        updatedAt: now
      });
    }

    for (const specialist of this.registry.specialistPacks) {
      this.upsertRecord({
        id: `specialist:${specialist.id}`,
        kind: 'specialist-pack',
        title: specialist.title,
        text: specialist.description,
        path: specialist.path,
        tags: ['specialist', specialist.category, specialist.featured ? 'featured' : 'catalog'],
        updatedAt: now
      });
    }

    this.index.lastIndexedAt = now;
    writeJson(this.indexPath, this.index);
  }

  private upsertRecord(record: MemoryRecord): void {
    const existing = this.index.records.findIndex((candidate) => candidate.id === record.id);
    if (existing >= 0) {
      this.index.records[existing] = record;
    } else {
      this.index.records.push(record);
    }

    writeJson(this.indexPath, this.index);
  }
}
