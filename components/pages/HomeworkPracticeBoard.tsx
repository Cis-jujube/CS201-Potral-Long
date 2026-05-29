"use client";

import { CheckCircle2, Download, ExternalLink, FileCode2, RefreshCw, Send } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import type { QuestionProgressStatus } from "@/lib/course/types";
import type { HomeworkQuestionDetail, HomeworkSection } from "@/lib/homework/types";
import { buildHomeworkProgressSnapshot, getQuestionStatus } from "@/lib/homework/progress";
import type {
  HomeworkPracticeQuestion,
  NoticePracticeQuestion,
  PracticeEntry,
  PracticeQuestion,
  PracticeSection,
  QuizPracticeQuestion,
  ReflectionPracticeQuestion,
} from "@/lib/practice/types";
import type { QuizSubmitResult } from "@/lib/quiz/types";
import type { ReflectionQuestionnaire } from "@/lib/reflections/types";

interface HomeworkPracticeBoardProps {
  entries: PracticeEntry[];
  questionProgressMap: Record<string, QuestionProgressStatus>;
  onSetQuestionStatus: (questionId: string, status: QuestionProgressStatus) => void;
  onQuizRefresh?: () => void;
}

const STATUS_LABEL_MAP: Record<QuestionProgressStatus, string> = {
  "not-started": "Not started",
  correct: "Correct",
  incorrect: "Incorrect",
};

const STATUS_CLASS_MAP: Record<QuestionProgressStatus, string> = {
  "not-started": "bg-[var(--surface-2)]",
  correct: "bg-emerald-500/80",
  incorrect: "bg-rose-500/80",
};

const quizStatusLabel = (status: QuizPracticeQuestion["status"]) =>
  status === "passed" ? "Passed" : status === "closed" ? "Closed" : "Open";

const quizStatusBadgeClass = (status: QuizPracticeQuestion["status"]) =>
  status === "passed"
    ? "bg-emerald-500/80 text-white"
    : status === "closed"
      ? "bg-[var(--surface-2)] text-muted"
      : "";

const uniqueStrings = (values: string[]) => [...new Set(values)];

const INLINE_CODE_PATTERN =
  /(`[^`]+`|\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+\([^)]*\)|\b[A-Za-z_$][\w$]*\([^)]*\)|\b(?:make submit|javac|java|python|pip|git|Stack|String|Integer|Math\.pow|int|double|boolean|char|args\[\d+\])\b|#[A-Za-z0-9_+-]*)/g;

const inlineCodeClass =
  "rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[0.92em] text-[var(--accent)]";

const isInlineCodeToken = (value: string) =>
  value.startsWith("`") ||
  /\b(make submit|javac|java|python|pip|git|Stack|String|Integer|Math\.pow|int|double|boolean|char|args\[\d+\])\b/.test(
    value,
  ) ||
  /[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\([^)]*\)/.test(value) ||
  /^#[A-Za-z0-9_+-]*$/.test(value);

const sourceButton = (href?: string) =>
  href ? (
    <a className="button-ghost px-2.5 py-1.5 text-xs" href={href} target="_blank" rel="noreferrer">
      Source
      <ExternalLink className="ml-1 size-3.5" />
    </a>
  ) : null;

