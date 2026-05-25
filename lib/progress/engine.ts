import { calculateWeekProgress } from "@/lib/course/selectors";
import type { TaskItem, WeekProgressSnapshot, WeekProgressSource } from "@/lib/course/types";

interface ProgressEndpointConfig {
  baseUrl: string;
  token?: string;
}

export interface WeekProgressAdapterConfig {
  source: WeekProgressSource;
  edForum?: ProgressEndpointConfig;
  coursePages?: ProgressEndpointConfig;
}

interface WeekProgressInput {
  tasks: TaskItem[];
  completedTaskIds: string[];
  config?: WeekProgressAdapterConfig;
}

const DEFAULT_PROGRESS_SOURCE: WeekProgressSource = "local-tasks";

export const getWeekProgressAdapterConfigFromEnv = (): WeekProgressAdapterConfig => {
  const source = (process.env.WEEK_PROGRESS_SOURCE as WeekProgressSource | undefined) ?? DEFAULT_PROGRESS_SOURCE;

  return {
    source,
    edForum: process.env.WEEK_PROGRESS_ED_API_BASE_URL
      ? {
          baseUrl: process.env.WEEK_PROGRESS_ED_API_BASE_URL,
          token: process.env.WEEK_PROGRESS_ED_API_TOKEN,
        }
      : undefined,
    coursePages: process.env.WEEK_PROGRESS_COURSE_PAGES_API_BASE_URL
      ? {
          baseUrl: process.env.WEEK_PROGRESS_COURSE_PAGES_API_BASE_URL,
          token: process.env.WEEK_PROGRESS_COURSE_PAGES_API_TOKEN,
        }
      : undefined,
  };
};

export const getWeekProgressSnapshot = ({
  tasks,
  completedTaskIds,
  config,
}: WeekProgressInput): WeekProgressSnapshot => {
  const fallback = calculateWeekProgress(tasks, completedTaskIds);
  const source = config?.source ?? DEFAULT_PROGRESS_SOURCE;

  // v1: external signals are only reserved; local task completion is still authoritative.
  return {
    ...fallback,
    source: source === "local-tasks" ? source : DEFAULT_PROGRESS_SOURCE,
    externalSignalsEnabled: false,
  };
};
