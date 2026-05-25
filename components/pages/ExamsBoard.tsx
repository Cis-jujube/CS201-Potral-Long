import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import type { ExamItem, ResourceItem } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";

interface ExamsBoardProps {
  exams: ExamItem[];
  resources: ResourceItem[];
  className?: string;
}

const COURSEWORK_ROWS = [
  ["x.bk Profile", "1", "1"],
  ["JPA Exercise", "1 point each", "17"],
  ["JPA Project", "3 points each", "2"],
  ["Written HW", "1 point each", "< 5"],
  ["Weekly quiz", "1 point each", "6 or 7"],
];

export function ExamsBoard({ exams, resources, className }: ExamsBoardProps) {
  const reviewResources = resources.filter((resource) => resource.weeks.includes(7));
  const tone = PAGE_TONE_MAP.exams;

  return (
    <div className={cn("space-y-4", className)}>
      {exams.map((exam) => (
        <section
          key={exam.id}
          className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone.schedule))}
        >
          <p className="kicker">Final Assessment</p>
          <h2 className="mt-1 text-lg font-semibold">{exam.title}</h2>
          <p className="mt-1 text-sm text-muted">{exam.description}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="surface-muted rounded-xl p-3">
              <p className="text-xs text-muted">Date</p>
              <p className="text-sm font-semibold">
                {new Date(exam.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="surface-muted rounded-xl p-3">
              <p className="text-xs text-muted">Format</p>
              <p className="text-sm font-semibold">{exam.format}</p>
            </div>
          </div>
        </section>
      ))}

      <section className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone.schedule))}>
        <p className="kicker">Session Exam Grading Policy</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">How the session score is calculated</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted">
              The session grade is not a simple final-exam-only score. It first locks in coursework and weekly AI
              questionnaire credit, then uses the exam category to fill the remaining percentage up to the 100% cap.
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
            <p className="text-xs text-muted">Exam score</p>
            <p className="mt-1 font-mono font-semibold">max(final, 40% * mid + 60% * final)</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-3">
          <article className="surface-muted rounded-2xl p-4 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Category I: graded assignments</h3>
              <span className="badge">43%</span>
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-[var(--border)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-[0.12em] text-muted">
                  <tr>
                    <th className="px-3 py-2">Assignment</th>
                    <th className="px-3 py-2">Weight</th>
                    <th className="px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {COURSEWORK_ROWS.map(([assignment, weight, total]) => (
                    <tr key={assignment} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2 font-medium">{assignment}</td>
                      <td className="px-3 py-2 text-muted">{weight}</td>
                      <td className="px-3 py-2 text-muted">{total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="surface-muted rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">Category II: AI questionnaires</h3>
              <span className="badge">7%</span>
            </div>
            <p className="mt-3 text-sm text-muted">Weekly Questionnaire-AI, 1 point each, total 7.</p>
            <p className="mt-2 text-xs text-muted">
              BK reflections are tracked in the portal workflow, but this category is specifically the weekly AI questionnaire total.
            </p>
          </article>

          <article className="surface-muted rounded-2xl p-4 xl:col-span-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">Category III: adaptive exam contribution</h3>
                  <span className="badge">remaining weight</span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Let coursework plus AI questionnaire credit be `x`. The exam category contributes only the remaining
                  percentage, using the better exam score formula shown above.
                </p>
              </div>
              <div className="rounded-xl bg-[var(--surface)] p-3 font-mono text-xs leading-6">
                <p>x = Category I + Category II</p>
                <p>y = Category III * (100 - x) / 100</p>
                <p>final score = x + y</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone.resources))}>
        <h2 className="text-lg font-semibold">Recommended Review Resources</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {reviewResources.map((resource) => (
            <article key={resource.id} className="surface-muted rounded-xl p-3">
              <p className="text-sm font-semibold">{resource.title}</p>
              <p className="mt-1 text-xs text-muted">{resource.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
