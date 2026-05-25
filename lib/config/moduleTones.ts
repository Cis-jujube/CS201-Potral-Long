import type { HomeModuleKey, ModuleTone } from "@/lib/course/types";

export const MODULE_TONES: ModuleTone[] = ["violet", "blue", "cyan", "emerald", "amber", "rose"];

export const HOME_MODULE_TONE_MAP: Record<HomeModuleKey, ModuleTone> = {
  "weekly-map": "blue",
  "this-week-tasks": "blue",
  "ed-link": "blue",
  textbooks: "blue",
};

export const PAGE_TONE_MAP = {
  homework: {
    board: "violet",
  },
  resources: {
    library: "blue",
    textbooks: "cyan",
    "next-note": "amber",
    explore: "rose",
    imported: "emerald",
  },
  sag: {
    summary: "violet",
    setup: "blue",
    videos: "cyan",
    gitbash: "amber",
    imported: "emerald",
  },
  projects: {
    intro: "violet",
    board: "rose",
  },
  exams: {
    intro: "violet",
    schedule: "amber",
    resources: "cyan",
    imported: "blue",
  },
  faq: {
    intro: "violet",
    groups: "emerald",
    imported: "blue",
  },
} as const satisfies Record<string, Record<string, ModuleTone>>;

export const getModuleToneClass = (tone: ModuleTone) => `module-tone-${tone}`;

export const getModuleToneSubtleClass = (tone: ModuleTone) => `module-tone-subtle-${tone}`;
