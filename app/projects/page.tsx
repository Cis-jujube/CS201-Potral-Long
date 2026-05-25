"use client";

import { PageIntro } from "@/components/layout/PageIntro";
import { ProjectsBoard } from "@/components/pages/ProjectsBoard";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCourseOverview } from "@/hooks/useCourseOverview";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { cn } from "@/lib/utils/cn";

export default function ProjectsPage() {
  const { overview, loading, error } = useCourseOverview();

  if (loading) {
    return <StatePanel type="loading" title="Loading projects..." message="Building milestone roadmap." />;
  }

  if (error || !overview) {
    return <StatePanel type="error" title="Projects unavailable" message={error ?? "Cannot load BK project data."} />;
  }

  void overview;

  return (
    <div className="space-y-4 pb-8">
      <PageIntro
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(PAGE_TONE_MAP.projects.intro),
        )}
        title="Projects"
        description="Check project grouping and role assignments for the current project cycle."
      />
      <ProjectsBoard />
    </div>
  );
}
