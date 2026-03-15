import test from 'node:test';
import assert from 'node:assert/strict';
import { NexusRegistry } from '../src/runtime/registry.js';

test('registry exposes assimilated design, memory, and specialist pack surfaces', () => {
  const registry = new NexusRegistry(process.cwd()).load();

  assert.ok(registry.commands.some((command) => command.id === 'design.audit'));
  assert.ok(registry.commands.some((command) => command.id === 'memory.status'));
  assert.ok(registry.skills.some((skill) => skill.id === 'nexus-design-suite'));
  assert.ok(registry.agents.some((agent) => agent.id === 'data_engineer'));
  assert.ok(registry.specialistPacks.length > 20);
});
