import React from 'react';
import { Box, Text } from 'ink';
import type { OrchestrationState } from '../types/index.js';

interface ProgressTrackerProps {
  state: OrchestrationState;
}

export function ProgressTracker({ state }: ProgressTrackerProps) {
  const { phases = [], current_phase } = state;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="blue" padding={1} width="100%">
      <Text bold color="cyan">Progress Tracker</Text>
      <Box flexDirection="column" marginTop={1}>
        {phases.length === 0 ? (
          <Text dimColor>No phases initialized.</Text>
        ) : (
          phases.map((phase, index) => {
            const isCurrent = phase.id === current_phase;
            const prefix = isCurrent ? '▶' : ' ';
            let statusColor = 'gray';
            if (phase.status === 'completed') statusColor = 'green';
            if (phase.status === 'running') statusColor = 'yellow';
            if (phase.status === 'failed') statusColor = 'red';
            const completedTasks = phase.tasks.filter((task) => task.status === 'completed').length;

            return (
              <Box key={phase.id} flexDirection="column" marginBottom={1}>
                <Box flexDirection="row">
                  <Text color="white">{prefix} </Text>
                  <Text color={statusColor}>
                    Phase {index + 1}: {phase.name} [{phase.status}]
                  </Text>
                </Box>
                <Text dimColor>
                  Tasks: {completedTasks}/{phase.tasks.length}
                  {phase.objective ? ` · ${phase.objective}` : ''}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}
