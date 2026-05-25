import type { WeekNumber } from "@/lib/course/types";
import type {
  ReflectionQuestionnaire,
  ReflectionQuestionnaireKind,
  ReflectionSyncStatus,
  ReflectionTemplateLink,
  ReflectionWeekPayload,
} from "@/lib/reflections/types";

export const TEACHER_STUDENT_APP_URL = "http://10.200.20.79:81/student.html";

export const REFLECTION_TEMPLATE_LINKS: Record<ReflectionQuestionnaireKind, ReflectionTemplateLink> = {
  "ai-reflection": {
    label: "Download AI reflection template",
    href: "/reflection-templates/ai-reflect-template-2026-v2.pdf",
    fileName: "ai-reflect-template-2026-v2.pdf",
  },
  "bk-reflection": {
    label: "Download BK reflection template",
    href: "/reflection-templates/weekly-bk-questionnaire-template.pdf",
    fileName: "weekly-bk-questionnaire-template.pdf",
  },
};

const FALLBACK_QUESTIONNAIRES_BY_WEEK: Record<WeekNumber, number[]> = {
  1: [1],
  2: [1, 2, 3],
  3: [1, 2, 3],
  4: [1],
  5: [1, 2, 3],
  6: [1],
  7: [1, 2, 3],
};

export const getReflectionQuestionnaireNumbersForWeek = (week: WeekNumber) =>
  FALLBACK_QUESTIONNAIRES_BY_WEEK[week];

export const isSupportedReflectionWeek = (value: number): value is WeekNumber =>
  Number.isInteger(value) && value >= 1 && value <= 7;

export const getReflectionKindForQuestionnaire = (questionnaireNo: number): ReflectionQuestionnaireKind =>
  questionnaireNo === 1 ? "ai-reflection" : "bk-reflection";

export const getReflectionQuestionnaireLabel = (questionnaireNo: number) => {
  if (questionnaireNo === 1) {
    return "Questionnaire 1: AI Reflection";
  }

  if (questionnaireNo === 2) {
    return "Questionnaire 2: BK Reflection";
  }

  if (questionnaireNo === 3) {
    return "Questionnaire 3: BK Reflection";
  }

  return `Questionnaire ${questionnaireNo}`;
};

export const getReflectionEntryTitle = (kind: ReflectionQuestionnaireKind) =>
  kind === "ai-reflection" ? "AI Reflection" : "BK Reflection";

export const buildReflectionQuestionnaire = ({
  week,
  questionnaireNo,
  syncStatus,
  syncMessage,
  responseText,
  accepted,
  submissionSpk,
  canSubmit,
  available = true,
}: {
  week: WeekNumber;
  questionnaireNo: number;
  syncStatus: ReflectionSyncStatus;
  syncMessage?: string;
  responseText?: string;
  accepted?: boolean;
  submissionSpk?: string;
  canSubmit: boolean;
  available?: boolean;
}): ReflectionQuestionnaire => {
  const kind = getReflectionKindForQuestionnaire(questionnaireNo);

  return {
    id: `reflection-week-${week}-questionnaire-${questionnaireNo}`,
    week,
    kind,
    questionnaireNo,
    label: getReflectionQuestionnaireLabel(questionnaireNo),
    title: getReflectionEntryTitle(kind),
    template: REFLECTION_TEMPLATE_LINKS[kind],
    sourceHref: TEACHER_STUDENT_APP_URL,
    submitEndpoint: `/api/reflections/week/${week}/questionnaire/${questionnaireNo}/submit`,
    available,
    canSubmit,
    syncStatus,
    syncMessage,
    responseText,
    accepted,
    submissionSpk,
  };
};

export const buildReflectionWeekPayload = ({
  week,
  syncStatus,
  syncMessage,
  questionnaires,
}: {
  week: WeekNumber;
  syncStatus: ReflectionSyncStatus;
  syncMessage?: string;
  questionnaires: ReflectionQuestionnaire[];
}): ReflectionWeekPayload => ({
  kind: "reflection-week",
  week,
  sourceHref: TEACHER_STUDENT_APP_URL,
  syncStatus,
  syncMessage,
  generatedAt: new Date().toISOString(),
  questionnaires,
});

export const buildFallbackReflectionWeekPayload = (
  week: WeekNumber,
  syncStatus: ReflectionSyncStatus = "unconfigured",
  syncMessage = "Teacher-site reflection sync is not configured. Showing the local fallback schedule.",
): ReflectionWeekPayload => {
  const questionnaires = FALLBACK_QUESTIONNAIRES_BY_WEEK[week].map((questionnaireNo) =>
    buildReflectionQuestionnaire({
      week,
      questionnaireNo,
      syncStatus,
      syncMessage,
      canSubmit: false,
    }),
  );

  return buildReflectionWeekPayload({
    week,
    syncStatus,
    syncMessage,
    questionnaires,
  });
};
