import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface Question {
  id: string;
  text: string;
  agent: string;
}

interface QuestionOverlayProps {
  question: Question | null;
  onSubmit: (answer: string) => void;
}

export function QuestionOverlay({ question, onSubmit }: QuestionOverlayProps) {
  const [input, setInput] = useState('');

  useInput((char, key) => {
    if (!question) return;
    
    if (key.return) {
      onSubmit(input);
      setInput('');
    } else if (key.backspace || key.delete) {
      setInput((prev) => prev.slice(0, -1));
    } else if (char) {
      setInput((prev) => prev + char);
    }
  });

  if (!question) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="magenta"
      padding={1}
      width="80%"
      alignSelf="center"
    >
      <Text bold color="magenta">Agent Intervention Required</Text>
      <Text color="yellow" bold>{question.agent} <Text color="white">asks:</Text></Text>
      <Box marginTop={1} marginBottom={1}><Text color="white">{question.text}</Text></Box>
      
      <Box flexDirection="row">
        <Text color="cyan">❯ </Text>
        <Text>{input}</Text>
        <Text><Text color="gray">█</Text></Text>
      </Box>
      <Box marginTop={1}><Text dimColor>(Press Enter to submit)</Text></Box>
    </Box>
  );
}
