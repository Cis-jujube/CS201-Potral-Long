export type WeekNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const COURSE_WEEKS: WeekNumber[] = [1, 2, 3, 4, 5, 6, 7];

export type StyleMode = "bento-grid";
export type ThemeMode = "light" | "dark";
export type HomeBreakpoint = "mobile" | "tablet" | "desktop";
export type ModuleTone = "violet" | "blue" | "cyan" | "emerald" | "amber" | "rose";

export type HomeModuleKey =
  | "weekly-map"
  | "this-week-tasks"
  | "ed-link"
  | "textbooks";

export type HomeModuleWeightConfig = Record<HomeModuleKey, 1 | 2 | 3 | 4 | 5>;

export interface WeightedTileLayout {
  key: HomeModuleKey;
  importance: number;
  breakpoint: HomeBreakpoint;
  span: {
    col: number;
    row: number;
  };
  area: number;
}

export type CourseItemType =
  | "lecture"
  | "homework"
  | "quiz"
  | "ai-reflection"
  | "bk-reflection"
  | "project-presentation"
  | "lab"
  | "resource"
  | "exam";

export type TaskType =
  | "homework"
  | "quiz"
  | "ai-reflection"
  | "bk-reflection";

export type DueKind = "required" | "recommended";

export interface CourseItemBase {
  id: string;
  title: string;
  description: string;
  weeks: WeekNumber[];
  type: CourseItemType;
  href?: string;
  tags?: string[];
}

export interface LectureItem extends CourseItemBase {
  type: "lecture";
  durationMinutes: number;
  instructor: string;
  slidesUrl?: string;
  recordingUrl?: string;
}

export interface TaskItem extends CourseItemBase {
  type: TaskType;
  dueDate: string;
  points?: number;
  linkedLectureIds: string[];
  priority: "high" | "medium" | "low";
  dueKind: DueKind;
  detail?: string;
  showDue?: boolean;
}

export interface ResourceItem extends CourseItemBase {
  type: "resource";
  category: "reading" | "tool" | "video" | "cheatsheet";
  relatedTaskIds: string[];
}

export interface DeadlineItem {
  id: string;
  title: string;
  type: TaskType | "project-presentation" | "exam";
  dueDate: string;
  week: WeekNumber;
  href?: string;
  dueKind: DueKind;
  detail?: string;
}

export interface ExamItem extends CourseItemBase {
  type: "exam";
  date: string;
  format: string;
}

export interface WeeklyMapNode {
  id: string;
  type: CourseItemType;
  title: string;
  summary?: string;
  href?: string;
  progressStatus?: "not-started" | "correct" | "incorrect";
  statusLabel?: string;
}

export interface WeeklyMapEdge {
  from: string;
  to: string;
  label?: string;
}

export interface WeekBundle {
  week: WeekNumber;
  lectures: LectureItem[];
  tasks: TaskItem[];
  resources: ResourceItem[];
  deadlines: DeadlineItem[];
  mapNodes: WeeklyMapNode[];
  mapEdges: WeeklyMapEdge[];
  recommendations: string[];
}

export interface CourseOverview {
  courseCode: string;
  courseTitle: string;
  subtitle: string;
  weeks: WeekNumber[];
  lectures: LectureItem[];
  tasks: TaskItem[];
  resources: ResourceItem[];
  deadlines: DeadlineItem[];
  exams: ExamItem[];
  quickLinks: Array<{ label: string; href: string; description: string }>;
}

export interface SagCheck {
  id: string;
  label: string;
  description: string;
}

export interface SagStage {
  id: string;
  name: string;
  order: number;
  checks: SagCheck[];
  passRule: string;
  retryPolicy: string;
  feedbackWindow: string;
  commonFailures: string[];
}

export interface SagOverview {
  title: string;
  summary: string;
  stages: SagStage[];
  gradingWeights: Array<{ label: string; weight: string }>;
  studentTips: string[];
}

export interface ApiEnvelope<T> {
  source: "live" | "mock";
  generatedAt: string;
  data: T;
  error?: string;
}

export type WeekProgressSource = "local-tasks" | "ed-forum" | "course-pages";

export interface WeekProgressSnapshot {
  completed: number;
  total: number;
  percentage: number;
  source: WeekProgressSource;
  externalSignalsEnabled: boolean;
}

export interface DailyQuote {
  text: string;
  source: string;
}

export type SetupPlatform = "windows" | "mac";

export interface SetupInstructionStep {
  title: string;
  detail: string;
  commands?: string[];
  links?: Array<{ label: string; href: string }>;
  note?: string;
}

export interface SetupInstruction {
  platform: SetupPlatform;
  steps: SetupInstructionStep[];
}

export interface SetupVideoLink {
  platform: SetupPlatform;
  label: string;
  href: string;
}

export interface GitBashCommand {
  command: string;
  description: string;
}

export type QuestionProgressStatus = "not-started" | "correct" | "incorrect";

export interface HomeworkQuestion {
  id: string;
  label: string;
  prompt: string;
}

export interface HomeworkMock {
  id: string;
  week: WeekNumber;
  title: string;
  questions: HomeworkQuestion[];
}
