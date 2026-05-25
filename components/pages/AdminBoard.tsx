"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";

import type { ClassNoteItem, ClassNotesPayload } from "@/lib/class-notes/types";
import type {
  AdminDeadlineOverride,
  AdminEditableContent,
  AdminResourceOverride,
  AdminTaskOverride,
  CourseAdminOverrides,
} from "@/lib/admin/overrides";
import { COURSE_WEEKS, type ResourceItem, type TaskItem, type WeekNumber } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";

interface AdminResponse {
  ok: boolean;
  username?: string;
  overrides?: CourseAdminOverrides;
  base?: AdminEditableContent;
  error?: string;
}

const emptyOverrides = (): CourseAdminOverrides => ({
  version: 1,
  tasks: {},
  deadlines: {},
  resources: {},
  reflections: {},
});

const isReflectionTask = (task: TaskItem) => task.type === "ai-reflection" || task.type === "bk-reflection";
const sortClassNotes = (notes: ClassNoteItem[]) =>
  [...notes].sort((left, right) => left.week - right.week || left.title.localeCompare(right.title));
const overrideSignature = (override: unknown) => JSON.stringify(override ?? {});
const hasUnsavedOverride = (current: unknown, saved: unknown) =>
  overrideSignature(current) !== overrideSignature(saved);
const isStudentVisible = (hidden?: boolean) => hidden !== true;

type VisibilityFilter = "all" | "visible" | "hidden";
type ChipTone = "visible" | "hidden" | "dirty" | "saved" | "neutral";

