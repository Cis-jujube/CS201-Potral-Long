"use client";

import { COURSE_WEEKS, type WeekNumber } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";

interface WeekSliderProps {
  value: WeekNumber;
  onChange: (week: WeekNumber) => void;
  className?: string;
  embedded?: boolean;
}

export function WeekSlider({ value, onChange, className, embedded = false }: WeekSliderProps) {
  return (
    <div className={className ?? (embedded ? "" : "surface-card p-4 sm:p-5")}>
      <div className="mb-3 flex items-center justify-between">
        <p className="kicker">Week Context</p>
        <span className="badge">Week {value} active</span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {COURSE_WEEKS.map((week) => (
          <button
            key={week}
            type="button"
            onClick={() => onChange(week)}
            className={cn(
              "min-w-24 rounded-xl px-4 py-2 text-sm font-semibold transition",
              "focus-visible:outline-none",
              value === week
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "surface-muted text-[var(--text)] hover:scale-[1.02]",
            )}
            aria-pressed={value === week}
          >
            Week {week}
          </button>
        ))}
      </div>
    </div>
  );
}
