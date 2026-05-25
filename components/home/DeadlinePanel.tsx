import { AlarmClock } from "lucide-react";

import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import type { DeadlineItem } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";

interface DeadlinePanelProps {
  deadlines: DeadlineItem[];
}

export function DeadlinePanel({ deadlines }: DeadlinePanelProps) {
  if (deadlines.length === 0) {
    return <p className="text-sm text-muted">No upcoming deadlines. Great week to review and refactor.</p>;
  }

  return (
    <div className="space-y-2">
      {deadlines.map((deadline) => (
        <div key={deadline.id} className="surface-muted flex items-start justify-between gap-3 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <AlarmClock className="size-4 text-[var(--accent)]" />
            <div>
              <p className="text-sm font-medium">{deadline.title}</p>
              <p className="text-xs text-muted">
                Due{" "}
                {new Date(deadline.dueDate).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {deadline.detail ? <p className="mt-1 text-xs text-muted">{deadline.detail}</p> : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <DeadlineBadge deadline={deadline} />
            <span
              className={cn(
                "badge",
                deadline.dueKind === "required" && "bg-rose-500/10 text-[var(--danger)]",
              )}
            >
              {deadline.dueKind}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
