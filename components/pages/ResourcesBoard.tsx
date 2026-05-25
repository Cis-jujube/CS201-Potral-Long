"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Download, ExternalLink, FileText, FlaskConical, NotebookTabs, Presentation } from "lucide-react";

import { CourseSitePlacementPanel } from "@/components/course-site/CourseSitePlacementPanel";
import { isClassNoteImage } from "@/lib/class-notes/content";
import type { ClassNoteItem, ClassNotesPayload } from "@/lib/class-notes/types";
import {
  getLabMaterials,
  getLectureMaterials,
  getMaterialPreviewHref,
  groupCourseMaterialsByWeek,
} from "@/lib/course-materials/content";
import { CS201_TEXTBOOK_LINK } from "@/lib/course-materials/staticResources";
import type { CourseMaterialItem } from "@/lib/course-materials/types";
import { getCourseSitePagesByPlacement } from "@/lib/course-site/content";
import { cn } from "@/lib/utils/cn";
import { useCourseUi } from "@/providers/CourseUiProvider";

type ResourceTab = "lecture" | "lab" | "class-notes";

interface ResourcesBoardProps {
  className?: string;
}

const TABS: Array<{ id: ResourceTab; label: string; icon: typeof Presentation }> = [
  { id: "lecture", label: "Lecture", icon: Presentation },
  { id: "lab", label: "Lab", icon: FlaskConical },
  { id: "class-notes", label: "Class Notes", icon: NotebookTabs },
];

export function ResourcesBoard({ className }: ResourcesBoardProps) {
  const [activeTab, setActiveTab] = useState<ResourceTab>("lecture");
  const [classNotes, setClassNotes] = useState<ClassNoteItem[]>([]);
  const [classNotesStatus, setClassNotesStatus] = useState<"loading" | "ready" | "error">("loading");
  const [classNotesError, setClassNotesError] = useState<string | null>(null);
  const { selectedWeek } = useCourseUi();

  const lectureWeeks = useMemo(() => groupCourseMaterialsByWeek(getLectureMaterials()), []);
  const labWeeks = useMemo(() => groupCourseMaterialsByWeek(getLabMaterials()), []);
  const materialWeeks = activeTab === "lecture" ? lectureWeeks : labWeeks;
  const visibleWeeks = materialWeeks.filter(
    (weekGroup) => weekGroup.week === selectedWeek,
  );
  const resourceCourseSitePages = useMemo(() => getCourseSitePagesByPlacement("resources"), []);

  useEffect(() => {
    let active = true;

    const loadClassNotes = async () => {
      setClassNotesStatus("loading");
      setClassNotesError(null);
      try {
        const response = await fetch(`/api/class-notes/week/${selectedWeek}`);
        const payload = (await response.json()) as ClassNotesPayload;
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "Class notes unavailable.");
        }

        if (active) {
          setClassNotes(payload.notes ?? []);
          setClassNotesStatus("ready");
        }
      } catch (error) {
        if (active) {
          setClassNotes([]);
          setClassNotesStatus("error");
          setClassNotesError(error instanceof Error ? error.message : "Class notes unavailable.");
        }
      }
    };

    void loadClassNotes();
    return () => {
      active = false;
    };
  }, [selectedWeek]);

  return (
    <section className={cn("surface-card module-tone-context module-tone-border p-5", className)}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kicker">Course Materials</p>
          <h2 className="mt-1 text-xl font-semibold">Week {selectedWeek} Lecture, Lab, and Class Notes</h2>
          <p className="mt-1 text-sm text-muted">
            Lecture and lab files are matched from the official schedule. Class Notes are uploaded by admins and shown by week.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="badge">Week {selectedWeek}</span>
            <span className="badge bg-[var(--surface-2)] text-muted">Preview and download enabled</span>
          </div>
        </div>

        <div className="inline-flex w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-1 sm:w-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition sm:flex-none sm:px-4",
                  selected
                    ? "bg-[var(--accent)] text-white shadow-sm"
                    : "text-muted hover:bg-[var(--surface)] hover:text-[var(--text)]",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold">{CS201_TEXTBOOK_LINK.label}</p>
            <p className="mt-1 text-sm text-muted">{CS201_TEXTBOOK_LINK.description}</p>
          </div>
          <a className="button-ghost px-3 py-2 text-sm" href={CS201_TEXTBOOK_LINK.href} download>
            <Download className="mr-2 size-4" />
            Download textbook
          </a>
        </div>
      </section>

      <div className="mt-5 space-y-4">
        {activeTab === "class-notes" ? (
          <ClassNotesSection
            selectedWeek={selectedWeek}
            notes={classNotes}
            status={classNotesStatus}
            error={classNotesError}
          />
        ) : (
          visibleWeeks.map((weekGroup) => (
            <section key={`${activeTab}-${weekGroup.week}`} className="surface-muted p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">
                    Week {weekGroup.week} {activeTab === "lecture" ? "Lecture files" : "Lab files"}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {activeTab === "lecture" ? "Open the session PPT preview before downloading." : "Open lab PDFs and solution PDFs from the same list."}
                  </p>
                </div>
                <span className="badge">{weekGroup.items.length} item(s)</span>
              </div>

              <div className="space-y-3">
                {weekGroup.items.map((item) =>
                  activeTab === "lecture" ? (
                    <LectureMaterialRow key={item.id} item={item} />
                  ) : (
                    <LabMaterialRow key={item.id} item={item} />
                  ),
                )}
              </div>
            </section>
          ))
        )}
        {activeTab !== "class-notes" && visibleWeeks.length === 0 ? (
          <section className="surface-muted p-4">
            <p className="text-sm font-semibold">No {activeTab} materials found for Week {selectedWeek}.</p>
            <p className="mt-1 text-sm text-muted">Try another week from the Week Navigation controls.</p>
          </section>
        ) : null}
      </div>

      <CourseSitePlacementPanel
        title="Official Course Site"
        description="Imported textbook, lecture video, animation, and supplement pages from the official CS201 site."
        pages={resourceCourseSitePages}
        className="mt-6 opacity-90"
      />
    </section>
  );
}

