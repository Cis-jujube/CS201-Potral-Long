export type CourseMaterialKind = "lecture" | "lab" | "answer";

export interface CourseMaterialItem {
  id: string;
  kind: CourseMaterialKind;
  week: number;
  session?: number;
  date?: string;
  topic?: string;
  title: string;
  fileName: string;
  assignment?: string;
  publicHref?: string;
  sourceHref?: string;
  available: boolean;
  children?: CourseMaterialItem[];
}

export interface CourseMaterialsManifest {
  generatedAt: string;
  source: {
    scheduleUrl: string;
    labUrl: string;
    slideSourceDir: string;
    labSourceDir: string;
    importedAssetsDir: string;
  };
  items: CourseMaterialItem[];
}
