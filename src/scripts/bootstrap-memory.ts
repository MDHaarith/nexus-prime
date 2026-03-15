import { loadRuntimeConfig } from '../runtime/config.js';
import { NexusMemoryService } from '../runtime/memory.js';
import { NexusRegistry } from '../runtime/registry.js';

const workspaceRoot = process.cwd();
const config = loadRuntimeConfig(workspaceRoot);
const registry = new NexusRegistry(workspaceRoot).load();
const memory = new NexusMemoryService(config, registry);
const status = memory.bootstrap();

process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
