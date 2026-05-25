interface WeekProgressCardProps {
  completed: number;
  total: number;
  percentage: number;
  className?: string;
}

export function WeekProgressCard({ completed, total, percentage, className }: WeekProgressCardProps) {
  return (
    <div className={className ?? "surface-card p-5"}>
      <div className="mb-3 flex items-center justify-between">
        <p className="kicker">Week Progress</p>
        <span className="text-sm font-semibold">{percentage}%</span>
      </div>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${percentage}%` }}
          aria-hidden
        />
      </div>

      <p className="text-sm text-muted">
        <span className="font-semibold text-[var(--text)]">{completed}</span> / {total} tasks completed this week.
      </p>
    </div>
  );
}
