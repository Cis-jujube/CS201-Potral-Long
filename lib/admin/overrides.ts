import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CourseOverview, DeadlineItem, ResourceItem, TaskItem } from "@/lib/course/types";

export interface AdminTaskOverride {
  title?: string;
  description?: string;
  dueDate?: string;
  hidden?: boolean;
  showDue?: boolean;
}

export interface AdminDeadlineOverride {
  title?: string;
  detail?: string;
  dueDate?: string;
  hidden?: boolean;
}

export interface AdminResourceOverride {
  title?: string;
  description?: string;
  href?: string;
  hidden?: boolean;
}

export interface CourseAdminOverrides {
  version: 1;
  updatedAt?: string;
  updatedBy?: string;
  tasks: Record<string, AdminTaskOverride>;
  deadlines: Record<string, AdminDeadlineOverride>;
  resources: Record<string, AdminResourceOverride>;
  reflections: Record<string, AdminTaskOverride>;
}

export interface AdminEditableContent {
  weeks: CourseOverview["weeks"];
  tasks: TaskItem[];
  deadlines: DeadlineItem[];
  resources: ResourceItem[];
}

const getOverridePath = () =>
  process.env.NODE_ENV === "test" && process.env.CS201_ADMIN_OVERRIDES_PATH
    ? process.env.CS201_ADMIN_OVERRIDES_PATH
    : path.join(process.cwd(), "data", "admin-overrides", "course-overrides.json");

export const EMPTY_COURSE_OVERRIDES: CourseAdminOverrides = {
  version: 1,
  tasks: {},
  deadlines: {},
  resources: {},
  reflections: {},
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionalString = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }

  return value;
};

const optionalBoolean = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }

  return value;
};

const sanitizeTaskOverride = (value: unknown, label: string): AdminTaskOverride => {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    title: optionalString(value.title, `${label}.title`),
    description: optionalString(value.description, `${label}.description`),
    dueDate: optionalString(value.dueDate, `${label}.dueDate`),
    hidden: optionalBoolean(value.hidden, `${label}.hidden`),
    showDue: optionalBoolean(value.showDue, `${label}.showDue`),
  };
};

const sanitizeDeadlineOverride = (value: unknown, label: string): AdminDeadlineOverride => {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    title: optionalString(value.title, `${label}.title`),
    detail: optionalString(value.detail, `${label}.detail`),
    dueDate: optionalString(value.dueDate, `${label}.dueDate`),
    hidden: optionalBoolean(value.hidden, `${label}.hidden`),
  };
};

const sanitizeResourceOverride = (value: unknown, label: string): AdminResourceOverride => {
  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return {
    title: optionalString(value.title, `${label}.title`),
    description: optionalString(value.description, `${label}.description`),
    href: optionalString(value.href, `${label}.href`),
    hidden: optionalBoolean(value.hidden, `${label}.hidden`),
  };
};

const sanitizeSection = <T>(
  value: unknown,
  label: string,
  sanitizeEntry: (entry: unknown, entryLabel: string) => T,
): Record<string, T> => {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return Object.fromEntries(
    Object.entries(value).map(([id, entry]) => [id, sanitizeEntry(entry, `${label}.${id}`)]),
  );
};

export const sanitizeCourseOverrides = (value: unknown): CourseAdminOverrides => {
  if (!isRecord(value)) {
    throw new Error("Overrides must be an object.");
  }

  return {
    version: 1,
    updatedAt: optionalString(value.updatedAt, "updatedAt"),
    updatedBy: optionalString(value.updatedBy, "updatedBy"),
    tasks: sanitizeSection(value.tasks, "tasks", sanitizeTaskOverride),
    deadlines: sanitizeSection(value.deadlines, "deadlines", sanitizeDeadlineOverride),
    resources: sanitizeSection(value.resources, "resources", sanitizeResourceOverride),
    reflections: sanitizeSection(value.reflections, "reflections", sanitizeTaskOverride),
  };
};

export const readCourseOverrides = async (): Promise<CourseAdminOverrides> => {
  try {
    const raw = await readFile(getOverridePath(), "utf8");
    return sanitizeCourseOverrides(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return EMPTY_COURSE_OVERRIDES;
    }

    throw error;
  }
};

