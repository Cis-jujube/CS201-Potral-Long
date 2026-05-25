"use client";

import { PageIntro } from "@/components/layout/PageIntro";
import { ExamsBoard } from "@/components/pages/ExamsBoard";
import { StatePanel } from "@/components/ui/StatePanel";
import { useCourseOverview } from "@/hooks/useCourseOverview";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { cn } from "@/lib/utils/cn";

export default function ExamsPage() {
  const { overview, loading, error } = useCourseOverview();

  if (loading) {
    return <StatePanel type="loading" title="Loading exams..." message="Gathering exam schedule and review resources." />;
  }

  if (error || !overview) {
    return <StatePanel type="error" title="Exams data unavailable" message={error ?? "Cannot load exam information."} />;
  }

  return (
    <div className="space-y-4 pb-8">
      <PageIntro
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(PAGE_TONE_MAP.exams.intro),
        )}
        title="Exams"
        description="Get final exam details and targeted review resources aligned with week 7 outcomes."
      />
      <ExamsBoard exams={overview.data.exams} resources={overview.data.resources} />
    </div>
  );
}
