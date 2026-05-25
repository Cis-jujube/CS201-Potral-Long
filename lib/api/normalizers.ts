import {
  COURSE_WEEKS,
  type CourseOverview,
  type DeadlineItem,
  type ExamItem,
  type LectureItem,
  type ResourceItem,
  type SagOverview,
  type TaskItem,
  type WeekNumber,
} from "@/lib/course/types";
import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";
import { MOCK_SAG_OVERVIEW } from "@/lib/mock/sagData";

const toWeek = (value: unknown): WeekNumber | null => {
  const number = Number(value);
  return COURSE_WEEKS.includes(number as WeekNumber) ? (number as WeekNumber) : null;
};

const toWeeks = (value: unknown): WeekNumber[] => {
  if (Array.isArray(value)) {
    const parsed = value.map(toWeek).filter((week): week is WeekNumber => Boolean(week));
    return parsed.length > 0 ? parsed : [1];
  }

  const single = toWeek(value);
  return single ? [single] : [1];
};

const toString = (value: unknown, fallback: string) => {
  return typeof value === "string" && value.trim() ? value : fallback;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
};

const asObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }

  return {};
};

const normalizeLecture = (raw: unknown, fallback: LectureItem): LectureItem => {
  const source = asObject(raw);
  return {
    ...fallback,
    id: toString(source.id, fallback.id),
    type: "lecture",
    title: toString(source.title, fallback.title),
    description: toString(source.description, fallback.description),
    weeks: toWeeks(source.weeks ?? source.week ?? fallback.weeks),
    durationMinutes: Number(source.durationMinutes ?? fallback.durationMinutes),
    instructor: toString(source.instructor, fallback.instructor),
    slidesUrl: toString(source.slidesUrl, fallback.slidesUrl ?? ""),
    recordingUrl: toString(source.recordingUrl, fallback.recordingUrl ?? ""),
    tags: toStringArray(source.tags),
  };
};

const normalizeTask = (raw: unknown, fallback: TaskItem): TaskItem => {
  const source = asObject(raw);
  const priority = source.priority;
  const dueKind = source.dueKind;
  return {
    ...fallback,
    id: toString(source.id, fallback.id),
    type: fallback.type,
    title: toString(source.title, fallback.title),
    description: toString(source.description, fallback.description),
    weeks: toWeeks(source.weeks ?? source.week ?? fallback.weeks),
    dueDate: toString(source.dueDate, fallback.dueDate),
    points: Number(source.points ?? fallback.points),
    linkedLectureIds: toStringArray(source.linkedLectureIds ?? fallback.linkedLectureIds),
    priority:
      priority === "high" || priority === "medium" || priority === "low" ? priority : fallback.priority,
    dueKind: dueKind === "required" || dueKind === "recommended" ? dueKind : fallback.dueKind,
    detail: toString(source.detail, fallback.detail ?? ""),
    showDue: typeof source.showDue === "boolean" ? source.showDue : fallback.showDue,
  };
};

const normalizeResource = (raw: unknown, fallback: ResourceItem): ResourceItem => {
  const source = asObject(raw);
  const category = source.category;
  return {
    ...fallback,
    id: toString(source.id, fallback.id),
    type: "resource",
    title: toString(source.title, fallback.title),
    description: toString(source.description, fallback.description),
    weeks: toWeeks(source.weeks ?? source.week ?? fallback.weeks),
    category:
      category === "reading" || category === "tool" || category === "video" || category === "cheatsheet"
        ? category
        : fallback.category,
    relatedTaskIds: toStringArray(source.relatedTaskIds ?? fallback.relatedTaskIds),
    href: toString(source.href, fallback.href ?? ""),
  };
};

const normalizeDeadline = (raw: unknown, fallback: DeadlineItem): DeadlineItem => {
  const source = asObject(raw);
  const week = toWeek(source.week);
  const type = source.type;
  const dueKind = source.dueKind;
  return {
    ...fallback,
    id: toString(source.id, fallback.id),
    title: toString(source.title, fallback.title),
    type:
      type === "homework" ||
      type === "quiz" ||
      type === "ai-reflection" ||
      type === "bk-reflection" ||
      type === "project-presentation" ||
      type === "exam"
        ? type
        : fallback.type,
    week: week ?? fallback.week,
    dueDate: toString(source.dueDate, fallback.dueDate),
    href: toString(source.href, fallback.href ?? ""),
    dueKind: dueKind === "required" || dueKind === "recommended" ? dueKind : fallback.dueKind,
    detail: toString(source.detail, fallback.detail ?? ""),
  };
};

