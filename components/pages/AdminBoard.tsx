"use client";

import type { ChangeEvent, Dispatch, DragEvent, ReactNode, SetStateAction } from "react";
import { useMemo, useRef, useState, useTransition, useEffect } from "react";
import {
  CalendarDays,
  Clock,
  Eye,
  EyeOff,
  FileText,
  LoaderCircle,
  RotateCcw,
  Save,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import type { ClassNoteItem, ClassNotesPayload } from "@/lib/class-notes/types";
import type {
  AdminDeadlineOverride,
  AdminEditableContent,
  AdminTaskOverride,
  CourseAdminOverrides,
} from "@/lib/admin/overrides";
import { COURSE_WEEKS, type DeadlineItem, type TaskItem, type WeekNumber } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";

interface AdminResponse {
  ok: boolean;
  username?: string;
  overrides?: CourseAdminOverrides;
  base?: AdminEditableContent;
  error?: string;
}

type Segment = "dates" | "files" | "preview";
type VisibilityFilter = "all" | "visible" | "hidden";
type ChipTone = "visible" | "hidden" | "dirty" | "saved" | "neutral" | "error";
type QueueStatus = "queued" | "invalid" | "uploading" | "uploaded" | "error";

interface UploadQueueItem {
  id: string;
  file: File;
  title: string;
  week: WeekNumber;
  status: QueueStatus;
  message?: string;
  note?: ClassNoteItem;
}

type ScheduleRow =
  | {
      kind: "task";
      id: string;
      itemType: TaskItem["type"];
      title: string;
      dueDate: string;
      hidden: boolean;
      showDue: boolean;
      canToggleDue: true;
      dueKind: TaskItem["dueKind"];
      unsaved: boolean;
      task: TaskItem;
    }
  | {
      kind: "deadline";
      id: string;
      itemType: DeadlineItem["type"];
      title: string;
      dueDate: string;
      hidden: boolean;
      showDue: true;
      canToggleDue: false;
      dueKind: DeadlineItem["dueKind"];
      unsaved: boolean;
      deadline: DeadlineItem;
    };

const emptyOverrides = (): CourseAdminOverrides => ({
  version: 1,
  tasks: {},
  deadlines: {},
  resources: {},
  reflections: {},
});

const isReflectionTask = (task: TaskItem) => task.type === "ai-reflection" || task.type === "bk-reflection";
const taskSection = (task: TaskItem) => (isReflectionTask(task) ? "reflections" : "tasks");
const sortClassNotes = (notes: ClassNoteItem[]) =>
  [...notes].sort((left, right) => left.week - right.week || left.title.localeCompare(right.title));
const overrideSignature = (override: unknown) => JSON.stringify(override ?? {});
const hasUnsavedOverride = (current: unknown, saved: unknown) =>
  overrideSignature(current) !== overrideSignature(saved);
const taskIdFromDeadline = (deadline: DeadlineItem) =>
  deadline.id.startsWith("ddl-") ? deadline.id.slice(4) : undefined;

const segmentConfig: Array<{ id: Segment; label: string; icon: typeof CalendarDays }> = [
  { id: "dates", label: "Dates", icon: CalendarDays },
  { id: "files", label: "Files", icon: UploadCloud },
  { id: "preview", label: "Preview", icon: Eye },
];

const allowedClassNoteTypes: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
};

