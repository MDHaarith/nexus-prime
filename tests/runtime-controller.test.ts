import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { InteractivityGate } from '../src/core/InteractivityGate.js';
import { NexusRuntimeController } from '../src/runtime/controller.js';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import { NexusMemoryService } from '../src/runtime/memory.js';
import { NexusPersistence } from '../src/runtime/persistence.js';
import { NexusRegistry } from '../src/runtime/registry.js';

test('runtime controller completes a 4-phase deterministic run and archives it', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-runtime-'));
  const workspaceRoot = process.cwd();
  const config = loadRuntimeConfig(workspaceRoot, {
    NEXUS_STATE_DIR: tempRoot,
    NEXUS_EXECUTOR_MODE: 'deterministic',
    NEXUS_EXECUTION_MODE: 'sequential'
  });
  const registry = new NexusRegistry(workspaceRoot).load();
  const memory = new NexusMemoryService(config, registry);
  const persistence = new NexusPersistence(config);
  persistence.bootstrap();
  const store = NexusRuntimeController.createStore(config);
  const gate = new InteractivityGate(async () => []);
  const controller = new NexusRuntimeController(config, registry, store, memory, persistence, gate);

  await controller.start();

  const state = store.getState();
  const archiveRoot = path.join(tempRoot, 'runtime', 'archive');

  assert.equal(state.run_status, 'completed');
  assert.equal(state.phases?.length, 4);
  assert.ok(fs.existsSync(path.join(tempRoot, 'memory', 'index.json')));
  assert.ok(fs.readdirSync(archiveRoot).length > 0);
});

test('resumeFromCheckpoint with unknown graphId falls back to fresh start', async () => {
  const tempRoot2 = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-resume-'));
  const workspaceRoot = process.cwd();
  const config = loadRuntimeConfig(workspaceRoot, {
    NEXUS_STATE_DIR: tempRoot2,
    NEXUS_EXECUTOR_MODE: 'deterministic',
    NEXUS_EXECUTION_MODE: 'sequential'
  });
  const registry = new NexusRegistry(workspaceRoot).load();
  const memory = new NexusMemoryService(config, registry);
  const persistence = new NexusPersistence(config);
  persistence.bootstrap();
  const store = NexusRuntimeController.createStore(config);
  const gate = new InteractivityGate(async () => []);
  const controller = new NexusRuntimeController(config, registry, store, memory, persistence, gate);

  // Should fall back to a fresh run when graphId is not found
  await controller.resumeFromCheckpoint('nonexistent-graph-id-12345');

  const state = store.getState();
  assert.equal(state.run_status, 'completed');
  assert.equal(state.phases?.length, 4);
});

