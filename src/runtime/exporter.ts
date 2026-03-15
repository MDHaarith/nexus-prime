import fs from 'fs';
import path from 'path';
import type { ExportTarget, RegistrySnapshot } from '../types/index.js';
import { NEXUS_VERSION } from './product.js';

interface ExportLayout {
  root: string;
  manifest: string;
  summary: string;
}

const TARGET_LAYOUTS: Record<ExportTarget, ExportLayout> = {
  gemini: {
    root: '.gemini/extensions/nexus-prime',
    manifest: 'nexus-manifest.json',
    summary: 'GEMINI.md'
  },
  codex: {
    root: '.codex/skills/nexus-prime',
    manifest: 'registry.json',
    summary: 'SKILL.md'
  },
  'claude-code': {
    root: '.claude/nexus-prime',
    manifest: 'registry.json',
    summary: 'CLAUDE.md'
  },
  cursor: {
    root: '.cursor/rules/nexus-prime',
    manifest: 'registry.json',
    summary: 'RULES.md'
  },
  opencode: {
    root: '.opencode/nexus-prime',
    manifest: 'registry.json',
    summary: 'README.md'
  }
};

function ensureDir(directory: string): void {
  fs.mkdirSync(directory, { recursive: true });
}

export class NexusExporter {
  constructor(private readonly registry: RegistrySnapshot) {}

  public exportAll(outputRoot: string, targets: ExportTarget[]): string[] {
    const written: string[] = [];

    for (const target of targets) {
      const layout = TARGET_LAYOUTS[target];
      const targetRoot = path.join(outputRoot, target, layout.root);
      ensureDir(targetRoot);

      const manifestPath = path.join(targetRoot, layout.manifest);
      const summaryPath = path.join(targetRoot, layout.summary);

      fs.writeFileSync(
        manifestPath,
        JSON.stringify(
          {
            product: 'nexus-prime',
            version: NEXUS_VERSION,
            target,
            commands: this.registry.commands.map((command) => ({
              id: command.id,
              description: command.description
            })),
            agents: this.registry.agents.map((agent) => ({
              id: agent.id,
              description: agent.description
            })),
            specialistPacks: this.registry.specialistPacks.map((pack) => ({
              id: pack.id,
              category: pack.category
            }))
          },
          null,
          2
        ),
        'utf8'
      );

      fs.writeFileSync(
        summaryPath,
        [
          `# Nexus-Prime ${NEXUS_VERSION}`,
          '',
          `Target: ${target}`,
          '',
          'This bundle was generated from the canonical Nexus registry.',
          '',
          `Commands: ${this.registry.commands.length}`,
          `Agents: ${this.registry.agents.length}`,
          `Specialist Packs: ${this.registry.specialistPacks.length}`
        ].join('\n'),
        'utf8'
      );

      written.push(manifestPath, summaryPath);
    }

    return written;
  }
}
