export type QuizProblemStatus = "open" | "closed" | "passed";

export interface QuizAssignment {
  week: number;
  title: string;
  sourceHref: string;
  status: QuizProblemStatus | "unknown";
  due?: string;
  passed?: number;
  total?: number;
}

export interface QuizAnswerField {
  name: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

export interface QuizPromptBlock {
  type: "text" | "code";
  text: string;
}

export interface QuizProblemLink {
  problemId: string;
  label: string;
  sourceHref: string;
  status?: QuizProblemStatus;
}

export interface QuizProblem {
  id: string;
  problemId: string;
  week: number;
  label: string;
  title: string;
  sourceHref: string;
  status: QuizProblemStatus;
  prompt: QuizPromptBlock[];
  answerFields: QuizAnswerField[];
  formAction?: string;
  csrfToken?: string;
  submitContextId?: string;
}

export interface ParsedQuizProblem extends QuizProblem {
  problemLinks: QuizProblemLink[];
}

export interface QuizWeekPayload {
  kind: "quiz";
  id: string;
  week: number;
  title: string;
  sourceHref: string;
  status: QuizAssignment["status"];
  due?: string;
  progressLabel?: string;
  problems: QuizProblem[];
}

export interface QuizSubmitResult {
  status: "passed" | "failed" | "unknown";
  message: string;
  passed?: number;
  total?: number;
  attemptsLeft?: number;
}
