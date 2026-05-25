import type { DueKind, TaskItem, WeekNumber } from "@/lib/course/types";
import type { HomeworkQuestionDetail } from "@/lib/homework/types";
import type { QuizAnswerField, QuizProblemStatus, QuizPromptBlock } from "@/lib/quiz/types";
import type { ReflectionQuestionnaire } from "@/lib/reflections/types";

export type PracticeEntryKind = "homework" | "quiz" | "ai-reflection" | "bk-reflection";
export type PracticeQuestionKind = "homework" | "quiz" | "reflection" | "notice";

export interface PracticeSectionItem {
  type: "text" | "code";
  text: string;
}

export interface PracticeSection {
  heading: string;
  items: PracticeSectionItem[];
}

export interface PracticeQuestionBase {
  id: string;
  kind: PracticeQuestionKind;
  label: string;
  title: string;
  sourceHref?: string;
}

export interface HomeworkPracticeQuestion extends PracticeQuestionBase {
  kind: "homework";
  homework: HomeworkQuestionDetail;
}

export interface ReflectionPracticeQuestion extends PracticeQuestionBase {
  kind: "reflection";
  metadata: string[];
  sections: PracticeSection[];
  reflection?: ReflectionQuestionnaire;
}

export interface NoticePracticeQuestion extends PracticeQuestionBase {
  kind: "notice";
  metadata: string[];
  sections: PracticeSection[];
}

export interface QuizPracticeQuestion extends PracticeQuestionBase {
  kind: "quiz";
  problemId: string;
  status: QuizProblemStatus;
  prompt: QuizPromptBlock[];
  answerFields: QuizAnswerField[];
  submitContextId?: string;
}

export type PracticeQuestion =
  | HomeworkPracticeQuestion
  | ReflectionPracticeQuestion
  | NoticePracticeQuestion
  | QuizPracticeQuestion;

export interface PracticeEntry {
  id: string;
  kind: PracticeEntryKind;
  week: WeekNumber;
  title: string;
  sourceHref?: string;
  dueDate?: string;
  dueKind?: DueKind;
  available: boolean;
  statusLabel?: string;
  progressLabel?: string;
  questions: PracticeQuestion[];
  sourceTask?: TaskItem;
}
