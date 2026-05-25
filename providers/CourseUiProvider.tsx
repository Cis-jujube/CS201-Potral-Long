"use client";

import {
  useCallback,
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

import { DEFAULT_THEME_MODE, DEFAULT_WEEK } from "@/lib/config/themeTokens";
import type { QuestionProgressStatus, ThemeMode, WeekNumber } from "@/lib/course/types";
import { readString, writeValue } from "@/lib/storage/clientStore";
import { STORAGE_KEYS } from "@/lib/storage/keys";

interface CourseUiContextValue {
  selectedWeek: WeekNumber;
  setSelectedWeek: (week: WeekNumber) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  globalQuery: string;
  setGlobalQuery: (query: string) => void;
  completedTaskIds: string[];
  toggleTaskCompleted: (taskId: string) => void;
  bookmarkedResourceIds: string[];
  toggleResourceBookmarked: (resourceId: string) => void;
  questionProgressMap: Record<string, QuestionProgressStatus>;
  setQuestionProgressStatus: (questionId: string, status: QuestionProgressStatus) => void;
  weekNavCollapsed: boolean;
  setWeekNavCollapsed: (collapsed: boolean) => void;
}

const CourseUiContext = createContext<CourseUiContextValue | null>(null);
const COURSE_UI_STORAGE_EVENT = "course-ui-storage";
const EMPTY_STORAGE_SNAPSHOT = "";

const toWeek = (value: number): WeekNumber => {
  if (value >= 1 && value <= 7) {
    return value as WeekNumber;
  }

  return DEFAULT_WEEK;
};

const toTheme = (value: string): ThemeMode => {
  return value === "dark" ? "dark" : DEFAULT_THEME_MODE;
};

const parseStringArray = (value: string): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const parseQuestionProgressMap = (value: string): Record<string, QuestionProgressStatus> => {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, QuestionProgressStatus>>((accumulator, [questionId, status]) => {
      if (status === "correct" || status === "incorrect" || status === "not-started") {
        accumulator[questionId] = status;
      }
      return accumulator;
    }, {});
  } catch {
    return {};
  }
};

const subscribeToCourseUiStorage = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(COURSE_UI_STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(COURSE_UI_STORAGE_EVENT, callback);
  };
};

const getServerStorageSnapshot = () => EMPTY_STORAGE_SNAPSHOT;

const notifyCourseUiStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(COURSE_UI_STORAGE_EVENT));
};

const writeCourseUiValue = (
  key: string,
  value: string | number | string[] | Record<string, string>,
) => {
  writeValue(key, value);
  notifyCourseUiStorage();
};

const useCourseUiStorageRaw = (key: string) => {
  const getSnapshot = useCallback(() => readString(key, EMPTY_STORAGE_SNAPSHOT), [key]);
  return useSyncExternalStore(subscribeToCourseUiStorage, getSnapshot, getServerStorageSnapshot);
};

export function CourseUiProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const selectedWeekRaw = useCourseUiStorageRaw(STORAGE_KEYS.selectedWeek);
  const themeModeRaw = useCourseUiStorageRaw(STORAGE_KEYS.themeMode);
  const persistedGlobalQuery = useCourseUiStorageRaw(STORAGE_KEYS.homeSearchQuery);
  const completedTaskIdsRaw = useCourseUiStorageRaw(STORAGE_KEYS.completedTaskIds);
  const bookmarkedResourceIdsRaw = useCourseUiStorageRaw(STORAGE_KEYS.bookmarkedResourceIds);
  const questionProgressMapRaw = useCourseUiStorageRaw(STORAGE_KEYS.questionProgressMap);
  const weekNavCollapsedRaw = useCourseUiStorageRaw(STORAGE_KEYS.weekNavCollapsed);

  const selectedWeek = toWeek(Number(selectedWeekRaw));
  const themeMode = toTheme(themeModeRaw);
  const completedTaskIds = useMemo(() => parseStringArray(completedTaskIdsRaw), [completedTaskIdsRaw]);
  const bookmarkedResourceIds = useMemo(() => parseStringArray(bookmarkedResourceIdsRaw), [bookmarkedResourceIdsRaw]);
  const questionProgressMap = useMemo(
    () => parseQuestionProgressMap(questionProgressMapRaw),
    [questionProgressMapRaw],
  );
  const weekNavCollapsed = weekNavCollapsedRaw === "true";

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
  }, [themeMode]);

  const setSelectedWeek = useCallback((week: WeekNumber) => {
    startTransition(() => writeCourseUiValue(STORAGE_KEYS.selectedWeek, week));
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    startTransition(() => writeCourseUiValue(STORAGE_KEYS.themeMode, mode));
  }, []);

  const setGlobalQuery = useCallback((query: string) => {
    startTransition(() => writeCourseUiValue(STORAGE_KEYS.homeSearchQuery, query));
  }, []);

  const globalQuery = searchParams.get("q") ?? persistedGlobalQuery;

  const toggleTaskCompleted = useCallback((taskId: string) => {
    const next = completedTaskIds.includes(taskId)
      ? completedTaskIds.filter((id) => id !== taskId)
      : [...completedTaskIds, taskId];
    writeCourseUiValue(STORAGE_KEYS.completedTaskIds, next);
  }, [completedTaskIds]);

  const toggleResourceBookmarked = useCallback((resourceId: string) => {
    const next = bookmarkedResourceIds.includes(resourceId)
      ? bookmarkedResourceIds.filter((id) => id !== resourceId)
      : [...bookmarkedResourceIds, resourceId];
    writeCourseUiValue(STORAGE_KEYS.bookmarkedResourceIds, next);
  }, [bookmarkedResourceIds]);

  const setQuestionProgressStatus = useCallback((questionId: string, status: QuestionProgressStatus) => {
    writeCourseUiValue(STORAGE_KEYS.questionProgressMap, { ...questionProgressMap, [questionId]: status });
  }, [questionProgressMap]);

  const setWeekNavCollapsed = useCallback((collapsed: boolean) => {
    startTransition(() => writeCourseUiValue(STORAGE_KEYS.weekNavCollapsed, collapsed ? "true" : "false"));
  }, []);

  const value = useMemo<CourseUiContextValue>(
    () => ({
      selectedWeek,
      setSelectedWeek,
      themeMode,
      setThemeMode,
      globalQuery,
      setGlobalQuery,
      completedTaskIds,
      toggleTaskCompleted,
      bookmarkedResourceIds,
      toggleResourceBookmarked,
      questionProgressMap,
      setQuestionProgressStatus,
      weekNavCollapsed,
      setWeekNavCollapsed,
    }),
    [
      selectedWeek,
      setSelectedWeek,
      themeMode,
      setThemeMode,
      globalQuery,
      completedTaskIds,
      setGlobalQuery,
      bookmarkedResourceIds,
      toggleTaskCompleted,
      toggleResourceBookmarked,
      questionProgressMap,
      setQuestionProgressStatus,
      weekNavCollapsed,
      setWeekNavCollapsed,
    ],
  );

  return <CourseUiContext.Provider value={value}>{children}</CourseUiContext.Provider>;
}

export const useCourseUi = () => {
  const context = useContext(CourseUiContext);
  if (!context) {
    throw new Error("useCourseUi must be used inside CourseUiProvider");
  }

  return context;
};
