import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import { NexusMemoryService } from '../src/runtime/memory.js';
import { NexusRegistry } from '../src/runtime/registry.js';

test('Nexus Memory indexes registry records and can search them', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-memory-'));
  const config = loadRuntimeConfig(process.cwd(), {
    NEXUS_STATE_DIR: tempRoot
  });
  const registry = new NexusRegistry(process.cwd()).load();
  const memory = new NexusMemoryService(config, registry);
  const status = memory.bootstrap();
  const results = memory.search('design suite');

  assert.ok(status.records > 0);
  assert.ok(results.length > 0);
  assert.ok(results.some((result) => result.record.kind === 'skill' || result.record.kind === 'command'));
});
