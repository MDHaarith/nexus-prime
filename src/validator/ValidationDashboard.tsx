import React from 'react';
import { Box, Text } from 'ink';
import type { ComparativeMetrics } from '../types/index.js';

export interface ValidationDashboardProps {
  comparison?: ComparativeMetrics;
}

export function ValidationDashboard({ comparison }: ValidationDashboardProps) {
  if (!comparison) {
    return null;
  }

  const { current, baseline, deltas } = comparison;

  const formatCost = (cost: number) => `$${cost.toFixed(3)}`;
  
  const formatDelta = (delta: number, isGoodWhenPositive: boolean, isInteger: boolean = false) => {
    if (delta === 0) return <Text color="gray">-</Text>;
    const isPositive = delta > 0;
    const isGood = isGoodWhenPositive ? isPositive : !isPositive;
    const color = isGood ? 'green' : 'red';
    const symbol = isPositive ? '▲' : '▼';
    
    let formattedVal = Math.abs(delta).toFixed(isInteger ? 0 : 1);

    return <Text color={color}>{symbol} {formattedVal}%</Text>;
  };

  return (
    <Box borderStyle="round" borderColor="blue" padding={1} flexDirection="column">
      <Text bold color="cyan">Validation Metrics Comparison</Text>
      
      <Box flexDirection="row" marginTop={1}>
        <Box flexDirection="column" width="30%">
          <Text dimColor>Metric</Text>
          <Text>Cost</Text>
          <Text>Quality</Text>
          <Text>Usage</Text>
        </Box>
        
        <Box flexDirection="column" width="25%">
          <Text dimColor>Current</Text>
          <Text>{formatCost(current.cost)}</Text>
          <Text>{current.quality_score.toFixed(1)}</Text>
          <Text>{(current.input_tokens + current.output_tokens).toString()}</Text>
        </Box>

        {baseline ? (
          <Box flexDirection="column" width="25%">
            <Text dimColor>Baseline</Text>
            <Text>{formatCost(baseline.cost)}</Text>
            <Text>{baseline.quality_score.toFixed(1)}</Text>
            <Text>{(baseline.input_tokens + baseline.output_tokens).toString()}</Text>
          </Box>
        ) : (
          <Box flexDirection="column" width="25%">
            <Text dimColor>Baseline</Text>
            <Text color="gray">N/A</Text>
            <Text color="gray">N/A</Text>
            <Text color="gray">N/A</Text>
          </Box>
        )}

        <Box flexDirection="column" width="20%">
          <Text dimColor>Delta</Text>
          <Text>{formatDelta(deltas.cost, false)}</Text>
          <Text>{formatDelta(deltas.quality, true)}</Text>
          <Text>{formatDelta(deltas.usage, false, true)}</Text>
        </Box>
      </Box>
    </Box>
  );
}
