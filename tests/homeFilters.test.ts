import { getWeekBundle } from "@/lib/course/selectors";
import { buildHomeFilterResult } from "@/lib/home/homeFilters";
import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";

describe("buildHomeFilterResult", () => {
  const weekBundle = getWeekBundle(MOCK_COURSE_OVERVIEW, 1);

  it("returns full content when query is empty", () => {
    const result = buildHomeFilterResult({
      weekBundle,
      overview: MOCK_COURSE_OVERVIEW,
      query: "",
      completedTaskIds: [],
    });

    expect(result.isFiltering).toBe(false);
    expect(result.hasAnyMatch).toBe(true);
    expect(result.tasks.length).toBe(weekBundle.tasks.length);
    expect(result.deadlines.length).toBeGreaterThan(0);
    expect(result.mapNodes.length).toBe(weekBundle.mapNodes.length);
    expect(result.edLink).not.toBeNull();
    expect(result.textbooks.length).toBeGreaterThan(0);
  });

  it("filters content by keyword across modules", () => {
    const result = buildHomeFilterResult({
      weekBundle,
      overview: MOCK_COURSE_OVERVIEW,
      query: "textbook",
      completedTaskIds: [],
    });

    expect(result.isFiltering).toBe(true);
    expect(result.hasAnyMatch).toBe(true);
    expect(result.textbooks.some((item) => item.label.toLowerCase().includes("textbook"))).toBe(true);
  });

  it("returns unified empty state condition when nothing matches", () => {
    const result = buildHomeFilterResult({
      weekBundle,
      overview: MOCK_COURSE_OVERVIEW,
      query: "no-such-keyword-xyz",
      completedTaskIds: [],
    });

    expect(result.isFiltering).toBe(true);
    expect(result.hasAnyMatch).toBe(false);
    expect(result.tasks).toHaveLength(0);
    expect(result.deadlines).toHaveLength(0);
    expect(result.mapNodes).toHaveLength(0);
    expect(result.edLink).toBeNull();
    expect(result.textbooks).toHaveLength(0);
  });
});
