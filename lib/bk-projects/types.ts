import type { WeekNumber } from "@/lib/course/types";

export type BkProjectSyncStatus = "synced" | "unconfigured" | "error" | "fallback";
export type BkSurveyItemType = "rating" | "text" | "unknown";

export interface BkProjectMember {
  id?: string | number;
  username: string;
  displayName?: string;
  role?: string;
}

export interface BkProjectGroup {
  spk: string;
  id?: string | number;
  name: string;
  groupNo?: number;
  nickname?: string;
  members: BkProjectMember[];
  isOwnGroup: boolean;
}

export interface BkProjectSummary {
  spk: string;
  name: string;
  surveySpk?: string;
  votingClosed: boolean;
}

export interface BkProjectWeekPayload {
  kind: "bk-project-week";
  week: WeekNumber;
  sourceHref: string;
  syncStatus: BkProjectSyncStatus;
  syncMessage?: string;
  generatedAt: string;
  project?: BkProjectSummary;
  ownGroup?: BkProjectGroup;
  groups: BkProjectGroup[];
  canVote: boolean;
}

export interface BkSurveyItem {
  spk: string;
  nid: string;
  label: string;
  type: BkSurveyItemType;
}

export interface BkSurveySubmission {
  spk: string;
  itemSpk: string;
  itemNid?: string;
  rating?: number;
  responseText?: string;
}

export interface BkSurveyPayload {
  kind: "bk-survey";
  week: WeekNumber;
  sourceHref: string;
  project: BkProjectSummary;
  group: BkProjectGroup;
  items: BkSurveyItem[];
  submissions: BkSurveySubmission[];
  votingClosed: boolean;
  isOwnGroup: boolean;
  canSubmit: boolean;
}

export type BkVoteRatings = Record<string, number>;
