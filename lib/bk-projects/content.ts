import type { WeekNumber } from "@/lib/course/types";

export const BK_PROJECT_PRESENTATION_WEEKS: WeekNumber[] = [2, 3, 5, 7];

export const BK_PROJECT_PHASES: Array<{
  id: string;
  title: string;
  weeks: WeekNumber[];
  summary: string;
}> = [
  {
    id: "phase-a",
    title: "Project Group A",
    weeks: [1, 2, 3],
    summary: "Early project cycle. Week 2 and Week 3 include presentation and voting checkpoints.",
  },
  {
    id: "phase-b",
    title: "Project Group B",
    weeks: [4, 5, 6, 7],
    summary: "Second project cycle. Week 5 and Week 7 include presentation and voting checkpoints.",
  },
];

export const isBkPresentationWeek = (week: WeekNumber) => BK_PROJECT_PRESENTATION_WEEKS.includes(week);
