import { PageIntro } from "@/components/layout/PageIntro";
import { FAQBoard } from "@/components/pages/FAQBoard";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { cn } from "@/lib/utils/cn";

export default function FAQPage() {
  return (
    <div className="space-y-4 pb-8">
      <PageIntro
        className={cn(
          "surface-card module-tone-context module-tone-border p-5",
          getModuleToneClass(PAGE_TONE_MAP.faq.intro),
        )}
        title="FAQ"
        description="Quick answers to common CS201 workflow, SAG, and resource-navigation questions."
      />
      <FAQBoard />
    </div>
  );
}
