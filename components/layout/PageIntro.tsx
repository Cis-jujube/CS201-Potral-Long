import type { ReactNode } from "react";

interface PageIntroProps {
  title: string;
  description: string;
  rightSlot?: ReactNode;
  className?: string;
}

export function PageIntro({ title, description, rightSlot, className }: PageIntroProps) {
  return (
    <section className={className ?? "surface-card p-5"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted">{description}</p>
        </div>
        {rightSlot}
      </div>
    </section>
  );
}
