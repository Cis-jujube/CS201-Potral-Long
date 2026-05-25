import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";

describe("deadline kinds", () => {
  it("marks homework and reflections as recommended while keeping quizzes required on Sunday", () => {
    const hw1 = MOCK_COURSE_OVERVIEW.tasks.find((task) => task.id === "hw1");
    const quiz = MOCK_COURSE_OVERVIEW.tasks.find((task) => task.type === "quiz");
    const aiReflection = MOCK_COURSE_OVERVIEW.tasks.find((task) => task.type === "ai-reflection");
    const bkReflection = MOCK_COURSE_OVERVIEW.tasks.find((task) => task.type === "bk-reflection");
    const aiDeadline = MOCK_COURSE_OVERVIEW.deadlines.find((deadline) => deadline.type === "ai-reflection");
    const bkDeadline = MOCK_COURSE_OVERVIEW.deadlines.find((deadline) => deadline.type === "bk-reflection");

    expect(hw1?.dueKind).toBe("recommended");
    expect(hw1?.dueDate).toBe("2026-03-17T23:59:00");
    expect(quiz?.dueKind).toBe("required");
    expect(quiz?.dueDate).toBe("2026-03-22T23:59:00");
    expect(aiReflection?.dueKind).toBe("recommended");
    expect(aiReflection?.dueDate).toBe("2026-03-22T23:59:00");
    expect(aiReflection?.showDue).toBeUndefined();
    expect(aiDeadline?.dueKind).toBe("recommended");
    expect(aiDeadline?.dueDate).toBe("2026-03-22T23:59:00");
    expect(bkReflection?.dueKind).toBe("recommended");
    expect(bkReflection?.dueDate).toBe("2026-03-29T23:59:00");
    expect(bkDeadline?.dueKind).toBe("recommended");
    expect(bkDeadline?.dueDate).toBe("2026-03-29T23:59:00");
  });

  it("models the current reflection schedule in task and deadline data", () => {
    const reflectionCountsByWeek = new Map<number, { ai: number; bk: number }>();

    MOCK_COURSE_OVERVIEW.tasks
      .filter((task) => task.type === "ai-reflection" || task.type === "bk-reflection")
      .forEach((task) => {
        const week = task.weeks[0];
        const counts = reflectionCountsByWeek.get(week) ?? { ai: 0, bk: 0 };
        if (task.type === "ai-reflection") {
          counts.ai += 1;
        } else {
          counts.bk += 1;
        }
        reflectionCountsByWeek.set(week, counts);
      });

    expect(reflectionCountsByWeek.get(1)).toEqual({ ai: 1, bk: 0 });
    expect(reflectionCountsByWeek.get(2)).toEqual({ ai: 1, bk: 2 });
    expect(reflectionCountsByWeek.get(3)).toEqual({ ai: 1, bk: 2 });
    expect(reflectionCountsByWeek.get(4)).toEqual({ ai: 1, bk: 0 });
    expect(reflectionCountsByWeek.get(5)).toEqual({ ai: 1, bk: 2 });
    expect(reflectionCountsByWeek.get(6)).toEqual({ ai: 1, bk: 0 });
    expect(reflectionCountsByWeek.get(7)).toEqual({ ai: 1, bk: 2 });
  });

  it("keeps BK presentations in the calendar without fake project milestone tasks", () => {
    expect(MOCK_COURSE_OVERVIEW.tasks.some((task) => task.title.includes("Project Milestone"))).toBe(false);
    expect(MOCK_COURSE_OVERVIEW.tasks.some((task) => String(task.type) === "project-presentation")).toBe(false);

    const presentationWeeks = MOCK_COURSE_OVERVIEW.deadlines
      .filter((deadline) => deadline.type === "project-presentation")
      .map((deadline) => deadline.week);

    expect(presentationWeeks).toEqual([2, 3, 5, 7]);
    expect(presentationWeeks).not.toContain(6);
  });
});
