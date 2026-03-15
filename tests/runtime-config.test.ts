import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRuntimeConfig } from '../src/runtime/config.js';

test('loadRuntimeConfig parses execution, export, and memory settings', () => {
  const config = loadRuntimeConfig('/tmp/nexus', {
    NEXUS_STATE_DIR: '/tmp/nexus/.state',
    NEXUS_EXECUTION_MODE: 'parallel',
    NEXUS_EXECUTOR_MODE: 'gemini-cli',
    NEXUS_EXPORT_TARGETS: 'gemini,codex',
    NEXUS_MEMORY_BACKEND: 'nexus-memory-test',
    NEXUS_MEMORY_AUTO_INDEX: 'false'
  });

  assert.equal(config.stateDir, '/tmp/nexus/.state');
  assert.equal(config.executionMode, 'parallel');
  assert.equal(config.executorMode, 'gemini-cli');
  assert.deepEqual(config.exportTargets, ['gemini', 'codex']);
  assert.equal(config.memory.backend, 'nexus-memory-test');
  assert.equal(config.memory.autoIndex, false);
});
