import { CheckCircle2, Circle, Clock3 } from "lucide-react";

import { DeadlineBadge } from "@/components/ui/DeadlineBadge";
import type { DeadlineItem, TaskItem } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";

interface TaskCardProps {
  task: TaskItem;
  completed: boolean;
  onToggle: (taskId: string) => void;
}

export function TaskCard({ task, completed, onToggle }: TaskCardProps) {
  const showDue = task.showDue !== false;
  const isRequired = task.dueKind === "required";
  const deadline: DeadlineItem | null = showDue
    ? {
        id: task.id,
        title: task.title,
        type: task.type,
        dueDate: task.dueDate,
        week: task.weeks[0],
        dueKind: task.dueKind,
        detail: task.detail,
      }
    : null;

  return (
    <article
      className={cn(
        "surface-card-hover overflow-hidden border-l-4 p-4",
        isRequired ? "border-l-[var(--danger)]" : "border-l-[var(--accent)]",
        completed && "opacity-85",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold leading-tight">{task.title}</p>
            {showDue ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                  isRequired
                    ? "bg-rose-500/10 text-[var(--danger)]"
                    : "bg-[var(--accent-soft)] text-[var(--accent)]",
                )}
              >
                {isRequired ? "Required due" : "Recommended due"}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">{task.description}</p>
        </div>
        <button
          type="button"
          className="button-ghost px-2.5 py-1.5"
          onClick={() => onToggle(task.id)}
          aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
        >
          {completed ? <CheckCircle2 className="size-4 text-[var(--success)]" /> : <Circle className="size-4" />}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {deadline ? <DeadlineBadge deadline={deadline} /> : null}
        <span className="badge capitalize">{task.type.replace("-", " ")}</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs text-muted">
          <Clock3 className="size-3.5" />
          {task.priority} priority
        </span>
      </div>
    </article>
  );
}