export function HomeworkPracticeBoard({
  entries,
  questionProgressMap,
  onSetQuestionStatus,
  onQuizRefresh,
}: HomeworkPracticeBoardProps) {
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const selectedEntry = useMemo(
    () => entries.find((item) => item.id === selectedEntryId) ?? entries[0],
    [entries, selectedEntryId],
  );

  if (!selectedEntry) {
    return <p className="text-sm text-muted">No practice entries imported for this week yet.</p>;
  }

  const selectedQuestion =
    selectedEntry.questions.find((question) => question.id === selectedQuestionId) ?? selectedEntry.questions[0];

  return (
    <div className="space-y-4">
      <section className="surface-card p-4">
        <p className="kicker mb-2">Homework Selector</p>
        <div className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <PracticeEntryButton
              key={entry.id}
              entry={entry}
              selected={selectedEntry.id === entry.id}
              questionProgressMap={questionProgressMap}
              onSelect={() => {
                setSelectedEntryId(entry.id);
                setSelectedQuestionId(entry.questions[0]?.id ?? "");
              }}
            />
          ))}
        </div>
      </section>

      <section className="surface-card p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="kicker">Question Selector</p>
          {sourceButton(selectedEntry.sourceHref)}
        </div>
        {selectedEntry.questions.length === 0 ? (
          <p className="text-sm text-muted">This entry is listed but no question detail is available yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedEntry.questions.map((question) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setSelectedQuestionId(question.id)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  selectedQuestion?.id === question.id
                    ? "bg-[var(--accent)] text-white"
                    : question.kind === "quiz" && question.status === "passed"
                      ? "bg-emerald-500/80 text-white"
                      : "surface-muted"
                }`}
              >
                {question.label || question.title}
                {question.kind === "quiz" && question.status === "passed" ? (
                  <CheckCircle2 aria-label="passed" className="ml-1 inline size-3.5 align-[-2px]" />
                ) : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedQuestion ? (
        <PracticeQuestionDetail
          entry={selectedEntry}
          question={selectedQuestion}
          status={getQuestionStatus(selectedQuestion.id, questionProgressMap)}
          onSetStatus={onSetQuestionStatus}
          onQuizRefresh={onQuizRefresh}
        />
      ) : null}

      {selectedEntry.kind === "homework" ? (
        <HomeworkProgress entry={selectedEntry} questionProgressMap={questionProgressMap} />
      ) : selectedEntry.kind === "quiz" ? (
        <QuizProgress entry={selectedEntry} />
      ) : null}
    </div>
  );
}

function PracticeEntryButton({
  entry,
  selected,
  questionProgressMap,
  onSelect,
}: {
  entry: PracticeEntry;
  selected: boolean;
  questionProgressMap: Record<string, QuestionProgressStatus>;
  onSelect: () => void;
}) {
  const homeworkQuestions = entry.questions.filter(
    (question): question is HomeworkPracticeQuestion => question.kind === "homework",
  );
  const isComplete =
    entry.kind === "homework" && homeworkQuestions.length > 0
      ? homeworkQuestions.every((question) => getQuestionStatus(question.id, questionProgressMap) === "correct")
      : false;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        selected
          ? "bg-[var(--accent)] text-white"
          : isComplete
            ? "bg-emerald-500/70 text-white"
            : entry.available
              ? "surface-muted"
              : "bg-[var(--surface-2)] text-muted"
      }`}
    >
      {entry.title}
      {entry.statusLabel ? <span className="ml-2 text-[0.68rem] opacity-75">{entry.statusLabel}</span> : null}
    </button>
  );
}

function PracticeQuestionDetail({
  entry,
  question,
  status,
  onSetStatus,
  onQuizRefresh,
}: {
  entry: PracticeEntry;
  question: PracticeQuestion;
  status: QuestionProgressStatus;
  onSetStatus: (questionId: string, status: QuestionProgressStatus) => void;
  onQuizRefresh?: () => void;
}) {
  if (question.kind === "homework") {
    return <HomeworkQuestionDetailView question={question.homework} status={status} onSetStatus={onSetStatus} />;
  }

  if (question.kind === "quiz") {
    return <QuizQuestionDetail entry={entry} question={question} onQuizRefresh={onQuizRefresh} />;
  }

  if (question.kind === "reflection") {
    return <ReflectionQuestionDetail question={question} />;
  }

  return <NoticeQuestionDetail question={question} />;
}

