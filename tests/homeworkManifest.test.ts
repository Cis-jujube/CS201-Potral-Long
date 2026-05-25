import { HOMEWORKS } from "@/lib/homework/content";

describe("homework manifest", () => {
  it("includes imported EuclideanDistance question details", () => {
    const hw1 = HOMEWORKS.find((homework) => homework.id === "hw1");
    const question = hw1?.questions.find((entry) => entry.title.includes("EuclideanDistance"));

    expect(hw1?.recommendedDate).toBe("2026-03-17T23:59:00.000Z");
    expect(question?.title).toBe("Exercise 1.2.18 EuclideanDistance");
    expect(question?.sections.some((section) => section.heading === "Program description")).toBe(true);
    expect(question?.sections.some((section) => section.heading === "Illustrating example(s)")).toBe(true);
    expect(question?.codeBlocks.some((block) => block.text.includes("java EuclideanDistance -3 -4"))).toBe(true);
    expect(question?.filesToSubmit).toContain("EuclideanDistance.java");
  });

  it("excludes scheduled homework entries that do not exist in the current course", () => {
    const hw18 = HOMEWORKS.find((homework) => homework.id === "hw18");
    const hw19 = HOMEWORKS.find((homework) => homework.id === "hw19");

    expect(hw18).toBeUndefined();
    expect(hw19).toBeUndefined();
  });

  it("deduplicates files to submit for every imported question", () => {
    const questions = HOMEWORKS.flatMap((homework) => homework.questions);

    questions.forEach((question) => {
      expect(question.filesToSubmit).toEqual([...new Set(question.filesToSubmit)]);
    });
  });
});
