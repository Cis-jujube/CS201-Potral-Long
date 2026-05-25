import Image from "next/image";
import { Download } from "lucide-react";
import { notFound } from "next/navigation";

import { getClassNoteById } from "@/lib/class-notes/store";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { cn } from "@/lib/utils/cn";

interface ClassNotePreviewPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: ClassNotePreviewPageProps) {
  const { id } = await params;
  const note = await getClassNoteById(id);

  return {
    title: note ? `${note.title} | CS201 Class Notes` : "Class Note Preview",
  };
}

export default async function ClassNotePreviewPage({ params }: ClassNotePreviewPageProps) {
  const { id } = await params;
  const note = await getClassNoteById(id);

  if (!note) {
    notFound();
  }

  const tone = PAGE_TONE_MAP.resources.library;

  return (
    <div className="space-y-4 pb-8">
      <section className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone))}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="kicker">Class Note Preview</p>
            <h1 className="mt-1 break-words text-2xl font-semibold">{note.title}</h1>
            <p className="mt-2 text-sm text-muted">
              Week {note.week} / {note.originalFileName}
            </p>
            {note.description ? <p className="mt-2 text-sm text-muted">{note.description}</p> : null}
          </div>
          <a className="button-solid" href={note.publicHref} download>
            <Download className="mr-2 size-4" />
            Download
          </a>
        </div>
      </section>

      {note.fileType === "pdf" ? (
        <section className="surface-card overflow-hidden p-3">
          <iframe
            title={`${note.title} preview`}
            src={`${note.publicHref}#toolbar=1`}
            className="h-[78vh] min-h-[620px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
          />
        </section>
      ) : (
        <section className="surface-card p-4">
          <div className="relative min-h-[60vh] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
            <Image
              src={note.publicHref}
              alt={note.title}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
            />
          </div>
        </section>
      )}
    </div>
  );
}
