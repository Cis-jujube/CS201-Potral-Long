import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { cn } from "@/lib/utils/cn";

const faqGroups = [
  {
    title: "Weekly Workflow",
    entries: [
      {
        q: "How should I start each week?",
        a: "Open the Home page, select your current week, then follow lecture -> tasks -> resources in order.",
      },
      {
        q: "What if this week has too many tasks?",
        a: "Prioritize high-priority tasks and deadlines first, then complete reflections after core assignments.",
      },
    ],
  },
  {
    title: "SAG & Grading",
    entries: [
      {
        q: "What is staged auto-grading?",
        a: "SAG checks your work in ordered gates: build/lint, tests, integration, then rubric review.",
      },
      {
        q: "Can I retry if one stage fails?",
        a: "Yes. Retry policy is stage-specific and shown on the SAG page.",
      },
    ],
  },
  {
    title: "Resources & Support",
    entries: [
      {
        q: "How do I bookmark useful resources?",
        a: "Open Resources and use the bookmark icon. Your bookmarks are saved in localStorage.",
      },
      {
        q: "Where do I check all upcoming deadlines?",
        a: "Use Home -> Due This Week for weekly deadlines and the Task Calendar.",
      },
    ],
  },
];

export function FAQBoard({ className }: { className?: string }) {
  const tone = PAGE_TONE_MAP.faq;

  return (
    <div className={cn("space-y-4", className)}>
      {faqGroups.map((group) => (
        <section
          key={group.title}
          className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone.groups))}
        >
          <h2 className="text-lg font-semibold">{group.title}</h2>
          <div className="mt-4 space-y-3">
            {group.entries.map((entry) => (
              <article key={entry.q} className="surface-muted rounded-xl p-4">
                <p className="text-sm font-semibold">{entry.q}</p>
                <p className="mt-1 text-sm text-muted">{entry.a}</p>
              </article>
            ))}
          </div>
        </section>
      ))}

    </div>
  );
}
