import type { DeadlineItem } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";

interface TaskCalendarProps {
  deadlines: DeadlineItem[];
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toKey = (year: number, month: number, day: number) => `${year}-${month + 1}-${day}`;

const typeLabelMap: Record<DeadlineItem["type"], string> = {
  homework: "Homework",
  quiz: "Quiz",
  "ai-reflection": "AI reflection",
  "bk-reflection": "BK reflection",
  "project-presentation": "Project presentation",
  exam: "Exam",
};

const formatTime = (dueDate: string) =>
  new Date(dueDate).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

export function TaskCalendar({ deadlines }: TaskCalendarProps) {
  const fallbackDate = new Date();
  const anchorDate = deadlines
    .map((deadline) => new Date(deadline.dueDate))
    .find((date) => !Number.isNaN(date.getTime())) ?? fallbackDate;

  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const deadlineBuckets = deadlines.reduce<Record<string, DeadlineItem[]>>((accumulator, deadline) => {
    const date = new Date(deadline.dueDate);
    if (Number.isNaN(date.getTime())) {
      return accumulator;
    }
    if (date.getFullYear() !== year || date.getMonth() !== month) {
      return accumulator;
    }
    const key = toKey(year, month, date.getDate());
    accumulator[key] = [...(accumulator[key] ?? []), deadline];
    return accumulator;
  }, {});

  return (
    <div className="surface-muted rounded-2xl p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {anchorDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </p>
          <p className="mt-1 text-xs text-muted">Calendar-only markers stay here, not in the task list.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[var(--accent)]">
            <span className="size-2 rounded-full bg-[var(--accent)]" />
            Recommended
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[var(--danger)]">
            <span className="size-2 rounded-full bg-[var(--danger)]" />
            Required
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, index) => (
          <span key={`pad-${index}`} className="h-11 rounded-md bg-transparent" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const key = toKey(year, month, day);
          const bucket = deadlineBuckets[key] ?? [];
          const hasRequired = bucket.some((deadline) => deadline.dueKind === "required");
          const hasRecommended = bucket.some((deadline) => deadline.dueKind === "recommended");
          return (
            <button
              key={key}
              type="button"
              className={cn(
                "group relative flex h-11 items-center justify-center rounded-xl border text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                bucket.length === 0 && "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]",
                hasRecommended && !hasRequired && "border-[var(--border)] bg-[var(--accent-soft)] text-[var(--accent)]",
                hasRequired && !hasRecommended && "border-rose-500/20 bg-rose-500/10 text-[var(--danger)]",
                hasRequired && hasRecommended && "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] ring-2 ring-[var(--accent-soft)]",
              )}
              aria-label={bucket.length > 0 ? `${bucket.length} due item(s) on day ${day}` : `No due items on day ${day}`}
            >
              {day}
              {bucket.length > 0 ? (
                <span className="ml-1 inline-flex items-center gap-0.5">
                  {hasRecommended ? <span className="inline-block size-1.5 rounded-full bg-[var(--accent)]" /> : null}
                  {hasRequired ? <span className="inline-block size-1.5 rounded-full bg-[var(--danger)]" /> : null}
                </span>
              ) : null}
              {bucket.length > 0 ? (
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-lg group-hover:block group-focus:block">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Due on {anchorDate.toLocaleDateString("en-US", { month: "short" })} {day}
                  </span>
                  <span className="mt-2 block space-y-2">
                    {bucket.map((deadline) => (
                      <span key={deadline.id} className="block rounded-lg bg-[var(--surface-2)] p-2">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--text)]">{deadline.title}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                              deadline.dueKind === "required"
                                ? "bg-rose-500/10 text-[var(--danger)]"
                                : "bg-[var(--accent-soft)] text-[var(--accent)]",
                            )}
                          >
                            {deadline.dueKind}
                          </span>
                        </span>
                        <span className="mt-1 block text-[11px] text-muted">
                          {typeLabelMap[deadline.type]} at {formatTime(deadline.dueDate)}
                        </span>
                        {deadline.detail ? (
                          <span className="mt-1 block text-[11px] leading-relaxed text-muted">{deadline.detail}</span>
                        ) : null}
                      </span>
                    ))}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
