import { normalizeCourseOverview } from "@/lib/api/normalizers";

describe("normalizers", () => {
  it("returns safe fallback values for malformed overview payload", () => {
    const normalized = normalizeCourseOverview({
      courseTitle: "Custom title",
      lectures: [{ id: 1000, week: 3 }],
      tasks: [{ id: "task-x", dueDate: "broken", weeks: [3] }],
      resources: "invalid",
    });

    expect(normalized.courseTitle).toBe("Custom title");
    expect(normalized.lectures.length).toBeGreaterThan(0);
    expect(normalized.tasks.length).toBeGreaterThan(0);
    expect(Array.isArray(normalized.resources)).toBe(true);
  });
});
