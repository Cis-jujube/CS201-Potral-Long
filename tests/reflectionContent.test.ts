import {
  buildFallbackReflectionWeekPayload,
  getReflectionQuestionnaireNumbersForWeek,
} from "@/lib/reflections/content";
import type { WeekNumber } from "@/lib/course/types";

describe("reflection content", () => {
  it("uses the course reflection schedule: weeks 1/4/6 only AI and weeks 2/3/5/7 AI plus two BK", () => {
    const expected: Record<WeekNumber, number[]> = {
      1: [1],
      2: [1, 2, 3],
      3: [1, 2, 3],
      4: [1],
      5: [1, 2, 3],
      6: [1],
      7: [1, 2, 3],
    };

    Object.entries(expected).forEach(([week, questionnaireNumbers]) => {
      expect(getReflectionQuestionnaireNumbersForWeek(Number(week) as WeekNumber)).toEqual(questionnaireNumbers);
    });
  });

  it("builds fallback reflection entries from the same schedule", () => {
    expect(buildFallbackReflectionWeekPayload(5).questionnaires.map((item) => item.label)).toEqual([
      "Questionnaire 1: AI Reflection",
      "Questionnaire 2: BK Reflection",
      "Questionnaire 3: BK Reflection",
    ]);
    expect(buildFallbackReflectionWeekPayload(6).questionnaires.map((item) => item.label)).toEqual([
      "Questionnaire 1: AI Reflection",
    ]);
  });
});
