import type { ReactNode } from "react";

interface WeekSectionProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function WeekSection({ title, subtitle, action, children, className }: WeekSectionProps) {
  return (
    <section className={className ?? "surface-card p-5"}>
      <header className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
