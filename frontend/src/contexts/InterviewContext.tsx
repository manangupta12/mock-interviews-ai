import React, { createContext, useContext, useState, ReactNode } from 'react';

export type InterviewStage = 'explanation' | 'coding' | 'followup' | 'complexity' | 'optimization' | 'complete';

export interface Question {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string;
  test_cases: Array<{ input: string; output: string }>;
}

export interface Message {
  speaker: 'user' | 'interviewer';
  message: string;
  timestamp: Date;
}

interface InterviewContextType {
  sessionId: number | null;
  question: Question | null;
  stage: InterviewStage;
  messages: Message[];
  code: string;
  language: string;
  startTime: Date | null;
  setSessionId: (id: number | null) => void;
  setQuestion: (question: Question | null) => void;
  setStage: (stage: InterviewStage) => void;
  addMessage: (message: Message) => void;
  setCode: (code: string) => void;
  setLanguage: (language: string) => void;
  setStartTime: (time: Date | null) => void;
  reset: () => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const InterviewProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [stage, setStage] = useState<InterviewStage>('explanation');
  const [messages, setMessages] = useState<Message[]>([]);
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [startTime, setStartTime] = useState<Date | null>(null);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const reset = () => {
    setSessionId(null);
    setQuestion(null);
    setStage('explanation');
    setMessages([]);
    setCode('');
    setLanguage('python');
    setStartTime(null);
  };

  return (
    <InterviewContext.Provider
      value={{
        sessionId,
        question,
        stage,
        messages,
        code,
        language,
        startTime,
        setSessionId,
        setQuestion,
        setStage,
        addMessage,
        setCode,
        setLanguage,
        setStartTime,
        reset,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (context === undefined) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
};

