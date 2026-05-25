import type { ClassNoteItem } from "@/lib/class-notes/types";

export const getClassNotePreviewHref = (note: Pick<ClassNoteItem, "id">) =>
  `/resources/class-notes/${note.id}`;

export const isClassNoteImage = (note: Pick<ClassNoteItem, "fileType">) => note.fileType === "image";
