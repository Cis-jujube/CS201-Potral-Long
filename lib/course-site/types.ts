export type CourseSitePlacement =
  | "home"
  | "sag"
  | "homework"
  | "resources"
  | "exams"
  | "faq"
  | "archive";

export type CourseSiteLinkType = "internal" | "external" | "download" | "video";

export interface CourseSiteLink {
  text: string;
  href: string;
  type: CourseSiteLinkType;
}

export interface CourseSiteTable {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface CourseSiteBlock {
  heading?: string;
  text: string;
}

export interface CourseSitePage {
  id: string;
  title: string;
  url: string;
  navigationPath: string[];
  headings: string[];
  blocks: CourseSiteBlock[];
  tables: CourseSiteTable[];
  links: CourseSiteLink[];
  placements: CourseSitePlacement[];
}

export interface CourseSiteWhiteboard {
  imagePath?: string;
  summary: string;
  workflow: string[];
}

export interface CourseSiteArchive {
  generatedAt: string;
  sourceUrl: string;
  pages: CourseSitePage[];
  failedUrls: Array<{ url: string; reason: string }>;
  whiteboard: CourseSiteWhiteboard;
}
