import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";
import { getHomeworksForWeek } from "@/lib/homework/content";
import { buildPracticeEntriesForWeek } from "@/lib/practice/content";
import { buildReflectionQuestionnaire, buildReflectionWeekPayload } from "@/lib/reflections/content";

describe("practice content", () => {
  it("orders homework, reflections, then quiz for the selected week", () => {
    const entries = buildPracticeEntriesForWeek(1, getHomeworksForWeek(1), MOCK_COURSE_OVERVIEW.tasks, {
      state: "unconfigured",
      error: "Quiz account not configured.",
    });

    expect(entries.map((entry) => entry.kind)).toEqual(["homework", "homework", "homework", "ai-reflection", "quiz"]);
    expect(entries.at(-1)?.questions[0]?.title).toBe("Quiz account not configured");
  });

  it("turns reflection tasks into a single recommended Sunday instruction question", () => {
    const entries = buildPracticeEntriesForWeek(2, getHomeworksForWeek(2), MOCK_COURSE_OVERVIEW.tasks, {
      state: "unconfigured",
      error: "Quiz account not configured.",
    });
    const reflection = entries.find((entry) => entry.kind === "bk-reflection");

    expect(reflection?.dueKind).toBe("recommended");
    expect(reflection?.dueDate).toBe("2026-03-29T23:59:00");
    expect(reflection?.questions).toHaveLength(1);
    expect(reflection?.questions[0]?.title).toBe("Reflection Instructions");
  });

  it("keeps AI reflection available with recommended due metadata", () => {
    const entries = buildPracticeEntriesForWeek(1, getHomeworksForWeek(1), MOCK_COURSE_OVERVIEW.tasks, {
      state: "unconfigured",
      error: "Quiz account not configured.",
    });
    const reflection = entries.find((entry) => entry.kind === "ai-reflection");

    expect(reflection?.dueDate).toBe("2026-03-22T23:59:00");
    expect(reflection?.dueKind).toBe("recommended");
    expect(reflection?.statusLabel).toBe("Recommended");
    expect(reflection?.questions[0]?.metadata).toContain("Recommended due");
  });

  it("uses synced reflection payloads instead of static reflection tasks", () => {
    const reflection = buildReflectionWeekPayload({
      week: 7,
      syncStatus: "synced",
      questionnaires: [1, 2, 3].map((questionnaireNo) =>
        buildReflectionQuestionnaire({
          week: 7,
          questionnaireNo,
          syncStatus: "synced",
          canSubmit: true,
        }),
      ),
    });
    const entries = buildPracticeEntriesForWeek(
      7,
      getHomeworksForWeek(7),
      MOCK_COURSE_OVERVIEW.tasks,
      {
        state: "unconfigured",
        error: "Quiz account not configured.",
      },
      { state: "ready", reflection },
    );

    const aiReflection = entries.find((entry) => entry.kind === "ai-reflection");
    const bkReflection = entries.find((entry) => entry.kind === "bk-reflection");

    expect(aiReflection?.statusLabel).toBe("Synced");
    expect(aiReflection?.dueDate).toBe("2026-05-03T23:59:00");
    expect(aiReflection?.dueKind).toBe("recommended");
    expect(aiReflection?.questions).toHaveLength(1);
    expect(aiReflection?.questions[0]?.metadata).toContain("Recommended due");
    expect(bkReflection?.dueDate).toBe("2026-05-03T23:59:00");
    expect(bkReflection?.dueKind).toBe("recommended");
    expect(bkReflection?.questions.map((question) => question.label)).toEqual([
      "Questionnaire 2: BK Reflection",
      "Questionnaire 3: BK Reflection",
    ]);
  });
});
