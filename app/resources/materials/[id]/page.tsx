import { Download, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";

import {
  flattenCourseMaterials,
  getCourseMaterialById,
} from "@/lib/course-materials/content";
import type { CourseMaterialItem } from "@/lib/course-materials/types";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { cn } from "@/lib/utils/cn";

interface MaterialPreviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const generateStaticParams = () =>
  flattenCourseMaterials().map((item) => ({
    id: item.id,
  }));

export async function generateMetadata({ params }: MaterialPreviewPageProps) {
  const { id } = await params;
  const item = getCourseMaterialById(id);

  return {
    title: item ? `${item.fileName} | CS201 Resources` : "Material Preview",
  };
}

export default async function MaterialPreviewPage({ params }: MaterialPreviewPageProps) {
  const { id } = await params;
  const item = getCourseMaterialById(id);

  if (!item) {
    notFound();
  }

  const tone = PAGE_TONE_MAP.resources.library;

  return (
    <div className="space-y-4 pb-8">
      <section
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(tone),
        )}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="kicker">{materialKindLabel(item)}</p>
            <h1 className="mt-1 break-words text-2xl font-semibold">{item.fileName}</h1>
            <p className="mt-2 text-sm text-muted">
              Week {item.week}
              {item.session ? ` / Session ${item.session}` : ""}
              {item.topic ? ` / ${item.topic}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.publicHref ? (
              <a className="button-solid" href={item.publicHref} download>
                <Download className="mr-2 size-4" />
                Download
              </a>
            ) : null}
            {item.sourceHref ? (
              <a className="button-ghost" href={item.sourceHref} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 size-4" />
                Open Source
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {item.publicHref ? <PdfPreview item={item} /> : <SourceOnlyFallback item={item} />}
    </div>
  );
}

function PdfPreview({ item }: { item: CourseMaterialItem }) {
  return (
    <section className="surface-card overflow-hidden p-3">
      <iframe
        title={`${item.fileName} preview`}
        src={`${item.publicHref}#toolbar=1`}
        className="h-[78vh] min-h-[620px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
      />
    </section>
  );
}

function SourceOnlyFallback({ item }: { item: CourseMaterialItem }) {
  return (
    <section className="surface-card p-5">
      <h2 className="text-lg font-semibold">Local preview unavailable</h2>
      <p className="mt-2 text-sm text-muted">
        This file was listed in the official course site, but no matching local PDF was found in the copied materials.
      </p>
      {item.sourceHref ? (
        <a className="button-solid mt-4" href={item.sourceHref} target="_blank" rel="noreferrer">
          <ExternalLink className="mr-2 size-4" />
          Open Source
        </a>
      ) : null}
    </section>
  );
}

function materialKindLabel(item: CourseMaterialItem) {
  if (item.kind === "lecture") {
    return "Lecture Preview";
  }

  if (item.kind === "answer") {
    return "Lab Answer Preview";
  }

  return "Lab Preview";
}
