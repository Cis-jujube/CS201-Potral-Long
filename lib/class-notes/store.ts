import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { getClassNotePreviewHref } from "@/lib/class-notes/content";
import type { ClassNoteFileType, ClassNoteItem } from "@/lib/class-notes/types";
import { COURSE_WEEKS, type WeekNumber } from "@/lib/course/types";

const PUBLIC_BASE_HREF = "/course-materials/class-notes";

const ALLOWED_FILE_TYPES: Record<string, { mimeTypes: string[]; fileType: ClassNoteFileType }> = {
  ".pdf": { mimeTypes: ["application/pdf"], fileType: "pdf" },
  ".png": { mimeTypes: ["image/png"], fileType: "image" },
  ".jpg": { mimeTypes: ["image/jpeg"], fileType: "image" },
  ".jpeg": { mimeTypes: ["image/jpeg"], fileType: "image" },
  ".webp": { mimeTypes: ["image/webp"], fileType: "image" },
};

interface CreateClassNoteInput {
  week: WeekNumber;
  title: string;
  description?: string;
  file: File;
  originalFileName?: string;
  createdBy: string;
}

interface UpdateClassNoteInput {
  week?: WeekNumber;
  title?: string;
  description?: string;
  hidden?: boolean;
}

const getMetadataPath = () =>
  process.env.NODE_ENV === "test" && process.env.CS201_CLASS_NOTES_PATH
    ? process.env.CS201_CLASS_NOTES_PATH
    : path.join(process.cwd(), "data", "admin-overrides", "class-notes.json");

const getPublicDir = () =>
  process.env.NODE_ENV === "test" && process.env.CS201_CLASS_NOTES_PUBLIC_DIR
    ? process.env.CS201_CLASS_NOTES_PUBLIC_DIR
    : path.join(process.cwd(), "public", "course-materials", "class-notes");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toOptionalString = (value: unknown, fallback?: string) =>
  typeof value === "string" ? value : fallback;

const toBoolean = (value: unknown, fallback = false) => (typeof value === "boolean" ? value : fallback);

export const parseClassNoteWeek = (value: unknown): WeekNumber => {
  const number = Number(value);
  if (COURSE_WEEKS.includes(number as WeekNumber)) {
    return number as WeekNumber;
  }

  throw new Error("Week must be between 1 and 7.");
};

const sanitizeTitle = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Title is required.");
  }

  return value.trim().slice(0, 160);
};

const sanitizeDescription = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, 1000) : undefined;

const safeOriginalName = (value: string) => path.basename(value).replace(/[^\w.\- ()]/g, "_").slice(0, 180);

const buildPublicHref = (storedFileName: string) => `${PUBLIC_BASE_HREF}/${storedFileName}`;

const normalizeClassNote = (value: unknown): ClassNoteItem | null => {
  if (!isRecord(value)) {
    return null;
  }

  try {
    const id = toOptionalString(value.id);
    const storedFileName = toOptionalString(value.storedFileName);
    const originalFileName = toOptionalString(value.originalFileName);
    const title = toOptionalString(value.title);
    const mimeType = toOptionalString(value.mimeType);
    const fileType = value.fileType;
    const createdAt = toOptionalString(value.createdAt);
    const createdBy = toOptionalString(value.createdBy);

    if (
      !id ||
      !storedFileName ||
      !originalFileName ||
      !title ||
      !mimeType ||
      !createdAt ||
      !createdBy ||
      (fileType !== "pdf" && fileType !== "image")
    ) {
      return null;
    }

    return {
      id,
      week: parseClassNoteWeek(value.week),
      title,
      description: toOptionalString(value.description),
      originalFileName,
      storedFileName,
      mimeType,
      size: Number(value.size ?? 0),
      fileType,
      publicHref: toOptionalString(value.publicHref) ?? buildPublicHref(storedFileName),
      previewHref: toOptionalString(value.previewHref) ?? getClassNotePreviewHref({ id }),
      hidden: toBoolean(value.hidden),
      createdAt,
      createdBy,
      updatedAt: toOptionalString(value.updatedAt),
      updatedBy: toOptionalString(value.updatedBy),
    };
  } catch {
    return null;
  }
};

export const sanitizeClassNotes = (value: unknown): ClassNoteItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeClassNote)
    .filter((note): note is ClassNoteItem => Boolean(note))
    .sort((left, right) => left.week - right.week || left.title.localeCompare(right.title));
};

