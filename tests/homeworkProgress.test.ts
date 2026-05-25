import { buildHomeworkProgressSnapshot } from "@/lib/homework/progress";
import { HOMEWORK_MOCKS } from "@/lib/mock/uiPlaceholders";

describe("buildHomeworkProgressSnapshot", () => {
  const homework = HOMEWORK_MOCKS[0];

  it("counts question status buckets correctly", () => {
    const snapshot = buildHomeworkProgressSnapshot(homework, {
      [homework.questions[0].id]: "correct",
      [homework.questions[1].id]: "incorrect",
    });

    expect(snapshot.correct).toBe(1);
    expect(snapshot.incorrect).toBe(1);
    expect(snapshot.notStarted).toBe(homework.questions.length - 2);
    expect(snapshot.isComplete).toBe(false);
  });

  it("marks homework complete when all questions are correct", () => {
    const allCorrectMap = homework.questions.reduce<Record<string, "correct">>((accumulator, question) => {
      accumulator[question.id] = "correct";
      return accumulator;
    }, {});

    const snapshot = buildHomeworkProgressSnapshot(homework, allCorrectMap);
    expect(snapshot.correct).toBe(homework.questions.length);
    expect(snapshot.isComplete).toBe(true);
  });
});
