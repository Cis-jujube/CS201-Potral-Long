import { calculateWeekProgress, getWeekBundle } from "@/lib/course/selectors";
import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";

describe("course selectors", () => {
  it("builds week bundle filtered by selected week", () => {
    const bundle = getWeekBundle(MOCK_COURSE_OVERVIEW, 3);

    expect(bundle.week).toBe(3);
    expect(bundle.tasks.every((task) => task.weeks.includes(3))).toBe(true);
    expect(bundle.lectures.every((lecture) => lecture.weeks.includes(3))).toBe(true);
  });

  it("computes progress based on completed task IDs", () => {
    const bundle = getWeekBundle(MOCK_COURSE_OVERVIEW, 1);
    const progress = calculateWeekProgress(bundle.tasks, [bundle.tasks[0].id]);

    expect(progress.total).toBe(bundle.tasks.length);
    expect(progress.completed).toBe(1);
    expect(progress.percentage).toBeGreaterThan(0);
  });
});