export const readClassNotes = async (): Promise<ClassNoteItem[]> => {
  try {
    const raw = await readFile(getMetadataPath(), "utf8");
    return sanitizeClassNotes(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
};

const writeClassNotes = async (notes: ClassNoteItem[]) => {
  const metadataPath = getMetadataPath();
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify(sanitizeClassNotes(notes), null, 2)}\n`, "utf8");
};

const validateFile = (file: File, originalFileNameOverride?: string) => {
  const originalFileName = safeOriginalName(originalFileNameOverride || file.name);
  const extension = path.extname(originalFileName).toLowerCase();
  const allowed = ALLOWED_FILE_TYPES[extension];

  if (!allowed) {
    throw new Error("Only PDF, PNG, JPG, JPEG, and WEBP files are allowed.");
  }

  if (file.type && !allowed.mimeTypes.includes(file.type)) {
    throw new Error("File type does not match the allowed extension.");
  }

  return {
    extension,
    originalFileName,
    mimeType: file.type || allowed.mimeTypes[0],
    fileType: allowed.fileType,
  };
};

export const createClassNote = async ({
  week,
  title,
  description,
  file,
  originalFileName,
  createdBy,
}: CreateClassNoteInput): Promise<ClassNoteItem> => {
  const fileInfo = validateFile(file, originalFileName);
  const id = `class-note-${week}-${randomUUID().slice(0, 8)}`;
  const storedFileName = `${id}${fileInfo.extension}`;
  const publicHref = buildPublicHref(storedFileName);
  const now = new Date().toISOString();
  const note: ClassNoteItem = {
    id,
    week,
    title: sanitizeTitle(title),
    description: sanitizeDescription(description),
    originalFileName: fileInfo.originalFileName,
    storedFileName,
    mimeType: fileInfo.mimeType,
    size: file.size,
    fileType: fileInfo.fileType,
    publicHref,
    previewHref: getClassNotePreviewHref({ id }),
    hidden: false,
    createdAt: now,
    createdBy,
  };

  const publicDir = getPublicDir();
  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(publicDir, storedFileName), Buffer.from(await file.arrayBuffer()));

  const notes = await readClassNotes();
  await writeClassNotes([...notes, note]);
  return note;
};

export const updateClassNote = async (
  id: string,
  patch: UpdateClassNoteInput,
  updatedBy: string,
): Promise<ClassNoteItem> => {
  const notes = await readClassNotes();
  const index = notes.findIndex((note) => note.id === id);
  if (index === -1) {
    throw new Error("Class note not found.");
  }

  const current = notes[index];
  const updated: ClassNoteItem = {
    ...current,
    week: patch.week ?? current.week,
    title: patch.title === undefined ? current.title : sanitizeTitle(patch.title),
    description: patch.description === undefined ? current.description : sanitizeDescription(patch.description),
    hidden: patch.hidden ?? current.hidden,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  notes[index] = updated;
  await writeClassNotes(notes);
  return updated;
};

export const deleteClassNote = async (id: string): Promise<ClassNoteItem> => {
  const notes = await readClassNotes();
  const note = notes.find((item) => item.id === id);
  if (!note) {
    throw new Error("Class note not found.");
  }

  await writeClassNotes(notes.filter((item) => item.id !== id));
  await rm(path.join(getPublicDir(), note.storedFileName), { force: true });
  return note;
};

export const getClassNoteById = async (id: string, includeHidden = false) => {
  const notes = await readClassNotes();
  return notes.find((note) => note.id === id && (includeHidden || !note.hidden)) ?? null;
};

export const getVisibleClassNotesForWeek = async (week: WeekNumber) => {
  const notes = await readClassNotes();
  return notes.filter((note) => note.week === week && !note.hidden);
};

export const parseClassNotePatch = (value: unknown): UpdateClassNoteInput => {
  if (!isRecord(value)) {
    throw new Error("Patch payload must be an object.");
  }

  return {
    week: value.week === undefined ? undefined : parseClassNoteWeek(value.week),
    title: value.title === undefined ? undefined : sanitizeTitle(value.title),
    description: value.description === undefined ? undefined : sanitizeDescription(value.description),
    hidden: value.hidden === undefined ? undefined : toBoolean(value.hidden),
  };
};
