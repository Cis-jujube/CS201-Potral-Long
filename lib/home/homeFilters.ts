import { HOME_ED_LINK, HOME_TEXTBOOK_LINKS } from "@/lib/mock/uiPlaceholders";
import type { CourseOverview, WeekBundle } from "@/lib/course/types";
import { getUpcomingDeadlines } from "@/lib/course/selectors";
import type { LinkItem } from "@/lib/mock/uiPlaceholders";

interface BuildHomeFilterInput {
  weekBundle: WeekBundle;
  overview: CourseOverview;
  query: string;
  completedTaskIds: string[];
}

export interface HomeFilterResult {
  query: string;
  isFiltering: boolean;
  hasAnyMatch: boolean;
  tasks: WeekBundle["tasks"];
  deadlines: CourseOverview["deadlines"];
  mapNodes: WeekBundle["mapNodes"];
  mapEdges: WeekBundle["mapEdges"];
  edLink: LinkItem | null;
  textbooks: LinkItem[];
}

const normalize = (value: string) => value.toLowerCase();

const includesTerm = (term: string, values: Array<string | undefined>) => {
  return values.some((value) => normalize(value ?? "").includes(term));
};

const searchableDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${value} ${date.toLocaleDateString("en-US")} ${date.toLocaleString("en-US")}`;
};

export const buildHomeFilterResult = ({
  weekBundle,
  overview,
  query,
  completedTaskIds,
}: BuildHomeFilterInput): HomeFilterResult => {
  const normalizedQuery = query.trim();
  const term = normalize(normalizedQuery);
  const isFiltering = term.length > 0;

  void completedTaskIds;
  const allDeadlines = getUpcomingDeadlines(overview.deadlines, weekBundle.week);

  if (!isFiltering) {
    return {
      query: normalizedQuery,
      isFiltering: false,
      hasAnyMatch: true,
      tasks: weekBundle.tasks,
      deadlines: allDeadlines,
      mapNodes: weekBundle.mapNodes,
      mapEdges: weekBundle.mapEdges,
      edLink: HOME_ED_LINK,
      textbooks: HOME_TEXTBOOK_LINKS,
    };
  }

  const tasks = weekBundle.tasks.filter((task) =>
    includesTerm(term, [
      task.title,
      task.description,
      task.type,
      task.priority,
      task.showDue === false ? undefined : searchableDate(task.dueDate),
    ]),
  );

  const deadlines = allDeadlines.filter((deadline) =>
    includesTerm(term, [deadline.title, deadline.type, searchableDate(deadline.dueDate)]),
  );

  const mapNodes = weekBundle.mapNodes.filter((node) =>
    includesTerm(term, [node.title, node.summary, node.type, node.statusLabel, node.progressStatus]),
  );
  const mapNodeIds = new Set(mapNodes.map((node) => node.id));
  const mapEdges = weekBundle.mapEdges.filter((edge) => mapNodeIds.has(edge.from) && mapNodeIds.has(edge.to));

  const edLink = includesTerm(term, [HOME_ED_LINK.label, HOME_ED_LINK.description, HOME_ED_LINK.href])
    ? HOME_ED_LINK
    : null;
  const textbooks = HOME_TEXTBOOK_LINKS.filter((item) =>
    includesTerm(term, [item.label, item.description, item.href]),
  );

  const hasAnyMatch =
    tasks.length > 0 ||
    deadlines.length > 0 ||
    mapNodes.length > 0 ||
    edLink !== null ||
    textbooks.length > 0;

  return {
    query: normalizedQuery,
    isFiltering,
    hasAnyMatch,
    tasks,
    deadlines,
    mapNodes,
    mapEdges,
    edLink,
    textbooks,
  };
};
