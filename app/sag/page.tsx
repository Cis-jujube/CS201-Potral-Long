"use client";

import { PageIntro } from "@/components/layout/PageIntro";
import { SAGPanel } from "@/components/pages/SAGPanel";
import { StatePanel } from "@/components/ui/StatePanel";
import { useSagOverview } from "@/hooks/useSagOverview";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { cn } from "@/lib/utils/cn";

export default function SAGPage() {
  const { data, loading, error } = useSagOverview();

  if (loading) {
    return <StatePanel type="loading" title="Loading SAG..." message="Fetching staged auto-grading details." />;
  }

  if (error || !data) {
    return (
      <StatePanel
        type="error"
        title="Unable to load SAG"
        message={error ?? "Please retry after checking API configuration."}
      />
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <PageIntro
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(PAGE_TONE_MAP.sag.summary),
        )}
        title="Staged Auto-Grading (SAG)"
        description="Understand stage gates, retry rules, and feedback windows before every project submission."
      />
      <SAGPanel sag={data.data} />
    </div>
  );
}
