import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";

import type { ResourceItem } from "@/lib/course/types";

interface ResourceCardProps {
  resource: ResourceItem;
  bookmarked: boolean;
  onToggleBookmark: (resourceId: string) => void;
}

export function ResourceCard({ resource, bookmarked, onToggleBookmark }: ResourceCardProps) {
  return (
    <article className="surface-card-hover p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{resource.title}</p>
          <p className="mt-1 text-sm text-muted">{resource.description}</p>
        </div>
        <button
          type="button"
          className="button-ghost px-2.5 py-1.5"
          onClick={() => onToggleBookmark(resource.id)}
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark resource"}
        >
          {bookmarked ? <BookmarkCheck className="size-4 text-[var(--accent)]" /> : <Bookmark className="size-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="badge capitalize">{resource.category}</span>
        {resource.href ? (
          <a className="button-ghost px-2.5 py-1.5 text-xs" href={resource.href}>
            Open
            <ExternalLink className="ml-1 size-3.5" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
