import type { SagStage } from "@/lib/course/types";

interface SagAttemptTimelineProps {
  stages: SagStage[];
}

export function SagAttemptTimeline({ stages }: SagAttemptTimelineProps) {
  return (
    <div className="space-y-4">
      {stages.map((stage) => (
        <article key={stage.id} className="surface-muted rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Stage {stage.order}</p>
          <h3 className="mt-1 text-sm font-semibold">{stage.name}</h3>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <p className="text-xs text-muted">Pass rule: {stage.passRule}</p>
            <p className="text-xs text-muted">Retry: {stage.retryPolicy}</p>
            <p className="text-xs text-muted">Feedback: {stage.feedbackWindow}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
