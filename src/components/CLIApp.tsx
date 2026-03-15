import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import { ProgressTracker } from './ProgressTracker.js';
import { TaskLogs } from './TaskLogs.js';
import { QuestionOverlay } from './QuestionOverlay.js';
import type { AskUserPayload, OrchestrationState, UserAnswer } from '../types/index.js';
import { createNexusRuntime } from '../runtime/createRuntime.js';
import type { LogEntry } from '../core/Logger.js';

export function CLIApp() {
  const [runtime] = useState(() => createNexusRuntime(process.cwd()));
  const [state, setState] = useState<OrchestrationState>(runtime.store.getState());
  const [logs, setLogs] = useState<string[]>([]);
  const [promptState, setPromptState] = useState<{
    payload: AskUserPayload;
    resolve: (answers: UserAnswer[]) => void;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const format = (entry: LogEntry): string => {
      const agent = entry.agent && entry.agent !== 'system' ? `[${entry.agent}] ` : '';
      return `${entry.timestamp} ${entry.level} ${agent}${entry.message}`;
    };

    setLogs(runtime.logger.getEntries().map(format));

    const unsubscribeState = runtime.store.subscribe((nextState) => {
      setState(nextState);
    });

    const unsubscribeLogs = runtime.logger.subscribe((entry) => {
      setLogs((current) => [...current, format(entry)]);
    });

    runtime.interactivity.setPromptHandler((payload) => {
      runtime.store.setRunStatus('awaiting_input');
      return new Promise((resolve) => {
        setPromptState({ payload, resolve });
      });
    });

    runtime.controller.start().catch((runtimeError) => {
      setError(runtimeError instanceof Error ? runtimeError.message : String(runtimeError));
    });

    return () => {
      unsubscribeState();
      unsubscribeLogs();
    };
  }, [runtime]);

  const handleAnswerSubmit = (answers: UserAnswer[]) => {
    if (!promptState) {
      return;
    }

    promptState.resolve(answers);
    setPromptState(null);
    runtime.store.setRunStatus('running');
  };

  const currentTask = state.tasks.find((task) => task.status === 'running') || null;
  const registrySummary = state.metadata.registrySummary as
    | {
        commands: number;
        agents: number;
        skills: number;
        specialistPacks: number;
        designCommands: number;
        memoryCommands: number;
      }
    | undefined;
  const memoryStatus = state.metadata.memoryStatus as { backend: string; records: number } | undefined;

  return (
    <Box flexDirection="column" minHeight={24} width={108}>
      <Box paddingX={1} marginBottom={1}>
        <Text bold color="white" backgroundColor="blue"> Nexus-Prime CLI </Text>
        <Text dimColor> v{runtime.version}</Text>
        <Text color="cyan"> 4-Phase Assimilation Runtime</Text>
      </Box>

      <Box paddingX={1} marginBottom={1} flexDirection="column">
        <Text>
          Session <Text bold>{state.session_id}</Text> · Status <Text color="yellow">{state.run_status || 'idle'}</Text> · Objective <Text color="white">{String(state.metadata.objective || runtime.config.objective)}</Text>
        </Text>
        <Text dimColor>
          Nexus Memory: {memoryStatus?.backend || runtime.config.memory.backend} ({memoryStatus?.records || 0} records) ·
          Design Suite: {registrySummary?.designCommands || runtime.registry.designSuiteCommandIds.length} commands ·
          Specialist Packs: {registrySummary?.specialistPacks || runtime.registry.specialistPacks.length}
        </Text>
        <Text dimColor>
          Registry: {registrySummary?.commands || runtime.registry.commands.length} commands · {registrySummary?.agents || runtime.registry.agents.length} agents · {registrySummary?.skills || runtime.registry.skills.length} skills
        </Text>
        {error ? <Text color="red">Runtime error: {error}</Text> : null}
      </Box>

      <Box flexDirection="row" flexGrow={1}>
        <Box width="40%" marginRight={1}>
          <ProgressTracker state={state} />
        </Box>
        <Box width="60%">
          <TaskLogs task={currentTask} logs={logs} />
        </Box>
      </Box>

      {promptState ? (
        <Box marginTop={1}>
          <QuestionOverlay payload={promptState.payload} onSubmit={handleAnswerSubmit} />
        </Box>
      ) : (
        <Box marginTop={1} paddingX={1}>
          <Text dimColor>Press Ctrl+C to exit. Provider exports target: {runtime.config.exportTargets.join(', ')}.</Text>
        </Box>
      )}
    </Box>
  );
}
