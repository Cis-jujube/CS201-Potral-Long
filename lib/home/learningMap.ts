import type { WeekBundle, WeeklyMapEdge, WeeklyMapNode } from "@/lib/course/types";
import type { QuizProblem, QuizWeekPayload } from "@/lib/quiz/types";
import type { ReflectionQuestionnaire, ReflectionWeekPayload } from "@/lib/reflections/types";

const REFLECTION_TYPES = new Set<WeeklyMapNode["type"]>(["ai-reflection", "bk-reflection"]);
const QUIZ_TYPES = new Set<WeeklyMapNode["type"]>(["quiz"]);

const reflectionTitle = (questionnaire: ReflectionQuestionnaire) => {
  if (questionnaire.kind === "ai-reflection") {
    return "AI Reflection";
  }

  return questionnaire.questionnaireNo > 2 ? `BK Reflection ${questionnaire.questionnaireNo}` : "BK Reflection";
};

const reflectionSummary = (questionnaire: ReflectionQuestionnaire) => {
  const accepted =
    questionnaire.accepted === undefined
      ? undefined
      : questionnaire.accepted
        ? "Accepted"
        : "Not accepted";
  const submitted = questionnaire.submissionSpk ? "Submitted" : "No submission";
  return [`Questionnaire ${questionnaire.questionnaireNo}`, accepted ?? submitted].join(" / ");
};

const reflectionNode = (questionnaire: ReflectionQuestionnaire): WeeklyMapNode => ({
  id: questionnaire.id,
  type: questionnaire.kind,
  title: reflectionTitle(questionnaire),
  summary: reflectionSummary(questionnaire),
  href: "/homework",
});

const keepValidEdges = (nodes: WeeklyMapNode[], edges: WeeklyMapEdge[]) => {
  const nodeIds = new Set(nodes.map((node) => node.id));
  return edges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));
};

export const mergeSyncedReflectionNodes = (
  bundle: WeekBundle,
  reflection?: ReflectionWeekPayload,
): WeekBundle => {
  if (reflection?.syncStatus !== "synced") {
    return bundle;
  }

  const nonReflectionNodes = bundle.mapNodes.filter((node) => !REFLECTION_TYPES.has(node.type));
  const reflectionNodes = reflection.questionnaires.map(reflectionNode);
  const mapNodes = [...nonReflectionNodes, ...reflectionNodes];

  return {
    ...bundle,
    mapNodes,
    mapEdges: keepValidEdges(mapNodes, bundle.mapEdges),
  };
};

const quizProblemProgress = (problem: QuizProblem): WeeklyMapNode["progressStatus"] => {
  if (problem.status === "passed") {
    return "correct";
  }

  if (problem.status === "closed") {
    return "incorrect";
  }

  return "not-started";
};

const quizProblemStatusLabel = (problem: QuizProblem) => {
  if (problem.status === "passed") {
    return "Correct";
  }

  if (problem.status === "closed") {
    return "Incorrect";
  }

  return "Not done";
};

const quizProblemNode = (problem: QuizProblem): WeeklyMapNode => ({
  id: problem.id,
  type: "quiz",
  title: problem.label,
  summary: problem.title,
  href: "/homework",
  progressStatus: quizProblemProgress(problem),
  statusLabel: quizProblemStatusLabel(problem),
});

export const mergeLiveQuizNodes = (bundle: WeekBundle, quiz?: QuizWeekPayload): WeekBundle => {
  if (!quiz || quiz.week !== bundle.week || quiz.problems.length === 0) {
    return bundle;
  }

  const nonQuizNodes = bundle.mapNodes.filter((node) => !QUIZ_TYPES.has(node.type));
  const quizNodes = quiz.problems.map(quizProblemNode);
  const mapNodes = [...nonQuizNodes, ...quizNodes];

  return {
    ...bundle,
    mapNodes,
    mapEdges: keepValidEdges(mapNodes, bundle.mapEdges),
  };
};