export const writeCourseOverrides = async (
  overrides: CourseAdminOverrides,
  updatedBy: string,
): Promise<CourseAdminOverrides> => {
  const next: CourseAdminOverrides = {
    ...sanitizeCourseOverrides(overrides),
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  const overridePath = getOverridePath();
  await mkdir(path.dirname(overridePath), { recursive: true });
  await writeFile(overridePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
};

export const resetCourseOverrides = async (updatedBy: string) =>
  writeCourseOverrides(EMPTY_COURSE_OVERRIDES, updatedBy);

const applyTaskOverride = (task: TaskItem, overrides: CourseAdminOverrides): TaskItem | null => {
  const override =
    task.type === "ai-reflection" || task.type === "bk-reflection"
      ? { ...overrides.reflections[task.id], ...overrides.tasks[task.id] }
      : overrides.tasks[task.id];

  if (override?.hidden) {
    return null;
  }

  return {
    ...task,
    title: override?.title ?? task.title,
    description: override?.description ?? task.description,
    dueDate: override?.dueDate ?? task.dueDate,
    showDue: override?.showDue ?? task.showDue,
  };
};

const taskIdFromDeadline = (deadline: DeadlineItem) =>
  deadline.id.startsWith("ddl-") ? deadline.id.slice(4) : undefined;

const applyDeadlineOverride = (
  deadline: DeadlineItem,
  overrides: CourseAdminOverrides,
  tasksById: Map<string, TaskItem>,
  originalTaskIds: Set<string>,
): DeadlineItem | null => {
  const override = overrides.deadlines[deadline.id];
  const taskId = taskIdFromDeadline(deadline);
  const isTaskDeadline = Boolean(taskId && originalTaskIds.has(taskId));
  const sourceTask = isTaskDeadline && taskId ? tasksById.get(taskId) : undefined;

  if (override?.hidden || (isTaskDeadline && !sourceTask) || sourceTask?.showDue === false) {
    return null;
  }

  const syncedDeadline = sourceTask
    ? {
        ...deadline,
        title: sourceTask.title,
        dueDate: sourceTask.dueDate,
        dueKind: sourceTask.dueKind,
        detail: sourceTask.detail,
        href: sourceTask.href,
      }
    : deadline;

  return {
    ...syncedDeadline,
    title: override?.title ?? syncedDeadline.title,
    dueDate: override?.dueDate ?? syncedDeadline.dueDate,
    detail: override?.detail ?? syncedDeadline.detail,
  };
};

const applyResourceOverride = (
  resource: ResourceItem,
  overrides: CourseAdminOverrides,
): ResourceItem | null => {
  const override = overrides.resources[resource.id];
  if (override?.hidden) {
    return null;
  }

  return {
    ...resource,
    title: override?.title ?? resource.title,
    description: override?.description ?? resource.description,
    href: override?.href ?? resource.href,
  };
};

export const applyCourseOverrides = (
  overview: CourseOverview,
  overrides: CourseAdminOverrides = EMPTY_COURSE_OVERRIDES,
): CourseOverview => {
  const tasks = overview.tasks
    .map((task) => applyTaskOverride(task, overrides))
    .filter((task): task is TaskItem => Boolean(task));
  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const originalTaskIds = new Set(overview.tasks.map((task) => task.id));

  return {
    ...overview,
    tasks,
    deadlines: overview.deadlines
      .map((deadline) => applyDeadlineOverride(deadline, overrides, tasksById, originalTaskIds))
      .filter((deadline): deadline is DeadlineItem => Boolean(deadline)),
    resources: overview.resources
      .map((resource) => applyResourceOverride(resource, overrides))
      .filter((resource): resource is ResourceItem => Boolean(resource)),
  };
};

export const applyStoredCourseOverrides = async (overview: CourseOverview) =>
  applyCourseOverrides(overview, await readCourseOverrides());

export const buildAdminEditableContent = (overview: CourseOverview): AdminEditableContent => ({
  weeks: overview.weeks,
  tasks: overview.tasks,
  deadlines: overview.deadlines,
  resources: overview.resources,
});