export function AdminBoard() {
  const [selectedWeek, setSelectedWeek] = useState<WeekNumber>(1);
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
    const section = isReflectionTask(task) ? "reflections" : "tasks";
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

  const updateResource = (id: string, patch: AdminResourceOverride) => {
    setOverrides((current) => ({
      ...current,
      resources: {
        ...current.resources,
        [id]: {
          ...current.resources[id],
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
  const weekDeadlines = base.deadlines.filter((deadline) => deadline.week === selectedWeek);
  const weekResources = base.resources.filter((resource) => resource.weeks.includes(selectedWeek));
  const weekClassNotes = classNotes.filter((note) => note.week === selectedWeek);
  const hasUnsavedChanges = hasUnsavedOverride(overrides, savedOverrides);

  return (
    <div className="space-y-4">
      <section className="surface-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="kicker">Admin v1</p>
            <h2 className="mt-1 text-lg font-semibold">Local content publishing workbench</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Signed in as {username || "admin"}. These edits change the local portal only and never write to the teacher x.bk site.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusChip tone={hasUnsavedChanges ? "dirty" : "saved"}>
                {hasUnsavedChanges ? "Unsaved changes" : "Saved locally"}
              </StatusChip>
              <StatusChip tone="neutral">Explicit Save required</StatusChip>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="button-ghost px-3 py-2 text-sm" disabled={isPending} onClick={reset}>
              Reset
            </button>
            <button type="button" className="button-primary px-3 py-2 text-sm" disabled={isPending} onClick={save}>
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
        {message ? <p className="mt-3 rounded-xl bg-[var(--surface-2)] p-3 text-sm text-muted">{message}</p> : null}
      </section>

      <section className="surface-card p-4">
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
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <EditorSection
            title="Content"
            description="Edit weekly task, reflection, and resource cards. Hidden items are removed from the student portal after Save."
          >
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Tasks and reflections</p>
              {weekTasks.map((task) => {
                const section = isReflectionTask(task) ? "reflections" : "tasks";
                return (
                  <TaskEditor
                    key={task.id}
                    task={task}
                    override={overrides[section][task.id]}
                    savedOverride={savedOverrides[section][task.id]}
                    onUpdate={updateTask}
                  />
                );
              })}
            </div>

            <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Resource cards</p>
              {weekResources.length > 0 ? (
                weekResources.map((resource) => (
                  <ResourceEditor
                    key={resource.id}
                    resource={resource}
                    override={overrides.resources[resource.id]}
                    savedOverride={savedOverrides.resources[resource.id]}
                    onUpdate={updateResource}
                  />
                ))
              ) : (
                <p className="text-sm text-muted">No local resource cards are attached to this week.</p>
              )}
            </div>
          </EditorSection>

          <EditorSection
            title="Calendar"
            description="Control calendar-only visibility and date copy. Recommended and required due kinds keep their existing semantics."
          >
            {weekDeadlines.map((deadline) => (
              <article key={deadline.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{deadline.title}</h3>
                    <p className="mt-1 text-xs text-muted">{deadline.type}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusChip tone={isStudentVisible(overrides.deadlines[deadline.id]?.hidden) ? "visible" : "hidden"}>
                        {isStudentVisible(overrides.deadlines[deadline.id]?.hidden) ? "Student-visible" : "Hidden"}
                      </StatusChip>
                      <StatusChip tone={hasUnsavedOverride(overrides.deadlines[deadline.id], savedOverrides.deadlines[deadline.id]) ? "dirty" : "saved"}>
                        {hasUnsavedOverride(overrides.deadlines[deadline.id], savedOverrides.deadlines[deadline.id]) ? "Unsaved changes" : "Saved locally"}
                      </StatusChip>
                    </div>
                  </div>
                  <HiddenToggle
                    checked={Boolean(overrides.deadlines[deadline.id]?.hidden)}
                    onChange={(hidden) => updateDeadline(deadline.id, { hidden })}
                  />
                </div>
                <TextField label="Title" value={overrides.deadlines[deadline.id]?.title ?? deadline.title} onChange={(title) => updateDeadline(deadline.id, { title })} />
                <TextField label="Date" value={overrides.deadlines[deadline.id]?.dueDate ?? deadline.dueDate} onChange={(dueDate) => updateDeadline(deadline.id, { dueDate })} />
                <TextAreaField label="Detail" value={overrides.deadlines[deadline.id]?.detail ?? deadline.detail ?? ""} onChange={(detail) => updateDeadline(deadline.id, { detail })} />
              </article>
            ))}
          </EditorSection>

          <EditorSection
            title="Files / Class Notes"
            description="Upload, hide, and maintain local PDF/image class notes for the selected week."
          >
            <ClassNotesManager selectedWeek={selectedWeek} notes={weekClassNotes} setNotes={setClassNotes} />
          </EditorSection>
        </div>

        <PreviewPanel
          selectedWeek={selectedWeek}
          tasks={weekTasks}
          resources={weekResources}
          classNotes={weekClassNotes}
          overrides={overrides}
        />
      </div>
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

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-card p-5">
      <p className="kicker">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-3 space-y-3">{children}</div>
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
      )}
    >
      {children}
    </span>
  );
}

function TaskEditor({
  task,
  override,
  savedOverride,
  onUpdate,
}: {
  task: TaskItem;
  override?: AdminTaskOverride;
  savedOverride?: AdminTaskOverride;
  onUpdate: (task: TaskItem, patch: AdminTaskOverride) => void;
}) {
  const showDue = override?.showDue ?? task.showDue ?? true;
  const hidden = Boolean(override?.hidden);
  const unsaved = hasUnsavedOverride(override, savedOverride);
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{task.title}</h3>
          <p className="mt-1 text-xs text-muted">{task.type}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusChip tone={hidden ? "hidden" : "visible"}>{hidden ? "Hidden" : "Student-visible"}</StatusChip>
            <StatusChip tone={unsaved ? "dirty" : "saved"}>{unsaved ? "Unsaved changes" : "Saved locally"}</StatusChip>
          </div>
        </div>
        <HiddenToggle checked={hidden} onChange={(nextHidden) => onUpdate(task, { hidden: nextHidden })} />
      </div>
      <TextField label="Title" value={override?.title ?? task.title} onChange={(title) => onUpdate(task, { title })} />
      <TextAreaField label="Description" value={override?.description ?? task.description} onChange={(description) => onUpdate(task, { description })} />
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <TextField label="Date" value={override?.dueDate ?? task.dueDate} onChange={(dueDate) => onUpdate(task, { dueDate })} />
        <label className="flex items-end gap-2 pb-2 text-sm font-semibold">
          <input type="checkbox" checked={showDue} onChange={(event) => onUpdate(task, { showDue: event.target.checked })} />
          Show due
        </label>
      </div>
      {task.type === "ai-reflection" ? (
        <p className="mt-3 text-xs text-muted">AI Reflection uses recommended Sunday due styling, not required due styling.</p>
      ) : null}
    </article>
  );
}

function ResourceEditor({
  resource,
  override,
  savedOverride,
  onUpdate,
}: {
  resource: ResourceItem;
  override?: AdminResourceOverride;
  savedOverride?: AdminResourceOverride;
  onUpdate: (id: string, patch: AdminResourceOverride) => void;
}) {
  const hidden = Boolean(override?.hidden);
  const unsaved = hasUnsavedOverride(override, savedOverride);

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{resource.title}</h3>
          <p className="mt-1 text-xs text-muted">{resource.category}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusChip tone={hidden ? "hidden" : "visible"}>{hidden ? "Hidden" : "Student-visible"}</StatusChip>
            <StatusChip tone={unsaved ? "dirty" : "saved"}>{unsaved ? "Unsaved changes" : "Saved locally"}</StatusChip>
          </div>
        </div>
        <HiddenToggle checked={hidden} onChange={(nextHidden) => onUpdate(resource.id, { hidden: nextHidden })} />
      </div>
      <TextField label="Title" value={override?.title ?? resource.title} onChange={(title) => onUpdate(resource.id, { title })} />
      <TextAreaField label="Description" value={override?.description ?? resource.description} onChange={(description) => onUpdate(resource.id, { description })} />
      <TextField label="Link" value={override?.href ?? resource.href ?? ""} onChange={(href) => onUpdate(resource.id, { href })} />
    </article>
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [note.title, note.description, note.originalFileName]
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

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setMessage("Choose a PDF or image file before uploading.");
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set("week", String(selectedWeek));
      form.set("title", title || file.name);
      form.set("description", description);
      form.set("originalFileName", file.name);
      form.set("file", file);

      const response = await fetch("/api/admin/class-notes/upload", {
        method: "POST",
        body: form,
      });
      const payload = (await response.json()) as ClassNotesPayload;
      if (!response.ok || !payload.ok || !payload.note) {
        throw new Error(payload.error ?? "Upload failed.");
      }

      upsertNote(payload.note);
      setTitle("");
      setDescription("");
      setFile(null);
      event.currentTarget.reset();
      setMessage("Uploaded class note.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4" onSubmit={upload}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Upload Week {selectedWeek} Class Note</h3>
            <p className="mt-1 text-xs text-muted">Allowed: PDF, PNG, JPG/JPEG, WEBP. Files are local portal assets only.</p>
          </div>
          <button type="submit" className="button-primary px-3 py-2 text-sm" disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <TextField label="Title" value={title} onChange={setTitle} />
          <label className="mt-3 block text-xs font-semibold text-muted">
            File
            <input
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <TextAreaField label="Description" value={description} onChange={setDescription} />
        {message ? <p className="mt-3 rounded-xl bg-[var(--surface)] p-3 text-sm text-muted">{message}</p> : null}
      </form>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <TextField label="Search class notes" value={query} onChange={setQuery} />
          <label className="mt-3 block text-xs font-semibold text-muted lg:w-48">
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

      <div className="space-y-3">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <ClassNoteEditor key={note.id} note={note} onSaved={upsertNote} onDeleted={removeNote} />
          ))
        ) : (
          <p className="text-sm text-muted">No Class Notes match the current Week {selectedWeek} filters.</p>
        )}
      </div>
    </div>
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
  const [description, setDescription] = useState(note.description ?? "");
  const [hidden, setHidden] = useState(note.hidden);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const dirty =
    title !== note.title ||
    week !== note.week ||
    description !== (note.description ?? "") ||
    hidden !== note.hidden;

  const save = async () => {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/class-notes/${note.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, week, description, hidden }),
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
          <a className="button-ghost px-3 py-2 text-sm" href={note.previewHref} target="_blank" rel="noreferrer">
            Preview
          </a>
          <button type="button" className="button-ghost px-3 py-2 text-sm" disabled={pending} onClick={remove}>
            Delete
          </button>
          <button type="button" className="button-primary px-3 py-2 text-sm" disabled={pending} onClick={save}>
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_140px_auto]">
        <TextField label="Title" value={title} onChange={setTitle} />
        <label className="mt-3 block text-xs font-semibold text-muted">
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
        <label className="mt-3 flex items-end gap-2 pb-2 text-sm font-semibold">
          <input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />
          Hidden
        </label>
      </div>
      <TextAreaField label="Description" value={description} onChange={setDescription} />
      {message ? <p className="mt-3 rounded-xl bg-[var(--surface)] p-3 text-sm text-muted">{message}</p> : null}
    </article>
  );
}

