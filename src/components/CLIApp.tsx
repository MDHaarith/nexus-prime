import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ProgressTracker } from './ProgressTracker.js';
import { TaskLogs } from './TaskLogs.js';
import { QuestionOverlay } from './QuestionOverlay.js';
import { ValidationDashboard } from '../validator/index.js';
import type { OrchestrationState, AskUserPayload, UserAnswer } from '../types/index.js';
import { TaskStore } from '../core/TaskStore.js';
import { InteractivityGate } from '../core/InteractivityGate.js';

export interface CLIAppProps {
  store: TaskStore;
  gate: InteractivityGate;
}

export function CLIApp({ store, gate }: CLIAppProps) {
  const [state, setState] = useState<OrchestrationState>(store.getState());
  const [logs, setLogs] = useState<string[]>([]);
  
  const [activePrompt, setActivePrompt] = useState<{
    payload: AskUserPayload;
    resolve: (answers: UserAnswer[]) => void;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = store.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, [store]);

  useEffect(() => {
    gate.setPromptHandler((payload: AskUserPayload) => {
      return new Promise<UserAnswer[]>((resolve) => {
        setActivePrompt({ payload, resolve });
      });
    });
  }, [gate]);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args: any[]) => {
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      setLogs(prev => [...prev.slice(-49), msg]);
    };
    
    console.error = (...args: any[]) => {
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      setLogs(prev => [...prev.slice(-49), `[ERROR] ${msg}`]);
    };
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const handleAnswersSubmit = (answers: UserAnswer[]) => {
    if (activePrompt) {
      activePrompt.resolve(answers);
      setActivePrompt(null);
    }
  };

  const activeTask = state.tasks?.find(t => t.status === 'running') || 
                     state.tasks?.[state.tasks.length - 1] || 
                     null;

  return (
    <Box flexDirection="column" minHeight={20} width={80}>
      <Box paddingX={1} marginBottom={1}>
        <Text bold color="white" backgroundColor="blue"> Nexus-Enterprise CLI </Text>
        <Text dimColor> v4.1.0</Text>
      </Box>

      <Box flexDirection="row" flexGrow={1}>
        <Box width="35%" marginRight={1}>
          <ProgressTracker state={state} />
        </Box>
        <Box width="65%">
          <TaskLogs task={activeTask} logs={logs} />
        </Box>
      </Box>

      {state.comparison && (
        <Box marginTop={1} paddingX={1}>
          <ValidationDashboard comparison={state.comparison} />
        </Box>
      )}

      {activePrompt ? (
        <Box marginTop={1}>
           <QuestionOverlay payload={activePrompt.payload} onSubmit={handleAnswersSubmit} />
        </Box>
      ) : (
        <Box marginTop={1} paddingX={1}>
           <Text dimColor>Press Ctrl+C to exit.</Text>
        </Box>
      )}
    </Box>
  );
}
