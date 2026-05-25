import { PageIntro } from "@/components/layout/PageIntro";
import { ResourcesBoard } from "@/components/pages/ResourcesBoard";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { cn } from "@/lib/utils/cn";

export default function ResourcesPage() {
  return (
    <div className="space-y-4 pb-8">
      <PageIntro
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(PAGE_TONE_MAP.resources.library),
        )}
        title="Resources"
        description="Open matched lecture slides, lab files, and admin-uploaded class notes in preview pages, then download the local file when available."
      />
      <ResourcesBoard className={getModuleToneClass(PAGE_TONE_MAP.resources.library)} />
    </div>
  );
}