function PreviewPanel({
  selectedWeek,
  tasks,
  resources,
  classNotes,
  overrides,
}: {
  selectedWeek: WeekNumber;
  tasks: TaskItem[];
  resources: ResourceItem[];
  classNotes: ClassNoteItem[];
  overrides: CourseAdminOverrides;
}) {
  const visibleTasks = tasks.filter((task) => {
    const override = (isReflectionTask(task) ? overrides.reflections : overrides.tasks)[task.id];
    return !override?.hidden;
  });
  const visibleResources = resources.filter((resource) => !overrides.resources[resource.id]?.hidden);
  const visibleClassNotes = classNotes.filter((note) => !note.hidden);

  return (
    <aside className="surface-card h-fit p-5" aria-label="Preview as student">
      <p className="kicker">Preview as student</p>
      <h3 className="mt-1 text-base font-semibold">Week {selectedWeek}</h3>
      <p className="mt-1 text-sm text-muted">Only student-visible local portal content appears below.</p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Visible tasks</p>
          <div className="mt-2 space-y-2">
            {visibleTasks.slice(0, 5).map((task) => {
              const override = (isReflectionTask(task) ? overrides.reflections : overrides.tasks)[task.id];
              return (
                <div key={task.id} className="rounded-xl bg-[var(--surface-2)] p-3">
                  <p className="text-sm font-semibold">{override?.title ?? task.title}</p>
                  <p className="mt-1 text-xs text-muted">{override?.description ?? task.description}</p>
                </div>
              );
            })}
            {visibleTasks.length === 0 ? <p className="text-sm text-muted">No visible tasks for this week.</p> : null}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Visible resources</p>
          <p className="mt-2 text-sm text-muted">{visibleResources.length} resource card(s)</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Visible class notes</p>
          <div className="mt-2 space-y-2">
            {visibleClassNotes.length > 0 ? (
              visibleClassNotes.slice(0, 4).map((note) => (
                <div key={note.id} className="rounded-xl bg-[var(--surface-2)] p-3">
                  <p className="text-sm font-semibold">{note.title}</p>
                  <p className="mt-1 text-xs text-muted">{note.fileType.toUpperCase()} / {note.originalFileName}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">No visible class notes for this week.</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function HiddenToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-muted">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      Hidden
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block text-xs font-semibold text-muted">
      {label}
      <input
        className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="mt-3 block text-xs font-semibold text-muted">
      {label}
      <textarea
        className="mt-1 min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm leading-6 text-[var(--text)] outline-none focus:border-[var(--accent)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
