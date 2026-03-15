import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { NexusExporter } from '../src/runtime/exporter.js';
import { NexusRegistry } from '../src/runtime/registry.js';

test('exporter writes Nexus-branded provider bundles', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'nexus-export-'));
  const registry = new NexusRegistry(process.cwd()).load();
  const exporter = new NexusExporter(registry);
  const written = exporter.exportAll(tempRoot, ['gemini', 'codex']);

  assert.ok(written.some((filePath) => filePath.includes('.gemini/extensions/nexus-prime')));
  assert.ok(written.some((filePath) => filePath.includes('.codex/skills/nexus-prime')));
  assert.ok(fs.existsSync(path.join(tempRoot, 'gemini', '.gemini', 'extensions', 'nexus-prime', 'nexus-manifest.json')));
  assert.ok(fs.existsSync(path.join(tempRoot, 'codex', '.codex', 'skills', 'nexus-prime', 'registry.json')));
});
