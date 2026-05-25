import type { WeekNumber } from "@/lib/course/types";

export interface HomeworkSectionItem {
  type: "text" | "code";
  text: string;
  language?: string;
}

export interface HomeworkSection {
  heading: string;
  items: HomeworkSectionItem[];
}

export interface HomeworkQuestionDetail {
  id: string;
  label: string;
  title: string;
  sourceHref: string;
  metadata: string[];
  sections: HomeworkSection[];
  codeBlocks: Array<{ language: string; text: string }>;
  filesToSubmit: string[];
}

export interface HomeworkEntry {
  id: string;
  number: number;
  week: WeekNumber;
  title: string;
  sourceHref?: string;
  recommendedDate?: string;
  scheduleLabel?: string;
  topic?: string;
  available: boolean;
  questions: HomeworkQuestionDetail[];
}

export interface HomeworkManifest {
  generatedAt: string;
  sourceArchive: string;
  homeworks: HomeworkEntry[];
}