export function AdminBoard() {
  const [selectedWeek, setSelectedWeek] = useState<WeekNumber>(1);
  const [activeSegment, setActiveSegment] = useState<Segment>("dates");
  const [base, setBase] = useState<AdminEditableContent | null>(null);
  const [overrides, setOverrides] = useState<CourseAdminOverrides>(emptyOverrides);
  const [savedOverrides, setSavedOverrides] = useState<CourseAdminOverrides>(emptyOverrides);
  const [classNotes, setClassNotes] = useState<ClassNoteItem[]>([]);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;

    const load = async () => {
      setStatus("loading");
      setMessage(null);
      try {
        const [response, notesResponse] = await Promise.all([
          fetch("/api/admin/overrides"),
          fetch("/api/admin/class-notes"),
        ]);
        const payload = (await response.json()) as AdminResponse;
        if (!response.ok || !payload.ok || !payload.base || !payload.overrides) {
          throw new Error(payload.error ?? "Admin overrides unavailable.");
        }
        const notesPayload = (await notesResponse.json()) as ClassNotesPayload;
        if (!notesResponse.ok || !notesPayload.ok) {
          throw new Error(notesPayload.error ?? "Class notes unavailable.");
        }

        if (active) {
          setBase(payload.base);
          setOverrides(payload.overrides);
          setSavedOverrides(payload.overrides);
          setClassNotes(sortClassNotes(notesPayload.notes ?? []));
          setUsername(payload.username ?? "");
          setStatus("ready");
        }
      } catch (error) {
        if (active) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Admin overrides unavailable.");
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const updateTask = (task: TaskItem, patch: AdminTaskOverride) => {
    const section = taskSection(task);
    setOverrides((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [task.id]: {
          ...current[section][task.id],
          ...patch,
        },
      },
    }));
  };

  const updateDeadline = (id: string, patch: AdminDeadlineOverride) => {
    setOverrides((current) => ({
      ...current,
      deadlines: {
        ...current.deadlines,
        [id]: {
          ...current.deadlines[id],
          ...patch,
        },
      },
    }));
  };

  const save = () => {
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch("/api/admin/overrides", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ overrides }),
        });
        const payload = (await response.json()) as AdminResponse;
        if (!response.ok || !payload.ok || !payload.overrides) {
          throw new Error(payload.error ?? "Save failed.");
        }
        setOverrides(payload.overrides);
        setSavedOverrides(payload.overrides);
        setMessage("Saved local portal overrides.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Save failed.");
      }
    });
  };

  const reset = () => {
    startTransition(async () => {
      setMessage(null);
      try {
        const response = await fetch("/api/admin/overrides/reset", { method: "POST" });
        const payload = (await response.json()) as AdminResponse;
        if (!response.ok || !payload.ok || !payload.overrides) {
          throw new Error(payload.error ?? "Reset failed.");
        }
        setOverrides(payload.overrides);
        setSavedOverrides(payload.overrides);
        setMessage("Reset local portal overrides.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Reset failed.");
      }
    });
  };

  if (status === "loading") {
    return <StateCard title="Loading admin editor..." message="Reading local portal override data." />;
  }

  if (status === "error" || !base) {
    return <StateCard title="Admin editor unavailable" message={message ?? "Unable to load admin data."} />;
  }

  const weekTasks = base.tasks.filter((task) => task.weeks.includes(selectedWeek));
  const taskIds = new Set(base.tasks.map((task) => task.id));
  const weekStandaloneDeadlines = base.deadlines.filter((deadline) => {
    if (deadline.week !== selectedWeek) {
      return false;
    }

    const taskId = taskIdFromDeadline(deadline);
    return !taskId || !taskIds.has(taskId);
  });
  const weekClassNotes = classNotes.filter((note) => note.week === selectedWeek);

  const scheduleRows: ScheduleRow[] = [
    ...weekTasks.map((task): ScheduleRow => {
      const section = taskSection(task);
      const override = overrides[section][task.id];
      const savedOverride = savedOverrides[section][task.id];
      return {
        kind: "task",
        id: task.id,
        itemType: task.type,
        title: override?.title ?? task.title,
        dueDate: override?.dueDate ?? task.dueDate,
        hidden: Boolean(override?.hidden),
        showDue: override?.showDue ?? task.showDue ?? true,
        canToggleDue: true,
        dueKind: task.dueKind,
        unsaved: hasUnsavedOverride(override, savedOverride),
        task,
      };
    }),
    ...weekStandaloneDeadlines.map((deadline): ScheduleRow => {
      const override = overrides.deadlines[deadline.id];
      const savedOverride = savedOverrides.deadlines[deadline.id];
      return {
        kind: "deadline",
        id: deadline.id,
        itemType: deadline.type,
        title: override?.title ?? deadline.title,
        dueDate: override?.dueDate ?? deadline.dueDate,
        hidden: Boolean(override?.hidden),
        showDue: true,
        canToggleDue: false,
        dueKind: deadline.dueKind,
        unsaved: hasUnsavedOverride(override, savedOverride),
        deadline,
      };
    }),
  ].sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

  const unsavedCount = scheduleRows.filter((row) => row.unsaved).length;
  const hiddenCount =
    scheduleRows.filter((row) => row.hidden || (row.canToggleDue && !row.showDue)).length +
    weekClassNotes.filter((note) => note.hidden).length;
  const hasUnsavedChanges = hasUnsavedOverride(overrides, savedOverrides);
  const lastSaved = formatSavedAt(savedOverrides.updatedAt);

  return (
    <div className="space-y-4">
      <section className="surface-card sticky top-3 z-20 p-4 shadow-md">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="kicker">Admin Workbench</p>
            <h2 className="mt-1 text-lg font-semibold">Professor date and file controls</h2>
            <p className="mt-1 text-sm text-muted">
              Signed in as {username || "admin"}. Edits stay local until Save and never write to the teacher site.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:min-w-[560px]">
            <Metric label="Week" value={String(selectedWeek)} />
            <Metric label="Editable" value={String(scheduleRows.length + weekClassNotes.length)} />
            <Metric label="Hidden/date off" value={String(hiddenCount)} />
            <Metric label="Unsaved" value={String(unsavedCount)} tone={hasUnsavedChanges ? "dirty" : "saved"} />
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" className="button-ghost gap-2 px-3 py-2 text-sm" disabled={isPending} onClick={reset}>
              <RotateCcw className="size-4" />
              Reset
            </button>
            <button type="button" className="button-primary gap-2 px-3 py-2 text-sm" disabled={isPending} onClick={save}>
              {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <StatusChip tone={hasUnsavedChanges ? "dirty" : "saved"}>
              {hasUnsavedChanges ? "Unsaved changes" : "Saved locally"}
            </StatusChip>
            <StatusChip tone="neutral">Last saved: {lastSaved}</StatusChip>
          </div>
          {message ? <p className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm text-muted">{message}</p> : null}
        </div>
      </section>

      <section className="surface-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="kicker mb-2">Week Selector</p>
            <div className="flex flex-wrap gap-2">
              {COURSE_WEEKS.map((week) => (
                <button
                  key={week}
                  type="button"
                  onClick={() => setSelectedWeek(week)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm transition",
                    selectedWeek === week ? "bg-[var(--accent)] text-white" : "surface-muted",
                  )}
                >
                  Week {week}
                </button>
              ))}
            </div>
          </div>

          <div className="inline-flex overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
            {segmentConfig.map((segment) => {
              const Icon = segment.icon;
              const selected = activeSegment === segment.id;
              return (
                <button
                  key={segment.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActiveSegment(segment.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                    selected ? "bg-[var(--accent)] text-white shadow-sm" : "text-muted hover:bg-[var(--surface)] hover:text-[var(--text)]",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {segment.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {activeSegment === "dates" ? (
        <DateWorkbench rows={scheduleRows} updateTask={updateTask} updateDeadline={updateDeadline} />
      ) : null}

      {activeSegment === "files" ? (
        <ClassNotesManager selectedWeek={selectedWeek} notes={weekClassNotes} setNotes={setClassNotes} />
      ) : null}

      {activeSegment === "preview" ? (
        <PreviewPanel selectedWeek={selectedWeek} rows={scheduleRows} classNotes={weekClassNotes} />
      ) : null}
    </div>
  );
}

function StateCard({ title, message }: { title: string; message: string }) {
  return (
    <section className="surface-card p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{message}</p>
    </section>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "dirty" | "saved" }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold leading-none", tone === "dirty" && "text-[var(--warning)]", tone === "saved" && "text-[var(--success)]")}>
        {value}
      </p>
    </div>
  );
}

function DateWorkbench({
  rows,
  updateTask,
  updateDeadline,
}: {
  rows: ScheduleRow[];
  updateTask: (task: TaskItem, patch: AdminTaskOverride) => void;
  updateDeadline: (id: string, patch: AdminDeadlineOverride) => void;
}) {
  const patchRow = (row: ScheduleRow, patch: AdminTaskOverride | AdminDeadlineOverride) => {
    if (row.kind === "task") {
      updateTask(row.task, patch as AdminTaskOverride);
      return;
    }

    updateDeadline(row.id, patch as AdminDeadlineOverride);
  };

  return (
    <section className="surface-card p-5">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kicker">Dates</p>
          <h3 className="mt-1 text-base font-semibold">Weekly schedule table</h3>
          <p className="mt-1 text-sm text-muted">Edit title, date, time, visibility, and due display.</p>
        </div>
        <StatusChip tone="neutral">{rows.length} row(s)</StatusChip>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
        <table className="min-w-[920px] w-full border-collapse bg-[var(--surface)] text-left text-sm">
          <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-[0.12em] text-muted">
            <tr>
              <th className="w-44 border-b border-[var(--border)] px-3 py-3 font-semibold">Type</th>
              <th className="border-b border-[var(--border)] px-3 py-3 font-semibold">Title</th>
              <th className="w-44 border-b border-[var(--border)] px-3 py-3 font-semibold">Date</th>
              <th className="w-36 border-b border-[var(--border)] px-3 py-3 font-semibold">Time</th>
              <th className="w-40 border-b border-[var(--border)] px-3 py-3 font-semibold">Visibility</th>
              <th className="w-36 border-b border-[var(--border)] px-3 py-3 font-semibold">Due</th>
              <th className="w-32 border-b border-[var(--border)] px-3 py-3 font-semibold">State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.kind}-${row.id}`} className={cn("border-b border-[var(--border)] last:border-b-0", row.hidden && "opacity-70")}>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-col gap-2">
                    <span className="font-semibold">{formatItemType(row.itemType)}</span>
                    <span className={cn("w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold", row.dueKind === "required" ? "bg-rose-500/10 text-[var(--danger)]" : "bg-[var(--accent-soft)] text-[var(--accent)]")}>
                      {row.dueKind}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 align-top">
                  <TextField
                    label={`${row.title} title`}
                    hideLabel
                    value={row.title}
                    onChange={(title) => patchRow(row, { title })}
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <input
                    aria-label={`${row.title} date`}
                    type="date"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    value={datePart(row.dueDate)}
                    onChange={(event) => patchRow(row, { dueDate: replaceDatePart(row.dueDate, event.target.value) })}
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <input
                    aria-label={`${row.title} time`}
                    type="time"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    value={timePart(row.dueDate)}
                    onChange={(event) => patchRow(row, { dueDate: replaceTimePart(row.dueDate, event.target.value) })}
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <button
                    type="button"
                    className="button-ghost w-full gap-2 px-3 py-2 text-sm"
                    onClick={() => patchRow(row, { hidden: !row.hidden })}
                    aria-pressed={row.hidden}
                  >
                    {row.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    {row.hidden ? "Hidden" : "Visible"}
                  </button>
                </td>
                <td className="px-3 py-3 align-top">
                  {row.canToggleDue ? (
                    <label className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm font-semibold">
                      <input
                        type="checkbox"
                        checked={row.showDue}
                        onChange={(event) => patchRow(row, { showDue: event.target.checked })}
                      />
                      Show due
                    </label>
                  ) : (
                    <span className="inline-flex min-h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-muted">
                      Always shown
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  <StatusChip tone={row.unsaved ? "dirty" : "saved"}>{row.unsaved ? "Unsaved" : "Saved"}</StatusChip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm text-muted">No editable schedule rows for this week.</p>
      ) : null}
    </section>
  );
}

function ClassNotesManager({
  selectedWeek,
  notes,
  setNotes,
}: {
  selectedWeek: WeekNumber;
  notes: ClassNoteItem[];
  setNotes: Dispatch<SetStateAction<ClassNoteItem[]>>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [dragActive, setDragActive] = useState(false);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [note.title, note.originalFileName]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedQuery));
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && !note.hidden) ||
        (visibilityFilter === "hidden" && note.hidden);
      return matchesQuery && matchesVisibility;
    });
  }, [notes, query, visibilityFilter]);

  const upsertNote = (note: ClassNoteItem) => {
    setNotes((current) => sortClassNotes([...current.filter((item) => item.id !== note.id), note]));
  };

  const removeNote = (id: string) => {
    setNotes((current) => current.filter((item) => item.id !== id));
  };

  const addFiles = (files: FileList | File[]) => {
    const nextItems = Array.from(files).map((file) => buildQueueItem(file, selectedWeek));
    if (nextItems.length === 0) {
      return;
    }

    setQueue((current) => [...current, ...nextItems]);
    setMessage(`${nextItems.length} file(s) added to the upload queue.`);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      addFiles(event.target.files);
    }
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  };

  const updateQueueItem = (id: string, patch: Partial<UploadQueueItem>) => {
    setQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const uploadQueuedFiles = async () => {
    const queuedItems = queue.filter((item) => item.status === "queued");
    if (queuedItems.length === 0) {
      setMessage("No valid queued files to upload.");
      return;
    }

    setUploading(true);
    setMessage(null);
    for (const item of queuedItems) {
      updateQueueItem(item.id, { status: "uploading", message: "Uploading..." });
      try {
        const form = new FormData();
        form.set("week", String(item.week));
        form.set("title", item.title || cleanTitleFromFileName(item.file.name));
        form.set("originalFileName", item.file.name);
        form.set("file", item.file, item.file.name);

        const response = await fetch("/api/admin/class-notes/upload", {
          method: "POST",
          body: form,
        });
        const payload = (await response.json()) as ClassNotesPayload;
        if (!response.ok || !payload.ok || !payload.note) {
          throw new Error(payload.error ?? "Upload failed.");
        }

        upsertNote(payload.note);
        updateQueueItem(item.id, {
          status: "uploaded",
          message: "Uploaded",
          note: payload.note,
          title: payload.note.title,
          week: payload.note.week,
        });
      } catch (error) {
        updateQueueItem(item.id, {
          status: "error",
          message: error instanceof Error ? error.message : "Upload failed.",
        });
      }
    }
    setUploading(false);
  };

  const queuedCount = queue.filter((item) => item.status === "queued").length;

  return (
    <section className="surface-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kicker">Files</p>
          <h3 className="mt-1 text-base font-semibold">Bulk Class Notes upload</h3>
          <p className="mt-1 text-sm text-muted">Drop PDF or image files, review titles and weeks, then upload them into the local portal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="button-ghost gap-2 px-3 py-2 text-sm" onClick={() => fileInputRef.current?.click()}>
            <FileText className="size-4" />
            Choose files
          </button>
          <button
            type="button"
            className="button-primary gap-2 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={uploading || queuedCount === 0}
            onClick={uploadQueuedFiles}
          >
            {uploading ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
            Upload queued
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        className="sr-only"
        aria-label="Class note files"
        type="file"
        multiple
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={handleFileInput}
      />

      <div
        className={cn(
          "mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-6 text-center transition",
          dragActive && "border-[var(--accent)] bg-[var(--accent-soft)]",
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <UploadCloud className="mx-auto size-8 text-[var(--accent)]" />
        <p className="mt-2 text-sm font-semibold">Drop Class Notes here</p>
        <p className="mt-1 text-xs text-muted">Allowed: PDF, PNG, JPG/JPEG, WEBP. Titles are generated from file names and can be edited before upload.</p>
      </div>

      {message ? <p className="mt-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm text-muted">{message}</p> : null}

      {queue.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Upload queue</p>
            <button
              type="button"
              className="button-ghost gap-2 px-3 py-1.5 text-xs"
              onClick={() => setQueue((current) => current.filter((item) => item.status !== "uploaded"))}
            >
              <X className="size-3.5" />
              Clear uploaded
            </button>
          </div>
          {queue.map((item) => (
            <UploadQueueRow key={item.id} item={item} onUpdate={updateQueueItem} onRemove={(id) => setQueue((current) => current.filter((entry) => entry.id !== id))} />
          ))}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-end">
          <TextField label="Search class notes" value={query} onChange={setQuery} icon={<Search className="size-4 text-muted" />} />
          <label className="block text-xs font-semibold text-muted">
            Visibility
            <select
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value as VisibilityFilter)}
            >
              <option value="all">All</option>
              <option value="visible">Student-visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          <div className="pb-2 text-xs text-muted">
            Showing {filteredNotes.length} of {notes.length} Week {selectedWeek} note(s)
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <ClassNoteEditor key={note.id} note={note} onSaved={upsertNote} onDeleted={removeNote} />
          ))
        ) : (
          <p className="rounded-xl bg-[var(--surface-2)] p-3 text-sm text-muted">No Class Notes match the current Week {selectedWeek} filters.</p>
        )}
      </div>
    </section>
  );
}

function UploadQueueRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: UploadQueueItem;
  onUpdate: (id: string, patch: Partial<UploadQueueItem>) => void;
  onRemove: (id: string) => void;
}) {
  const editable = item.status === "queued" || item.status === "invalid" || item.status === "error";

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={queueTone(item.status)}>{queueLabel(item.status)}</StatusChip>
            <span className="text-xs text-muted">{formatFileSize(item.file.size)}</span>
          </div>
          <p className="mt-2 truncate text-sm font-semibold">{item.file.name}</p>
          {item.message ? <p className="mt-1 text-xs text-muted">{item.message}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {item.note ? (
            <a className="button-ghost gap-2 px-3 py-2 text-sm" href={item.note.previewHref} target="_blank" rel="noreferrer">
              <Eye className="size-4" />
              Preview
            </a>
          ) : null}
          <button type="button" className="button-ghost gap-2 px-3 py-2 text-sm" disabled={item.status === "uploading"} onClick={() => onRemove(item.id)}>
            <Trash2 className="size-4" />
            Remove
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_140px]">
        <TextField
          label={`${item.file.name} title`}
          value={item.title}
          disabled={!editable}
          onChange={(title) => onUpdate(item.id, { title })}
        />
        <label className="block text-xs font-semibold text-muted">
          Week
          <select
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] disabled:opacity-70"
            value={item.week}
            disabled={!editable}
            onChange={(event) => onUpdate(item.id, { week: Number(event.target.value) as WeekNumber })}
          >
            {COURSE_WEEKS.map((week) => (
              <option key={week} value={week}>
                Week {week}
              </option>
            ))}
          </select>
        </label>
      </div>
    </article>
  );
}

function ClassNoteEditor({
  note,
  onSaved,
  onDeleted,
}: {
  note: ClassNoteItem;
  onSaved: (note: ClassNoteItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [week, setWeek] = useState<WeekNumber>(note.week);
  const [hidden, setHidden] = useState(note.hidden);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const dirty = title !== note.title || week !== note.week || hidden !== note.hidden;

  const save = async () => {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/class-notes/${note.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, week, hidden }),
      });
      const payload = (await response.json()) as ClassNotesPayload;
      if (!response.ok || !payload.ok || !payload.note) {
        throw new Error(payload.error ?? "Save failed.");
      }

      onSaved(payload.note);
      setMessage("Saved class note locally.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setPending(false);
    }
  };

  const remove = async () => {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/class-notes/${note.id}`, { method: "DELETE" });
      const payload = (await response.json()) as ClassNotesPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Delete failed.");
      }

      onDeleted(note.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
      setPending(false);
    }
  };

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{note.title}</h3>
          <p className="mt-1 text-xs text-muted">
            {note.fileType.toUpperCase()} / {note.originalFileName}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusChip tone={hidden ? "hidden" : "visible"}>{hidden ? "Hidden" : "Student-visible"}</StatusChip>
            <StatusChip tone={dirty ? "dirty" : "saved"}>{dirty ? "Unsaved changes" : "Saved locally"}</StatusChip>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="button-ghost gap-2 px-3 py-2 text-sm" href={note.previewHref} target="_blank" rel="noreferrer">
            <Eye className="size-4" />
            Preview
          </a>
          <button type="button" className="button-ghost gap-2 px-3 py-2 text-sm" disabled={pending} onClick={remove}>
            <Trash2 className="size-4" />
            Delete
          </button>
          <button type="button" className="button-primary gap-2 px-3 py-2 text-sm" disabled={pending || !dirty} onClick={save}>
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_140px_auto]">
        <TextField label="Title" value={title} onChange={setTitle} />
        <label className="block text-xs font-semibold text-muted">
          Week
          <select
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            value={week}
            onChange={(event) => setWeek(Number(event.target.value) as WeekNumber)}
          >
            {COURSE_WEEKS.map((item) => (
              <option key={item} value={item}>
                Week {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
          <input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />
          Hidden
        </label>
      </div>
      {message ? <p className="mt-3 rounded-xl bg-[var(--surface)] p-3 text-sm text-muted">{message}</p> : null}
    </article>
  );
}

function PreviewPanel({
  selectedWeek,
  rows,
  classNotes,
}: {
  selectedWeek: WeekNumber;
  rows: ScheduleRow[];
  classNotes: ClassNoteItem[];
}) {
  const visibleRows = rows.filter((row) => !row.hidden && (!row.canToggleDue || row.showDue));
  const visibleClassNotes = classNotes.filter((note) => !note.hidden);

  return (
    <section className="surface-card p-5" aria-label="Preview as student">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kicker">Preview as student</p>
          <h3 className="mt-1 text-base font-semibold">Week {selectedWeek}</h3>
          <p className="mt-1 text-sm text-muted">Only visible schedule dates and visible Class Notes appear below.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusChip tone="neutral">{visibleRows.length} visible date(s)</StatusChip>
          <StatusChip tone="neutral">{visibleClassNotes.length} visible file(s)</StatusChip>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="size-4 text-[var(--accent)]" />
            <p className="text-sm font-semibold">Visible dates</p>
          </div>
          <div className="space-y-2">
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{row.title}</p>
                      <p className="mt-1 text-xs text-muted">{formatItemType(row.itemType)}</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs text-muted">
                      <Clock className="size-3.5" />
                      {formatDueDate(row.dueDate)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No visible dates for this week.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="size-4 text-[var(--accent)]" />
            <p className="text-sm font-semibold">Visible Class Notes</p>
          </div>
          <div className="space-y-2">
            {visibleClassNotes.length > 0 ? (
              visibleClassNotes.map((note) => (
                <div key={note.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <p className="truncate text-sm font-semibold">{note.title}</p>
                  <p className="mt-1 text-xs text-muted">{note.fileType.toUpperCase()} / {note.originalFileName}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No visible class notes for this week.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]",
        tone === "visible" && "bg-[var(--accent-soft)] text-[var(--accent)]",
        tone === "hidden" && "bg-rose-500/10 text-[var(--danger)]",
        tone === "dirty" && "bg-amber-500/15 text-[var(--warning)]",
        tone === "saved" && "bg-emerald-500/10 text-[var(--success)]",
        tone === "neutral" && "bg-[var(--surface-2)] text-muted",
        tone === "error" && "bg-rose-500/10 text-[var(--danger)]",
      )}
    >
      {children}
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  hideLabel = false,
  disabled = false,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hideLabel?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-muted">
      <span className={hideLabel ? "sr-only" : undefined}>{label}</span>
      <span className={cn("relative block", !hideLabel && "mt-1")}>
        {icon ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span> : null}
        <input
          className={cn(
            "w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] disabled:opacity-70",
            Boolean(icon) && "pl-9",
          )}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function buildQueueItem(file: File, selectedWeek: WeekNumber): UploadQueueItem {
  const validationError = validateClassNoteFile(file);
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    title: cleanTitleFromFileName(file.name),
    week: selectedWeek,
    status: validationError ? "invalid" : "queued",
    message: validationError,
  };
}

function validateClassNoteFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const extension = Object.keys(allowedClassNoteTypes).find((candidate) => lowerName.endsWith(candidate));
  if (!extension) {
    return "Only PDF, PNG, JPG, JPEG, and WEBP files are allowed.";
  }

  const allowedMimeTypes = allowedClassNoteTypes[extension];
  if (file.type && !allowedMimeTypes.includes(file.type)) {
    return "File type does not match the allowed extension.";
  }

  return undefined;
}

function cleanTitleFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160) || fileName;
}

function datePart(value: string) {
  return value.slice(0, 10);
}

function timePart(value: string) {
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? "23:59";
}

function replaceDatePart(current: string, nextDate: string) {
  if (!nextDate) {
    return current;
  }

  return `${nextDate}T${timePart(current)}:00`;
}

function replaceTimePart(current: string, nextTime: string) {
  if (!nextTime) {
    return current;
  }

  return `${datePart(current)}T${nextTime}:00`;
}

function formatDueDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${datePart(value)} ${timePart(value)}`;
}

function formatSavedAt(value?: string) {
  if (!value) {
    return "not yet";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")} ${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

function formatItemType(value: ScheduleRow["itemType"]) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function queueTone(status: QueueStatus): ChipTone {
  if (status === "uploaded") {
    return "saved";
  }
  if (status === "invalid" || status === "error") {
    return "error";
  }
  if (status === "uploading") {
    return "dirty";
  }
  return "neutral";
}

function queueLabel(status: QueueStatus) {
  if (status === "queued") {
    return "Queued";
  }
  if (status === "invalid") {
    return "Invalid";
  }
  if (status === "uploading") {
    return "Uploading";
  }
  if (status === "uploaded") {
    return "Uploaded";
  }
  return "Error";
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
