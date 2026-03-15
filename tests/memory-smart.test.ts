import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import { NexusMemoryService } from '../src/runtime/memory.js';
import { NexusRegistry } from '../src/runtime/registry.js';
import { Task } from '../src/types/index.js';

test('Nexus Memory getRelevantContext provides smart prerunning context', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-memory-smart-'));
  const config = loadRuntimeConfig(process.cwd(), {
    NEXUS_STATE_DIR: tempRoot
  });
  const registry = new NexusRegistry(process.cwd()).load();
  const memory = new NexusMemoryService(config, registry);
  memory.bootstrap();

  const task: Task = {
    id: 'test-task',
    name: 'Scale architecture',
    agent: 'architect',
    description: 'Scale the backend for high load.',
    status: 'pending',
    dependencies: [],
    input: {
      load: '10x'
    }
  };

  const context = await memory.getRelevantContext(task);
  
  // Should find the native specialist or core agent
  assert.ok(context.includes('### Nexus Memory Context (Pre-run)') || context.includes('### Nexus Context Engine'));
  assert.ok(context.toLowerCase().includes('architect'));
});
