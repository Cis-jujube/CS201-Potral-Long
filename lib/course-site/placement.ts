import type { CourseSitePlacement } from "@/lib/course-site/types";

const hasAny = (value: string, terms: string[]) => terms.some((term) => value.includes(term));
const hasPattern = (value: string, pattern: RegExp) => pattern.test(value);

export const inferCourseSitePlacements = (input: string): CourseSitePlacement[] => {
  const value = input.toLowerCase();
  const placements = new Set<CourseSitePlacement>();

  if (hasAny(value, ["setting up environment", "auto-grading", "auto grading", "hw git repo", "git repo"]) ||
    hasPattern(value, /\bsag\b|\bworking with sag\b|\bsag error\b/)) {
    placements.add("sag");
  }

  if (hasAny(value, ["homework", "hw ", "hw-", "lab session", "lab material", "assignment", "git repo"])) {
    placements.add("homework");
  }

  if (
    hasAny(value, [
      "textbook",
      "lecture video",
      "video",
      "animation",
      "course supplement",
      "quick guide",
      "resource",
      "slides",
    ])
  ) {
    placements.add("resources");
  }

  if (hasAny(value, ["exam policy", "final assessment", "midterm"]) || hasPattern(value, /\bexams?\b/)) {
    placements.add("exams");
  }

  if (hasAny(value, ["staff", "hours", "location", "grading", "policy", "faq", "flex-weighted"])) {
    placements.add("faq");
  }

  if (hasAny(value, ["follow up", "follow-up", "course description", "schedule", "compsci 201", "intro to programming"])) {
    placements.add("home");
  }

  return placements.size > 0 ? [...placements] : ["archive"];
};

export const isCourseSitePlacement = (value: string): value is CourseSitePlacement => {
  return ["home", "sag", "homework", "resources", "exams", "faq", "archive"].includes(value);
};
