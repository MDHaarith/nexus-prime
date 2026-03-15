import fs from 'fs';
import path from 'path';
import type {
  AgentDefinition,
  CommandDefinition,
  RegistrySnapshot,
  SkillDefinition,
  SpecialistPackDefinition
} from '../types/index.js';
import { CURATED_CORE_REPLACEMENTS } from './product.js';
import { parseFrontmatter, parseSimpleToml, relativeCommandId, slugify } from './parsers.js';

function listFilesRecursive(root: string, matcher: (filePath: string) => boolean): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }

  const output: string[] = [];
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (matcher(fullPath)) {
        output.push(fullPath);
      }
    }
  }

  return output.sort();
}

function takeCapabilities(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- ') || line.startsWith('* '))
    .slice(0, 5)
    .map((line) => line.replace(/^[-*] /, '').replace(/\*\*/g, '').trim());
}

export class NexusRegistry {
  constructor(private readonly workspaceRoot: string) {}

  public load(): RegistrySnapshot {
    const commands = this.loadCommands();
    const agents = this.loadAgents();
    const skills = this.loadSkills();
    const specialistPacks = this.loadSpecialistPacks();

    const designSuiteCommandIds = ['design.adapt', 'design.animate', 'design.audit', 'design.critique', 'design.normalize', 'design.polish'];
    const memoryCommandIds = ['memory.status', 'memory.search', 'memory.sessions', 'memory.resources', 'memory.skills'];

    for (const id of designSuiteCommandIds) {
      commands.push({
        id,
        name: id,
        description: `Nexus Design Suite command: ${id}`,
        prompt: '',
        path: 'nexus-design-suite',
        namespace: 'core',
        source: 'nexus-core',
        aliases: [id]
      });
    }

    for (const id of memoryCommandIds) {
      commands.push({
        id,
        name: id,
        description: `Nexus Memory command: ${id}`,
        prompt: '',
        path: 'nexus-memory',
        namespace: 'core',
        source: 'nexus-core',
        aliases: [id]
      });
    }

    const aliases = this.buildAliasMap(commands, agents, skills);

    return {
      agents,
      commands,
      skills,
      specialistPacks,
      aliases,
      curatedCoreReplacements: [...CURATED_CORE_REPLACEMENTS],
      designSuiteCommandIds,
      memoryCommandIds
    };
  }

  private loadCommands(): CommandDefinition[] {
    const root = path.join(this.workspaceRoot, 'commands', 'nexus');
    const files = listFilesRecursive(root, (filePath) => filePath.endsWith('.toml'));

    return files.map((filePath) => {
      const relative = relativeCommandId(root, filePath);
      const values = parseSimpleToml(fs.readFileSync(filePath, 'utf8'));
      const basename = path.basename(filePath, '.toml');
      const namespace = relative.namespace;
      const aliases = new Set<string>([
        relative.id,
        basename,
        basename.replace(/-/g, '_')
      ]);

      return {
        id: relative.id,
        name: basename,
        description: values.description || basename,
        prompt: values.prompt || '',
        path: filePath,
        namespace,
        source: 'nexus-core',
        aliases: [...aliases]
      };
    });
  }

  private loadAgents(): AgentDefinition[] {
    const root = path.join(this.workspaceRoot, 'agents');
    const coreFiles = fs.readdirSync(root).filter(f => f.endsWith('.md'));
    const specialistDir = path.join(root, 'specialists');
    const specialistFiles = fs.existsSync(specialistDir) 
      ? fs.readdirSync(specialistDir).filter(f => f.endsWith('.md') && !f.toLowerCase().includes('readme'))
      : [];

    const agents: AgentDefinition[] = [];

    // Load Core Agents
    for (const file of coreFiles) {
      const filePath = path.join(root, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const document = parseFrontmatter(content);
      const id = path.basename(file, '.md');
      const displayName = document.attributes.name || id;
      
      agents.push({
        id,
        displayName,
        description: document.attributes.description || displayName,
        path: filePath,
        model: document.attributes.model || 'gemini-3.1-pro-preview',
        kind: document.attributes.kind || 'local',
        source: 'nexus-core',
        capabilities: takeCapabilities(document.body),
        aliases: [id, id.replace(/_/g, '-'), `nexus-${id.replace(/_/g, '-')}`]
      });
    }

    // Load Specialist Agents (Promoted from Agency)
    for (const file of specialistFiles) {
      const filePath = path.join(specialistDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const document = parseFrontmatter(content);
      const id = path.basename(file, '.md'); // e.g. nexus-engineering-backend-architect
      const displayName = document.attributes.name || id;
      
      agents.push({
        id,
        displayName,
        description: document.attributes.description || displayName,
        path: filePath,
        model: 'gemini-3.1-pro-preview',
        kind: 'local',
        source: 'nexus-specialist',
        capabilities: takeCapabilities(document.body),
        aliases: [id, id.replace('nexus-', ''), id.replace(/nexus-/, '').replace(/-/g, '_')]
      });
    }

    return agents;
  }

  private loadSkills(): SkillDefinition[] {
    const root = path.join(this.workspaceRoot, 'skills');
    const files = listFilesRecursive(root, (filePath) => filePath.endsWith(`${path.sep}SKILL.md`) || filePath.endsWith('/SKILL.md'));

    return files.map((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const document = parseFrontmatter(content);
      const id = path.basename(path.dirname(filePath));
      const referenceRoot = path.join(path.dirname(filePath), 'reference');
      const referencePaths = fs.existsSync(referenceRoot)
        ? listFilesRecursive(referenceRoot, () => true)
        : [];

      return {
        id,
        name: document.attributes.name || id,
        description: document.attributes.description || document.body.split('\n')[0] || id,
        path: filePath,
        source: 'nexus-core',
        referencePaths,
        aliases: [id, id.replace(/^nexus-/, ''), slugify(document.attributes.name || id)]
      };
    });
  }

  private loadSpecialistPacks(): SpecialistPackDefinition[] {
    const root = path.join(this.workspaceRoot, 'agents', 'specialists');
    if (!fs.existsSync(root)) return [];

    const files = fs.readdirSync(root).filter(f => f.endsWith('.md'));

    return files.map((file) => {
      const filePath = path.join(root, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const document = parseFrontmatter(content);
      const title = document.attributes.name || path.basename(file, '.md');
      const id = `specialist.native.${slugify(title)}`;

      return {
        id,
        title,
        category: 'native',
        description: document.attributes.description || title,
        path: filePath,
        featured: true
      };
    });
  }

  private buildAliasMap(
    commands: CommandDefinition[],
    agents: AgentDefinition[],
    skills: SkillDefinition[]
  ): Record<string, string> {
    const aliases: Record<string, string> = {};

    for (const command of commands) {
      for (const alias of command.aliases) {
        aliases[alias] = command.id;
      }
    }

    for (const agent of agents) {
      for (const alias of agent.aliases) {
        aliases[alias] = agent.id;
      }
    }

    for (const skill of skills) {
      for (const alias of skill.aliases) {
        aliases[alias] = skill.id;
      }
    }

    return aliases;
  }
}
