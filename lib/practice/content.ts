import type { TaskItem, WeekNumber } from "@/lib/course/types";
import type { HomeworkEntry } from "@/lib/homework/types";
import type { PracticeEntry, PracticeQuestion } from "@/lib/practice/types";
import type { QuizWeekPayload } from "@/lib/quiz/types";
import { getReflectionEntryTitle } from "@/lib/reflections/content";
import {
  getAiReflectionRecommendedDueDate,
  getBkReflectionRecommendedDueDate,
} from "@/lib/reflections/dueDates";
import type { ReflectionQuestionnaire, ReflectionWeekPayload } from "@/lib/reflections/types";

export type QuizLoadState = "loading" | "ready" | "error" | "unconfigured";

export interface QuizPracticeSource {
  state: QuizLoadState;
  quiz?: QuizWeekPayload;
  error?: string;
  sourceHref?: string;
}

export interface ReflectionPracticeSource {
  state: "loading" | "ready" | "error";
  reflection?: ReflectionWeekPayload;
  error?: string;
  sourceHref?: string;
}

const formatDue = (value?: string) => {
  if (!value) {
    return "No due date listed";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const shouldShowTaskDue = (task: TaskItem) => task.showDue !== false;
const dueKindLabel = (dueKind: TaskItem["dueKind"]) => (dueKind === "required" ? "Required" : "Recommended");

export const homeworkToPracticeEntry = (homework: HomeworkEntry): PracticeEntry => ({
  id: homework.id,
  kind: "homework",
  week: homework.week,
  title: homework.title,
  sourceHref: homework.sourceHref,
  dueDate: homework.recommendedDate,
  dueKind: "recommended",
  available: homework.available,
  statusLabel: homework.available ? "Recommended" : "Unavailable locally",
  questions: homework.questions.map((question): PracticeQuestion => ({
    id: question.id,
    kind: "homework",
    label: question.label,
    title: question.title,
    sourceHref: question.sourceHref,
    homework: question,
  })),
});

export const taskToReflectionPracticeEntry = (task: TaskItem): PracticeEntry | null => {
  if (task.type !== "ai-reflection" && task.type !== "bk-reflection") {
    return null;
  }

  const label = task.type === "ai-reflection" ? "AI Reflection" : "BK Reflection";
  const showDue = shouldShowTaskDue(task);
  const statusLabel = showDue ? dueKindLabel(task.dueKind) : "Reflection";
  const dueMetadata = showDue
    ? [`Due: ${formatDue(task.dueDate)}`, `${statusLabel} due`]
    : ["Reflection"];
  return {
    id: task.id,
    kind: task.type,
    week: task.weeks[0],
    title: label,
    sourceHref: task.href,
    dueDate: showDue ? task.dueDate : undefined,
    dueKind: showDue ? task.dueKind : undefined,
    available: true,
    statusLabel,
    sourceTask: task,
    questions: [
      {
        id: `${task.id}-instructions`,
        kind: "reflection",
        label: "Instructions",
        title: "Reflection Instructions",
        sourceHref: task.href,
        metadata: dueMetadata,
        sections: [
          {
            heading: task.title,
            items: [
              { type: "text", text: task.description },
              {
                type: "text",
                text:
                  task.detail ??
                  (showDue
                    ? task.dueKind === "recommended"
                      ? "Use the recommended due date as a weekly checkpoint; teacher-site submission still requires an explicit manual submit."
                      : "Submit the reflection through the official course workflow before the deadline."
                    : "Use this reflection as a learning checkpoint; no due date is shown in the portal."),
              },
            ],
          },
        ],
      },
    ],
  };
};

const reflectionQuestionnaireToQuestion = (questionnaire: ReflectionQuestionnaire): PracticeQuestion => {
  const dueDate =
    questionnaire.kind === "ai-reflection"
      ? getAiReflectionRecommendedDueDate(questionnaire.week)
      : getBkReflectionRecommendedDueDate(questionnaire.week);

  return {
    id: questionnaire.id,
    kind: "reflection",
    label: questionnaire.label,
    title: questionnaire.label,
    sourceHref: questionnaire.sourceHref,
    reflection: questionnaire,
    metadata: [
      `Due: ${formatDue(dueDate)}`,
      "Recommended due",
      `Template: ${questionnaire.template.fileName}`,
      `Sync: ${questionnaire.syncStatus}`,
      questionnaire.accepted === undefined ? "Accepted: Not reported" : `Accepted: ${questionnaire.accepted ? "Yes" : "No"}`,
    ],
    sections: [
      {
        heading: questionnaire.title,
        items: [
          {
            type: "text",
            text:
              questionnaire.kind === "ai-reflection"
                ? "Use the AI reflection template, then submit your response through the teacher-site sync panel below."
                : "Use the BK reflection template, then submit your response through the teacher-site sync panel below.",
          },
          {
            type: "text",
            text:
              questionnaire.syncMessage ??
              "The portal reads and writes this questionnaire through the teacher-site API when credentials are configured.",
          },
        ],
      },
    ],
  };
};

export const reflectionPayloadToPracticeEntries = (payload: ReflectionWeekPayload): PracticeEntry[] => {
  const groups = new Map<ReflectionQuestionnaire["kind"], ReflectionQuestionnaire[]>();
  payload.questionnaires.forEach((questionnaire) => {
    const existing = groups.get(questionnaire.kind) ?? [];
    existing.push(questionnaire);
    groups.set(questionnaire.kind, existing);
  });

  return [...groups.entries()].map(([kind, questionnaires]) => {
    const dueDate =
      kind === "ai-reflection"
        ? getAiReflectionRecommendedDueDate(payload.week)
        : getBkReflectionRecommendedDueDate(payload.week);

    return {
      id: `reflection-week-${payload.week}-${kind}`,
      kind,
      week: payload.week,
      title: getReflectionEntryTitle(kind),
      sourceHref: payload.sourceHref,
      dueDate,
      dueKind: "recommended",
      available: questionnaires.some((questionnaire) => questionnaire.available),
      statusLabel: payload.syncStatus === "synced" ? "Synced" : "Template",
      progressLabel: payload.syncMessage,
      questions: questionnaires
        .sort((left, right) => left.questionnaireNo - right.questionnaireNo)
        .map(reflectionQuestionnaireToQuestion),
    };
  });
};

export const quizToPracticeEntry = (week: WeekNumber, source: QuizPracticeSource): PracticeEntry => {
  if (source.state !== "ready" || !source.quiz) {
    const message =
      source.state === "loading"
        ? "Loading the live Quiz from the course site..."
        : source.error ?? "Quiz account not configured.";

    return {
      id: `quiz-week-${week}`,
      kind: "quiz",
      week,
      title: "Quiz",
      sourceHref: source.sourceHref,
      available: false,
      statusLabel: source.state === "loading" ? "Loading" : "Unavailable",
      questions: [
        {
          id: `quiz-week-${week}-notice`,
          kind: "notice",
          label: "Quiz Status",
          title: source.state === "unconfigured" ? "Quiz account not configured" : "Quiz unavailable",
          sourceHref: source.sourceHref,
          metadata: ["Quiz"],
          sections: [
            {
              heading: "Status",
              items: [{ type: "text", text: message }],
            },
          ],
        },
      ],
    };
  }

  const quiz = source.quiz;
  return {
    id: quiz.id,
    kind: "quiz",
    week,
    title: "Quiz",
    sourceHref: quiz.sourceHref,
    dueDate: quiz.due,
    dueKind: "required",
    available: true,
    statusLabel: quiz.status === "unknown" ? undefined : quiz.status,
    progressLabel: quiz.progressLabel,
    questions: quiz.problems.map((problem): PracticeQuestion => ({
      id: problem.id,
      kind: "quiz",
      label: problem.label,
      title: problem.title,
      sourceHref: problem.sourceHref,
      problemId: problem.problemId,
      status: problem.status,
      prompt: problem.prompt,
      answerFields: problem.answerFields,
      submitContextId: problem.submitContextId,
    })),
  };
};

export const buildPracticeEntriesForWeek = (
  week: WeekNumber,
  homeworks: HomeworkEntry[],
  tasks: TaskItem[],
  quizSource: QuizPracticeSource,
  reflectionSource?: ReflectionPracticeSource,
) => {
  const homeworkEntries = homeworks.map(homeworkToPracticeEntry);
  const reflectionEntries =
    reflectionSource?.state === "ready" && reflectionSource.reflection
      ? reflectionPayloadToPracticeEntries(reflectionSource.reflection)
      : tasks
          .filter((task) => task.weeks.includes(week))
          .flatMap((task) => {
            const entry = taskToReflectionPracticeEntry(task);
            return entry ? [entry] : [];
          });

  return [...homeworkEntries, ...reflectionEntries, quizToPracticeEntry(week, quizSource)];
};
