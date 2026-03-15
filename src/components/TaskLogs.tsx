import React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../types/index.js';

interface TaskLogsProps {
  task: Task | null;
  logs: string[];
}

export function TaskLogs({ task, logs }: TaskLogsProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1} width="100%" flexGrow={1}>
      <Text bold color="green">Execution Stream</Text>
      {task ? (
        <Box flexDirection="column" marginTop={1} marginBottom={1}>
          <Text color="cyan">Current Task: <Text bold color="white">{task.name}</Text></Text>
          <Text dimColor>Agent: {task.agent} | Status: {task.status} | Retries: {task.retry_count || 0}</Text>
          <Text dimColor>{task.description}</Text>
        </Box>
      ) : (
        <Box marginTop={1} marginBottom={1}>
          <Text dimColor>No active task. Runtime is waiting for the next phase transition.</Text>
        </Box>
      )}
      
      <Box flexDirection="column" height={12} overflowY="hidden">
        {logs.length === 0 ? (
          <Text dimColor>No logs available.</Text>
        ) : (
          logs.slice(-12).map((log, index) => (
            <Text key={index} wrap="wrap">{log}</Text>
          ))
        )}
      </Box>
    </Box>
  );
}
