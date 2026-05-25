import courseSiteArchive from "@/data/course-site/normalized.json";
import type { CourseSiteArchive, CourseSitePage, CourseSitePlacement } from "@/lib/course-site/types";

export const COURSE_SITE_ARCHIVE = courseSiteArchive as CourseSiteArchive;

const PLACEMENT_PRIORITY_TERMS: Record<CourseSitePlacement, string[]> = {
  home: ["compsci 201", "course logistics", "title page", "schedule", "hours", "follow"],
  sag: ["roadmap", "getting started", "sag", "git repo", "working with sag", "error faq"],
  homework: ["lab session materials", "homework", "java programming assignments", "hw git repo", "assignment"],
  resources: ["textbook and resources", "textbook", "lecture videos", "markmap", "animation", "supplement"],
  exams: ["exam policy", "session exam", "final", "grading policy"],
  faq: ["staff", "hours and locations", "syllabus", "grading policy", "exam policy", "faq"],
  archive: [],
};

const searchableText = (page: CourseSitePage) =>
  [page.title, page.navigationPath.join(" "), page.headings.join(" ")]
    .join(" ")
    .toLowerCase();

const getPlacementRank = (page: CourseSitePage, placement: CourseSitePlacement) => {
  const text = searchableText(page);
  const terms = PLACEMENT_PRIORITY_TERMS[placement];
  const index = terms.findIndex((term) => text.includes(term));

  if (index === -1) {
    return 10_000;
  }

  return index;
};

export const getCourseSitePagesByPlacement = (placement: CourseSitePlacement): CourseSitePage[] => {
  return COURSE_SITE_ARCHIVE.pages
    .filter((page) => page.placements.includes(placement))
    .sort((a, b) => {
      const rankDiff = getPlacementRank(a, placement) - getPlacementRank(b, placement);
      if (rankDiff !== 0) {
        return rankDiff;
      }

      return a.title.localeCompare(b.title);
    });
};

export const getCourseSitePagePreview = (page: CourseSitePage): string => {
  const block = page.blocks.find((item) => item.text.trim().length > 0);
  if (!block) {
    return page.headings.slice(0, 3).join(" / ") || "Open the archived source for details.";
  }

  return block.text.length > 220 ? `${block.text.slice(0, 217)}...` : block.text;
};

export const getCourseSiteLinkCounts = (page: CourseSitePage) => {
  return page.links.reduce(
    (accumulator, link) => {
      accumulator[link.type] += 1;
      return accumulator;
    },
    { internal: 0, external: 0, download: 0, video: 0 },
  );
};