function HomeworkQuestionDetailView({
  question,
  status,
  onSetStatus,
}: {
  question: HomeworkQuestionDetail;
  status: QuestionProgressStatus;
  onSetStatus: (questionId: string, status: QuestionProgressStatus) => void;
}) {
  const visibleSections = question.sections.filter((section) => section.heading !== question.title);
  const filesToSubmit = uniqueStrings(question.filesToSubmit);

  return (
    <section className="surface-card scroll-mt-72 overflow-hidden p-0">
      <DocumentHeader
        kicker="Question Detail"
        title={question.title}
        metadata={question.metadata}
        sourceHref={question.sourceHref}
      >
        <div className="flex flex-wrap gap-2">
          {(["not-started", "correct", "incorrect"] as const).map((nextStatus) => (
            <button
              key={nextStatus}
              type="button"
              onClick={() => onSetStatus(question.id, nextStatus)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                status === nextStatus ? "bg-[var(--accent)] text-white" : "surface-muted"
              }`}
            >
              {STATUS_LABEL_MAP[nextStatus]}
            </button>
          ))}
        </div>
      </DocumentHeader>

      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <div className="space-y-8">
          {visibleSections.map((section) => (
            <DocumentSection key={section.heading} section={section} />
          ))}

          {filesToSubmit.length > 0 ? <SubmittedFiles files={filesToSubmit} /> : null}
        </div>
      </div>
    </section>
  );
}

function ReflectionQuestionDetail({ question }: { question: ReflectionPracticeQuestion }) {
  const reflection = question.reflection;
  const [responseText, setResponseText] = useState(reflection?.responseText ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedReflection, setSavedReflection] = useState<ReflectionQuestionnaire | null>(reflection ?? null);

  useEffect(() => {
    setResponseText(reflection?.responseText ?? "");
    setSubmitError(null);
    setSavedReflection(reflection ?? null);
  }, [reflection]);

  const submit = async () => {
    if (!reflection?.canSubmit) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(reflection.submitEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ responseText }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        questionnaire?: ReflectionQuestionnaire;
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.questionnaire) {
        throw new Error(payload.error ?? "Reflection submission failed.");
      }

      setSavedReflection(payload.questionnaire);
      setResponseText(payload.questionnaire.responseText ?? responseText);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Reflection submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="surface-card scroll-mt-72 overflow-hidden p-0">
      <DocumentHeader
        kicker="Question Detail"
        title={question.title}
        metadata={question.metadata}
        sourceHref={question.sourceHref}
      >
        {reflection ? (
          <a className="button-ghost px-2.5 py-1.5 text-xs" href={reflection.template.href} download>
            <Download className="mr-1 size-3.5" />
            Template
          </a>
        ) : null}
      </DocumentHeader>
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <div className="space-y-8">
          {question.sections.map((section) => (
            <DocumentSection key={section.heading} section={section} />
          ))}
          {reflection ? (
            <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h5 className="text-sm font-semibold">Teacher-site submission</h5>
                  <p className="mt-1 text-sm text-muted">
                    {reflection.canSubmit
                      ? "Edit your response here, then click Submit to write it to the teacher site."
                      : reflection.syncMessage ?? "Teacher-site submission is unavailable from the portal."}
                  </p>
                </div>
                <ReflectionStatus reflection={savedReflection ?? reflection} />
              </div>

              <a className="button-ghost w-fit px-3 py-2 text-sm" href={reflection.template.href} download>
                <Download className="mr-2 size-4" />
                {reflection.template.label}
              </a>

              <label className="block text-sm font-semibold">
                Response text
                <textarea
                  className="mt-2 min-h-64 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm leading-6 outline-none focus:border-[var(--accent)]"
                  value={responseText}
                  disabled={submitting}
                  onChange={(event) => setResponseText(event.target.value)}
                  placeholder="Enter your reflection response..."
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="button-primary px-3 py-2 text-sm"
                  disabled={!reflection.canSubmit || submitting}
                  onClick={submit}
                >
                  <Send className="mr-2 size-4" />
                  {submitting ? "Submitting..." : "Submit to teacher site"}
                </button>
                {!reflection.canSubmit ? (
                  <a className="button-ghost px-3 py-2 text-sm" href={reflection.sourceHref} target="_blank" rel="noreferrer">
                    Open teacher site
                    <ExternalLink className="ml-2 size-4" />
                  </a>
                ) : null}
              </div>

              {savedReflection?.submissionSpk ? (
                <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700">
                  Saved to teacher site. Submission id: {savedReflection.submissionSpk}
                </p>
              ) : null}
              {submitError ? <p className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700">{submitError}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ReflectionStatus({ reflection }: { reflection: ReflectionQuestionnaire }) {
  return (
    <div className="flex flex-wrap gap-2 lg:justify-end">
      <span className="badge capitalize">{reflection.syncStatus}</span>
      {reflection.accepted !== undefined ? (
        <span className={`badge ${reflection.accepted ? "bg-emerald-500/80 text-white" : "bg-rose-500/80 text-white"}`}>
          {reflection.accepted ? "Accepted" : "Not accepted"}
        </span>
      ) : null}
      {reflection.submissionSpk ? <span className="badge">Submitted</span> : <span className="badge">No submission</span>}
    </div>
  );
}

function NoticeQuestionDetail({ question }: { question: NoticePracticeQuestion }) {
  return (
    <section className="surface-card scroll-mt-72 overflow-hidden p-0">
      <DocumentHeader
        kicker="Question Detail"
        title={question.title}
        metadata={question.metadata}
        sourceHref={question.sourceHref}
      />
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <div className="space-y-8">
          {question.sections.map((section) => (
            <DocumentSection key={section.heading} section={section} />
          ))}
        </div>
      </div>
    </section>
  );
}

function QuizQuestionDetail({
  entry,
  question,
  onQuizRefresh,
}: {
  entry: PracticeEntry;
  question: QuizPracticeQuestion;
  onQuizRefresh?: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<QuizSubmitResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isOpen = question.status === "open" && question.answerFields.length > 0;

  useEffect(() => {
    setAnswers({});
    setSubmitResult(null);
    setSubmitError(null);
  }, [question.problemId]);

  useEffect(() => {
    setAnswers({});
    setSubmitError(null);
  }, [question.submitContextId]);

  const refreshQuizQuestion = () => {
    setAnswers({});
    setSubmitResult(null);
    setSubmitError(null);
    onQuizRefresh?.();
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);
    try {
      const response = await fetch(`/api/quiz/question/${question.problemId}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, submitContextId: question.submitContextId }),
      });
      const payload = (await response.json()) as { ok: boolean; result?: QuizSubmitResult; error?: string };
      if (!response.ok || !payload.ok || !payload.result) {
        throw new Error(payload.error ?? "Quiz submission failed.");
      }
      setSubmitResult(payload.result);
      onQuizRefresh?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Quiz submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="surface-card scroll-mt-72 overflow-hidden p-0">
      <DocumentHeader kicker="Quiz Detail" title={question.label} subtitle={question.title} sourceHref={question.sourceHref}>
        <div className="flex flex-wrap gap-2">
          {onQuizRefresh ? (
            <button
              type="button"
              className="button-ghost px-2.5 py-1.5 text-xs"
              disabled={submitting}
              onClick={refreshQuizQuestion}
            >
              <RefreshCw className="mr-1 size-3.5" />
              Refresh question
            </button>
          ) : null}
          {entry.progressLabel ? <span className="badge">{entry.progressLabel}</span> : null}
          <span className={`badge ${quizStatusBadgeClass(question.status)}`}>{quizStatusLabel(question.status)}</span>
          {entry.dueDate ? <span className="badge">Due {entry.dueDate}</span> : null}
        </div>
      </DocumentHeader>

      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8 sm:py-8">
        <div className="space-y-4">
          <h5 className="border-b border-[var(--border)] pb-2 text-lg font-semibold tracking-normal">Prompt</h5>
          {question.prompt.length > 0 ? (
            question.prompt.map((block, index) =>
              block.type === "code" ? (
                <pre key={`${question.id}-prompt-${index}`} className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs leading-relaxed">
                  <code>{block.text}</code>
                </pre>
              ) : (
                <p key={`${question.id}-prompt-${index}`} className="text-[0.97rem] leading-8 text-[var(--text)]">
                  <InlineFormattedText text={block.text} />
                </p>
              ),
            )
          ) : (
            <p className="text-sm text-muted">The quiz prompt is unavailable from the course site response.</p>
          )}
        </div>

        {isOpen ? (
          <div className="mt-8 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <h5 className="text-sm font-semibold">Your answers</h5>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {question.answerFields.map((field) => (
                <label key={field.name} className="text-sm font-semibold">
                  {field.label}
                  <input
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    value={answers[field.name] ?? ""}
                    required={field.required}
                    onChange={(event) => setAnswers((current) => ({ ...current, [field.name]: event.target.value }))}
                  />
                </label>
              ))}
            </div>
            <button type="button" className="button-primary px-3 py-2 text-sm" disabled={submitting} onClick={submit}>
              <Send className="mr-2 size-4" />
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        ) : (
          <p className="mt-8 rounded-xl bg-[var(--surface-2)] p-3 text-sm text-muted">
            {question.status === "passed"
              ? "This quiz problem is already marked passed on the teacher site."
              : "This quiz problem is closed. The portal shows the prompt and status only; answers stay hidden."}
          </p>
        )}

        {submitResult ? (
          <div className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm">
            <p className="font-semibold capitalize">{submitResult.status}</p>
            <p className="mt-1 text-muted">{submitResult.message}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {typeof submitResult.passed === "number" && typeof submitResult.total === "number" ? (
                <span className="badge">{submitResult.passed}/{submitResult.total} passed</span>
              ) : null}
              {typeof submitResult.attemptsLeft === "number" ? (
                <span className="badge">{submitResult.attemptsLeft} attempts left</span>
              ) : null}
            </div>
          </div>
        ) : null}

        {submitError ? <p className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700">{submitError}</p> : null}
      </div>
    </section>
  );
}

