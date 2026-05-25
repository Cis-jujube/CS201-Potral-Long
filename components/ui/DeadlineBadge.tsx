import type { DeadlineItem } from "@/lib/course/types";

const typeLabelMap: Record<DeadlineItem["type"], string> = {
  homework: "HW",
  quiz: "Quiz",
  "ai-reflection": "AI Reflection",
  "bk-reflection": "BK Reflection",
  "project-presentation": "Presentation",
  exam: "Exam",
};

interface DeadlineBadgeProps {
  deadline: DeadlineItem;
}

export function DeadlineBadge({ deadline }: DeadlineBadgeProps) {
  return (
    <span
      className={deadline.dueKind === "required" ? "badge bg-rose-500/10 text-[var(--danger)]" : "badge"}
      title={deadline.title}
    >
      {typeLabelMap[deadline.type]} /{" "}
      {new Date(deadline.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  );
}
