import type {
  CourseItemBase,
  CourseOverview,
  DeadlineItem,
  LectureItem,
  TaskItem,
  WeekBundle,
  WeekNumber,
  WeeklyMapEdge,
  WeeklyMapNode,
} from "@/lib/course/types";
import {
  getLabMaterials,
  getLectureMaterials,
  getMaterialPreviewHref,
} from "@/lib/course-materials/content";
import type { CourseMaterialItem } from "@/lib/course-materials/types";

export const isInWeek = (item: CourseItemBase | DeadlineItem, week: WeekNumber) => {
  if ("weeks" in item) {
    return item.weeks.includes(week);
  }

  return item.week === week;
};

export const filterByWeek = <T extends CourseItemBase>(items: T[], week: WeekNumber): T[] => {
  return items.filter((item) => isInWeek(item, week));
};

export const calculateWeekProgress = (tasks: TaskItem[], completedTaskIds: string[]) => {
  const total = tasks.length;
  const completed = tasks.filter((task) => completedTaskIds.includes(task.id)).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { completed, total, percentage };
};

export const getLectureTaskMapping = (lectures: LectureItem[], tasks: TaskItem[]) => {
  return lectures.map((lecture) => ({
    lecture,
    tasks: tasks.filter((task) => task.linkedLectureIds.includes(lecture.id)),
  }));
};

export const getUpcomingDeadlines = (
  deadlines: DeadlineItem[],
  fromWeek: WeekNumber,
  limit = 5,
) => {
  const filtered = deadlines
    .filter((deadline) => deadline.week >= fromWeek)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return filtered.slice(0, limit);
};

const taskNodeSummary = (task: TaskItem) =>
  task.showDue === false
    ? task.type.replace("-", " ")
    : `${task.type.replace("-", " ")} · due ${toShortDate(task.dueDate)}`;

const toShortDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
};

const hasMaterialLink = (item: CourseMaterialItem) => Boolean(item.publicHref || item.sourceHref);

const materialSummary = (item: CourseMaterialItem) =>
  [item.date, item.topic === item.fileName ? undefined : item.topic].filter(Boolean).join(" / ");

const materialNode = (item: CourseMaterialItem, type: "lecture" | "lab"): WeeklyMapNode => ({
  id: item.id,
  type,
  title: item.fileName,
  summary: materialSummary(item) || item.title,
  href: hasMaterialLink(item) ? getMaterialPreviewHref(item) : undefined,
});

const buildWeekMap = (week: WeekNumber, tasks: TaskItem[]) => {
  const lectureNodes: WeeklyMapNode[] = getLectureMaterials()
    .filter((item) => item.week === week)
    .map((item) => materialNode(item, "lecture"));

  const labNodes: WeeklyMapNode[] = getLabMaterials()
    .filter((item) => item.week === week)
    .map((item) => materialNode(item, "lab"));

  const taskNodes: WeeklyMapNode[] = tasks.map((task) => ({
    id: task.id,
    type: task.type,
    title: task.title,
    summary: taskNodeSummary(task),
    href: "/homework",
  }));

  const firstLectureId = lectureNodes[0]?.id;
  const edges: WeeklyMapEdge[] = firstLectureId
    ? taskNodes.map((taskNode) => ({
        from: firstLectureId,
        to: taskNode.id,
        label: "drives",
      }))
    : [];

  return {
    mapNodes: [...lectureNodes, ...taskNodes, ...labNodes],
    mapEdges: edges,
  };
};

export const getWeekBundle = (overview: CourseOverview, week: WeekNumber): WeekBundle => {
  const lectures = filterByWeek(overview.lectures, week);
  const tasks = filterByWeek(overview.tasks, week);
  const resources = filterByWeek(overview.resources, week);
  const deadlines = overview.deadlines.filter((deadline) => deadline.week === week);
  const map = buildWeekMap(week, tasks);

  return {
    week,
    lectures,
    tasks,
    resources,
    deadlines,
    mapNodes: map.mapNodes,
    mapEdges: map.mapEdges,
    recommendations: [
      "Start with lecture highlights before opening tasks.",
      "Complete high-priority tasks before reflection items.",
      "Use one resource while solving each major task.",
    ],
  };
};

export const groupTasksByType = (tasks: TaskItem[]) => {
  return tasks.reduce<Record<TaskItem["type"], TaskItem[]>>(
    (accumulator, task) => {
      accumulator[task.type].push(task);
      return accumulator;
    },
    {
      homework: [],
      quiz: [],
      "ai-reflection": [],
      "bk-reflection": [],
    },
  );
};
