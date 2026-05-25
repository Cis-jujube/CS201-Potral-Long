import type { DeadlineItem, TaskItem } from "@/lib/course/types";

interface PlannerBoardProps {
  tasks: TaskItem[];
  deadlines: DeadlineItem[];
  className?: string;
}

export function PlannerBoard({ tasks, deadlines, className }: PlannerBoardProps) {
  const sortedDeadlines = [...deadlines].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  return (
    <div className={className ?? "grid grid-cols-1 gap-4 xl:grid-cols-3"}>
      <section className="surface-card xl:col-span-2 p-5">
        <h2 className="text-lg font-semibold">Weekly Timeline</h2>
        <p className="mt-1 text-sm text-muted">Finish required deadlines first, then reflections.</p>
        <div className="mt-4 space-y-3">
          {tasks.map((task) => (
            <article key={task.id} className="surface-muted rounded-xl p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{task.title}</p>
                <span className="badge">{task.priority}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{task.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="surface-card p-5">
        <h2 className="text-lg font-semibold">Deadline Track</h2>
        <p className="mt-1 text-sm text-muted">Upcoming time-critical items for this week.</p>
        <div className="mt-4 space-y-3">
          {sortedDeadlines.map((deadline) => (
            <article key={deadline.id} className="surface-muted rounded-xl p-3">
              <p className="text-sm font-semibold">{deadline.title}</p>
              <p className="mt-1 text-xs text-muted">
                {new Date(deadline.dueDate).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
