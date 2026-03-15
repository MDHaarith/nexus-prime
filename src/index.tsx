import React from 'react';
import { render } from 'ink';
import { CLIApp } from './components/CLIApp.js';
import { TaskStore } from './core/TaskStore.js';
import { ExecutionBus } from './core/ExecutionBus.js';
import { SmartRouter } from './core/SmartRouter.js';
import { InteractivityGate } from './core/InteractivityGate.js';
import { Orchestrator } from './core/Orchestrator.js';
import { OrchestrationState } from './types/index.js';
import { ValidationEngine } from './validator/index.js';

const initialState: OrchestrationState = {
  session_id: `session-${Date.now()}`,
  task: process.env.NEXUS_TASK || 'Dynamic Task Execution',
  status: 'idle',
  current_phase: 'INIT',
  tasks: [],
  phases: [],
  metadata: {},
  execution_mode: 'sequential'
};

const store = new TaskStore(initialState);
const executionBus = new ExecutionBus(store);
const smartRouter = new SmartRouter();
const interactivityGate = new InteractivityGate();

const validationEngine = ValidationEngine.getInstance();
validationEngine.initialize(initialState.task || '').catch(console.error);

const orchestrator = new Orchestrator(store, executionBus, smartRouter, interactivityGate);

// Start the workflow
orchestrator.design().catch(console.error);

render(<CLIApp store={store} gate={interactivityGate} />);
