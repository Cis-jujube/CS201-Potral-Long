import {
  getCourseMaterialById,
  getLabMaterials,
  getLectureMaterials,
  groupCourseMaterialsByWeek,
} from "@/lib/course-materials/content";

describe("course materials manifest", () => {
  it("maps schedule lecture slides into week/session materials", () => {
    const basics = getLectureMaterials().find((item) => item.fileName === "CS.1.Basics.pdf");

    expect(basics).toMatchObject({
      kind: "lecture",
      week: 1,
      session: 2,
      topic: "Basics and Data types",
      available: true,
      publicHref: "/course-materials/lecture/CS.1.Basics.pdf",
    });
  });

  it("keeps missing lecture files visible with source fallback", () => {
    const prologue = getLectureMaterials().find((item) => item.fileName === "CS.0.Prologue.pdf");

    expect(prologue).toBeDefined();
    expect(prologue?.available).toBe(false);
    expect(prologue?.publicHref).toBeUndefined();
    expect(prologue?.sourceHref).toContain("/slides/CS.0.Prologue.pdf");
  });

  it("maps lab materials and answer children", () => {
    const firstLab = getLabMaterials().find((item) => item.fileName === "Week_1__Lab.DataTypes.pdf");

    expect(firstLab).toMatchObject({
      kind: "lab",
      week: 1,
      available: true,
      publicHref: "/course-materials/lab/Week_1__Lab.DataTypes.pdf",
    });
    expect(firstLab?.children?.map((child) => child.fileName)).toContain(
      "CS201.DKU.week1.Lab.DataTypes.YikeGuo.pdf",
    );
  });

  it("finds nested answer materials by preview id", () => {
    const firstLab = getLabMaterials().find((item) => item.fileName === "Week_1__Lab.DataTypes.pdf");
    const answer = firstLab?.children?.find((child) => child.fileName.includes("YikeGuo"));

    expect(answer).toBeDefined();
    expect(getCourseMaterialById(answer!.id)).toEqual(answer);
  });

  it("groups materials by week in schedule order", () => {
    const weeks = groupCourseMaterialsByWeek(getLectureMaterials());

    expect(weeks.map((week) => week.week)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(weeks[0].items.map((item) => item.fileName)).toContain("CS.1.Basics.pdf");
  });
});