const normalizeExam = (raw: unknown, fallback: ExamItem): ExamItem => {
  const source = asObject(raw);
  return {
    ...fallback,
    id: toString(source.id, fallback.id),
    type: "exam",
    title: toString(source.title, fallback.title),
    description: toString(source.description, fallback.description),
    weeks: toWeeks(source.weeks ?? source.week ?? fallback.weeks),
    date: toString(source.date, fallback.date),
    format: toString(source.format, fallback.format),
  };
};

export const normalizeCourseOverview = (payload: unknown): CourseOverview => {
  const source = asObject(payload);
  const fallback = MOCK_COURSE_OVERVIEW;

  const rawLectures = Array.isArray(source.lectures) ? source.lectures : fallback.lectures;
  const rawTasks = Array.isArray(source.tasks) ? source.tasks : fallback.tasks;
  const rawResources = Array.isArray(source.resources) ? source.resources : fallback.resources;
  const rawDeadlines = Array.isArray(source.deadlines) ? source.deadlines : fallback.deadlines;
  const rawExams = Array.isArray(source.exams) ? source.exams : fallback.exams;

  return {
    courseCode: toString(source.courseCode, fallback.courseCode),
    courseTitle: toString(source.courseTitle, fallback.courseTitle),
    subtitle: toString(source.subtitle, fallback.subtitle),
    weeks: COURSE_WEEKS,
    lectures: rawLectures.map((item, index) => normalizeLecture(item, fallback.lectures[index] ?? fallback.lectures[0])),
    tasks: rawTasks.map((item, index) => normalizeTask(item, fallback.tasks[index] ?? fallback.tasks[0])),
    resources: rawResources.map((item, index) =>
      normalizeResource(item, fallback.resources[index] ?? fallback.resources[0]),
    ),
    deadlines: rawDeadlines.map((item, index) =>
      normalizeDeadline(item, fallback.deadlines[index] ?? fallback.deadlines[0]),
    ),
    exams: rawExams.map((item, index) => normalizeExam(item, fallback.exams[index] ?? fallback.exams[0])),
    quickLinks: fallback.quickLinks,
  };
};

export const normalizeSagOverview = (payload: unknown): SagOverview => {
  const source = asObject(payload);
  const stages = Array.isArray(source.stages) ? source.stages : MOCK_SAG_OVERVIEW.stages;

  return {
    title: toString(source.title, MOCK_SAG_OVERVIEW.title),
    summary: toString(source.summary, MOCK_SAG_OVERVIEW.summary),
    stages: stages.map((stage, index) => {
      const fallback = MOCK_SAG_OVERVIEW.stages[index] ?? MOCK_SAG_OVERVIEW.stages[0];
      const stageSource = asObject(stage);
      const checks = Array.isArray(stageSource.checks) ? stageSource.checks : fallback.checks;
      return {
        ...fallback,
        id: toString(stageSource.id, fallback.id),
        name: toString(stageSource.name, fallback.name),
        order: Number(stageSource.order ?? fallback.order),
        passRule: toString(stageSource.passRule, fallback.passRule),
        retryPolicy: toString(stageSource.retryPolicy, fallback.retryPolicy),
        feedbackWindow: toString(stageSource.feedbackWindow, fallback.feedbackWindow),
        commonFailures: toStringArray(stageSource.commonFailures),
        checks: checks.map((check, checkIndex) => {
          const checkSource = asObject(check);
          const checkFallback = fallback.checks[checkIndex] ?? fallback.checks[0];
          return {
            id: toString(checkSource.id, checkFallback.id),
            label: toString(checkSource.label, checkFallback.label),
            description: toString(checkSource.description, checkFallback.description),
          };
        }),
      };
    }),
    gradingWeights: MOCK_SAG_OVERVIEW.gradingWeights,
    studentTips: MOCK_SAG_OVERVIEW.studentTips,
  };
};
