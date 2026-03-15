import type { Phase, RegistrySnapshot, RuntimeConfig, Task } from '../types/index.js';
import { NEXUS_PHASES } from './product.js';

function buildTask(
  phaseId: string,
  id: string,
  name: string,
  agent: string,
  description: string,
  dependencies: string[] = [],
  input: Record<string, unknown> = {}
): Task {
  return {
    id,
    name,
    agent,
    description,
    status: 'pending',
    dependencies,
    input,
    phase_id: phaseId,
    retry_count: 0
  };
}

export function createAssimilationPlan(config: RuntimeConfig, registry: RegistrySnapshot): Phase[] {
  const designTasks = [
    buildTask(
      'design',
      'design-suite-foundation',
      'Establish Nexus Design Standards',
      'ui_designer',
      'Define the native Nexus Design Suite standards, including the Bold Aesthetic and AI Slop Test protocols.'
    ),
    buildTask(
      'design',
      'memory-surface-design',
      'Configure Nexus Context Engine',
      'architect',
      'Define the native Nexus Context Engine surface with tiered loading and recursive retrieval.'
    ),
    buildTask(
      'design',
      'specialist-pack-curation',
      'Curate Specialist Pack Core',
      'nexus_prime',
      `Select the default core roster from ${registry.specialistPacks.length} assimilated specialist packs.`
    )
  ];

  const planTasks = [
    buildTask(
      'plan',
      'registry-unification',
      'Unify Product Registry',
      'orchestrator_manager',
      'Create a canonical Nexus registry spanning agents, commands, skills, memory surfaces, and specialist pack metadata.'
    ),
    buildTask(
      'plan',
      'command-surface-plan',
      'Finalize Command Surface',
      'technical_writer',
      'Document the 4-phase runtime, the design namespace, and the Nexus Memory admin commands.',
      ['registry-unification']
    )
  ];

  const executeTasks = [
    buildTask(
      'execute',
      'runtime-controller',
      'Wire Runtime Controller',
      'coder',
      'Replace the mock CLI with a runtime-backed orchestration controller, persistent state, and a live execution bus.'
    ),
    buildTask(
      'execute',
      'memory-bootstrap',
      'Bootstrap Nexus Memory',
      'devops_engineer',
      'Provision Nexus Memory with persisted session snapshots, health checks, and startup indexing.',
      [],
      {
        memoryBackend: config.memory.backend
      }
    ),
    buildTask(
      'execute',
      'specialist-pack-index',
      'Index Specialist Packs',
      'data_engineer',
      'Index the assimilated specialist pack catalog into Nexus Memory for search and runtime discovery.'
    ),
    buildTask(
      'execute',
      'export-pipeline',
      'Build Provider Exports',
      'generalist',
      `Generate Nexus-branded exports for ${config.exportTargets.join(', ')} from the unified registry.`,
      ['runtime-controller']
    )
  ];

  const completeTasks = [
    buildTask(
      'complete',
      'docs-release',
      'Refresh README and Release Metadata',
      'technical_writer',
      'Rewrite README and release metadata to match the Nexus 4-phase model and native subsystem branding.'
    ),
    buildTask(
      'complete',
      'release-validation',
      'Validate Assimilation Release',
      'validation_agent',
      'Verify version alignment, registry consistency, memory bootstrap, export outputs, and roster coverage.',
      ['docs-release']
    )
  ];

  return [
    {
      id: NEXUS_PHASES[0].id,
      name: NEXUS_PHASES[0].name,
      status: 'pending',
      execution_mode: 'parallel',
      objective: 'Assimilate the three embedded subsystems into Nexus-native product surfaces.',
      tasks: designTasks
    },
    {
      id: NEXUS_PHASES[1].id,
      name: NEXUS_PHASES[1].name,
      status: 'pending',
      execution_mode: 'sequential',
      objective: 'Lock the canonical command, agent, and memory surface.',
      tasks: planTasks
    },
    {
      id: NEXUS_PHASES[2].id,
      name: NEXUS_PHASES[2].name,
      status: 'pending',
      execution_mode: config.executionMode,
      objective: 'Execute the product assimilation work and generate export artifacts.',
      tasks: executeTasks
    },
    {
      id: NEXUS_PHASES[3].id,
      name: NEXUS_PHASES[3].name,
      status: 'pending',
      execution_mode: 'sequential',
      objective: 'Validate and package the Nexus-Prime 4.1.0 release.',
      tasks: completeTasks
    }
  ];
}
