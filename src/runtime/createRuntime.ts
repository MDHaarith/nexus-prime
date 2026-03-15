import { InteractivityGate } from '../core/InteractivityGate.js';
import { Logger } from '../core/Logger.js';
import { TaskStore } from '../core/TaskStore.js';
import { loadRuntimeConfig } from './config.js';
import { NexusRuntimeController } from './controller.js';
import { NexusMemoryService } from './memory.js';
import { NexusPersistence } from './persistence.js';
import { NEXUS_SUBSYSTEMS, NEXUS_VERSION } from './product.js';
import { NexusRegistry } from './registry.js';

export function createNexusRuntime(workspaceRoot: string = process.cwd()) {
  const config = loadRuntimeConfig(workspaceRoot);
  const logger = Logger.getInstance();
  logger.reset();
  logger.setConsoleOutput(config.enableConsoleLogs);

  const registry = new NexusRegistry(workspaceRoot);
  const snapshot = registry.load();
  const persistence = new NexusPersistence(config);
  persistence.bootstrap();
  const restored = persistence.loadActiveSnapshot();
  const store = NexusRuntimeController.createStore(config, restored?.state);
  const interactivity = new InteractivityGate();
  const memory = new NexusMemoryService(config, snapshot);
  const controller = new NexusRuntimeController(config, snapshot, store, memory, persistence, interactivity);

  return {
    version: NEXUS_VERSION,
    config,
    logger,
    registry: snapshot,
    store,
    memory,
    controller,
    interactivity,
    persistence,
    subsystems: [...NEXUS_SUBSYSTEMS]
  };
}
