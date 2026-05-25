import type { ApiEnvelope, CourseOverview, SagOverview, WeekBundle, WeekNumber } from "@/lib/course/types";

export interface OverviewResponse extends ApiEnvelope<CourseOverview> {
  weekBundles: WeekBundle[];
}

const safeJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Failed request: ${response.status}`);
  }

  return (await response.json()) as T;
};

export const getOverviewClient = () => safeJson<OverviewResponse>("/api/course/overview");

export const getWeekClient = (week: WeekNumber) => safeJson<ApiEnvelope<WeekBundle>>(`/api/course/week/${week}`);

export const getSagClient = () => safeJson<ApiEnvelope<SagOverview>>("/api/course/sag");
