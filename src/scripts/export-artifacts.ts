import path from 'path';
import { loadRuntimeConfig } from '../runtime/config.js';
import { NexusExporter } from '../runtime/exporter.js';
import { NexusRegistry } from '../runtime/registry.js';

const workspaceRoot = process.cwd();
const config = loadRuntimeConfig(workspaceRoot);
const registry = new NexusRegistry(workspaceRoot).load();
const exporter = new NexusExporter(registry);
const outputRoot = path.join(workspaceRoot, 'dist', 'exports');
const written = exporter.exportAll(outputRoot, config.exportTargets);

process.stdout.write(
  `${JSON.stringify(
    {
      outputRoot,
      files: written
    },
    null,
    2
  )}\n`
);