function HomeworkProgress({
  entry,
  questionProgressMap,
}: {
  entry: PracticeEntry;
  questionProgressMap: Record<string, QuestionProgressStatus>;
}) {
  const homeworkQuestions = entry.questions.filter(
    (question): question is HomeworkPracticeQuestion => question.kind === "homework",
  );
  const homeworkLike = {
    ...entry,
    questions: homeworkQuestions.map((question) => question.homework),
  };
  const homeworkProgress = buildHomeworkProgressSnapshot(homeworkLike, questionProgressMap);

  return (
    <section className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="kicker">Question Progress</p>
        <span className={`badge ${homeworkProgress.isComplete ? "bg-emerald-500/80 text-white" : ""}`}>
          {homeworkProgress.correct}/{homeworkProgress.total} correct
        </span>
      </div>
      <div className="space-y-2">
        {homeworkQuestions.map((question) => {
          const status = getQuestionStatus(question.id, questionProgressMap);
          return (
            <div key={question.id} className="surface-muted rounded-xl p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{question.title}</p>
                <p className="text-xs text-muted">{STATUS_LABEL_MAP[status]}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--surface)]">
                <div
                  className={`h-full rounded-full transition-all ${STATUS_CLASS_MAP[status]}`}
                  style={{ width: status === "not-started" ? "35%" : "100%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function QuizProgress({ entry }: { entry: PracticeEntry }) {
  const quizQuestions = entry.questions.filter((question): question is QuizPracticeQuestion => question.kind === "quiz");
  return (
    <section className="surface-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="kicker">Quiz Progress</p>
        {entry.progressLabel ? <span className="badge">{entry.progressLabel}</span> : null}
      </div>
      {quizQuestions.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
          {quizQuestions.map((question) => (
              <div
                key={question.id}
                className={`rounded-xl border p-3 ${
                  question.status === "passed"
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "surface-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{question.label}</p>
                  {question.status === "passed" ? <CheckCircle2 className="size-4 shrink-0 text-[var(--success)]" /> : null}
                </div>
                <p className={`mt-1 text-xs ${question.status === "passed" ? "font-semibold text-[var(--success)]" : "text-muted"}`}>
                  {quizStatusLabel(question.status)}
                </p>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Quiz progress will appear after the course site response loads.</p>
      )}
    </section>
  );
}

function DocumentHeader({
  kicker,
  title,
  subtitle,
  metadata,
  sourceHref,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  metadata?: string[];
  sourceHref?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface-2)] px-5 py-5 sm:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="kicker">{kicker}</p>
          <h4 className="mt-2 text-2xl font-semibold leading-tight tracking-normal text-[var(--text)]">{title}</h4>
          {subtitle ? <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p> : null}
          {metadata && metadata.length > 0 ? (
            <dl className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
              {metadata.map((item) => {
                const separatorIndex = item.indexOf(":");
                const label = separatorIndex > 0 ? item.slice(0, separatorIndex).trim() : "Info";
                const value = separatorIndex > 0 ? item.slice(separatorIndex + 1).trim() : item;
                return (
                  <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
                    <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold">{value}</dd>
                  </div>
                );
              })}
            </dl>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {children}
          {sourceButton(sourceHref)}
        </div>
      </div>
    </header>
  );
}

function DocumentSection({ section }: { section: HomeworkSection | PracticeSection }) {
  return (
    <section className="space-y-4">
      <h5 className="border-b border-[var(--border)] pb-2 text-lg font-semibold tracking-normal">{section.heading}</h5>
      <div className="space-y-4">
        {section.items.map((item, index) =>
          item.type === "code" ? (
            <pre key={`${section.heading}-${index}`} className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs leading-relaxed">
              <code>{item.text}</code>
            </pre>
          ) : (
            <p key={`${section.heading}-${index}`} className="text-[0.97rem] leading-8 text-[var(--text)]">
              <InlineFormattedText text={item.text} />
            </p>
          ),
        )}
      </div>
    </section>
  );
}

function InlineFormattedText({ text }: { text: string }) {
  const segments = text.split(INLINE_CODE_PATTERN).filter(Boolean);

  return (
    <>
      {segments.map((segment, index) => {
        const cleaned = segment.startsWith("`") && segment.endsWith("`") ? segment.slice(1, -1) : segment;
        if (isInlineCodeToken(segment)) {
          return (
            <code key={`${segment}-${index}`} className={inlineCodeClass}>
              {cleaned}
            </code>
          );
        }

        return <span key={`${segment}-${index}`}>{segment}</span>;
      })}
    </>
  );
}

function SubmittedFiles({ files }: { files: string[] }) {
  return (
    <section className="space-y-4">
      <h5 className="border-b border-[var(--border)] pb-2 text-lg font-semibold tracking-normal">Files to be submitted</h5>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {files.map((file) => (
          <li key={file} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <FileCode2 className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <code className="block truncate font-mono text-sm font-semibold">{file}</code>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <CheckCircle2 className="size-3.5" />
                Required source file
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
