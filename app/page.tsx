"use client";

import { useDeferredValue } from "react";

import { TaskCalendar } from "@/components/home/TaskCalendar";
import { WeekSection } from "@/components/home/WeekSection";
import { WeeklyMap } from "@/components/home/WeeklyMap";
import { StatePanel } from "@/components/ui/StatePanel";
import { TaskCard } from "@/components/ui/TaskCard";
import { HOME_MODULE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { DEFAULT_STYLE_MODE } from "@/lib/config/themeTokens";
import { useCourseOverview } from "@/hooks/useCourseOverview";
import { useReflectionSync } from "@/hooks/useReflectionSync";
import { useWeeklyQuiz } from "@/hooks/useWeeklyQuiz";
import { mergeLiveQuizNodes, mergeSyncedReflectionNodes } from "@/lib/home/learningMap";
import { getHomeTileClassMap, DEFAULT_HOME_MODULE_WEIGHTS } from "@/lib/home/weightedLayout";
import { buildHomeFilterResult } from "@/lib/home/homeFilters";
import { cn } from "@/lib/utils/cn";
import { useCourseUi } from "@/providers/CourseUiProvider";

export default function HomePage() {
  const { overview, loading, error } = useCourseOverview();
  const {
    selectedWeek,
    completedTaskIds,
    toggleTaskCompleted,
    globalQuery,
  } = useCourseUi();
  const deferredWeek = useDeferredValue(selectedWeek);
  const reflectionSource = useReflectionSync(deferredWeek);
  const quizSource = useWeeklyQuiz(deferredWeek);

  if (loading) {
    return (
      <div className="space-y-4">
        <StatePanel type="loading" title="Loading course data..." message="Checking this week's materials." />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <StatePanel
        type="error"
        title="Course data is unavailable"
        message={error ?? "Unable to load course overview. Please retry."}
      />
    );
  }

  const tileClassMap = getHomeTileClassMap(DEFAULT_STYLE_MODE, DEFAULT_HOME_MODULE_WEIGHTS);
  const weekBundle = overview.weekBundles.find((bundle) => bundle.week === deferredWeek) ?? overview.weekBundles[0];
  const learningMapBundle = mergeSyncedReflectionNodes(
    weekBundle,
    reflectionSource.state === "ready" ? reflectionSource.reflection : undefined,
  );
  const quizLearningMapBundle = mergeLiveQuizNodes(
    learningMapBundle,
    quizSource.state === "ready" ? quizSource.quiz : undefined,
  );
  const filtered = buildHomeFilterResult({
    weekBundle: quizLearningMapBundle,
    overview: overview.data,
    query: globalQuery,
    completedTaskIds,
  });
  const filteredWeekBundle = {
    ...quizLearningMapBundle,
    mapNodes: filtered.mapNodes,
    mapEdges: filtered.mapEdges,
  };
  const shouldShowTasksSection = filtered.tasks.length > 0 || filtered.deadlines.length > 0;
  const mapTone = HOME_MODULE_TONE_MAP["weekly-map"];
  const tasksTone = HOME_MODULE_TONE_MAP["this-week-tasks"];
  const edLinkTone = HOME_MODULE_TONE_MAP["ed-link"];
  const textbooksTone = HOME_MODULE_TONE_MAP.textbooks;

  return (
    <div key={deferredWeek} className="week-switch-fade bento-canvas pb-8">
        {filtered.mapNodes.length > 0 ? (
          <WeekSection
            className={cn(
              "bento-tile module-tone-context module-tone-border",
              getModuleToneClass(mapTone),
              tileClassMap["weekly-map"],
            )}
            title={`Week ${deferredWeek} Learning Map`}
            subtitle="Lecture, lab, homework, and reflection items for this week."
          >
            <WeeklyMap bundle={filteredWeekBundle} />
          </WeekSection>
        ) : null}

        {shouldShowTasksSection ? (
          <WeekSection
            className={cn(
              "bento-tile module-tone-context module-tone-border",
              getModuleToneClass(tasksTone),
              tileClassMap["this-week-tasks"],
            )}
            title="Due This Week"
            subtitle="Assignments, reflections, quizzes, and calendar-only dates."
            action={
              <a className="button-ghost text-xs" href="/homework">
                HW / Quiz
              </a>
            }
          >
            <div className="space-y-4">
              {filtered.tasks.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {filtered.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      completed={completedTaskIds.includes(task.id)}
                      onToggle={toggleTaskCompleted}
                    />
                  ))}
                </div>
              ) : (
                <div className="surface-muted rounded-2xl p-4">
                  <p className="text-sm font-semibold">No listed tasks this week</p>
                  <p className="mt-1 text-xs text-muted">Calendar-only dates may still appear below.</p>
                </div>
              )}

              {filtered.deadlines.length > 0 ? (
                <div>
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold">Task Calendar</h3>
                    <p className="mt-1 text-xs text-muted">
                      Hover or focus a date to see quizzes, reflections, presentations, and exams.
                    </p>
                  </div>
                  <TaskCalendar deadlines={filtered.deadlines} />
                </div>
              ) : null}
            </div>
          </WeekSection>
        ) : null}

        {filtered.edLink ? (
          <WeekSection
            className={cn(
              "bento-tile module-tone-context module-tone-border",
              getModuleToneClass(edLinkTone),
              tileClassMap["ed-link"],
            )}
            title="ED Forum"
            subtitle="Course questions, announcements, and discussion."
          >
            <a className="surface-card-hover block p-4" href={filtered.edLink.href} target="_blank" rel="noreferrer">
              <p className="text-sm font-semibold">Open ED Forum</p>
              <p className="mt-1 text-xs text-muted">Ask questions and check class discussion.</p>
            </a>
          </WeekSection>
        ) : null}

        {filtered.textbooks.length > 0 ? (
          <WeekSection
            className={cn(
              "bento-tile module-tone-context module-tone-border",
              getModuleToneClass(textbooksTone),
              tileClassMap.textbooks,
            )}
            title="Textbooks"
            subtitle="Textbook and companion reading links."
          >
            <div className="space-y-2">
              {filtered.textbooks.map((book) => (
                <a key={book.label} href={book.href} className="surface-card-hover block p-4">
                  <p className="text-sm font-semibold">{book.label}</p>
                  <p className="mt-1 text-xs text-muted">{book.description}</p>
                </a>
              ))}
            </div>
          </WeekSection>
        ) : null}

        {filtered.isFiltering && !filtered.hasAnyMatch ? (
          <section className="bento-tile col-span-1 md:col-span-6 lg:col-span-12">
            <StatePanel
              type="empty"
              title="No matches found"
              message={`No board content matches "${filtered.query}". Try a shorter keyword or switch week.`}
            />
          </section>
        ) : null}
    </div>
  );
}
