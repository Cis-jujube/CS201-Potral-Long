import { getCourseSitePagePreview } from "@/lib/course-site/content";
import type { CourseSitePage } from "@/lib/course-site/types";
import { cn } from "@/lib/utils/cn";

interface CourseSitePlacementPanelProps {
  title: string;
  description: string;
  pages: CourseSitePage[];
  className?: string;
  limit?: number;
}

export function CourseSitePlacementPanel({
  title,
  description,
  pages,
  className,
  limit = 4,
}: CourseSitePlacementPanelProps) {
  const visiblePages = pages.slice(0, limit);

  if (visiblePages.length === 0) {
    return null;
  }

  return (
    <section className={cn("surface-card module-tone-context module-tone-border p-5", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="kicker">Course Site Import</p>
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visiblePages.map((page) => (
          <article key={page.id} className="surface-muted rounded-xl p-4">
            <p className="text-sm font-semibold">{page.title}</p>
            <p className="mt-1 text-xs text-muted">{page.navigationPath.join(" / ")}</p>
            <p className="mt-2 text-sm text-muted">{getCourseSitePagePreview(page)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {page.links.slice(0, 3).map((link) => (
                <a key={`${page.id}-${link.href}`} href={link.href} className="badge text-xs" target="_blank" rel="noreferrer">
                  {link.text || link.type}
                </a>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
