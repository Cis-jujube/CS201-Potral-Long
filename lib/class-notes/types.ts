import type { WeekNumber } from "@/lib/course/types";

export type ClassNoteFileType = "pdf" | "image";

export interface ClassNoteItem {
  id: string;
  week: WeekNumber;
  title: string;
  description?: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: string;
  size: number;
  fileType: ClassNoteFileType;
  publicHref: string;
  previewHref: string;
  hidden: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ClassNotesPayload {
  ok: boolean;
  notes?: ClassNoteItem[];
  note?: ClassNoteItem;
  error?: string;
}
