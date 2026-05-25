import type { WeekNumber } from "@/lib/course/types";

export const SUNDAY_DUE_BY_WEEK: Record<WeekNumber, string> = {
  1: "2026-03-22T23:59:00",
  2: "2026-03-29T23:59:00",
  3: "2026-04-05T23:59:00",
  4: "2026-04-12T23:59:00",
  5: "2026-04-19T23:59:00",
  6: "2026-04-26T23:59:00",
  7: "2026-05-03T23:59:00",
};

export const AI_REFLECTION_RECOMMENDED_DUE_BY_WEEK = SUNDAY_DUE_BY_WEEK;
export const BK_REFLECTION_RECOMMENDED_DUE_BY_WEEK = SUNDAY_DUE_BY_WEEK;
export const QUIZ_REQUIRED_DUE_BY_WEEK = SUNDAY_DUE_BY_WEEK;

export const getWeeklySundayDueDate = (week: WeekNumber) => SUNDAY_DUE_BY_WEEK[week];

export const getAiReflectionRecommendedDueDate = (week: WeekNumber) => getWeeklySundayDueDate(week);

export const getBkReflectionRecommendedDueDate = (week: WeekNumber) => getWeeklySundayDueDate(week);

export const getQuizRequiredDueDate = (week: WeekNumber) => getWeeklySundayDueDate(week);
