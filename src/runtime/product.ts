import type { ExportTarget } from '../types/index.js';

export const NEXUS_VERSION = '4.1.0';

export const NEXUS_PHASES = [
  { id: 'design', name: 'Design' },
  { id: 'plan', name: 'Plan' },
  { id: 'execute', name: 'Execute' },
  { id: 'complete', name: 'Complete' }
] as const;

export const NEXUS_SUBSYSTEMS = [
  {
    id: 'memory',
    name: 'Nexus Context Engine',
    description: 'Native tiered context database with recursive retrieval and session compression.'
  },
  {
    id: 'design-suite',
    name: 'Nexus Design Suite',
    description: 'Native UI orchestration with Bold Aesthetic and AI Slop Test protocols.'
  },
  {
    id: 'specialists',
    name: 'Nexus Specialists',
    description: '120+ first-class specialized agents natively integrated into the core roster.'
  }
] as const;

export const DEFAULT_EXPORT_TARGETS: ExportTarget[] = [
  'gemini',
  'codex',
  'claude-code',
  'cursor',
  'opencode'
];

export const CURATED_CORE_REPLACEMENTS = [
  'architect',
  'data_engineer',
  'database_admin',
  'devops_engineer',
  'ml_engineer',
  'technical_writer',
  'performance_engineer',
  'security_engineer',
  'validation_agent',
  'ui_designer'
];
