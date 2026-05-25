import type { WeekBundle, WeeklyMapNode } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";

const columns: Array<{ key: WeeklyMapNode["type"]; label: string; help: string }> = [
  { key: "lecture", label: "Lectures", help: "Slides and session topics" },
  { key: "lab", label: "Lab", help: "Hands-on PDF work" },
  { key: "homework", label: "Homework", help: "Practice entries" },
  { key: "quiz", label: "Quizzes", help: "Quiz portal tasks" },
  { key: "ai-reflection", label: "AI Reflection", help: "Recommended weekly reflection" },
  { key: "bk-reflection", label: "BK Reflection", help: "BK questionnaires" },
];

const progressLabelMap: Record<NonNullable<WeeklyMapNode["progressStatus"]>, string> = {
  correct: "Correct",
  incorrect: "Incorrect",
  "not-started": "Not done",
};

const progressBadgeClassMap: Record<NonNullable<WeeklyMapNode["progressStatus"]>, string> = {
  correct: "bg-emerald-500/80 text-white",
  incorrect: "bg-rose-500/80 text-white",
  "not-started": "bg-[var(--surface-2)] text-muted",
};

interface WeeklyMapProps {
  bundle: WeekBundle;
}

export function WeeklyMap({ bundle }: WeeklyMapProps) {
  const nodeLabelMap = new Map(bundle.mapNodes.map((node) => [node.id, node.title]));

  if (bundle.mapNodes.length === 0) {
    return (
      <div className="surface-muted rounded-2xl p-6 text-center text-sm text-muted">
        This week has lightweight content. Use quick links to review prior material.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {columns.map((column) => {
          const items = bundle.mapNodes.filter((node) => node.type === column.key);
          if (items.length === 0) {
            return (
              <div key={column.key} className="surface-muted flex min-h-36 flex-col rounded-2xl p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">{column.label}</p>
                    <p className="mt-1 text-[11px] text-muted">{column.help}</p>
                  </div>
                  <span className="badge bg-[var(--surface)] text-muted">0</span>
                </div>
                <div className="mt-auto rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-3">
                  <p className="text-xs text-muted">No items this week.</p>
                </div>
              </div>
            );
          }

          return (
            <div key={column.key} className="surface-muted rounded-2xl p-4">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{column.label}</p>
                  <p className="mt-1 text-[11px] text-muted">{column.help}</p>
                </div>
                <span className="badge bg-[var(--surface)]">{items.length}</span>
              </div>
              {column.key === "quiz" ? <QuizColumnSummary items={items} /> : null}
              <div className="space-y-2">
                {items.map((item) => (
                  <MapNodeCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="surface-muted rounded-2xl p-4">
        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold">Learning Flow</p>
          <p className="text-xs text-muted">Suggested order for the week</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {bundle.mapEdges.length === 0 ? (
            <p className="text-xs text-muted">No explicit dependencies this week.</p>
          ) : (
            bundle.mapEdges.map((edge) => (
              <span key={`${edge.from}-${edge.to}`} className="badge text-[11px]">
                {nodeLabelMap.get(edge.from) ?? edge.from} {"->"} {nodeLabelMap.get(edge.to) ?? edge.to}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function QuizColumnSummary({ items }: { items: WeeklyMapNode[] }) {
  const correct = items.filter((item) => item.progressStatus === "correct").length;
  const incorrect = items.filter((item) => item.progressStatus === "incorrect").length;
  const notDone = items.filter((item) => item.progressStatus === "not-started" || !item.progressStatus).length;

  return (
    <div className="mb-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-1">
      <span className="badge justify-center bg-[var(--surface)]">Total {items.length}</span>
      <span className="badge justify-center bg-emerald-500/10 text-[var(--success)]">Correct {correct}</span>
      <span className="badge justify-center bg-rose-500/10 text-[var(--danger)]">Incorrect {incorrect}</span>
      <span className="badge justify-center bg-[var(--surface-2)] text-muted">Not done {notDone}</span>
    </div>
  );
}

function MapNodeCard({ item }: { item: WeeklyMapNode }) {
  const status = item.progressStatus;
  const statusLabel = item.statusLabel ?? (status ? progressLabelMap[status] : undefined);
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-semibold leading-snug">{item.title}</p>
        {statusLabel ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
              status ? progressBadgeClassMap[status] : "bg-[var(--surface-2)] text-muted",
            )}
          >
            {statusLabel}
          </span>
        ) : (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
              item.href ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface-2)] text-muted",
            )}
          >
            {item.href ? "Open" : "Local"}
          </span>
        )}
      </div>
      {item.summary ? <p className="mt-1 text-xs text-muted">{item.summary}</p> : null}
      {!item.href ? <p className="mt-2 text-[11px] text-muted">No link available</p> : null}
    </>
  );
  const className = cn(
    "block rounded-xl border p-3 text-sm transition",
    status === "correct" && "border-emerald-500/30 bg-emerald-500/10",
    status === "incorrect" && "border-rose-500/30 bg-rose-500/10",
    status === "not-started" && "border-[var(--border)] bg-[var(--surface)]",
    !status && "border-[var(--border)] bg-[var(--surface)]",
  );

  if (!item.href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <a href={item.href} className={`${className} hover:scale-[1.02]`}>
      {content}
    </a>
  );
}
