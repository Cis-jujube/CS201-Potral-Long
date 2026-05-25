import type { QuestionProgressStatus } from "@/lib/course/types";

interface HomeworkProgressLike {
  questions: Array<{ id: string }>;
}

export interface HomeworkProgressSnapshot {
  correct: number;
  incorrect: number;
  notStarted: number;
  total: number;
  isComplete: boolean;
}

const readQuestionStatus = (
  questionId: string,
  questionProgressMap: Record<string, QuestionProgressStatus>,
): QuestionProgressStatus => questionProgressMap[questionId] ?? "not-started";

export const buildHomeworkProgressSnapshot = (
  homework: HomeworkProgressLike,
  questionProgressMap: Record<string, QuestionProgressStatus>,
): HomeworkProgressSnapshot => {
  const counts = homework.questions.reduce(
    (accumulator, question) => {
      const status = readQuestionStatus(question.id, questionProgressMap);
      if (status === "correct") {
        accumulator.correct += 1;
      } else if (status === "incorrect") {
        accumulator.incorrect += 1;
      } else {
        accumulator.notStarted += 1;
      }
      return accumulator;
    },
    { correct: 0, incorrect: 0, notStarted: 0 },
  );

  const total = homework.questions.length;
  return {
    ...counts,
    total,
    isComplete: total > 0 && counts.correct === total,
  };
};

export const getQuestionStatus = (
  questionId: string,
  questionProgressMap: Record<string, QuestionProgressStatus>,
): QuestionProgressStatus => readQuestionStatus(questionId, questionProgressMap);
