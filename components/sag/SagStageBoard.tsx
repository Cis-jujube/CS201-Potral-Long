import type { SagStage } from "@/lib/course/types";

interface SagStageBoardProps {
  stages: SagStage[];
}

export function SagStageBoard({ stages }: SagStageBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {stages.map((stage) => (
        <article key={stage.id} className="surface-card p-5">
          <header className="mb-3">
            <p className="kicker">Stage {stage.order}</p>
            <h3 className="mt-1 text-base font-semibold">{stage.name}</h3>
            <p className="mt-1 text-sm text-muted">{stage.passRule}</p>
          </header>

          <div className="space-y-2">
            {stage.checks.map((check) => (
              <div key={check.id} className="surface-muted rounded-xl p-3">
                <p className="text-sm font-medium">{check.label}</p>
                <p className="mt-1 text-xs text-muted">{check.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-[var(--border)] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Common Failures</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
              {stage.commonFailures.map((failure) => (
                <li key={failure}>{failure}</li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </div>
  );
}
