import type { WeekNumber } from "@/lib/course/types";

export type ReflectionQuestionnaireKind = "ai-reflection" | "bk-reflection";
export type ReflectionSyncStatus = "synced" | "fallback" | "unconfigured" | "error";

export interface ReflectionTemplateLink {
  label: string;
  href: string;
  fileName: string;
}

export interface ReflectionQuestionnaire {
  id: string;
  week: WeekNumber;
  kind: ReflectionQuestionnaireKind;
  questionnaireNo: number;
  label: string;
  title: string;
  template: ReflectionTemplateLink;
  sourceHref: string;
  submitEndpoint: string;
  available: boolean;
  canSubmit: boolean;
  syncStatus: ReflectionSyncStatus;
  syncMessage?: string;
  responseText?: string;
  accepted?: boolean;
  submissionSpk?: string;
}

export interface ReflectionWeekPayload {
  kind: "reflection-week";
  week: WeekNumber;
  sourceHref: string;
  syncStatus: ReflectionSyncStatus;
  syncMessage?: string;
  generatedAt: string;
  questionnaires: ReflectionQuestionnaire[];
}
