import { getCourseSitePagesByPlacement } from "@/lib/course-site/content";
import { classifyCourseSiteLink, parseCourseSiteFixture } from "@/lib/course-site/parser";
import { inferCourseSitePlacements } from "@/lib/course-site/placement";

describe("course site parser", () => {
  it("extracts headings, deduped links, tables, and placements from a fixture", () => {
    const parsed = parseCourseSiteFixture(
      `
        <main>
          <h1>Roadmap to SAG client</h1>
          <p>Set up the HW Git Repo before working with SAG.</p>
          <a href="/courses/proxy/cs201/roadmap.html">Roadmap</a>
          <a href="/courses/proxy/cs201/roadmap.html">Duplicate Roadmap</a>
          <a href="notes.pdf">Notes</a>
          <table><tr><th>Course at DKU</th><th>Description</th></tr><tr><td>CS301</td><td>Algorithms</td></tr></table>
        </main>
      `,
      "http://repolab.colab.duke.edu:8005/courses/proxy/cs201/index.html",
    );

    expect(parsed.title).toBe("Roadmap to SAG client");
    expect(parsed.links).toHaveLength(2);
    expect(parsed.links.map((link) => link.type)).toEqual(["internal", "download"]);
    expect(parsed.tables[0].headers).toEqual(["Course at DKU", "Description"]);
    expect(parsed.placements).toContain("sag");
    expect(parsed.placements).toContain("homework");
  });

  it("classifies video and external links", () => {
    expect(classifyCourseSiteLink("https://youtube.com/watch?v=123", "Lecture video")).toBe("video");
    expect(classifyCourseSiteLink("https://example.com/resource", "External")).toBe("external");
  });
});

describe("course site placement", () => {
  it("maps known course sections to their destination pages", () => {
    expect(inferCourseSitePlacements("Exam policy and grading rules")).toEqual(["exams", "faq"]);
    expect(inferCourseSitePlacements("Textbook resources and lecture videos")).toEqual(["resources"]);
    expect(inferCourseSitePlacements("Unknown appendix")).toEqual(["archive"]);
  });

  it("prioritizes high-confidence imported pages for mixed placement panels", () => {
    const sagPages = getCourseSitePagesByPlacement("sag");
    const resourcePages = getCourseSitePagesByPlacement("resources");

    expect(sagPages[0]?.title).toMatch(/Roadmap|Getting started|SAG/i);
    expect(resourcePages[0]?.title).toMatch(/Textbook|Lecture Videos|Markmap|Animation/i);
  });
});