function LectureMaterialRow({ item }: { item: CourseMaterialItem }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            Session {item.session}
            {item.date ? <span className="font-normal text-muted"> / {item.date}</span> : null}
          </p>
          <p className="mt-1 text-sm text-muted">{item.topic}</p>
          {item.assignment ? <p className="mt-1 text-xs text-muted">Assignment: {item.assignment}</p> : null}
        </div>
        <MaterialLink item={item} />
      </div>
    </article>
  );
}

function LabMaterialRow({ item }: { item: CourseMaterialItem }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="mt-1 text-xs text-muted">Lab material</p>
        </div>
        <MaterialLink item={item} />
      </div>

      {item.children?.length ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Answers</p>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {item.children.map((child) => (
              <div key={child.id} className="rounded-lg bg-[var(--surface-2)] p-3">
                <p className="mb-2 text-xs font-semibold text-muted">{child.title}</p>
                <MaterialLink item={child} compact />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MaterialLink({ item, compact = false }: { item: CourseMaterialItem; compact?: boolean }) {
  const canOpenPreview = Boolean(item.publicHref || item.sourceHref);

  if (!canOpenPreview) {
    return (
      <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-muted">
        <AlertCircle className="size-4 shrink-0" />
        <span className="truncate">{item.fileName}</span>
        <span className="shrink-0 text-xs">Unavailable locally</span>
      </span>
    );
  }

  return (
    <a
      href={getMaterialPreviewHref(item)}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--surface)]",
        compact ? "w-full justify-between" : "lg:max-w-[360px]",
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <FileText className="size-4 shrink-0 text-[var(--accent)]" />
        <span className="truncate">{item.fileName}</span>
      </span>
      {item.available ? (
        <Download className="size-4 shrink-0 text-muted" />
      ) : (
        <ExternalLink className="size-4 shrink-0 text-muted" />
      )}
    </a>
  );
}

function ClassNotesSection({
  selectedWeek,
  notes,
  status,
  error,
}: {
  selectedWeek: number;
  notes: ClassNoteItem[];
  status: "loading" | "ready" | "error";
  error: string | null;
}) {
  if (status === "loading") {
    return (
      <section className="surface-muted p-4">
        <p className="text-sm font-semibold">Loading Class Notes for Week {selectedWeek}...</p>
        <p className="mt-1 text-sm text-muted">Reading admin-managed local uploads.</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="surface-muted p-4">
        <p className="text-sm font-semibold">Class Notes unavailable.</p>
        <p className="mt-1 text-sm text-muted">{error ?? "Try again after the admin upload store is available."}</p>
      </section>
    );
  }

  if (notes.length === 0) {
    return (
      <section className="surface-muted p-4">
        <p className="text-sm font-semibold">No Class Notes uploaded for Week {selectedWeek}.</p>
        <p className="mt-1 text-sm text-muted">Teachers can add PDF or image notes from the Admin Files area.</p>
      </section>
    );
  }

  return (
    <section className="surface-muted p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Week {selectedWeek} Class Notes</h3>
        <span className="badge">{notes.length} item(s)</span>
      </div>
      <div className="space-y-4">
        {notes.map((note) => (
          <ClassNoteRow key={note.id} note={note} />
        ))}
      </div>
    </section>
  );
}

function ClassNoteRow({ note }: { note: ClassNoteItem }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-[var(--surface-2)] text-muted">{note.fileType === "pdf" ? "PDF" : "Image"}</span>
            <p className="text-sm font-semibold">{note.title}</p>
          </div>
          <p className="mt-2 text-xs text-muted">{note.description ?? note.originalFileName}</p>
          <p className="mt-1 text-[11px] text-muted">{note.originalFileName}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <a className="button-ghost px-3 py-2 text-sm" href={note.previewHref} target="_blank" rel="noreferrer">
            Preview
            <ExternalLink className="ml-2 size-4" />
          </a>
          <a className="button-ghost px-3 py-2 text-sm" href={note.publicHref} download>
            <Download className="mr-2 size-4" />
            Download
          </a>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]">
        {isClassNoteImage(note) ? (
          <div className="relative min-h-48 md:min-h-56">
            <Image src={note.publicHref} alt={note.title} fill sizes="(max-width: 1024px) 100vw, 720px" className="object-contain" unoptimized />
          </div>
        ) : (
          <iframe title={`${note.title} preview`} src={`${note.publicHref}#toolbar=0`} className="h-52 w-full bg-[var(--surface)] md:h-60" />
        )}
      </div>
    </article>
  );
}
