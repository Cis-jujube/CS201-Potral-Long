"use client";

import { HomeworkPracticeBoard } from "@/components/pages/HomeworkPracticeBoard";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCourseOverview } from "@/hooks/useCourseOverview";
import { useHomeworkStatusSync } from "@/hooks/useHomeworkStatusSync";
import { useReflectionSync } from "@/hooks/useReflectionSync";
import { useWeeklyQuiz } from "@/hooks/useWeeklyQuiz";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { getHomeworksForWeek } from "@/lib/homework/content";
import { buildPracticeEntriesForWeek } from "@/lib/practice/content";
import { cn } from "@/lib/utils/cn";
import { useCourseUi } from "@/providers/CourseUiProvider";

export default function HomeworkPage() {
  const { overview, loading, error } = useCourseOverview();
  const { selectedWeek, questionProgressMap, setQuestionProgressStatus } = useCourseUi();
  const quizSource = useWeeklyQuiz(selectedWeek);
  const reflectionSource = useReflectionSync(selectedWeek);
  const homeworkStatusSource = useHomeworkStatusSync();

  if (loading) {
    return <StatePanel type="loading" title="Loading homework..." message="Syncing weekly task board." />;
  }

  if (error || !overview) {
    return (
      <StatePanel type="error" title="Homework board unavailable" message={error ?? "Cannot load homework data."} />
    );
  }

  void overview;
  const tone = PAGE_TONE_MAP.homework;
  const homeworkEntries = getHomeworksForWeek(selectedWeek);
  const practiceEntries = buildPracticeEntriesForWeek(
    selectedWeek,
    homeworkEntries,
    overview.data.tasks,
    quizSource,
    reflectionSource,
  );

  return (
    <div className="bento-canvas pb-8">
      <section
        className={cn(
          "bento-tile module-tone-context module-tone-border",
          getModuleToneClass(tone.board),
          "col-span-1 row-span-3 md:col-span-6 md:row-span-3 lg:col-span-12 lg:row-span-3",
        )}
      >
        <div className="mb-4">
          <p className="kicker">Homework Workflow</p>
          <h3 className="mt-1 text-lg font-semibold">Week {selectedWeek} Homework to Questions to Progress</h3>
        </div>
        <HomeworkPracticeBoard
          entries={practiceEntries}
          questionProgressMap={questionProgressMap}
          onSetQuestionStatus={setQuestionProgressStatus}
          onQuizRefresh={quizSource.refresh}
          homeworkStatusSource={homeworkStatusSource}
        />
      </section>
    </div>
  );
}
