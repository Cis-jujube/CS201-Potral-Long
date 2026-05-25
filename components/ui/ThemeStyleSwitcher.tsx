"use client";

import { Moon, Sun } from "lucide-react";

import type { ThemeMode } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";
import { useCourseUi } from "@/providers/CourseUiProvider";

const themeModes: ThemeMode[] = ["light", "dark"];

export function ThemeStyleSwitcher() {
  const { themeMode, setThemeMode } = useCourseUi();

  return (
    <div className="surface-muted flex w-full min-w-0 p-2.5" role="group" aria-label="Display preferences">
      <div className="ml-auto flex min-w-0 flex-wrap items-center gap-1 rounded-xl bg-[var(--surface)] p-1" role="group" aria-label="Theme mode">
        {themeModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setThemeMode(mode)}
            className={cn(
              "inline-flex min-w-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              themeMode === mode ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-muted hover:bg-[var(--surface-2)]",
            )}
            aria-label={`Switch to ${mode} theme`}
          >
            {mode === "light" ? <Sun className="size-3.5 shrink-0" /> : <Moon className="size-3.5 shrink-0" />}
            <span className="truncate">{mode === "light" ? "Light" : "Dark"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
