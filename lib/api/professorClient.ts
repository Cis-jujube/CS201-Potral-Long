import { normalizeCourseOverview, normalizeSagOverview } from "@/lib/api/normalizers";
import { applyStoredCourseOverrides } from "@/lib/admin/overrides";
import { getWeekBundle } from "@/lib/course/selectors";
import type { ApiEnvelope, CourseOverview, SagOverview, WeekBundle, WeekNumber } from "@/lib/course/types";
import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";
import { MOCK_SAG_OVERVIEW } from "@/lib/mock/sagData";

const API_BASE_URL = process.env.COURSE_API_BASE_URL;
const API_KEY = process.env.COURSE_API_KEY;

const cacheOptions = { next: { revalidate: 300 } } as const;

const buildHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (API_KEY) {
    headers.Authorization = `Bearer ${API_KEY}`;
  }

  return headers;
};

const safeJsonFetch = async <T>(path: string): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error("COURSE_API_BASE_URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...cacheOptions,
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Professor API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

const buildEnvelope = <T>(data: T, source: "live" | "mock", error?: string): ApiEnvelope<T> => ({
  source,
  data,
  generatedAt: new Date().toISOString(),
  error,
});

export const getOverviewEnvelope = async (): Promise<ApiEnvelope<CourseOverview>> => {
  try {
    const livePayload = await safeJsonFetch<unknown>("/overview");
    const normalized = normalizeCourseOverview(livePayload);
    return buildEnvelope(await applyStoredCourseOverrides(normalized), "live");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    return buildEnvelope(await applyStoredCourseOverrides(MOCK_COURSE_OVERVIEW), "mock", message);
  }
};

export const getWeekEnvelope = async (week: WeekNumber): Promise<ApiEnvelope<WeekBundle>> => {
  try {
    const livePayload = await safeJsonFetch<unknown>(`/week/${week}`);
    const normalized = normalizeCourseOverview(livePayload);
    return buildEnvelope(getWeekBundle(await applyStoredCourseOverrides(normalized), week), "live");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    return buildEnvelope(getWeekBundle(await applyStoredCourseOverrides(MOCK_COURSE_OVERVIEW), week), "mock", message);
  }
};

export const getTasksEnvelope = async (): Promise<ApiEnvelope<CourseOverview["tasks"]>> => {
  try {
    const livePayload = await safeJsonFetch<unknown>("/tasks");
    const normalized = normalizeCourseOverview({ ...MOCK_COURSE_OVERVIEW, tasks: livePayload });
    return buildEnvelope((await applyStoredCourseOverrides(normalized)).tasks, "live");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    return buildEnvelope((await applyStoredCourseOverrides(MOCK_COURSE_OVERVIEW)).tasks, "mock", message);
  }
};

export const getResourcesEnvelope = async (): Promise<ApiEnvelope<CourseOverview["resources"]>> => {
  try {
    const livePayload = await safeJsonFetch<unknown>("/resources");
    const normalized = normalizeCourseOverview({ ...MOCK_COURSE_OVERVIEW, resources: livePayload });
    return buildEnvelope((await applyStoredCourseOverrides(normalized)).resources, "live");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    return buildEnvelope((await applyStoredCourseOverrides(MOCK_COURSE_OVERVIEW)).resources, "mock", message);
  }
};

export const getSagEnvelope = async (): Promise<ApiEnvelope<SagOverview>> => {
  try {
    const livePayload = await safeJsonFetch<unknown>("/sag");
    const normalized = normalizeSagOverview(livePayload);
    return buildEnvelope(normalized, "live");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown API error";
    return buildEnvelope(MOCK_SAG_OVERVIEW, "mock", message);
  }
};
