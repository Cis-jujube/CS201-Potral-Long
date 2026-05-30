import type { QuestionProgressStatus } from "@/lib/course/types";

export type HomeworkStatusSyncState = "synced" | "fallback" | "unconfigured" | "error";
export type HomeworkTeacherQuestionStatus = QuestionProgressStatus | "ungraded";

export interface HomeworkQuestionSyncStatus {
  questionId: string;
  homeworkId: string;
  homeworkTitle: string;
  questionTitle: string;
  status: HomeworkTeacherQuestionStatus;
  source: "teacher-site";
  jpaNid?: string;
  jpaSpk?: string;
  grade?: number;
  lastUpdated?: string;
}

export interface HomeworkSummarySyncStatus {
  homeworkId: string;
  title: string;
  correct: number;
  incorrect: number;
  ungraded: number;
  notStarted: number;
  total: number;
  isComplete: boolean;
}

export interface HomeworkStatusPayload {
  kind: "homework-jpa-status";
  syncStatus: HomeworkStatusSyncState;
  syncMessage?: string;
  sourceHref: string;
  generatedAt: string;
  username?: string;
  courseId?: string;
  questionStatuses: Record<string, HomeworkQuestionSyncStatus>;
  homeworkStatuses: Record<string, HomeworkSummarySyncStatus>;
}
