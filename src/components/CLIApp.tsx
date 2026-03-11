import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ProgressTracker } from './ProgressTracker.js';
import { TaskLogs } from './TaskLogs.js';
import { QuestionOverlay, Question } from './QuestionOverlay.js';
import type { OrchestrationState, Task, Phase } from '../types/index.js';

const mockPhases: Phase[] = [
  { id: 'p1', name: 'Initialization', status: 'completed', tasks: [] },
  { id: 'p2', name: 'UI Framework Design', status: 'running', tasks: [] },
  { id: 'p3', name: 'Implementation', status: 'pending', tasks: [] },
];

const mockTask: Task = {
  id: 't1',
  name: 'Build Reactive CLI',
  agent: 'ui_designer',
  description: 'Create the Ink and React UI components.',
  status: 'running',
  dependencies: []
};

const mockLogs = [
  '[System] Initializing Nexus-Enterprise Workspace...',
  '[Orchestrator] Starting session 2026-03-11-nexus-enterprise-upgrade',
  '[ui_designer] Analyzing requirements for CLIApp.tsx',
  '[ui_designer] Generating React component for TaskLogs.tsx',
  '[ui_designer] Validating type definitions against src/types/index.ts',
];

export function CLIApp() {
  const [state, setState] = useState<OrchestrationState>({
    session_id: 'session-1',
    current_phase: 'p2',
    tasks: [mockTask],
    phases: mockPhases,
    metadata: {}
  });

  const [logs, setLogs] = useState<string[]>(mockLogs);
  const [question, setQuestion] = useState<Question | null>({
    id: 'q1',
    agent: 'ui_designer',
    text: 'Do you want to enable debug mode for the CLI overlay?'
  });

  const handleAnswerSubmit = (answer: string) => {
    setLogs((prev) => [...prev, `[User] Answered: ${answer}`, `[ui_designer] Resuming task...`]);
    setQuestion(null); // Clear the question
  };

  useEffect(() => {
    // Simulate incoming logs if no question is pending
    if (question) return;

    const timer = setInterval(() => {
      setLogs((prev) => [...prev, `[System] Background process heartbeat at ${new Date().toLocaleTimeString()}`]);
    }, 3000);

    return () => clearInterval(timer);
  }, [question]);

  return (
    <Box flexDirection="column" minHeight={20} width={80}>
      <Box paddingX={1} marginBottom={1}>
        <Text bold color="white" backgroundColor="blue"> Nexus-Enterprise CLI </Text>
        <Text dimColor> v4.0.0</Text>
      </Box>

      <Box flexDirection="row" flexGrow={1}>
        <Box width="35%" marginRight={1}>
          <ProgressTracker state={state} />
        </Box>
        <Box width="65%">
          <TaskLogs task={state.tasks[0] || null} logs={logs} />
        </Box>
      </Box>

      {/* If there's an active question, render the overlay prominently below */}
      {question ? (
        <Box marginTop={1}>
           <QuestionOverlay question={question} onSubmit={handleAnswerSubmit} />
        </Box>
      ) : (
        <Box marginTop={1} paddingX={1}>
           <Text dimColor>Press Ctrl+C to exit.</Text>
        </Box>
      )}
    </Box>
  );
}
