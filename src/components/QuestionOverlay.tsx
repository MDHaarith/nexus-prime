import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AskUserPayload, UserAnswer } from '../types/index.js';

interface QuestionOverlayProps {
  payload: AskUserPayload;
  onSubmit: (answers: UserAnswer[]) => void;
}

export function QuestionOverlay({ payload, onSubmit }: QuestionOverlayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [input, setInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [cursorIndex, setCursorIndex] = useState(0);

  const question = payload.questions[currentIndex];

  useInput((char, key) => {
    if (!question) return;

    if (question.type === 'text') {
      if (key.return) {
        handleNext(input);
      } else if (key.backspace || key.delete) {
        setInput((prev) => prev.slice(0, -1));
      } else if (char) {
        setInput((prev) => prev + char);
      }
    } else if (question.type === 'yesno') {
      if (key.return) {
        const lower = input.toLowerCase();
        if (lower === 'y' || lower === 'yes') handleNext(true);
        else if (lower === 'n' || lower === 'no') handleNext(false);
        else setInput('');
      } else if (char === 'y' || char === 'n' || char === 'Y' || char === 'N') {
        setInput(char.toLowerCase());
      } else if (key.backspace || key.delete) {
        setInput('');
      }
    } else if (question.type === 'choice') {
      const optionsCount = question.options?.length || 0;
      
      if (key.upArrow) {
        setCursorIndex((prev) => (prev > 0 ? prev - 1 : optionsCount - 1));
      } else if (key.downArrow) {
        setCursorIndex((prev) => (prev < optionsCount - 1 ? prev + 1 : 0));
      } else if (char === ' ') {
        if (question.multiSelect) {
          setSelectedOptions((prev) => 
            prev.includes(cursorIndex) ? prev.filter(i => i !== cursorIndex) : [...prev, cursorIndex]
          );
        } else {
          setSelectedOptions([cursorIndex]);
        }
      } else if (key.return) {
        if (question.multiSelect) {
          const selectedLabels = selectedOptions.map(i => question.options![i].label);
          handleNext(selectedLabels);
        } else {
          if (selectedOptions.length === 0) {
            handleNext(question.options![cursorIndex].label);
          } else {
            handleNext(question.options![selectedOptions[0]].label);
          }
        }
      }
    }
  });

  const handleNext = (answer: UserAnswer) => {
    const newAnswers = [...answers, answer];
    if (currentIndex < payload.questions.length - 1) {
      setAnswers(newAnswers);
      setCurrentIndex(currentIndex + 1);
      setInput('');
      setSelectedOptions([]);
      setCursorIndex(0);
    } else {
      onSubmit(newAnswers);
    }
  };

  if (!question) return null;

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="magenta" padding={1} width="80%" alignSelf="center">
      <Text bold color="magenta">Agent Intervention Required ({currentIndex + 1}/{payload.questions.length})</Text>
      <Box flexDirection="row" marginBottom={1}>
        <Text color="black" backgroundColor="cyan"> {question.header} </Text>
      </Box>
      <Box marginBottom={1}><Text color="white">{question.question}</Text></Box>
      
      {question.type === 'text' && (
        <Box flexDirection="column">
          <Box flexDirection="row">
            <Text color="cyan">❯ </Text>
            <Text>{input}</Text>
            <Text><Text color="gray">█</Text></Text>
          </Box>
          <Box marginTop={1}><Text dimColor>(Type your answer and press Enter. {question.placeholder || ''})</Text></Box>
        </Box>
      )}

      {question.type === 'yesno' && (
        <Box flexDirection="column">
          <Box flexDirection="row">
             <Text color="cyan">❯ </Text>
             <Text>{input}</Text>
             <Text><Text color="gray">█</Text></Text>
          </Box>
          <Box marginTop={1}><Text dimColor>(Type y/n and press Enter)</Text></Box>
        </Box>
      )}

      {question.type === 'choice' && question.options && (
        <Box flexDirection="column">
          {question.options.map((opt, i) => {
            const isCursor = i === cursorIndex;
            const isSelected = selectedOptions.includes(i);
            const prefix = isCursor ? '❯ ' : '  ';
            const checkbox = question.multiSelect ? (isSelected ? '[x] ' : '[ ] ') : (isSelected ? '(•) ' : '( ) ');
            return (
              <Box key={i} flexDirection="row">
                 <Text color="cyan">{prefix}</Text>
                 <Text color={isSelected ? 'green' : 'white'}>{checkbox}{opt.label}</Text>
                 <Text dimColor> - {opt.description}</Text>
              </Box>
            );
          })}
          <Box marginTop={1}>
            <Text dimColor>
               (Use ↑/↓ arrows to move, Space to select, Enter to confirm)
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
