import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { AskUserPayload, InteractiveQuestion, UserAnswer } from '../types/index.js';

interface QuestionOverlayProps {
  payload: AskUserPayload | null;
  onSubmit: (answers: UserAnswer[]) => void;
}

function defaultValue(question: InteractiveQuestion): UserAnswer {
  if (question.type === 'yesno') {
    return true;
  }
  if (question.type === 'choice') {
    return question.multiSelect ? [] : question.options?.[0]?.label || null;
  }
  return '';
}

export function QuestionOverlay({ payload, onSubmit }: QuestionOverlayProps) {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<UserAnswer[]>([]);
  const [textInput, setTextInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!payload) {
      setQuestionIndex(0);
      setDraftAnswers([]);
      setTextInput('');
      setSelectedIndex(0);
      return;
    }

    setQuestionIndex(0);
    setDraftAnswers(payload.questions.map(defaultValue));
    setTextInput('');
    setSelectedIndex(0);
  }, [payload]);

  const question = payload?.questions[questionIndex] || null;

  useInput((char, key) => {
    if (!question || !payload) {
      return;
    }

    if (question.type === 'text') {
      if (key.return) {
        const answers = [...draftAnswers];
        answers[questionIndex] = textInput.trim();
        advance(answers);
      } else if (key.backspace || key.delete) {
        setTextInput((prev) => prev.slice(0, -1));
      } else if (char) {
        setTextInput((prev) => prev + char);
      }
      return;
    }

    if (question.type === 'yesno') {
      if (char.toLowerCase() === 'y' || key.rightArrow) {
        updateAnswer(true);
      } else if (char.toLowerCase() === 'n' || key.leftArrow) {
        updateAnswer(false);
      } else if (key.return) {
        advance(draftAnswers);
      }
      return;
    }

    if ((key.downArrow || char === 'j') && question.options) {
      setSelectedIndex((prev) => (prev + 1) % question.options!.length);
      return;
    }

    if ((key.upArrow || char === 'k') && question.options) {
      setSelectedIndex((prev) => (prev - 1 + question.options!.length) % question.options!.length);
      return;
    }

    if (char === ' ' && question.multiSelect) {
      const current = Array.isArray(draftAnswers[questionIndex]) ? [...(draftAnswers[questionIndex] as string[])] : [];
      const label = question.options?.[selectedIndex]?.label;
      if (!label) {
        return;
      }
      const existing = current.includes(label);
      const next = existing ? current.filter((item) => item !== label) : [...current, label];
      updateAnswer(next);
      return;
    }

    if (key.return) {
      if (question.multiSelect) {
        const selected = Array.isArray(draftAnswers[questionIndex]) ? draftAnswers[questionIndex] as string[] : [];
        if (selected.length === 0 && question.options?.[selectedIndex]) {
          updateAnswer([question.options[selectedIndex].label]);
        }
        advance([
          ...draftAnswers.slice(0, questionIndex),
          Array.isArray(draftAnswers[questionIndex]) && (draftAnswers[questionIndex] as string[]).length > 0
            ? draftAnswers[questionIndex]
            : [question.options?.[selectedIndex]?.label || ''],
          ...draftAnswers.slice(questionIndex + 1)
        ]);
      } else {
        const label = question.options?.[selectedIndex]?.label || null;
        updateAnswer(label);
        advance([
          ...draftAnswers.slice(0, questionIndex),
          label,
          ...draftAnswers.slice(questionIndex + 1)
        ]);
      }
    }
  });

  const updateAnswer = (answer: UserAnswer) => {
    setDraftAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = answer;
      return next;
    });
  };

  const advance = (answers: UserAnswer[]) => {
    if (!payload) {
      return;
    }
    if (questionIndex >= payload.questions.length - 1) {
      onSubmit(answers);
      return;
    }

    setDraftAnswers(answers);
    setQuestionIndex((prev) => prev + 1);
    setSelectedIndex(0);
    setTextInput('');
  };

  if (!question || !payload) return null;

  const currentAnswer = draftAnswers[questionIndex];

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      padding={1}
      width="80%"
      alignSelf="center"
    >
      <Text bold color="cyan">Nexus Interactivity Gate</Text>
      <Text color="yellow">
        {payload.agent || 'nexus-runtime'} asks: <Text color="white">{question.header}</Text>
      </Text>
      <Box marginTop={1} marginBottom={1}>
        <Text color="white">{question.question}</Text>
      </Box>

      {question.type === 'text' ? (
        <Box flexDirection="row">
          <Text color="cyan">❯ </Text>
          <Text>{textInput || question.placeholder || ''}</Text>
          <Text color="gray">█</Text>
        </Box>
      ) : null}

      {question.type === 'yesno' ? (
        <Box flexDirection="column">
          <Text color={currentAnswer === true ? 'green' : 'white'}>[Y] Yes</Text>
          <Text color={currentAnswer === false ? 'red' : 'white'}>[N] No</Text>
        </Box>
      ) : null}

      {question.type === 'choice' ? (
        <Box flexDirection="column">
          {(question.options || []).map((option, index) => {
            const selected = question.multiSelect
              ? Array.isArray(currentAnswer) && currentAnswer.includes(option.label)
              : currentAnswer === option.label || selectedIndex === index;

            return (
              <Box key={option.label} flexDirection="column" marginBottom={1}>
                <Text color={selected ? 'green' : 'white'}>
                  {selectedIndex === index ? '▶' : ' '} {question.multiSelect ? (selected ? '[x]' : '[ ]') : '( )'} {option.label}
                </Text>
                <Text dimColor>{option.description}</Text>
              </Box>
            );
          })}
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text dimColor>
          Step {questionIndex + 1}/{payload.questions.length} · Press Enter to submit
          {question.type === 'choice' && question.multiSelect ? ' · Space toggles selections' : ''}
        </Text>
      </Box>
    </Box>
  );
}
