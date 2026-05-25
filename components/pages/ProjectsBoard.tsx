"use client";

import { useEffect, useState, useTransition } from "react";

import { useBkProjectSync } from "@/hooks/useBkProjectSync";
import { BK_PROJECT_PHASES, isBkPresentationWeek } from "@/lib/bk-projects/content";
import type { BkProjectGroup, BkProjectWeekPayload, BkSurveyPayload } from "@/lib/bk-projects/types";
import { PAGE_TONE_MAP, getModuleToneClass } from "@/lib/config/moduleTones";
import { COURSE_WEEKS, type WeekNumber } from "@/lib/course/types";
import { cn } from "@/lib/utils/cn";
import { useCourseUi } from "@/providers/CourseUiProvider";

interface ProjectsBoardProps {
  className?: string;
}

type SurveyState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; survey: BkSurveyPayload }
  | { state: "error"; error: string };

const ratingOptions = [
  { value: 1, label: "1 Strongly disagree" },
  { value: 2, label: "2 Disagree" },
  { value: 3, label: "3 Neutral" },
  { value: 4, label: "4 Agree" },
  { value: 5, label: "5 Strongly agree" },
];

export function ProjectsBoard({ className }: ProjectsBoardProps) {
  const tone = PAGE_TONE_MAP.projects;
  const { selectedWeek, setSelectedWeek } = useCourseUi();
  const projectSource = useBkProjectSync(selectedWeek);
  const project = projectSource.project;
  const [selectedGroupSpk, setSelectedGroupSpk] = useState<string | null>(null);
  const [surveyState, setSurveyState] = useState<SurveyState>({ state: "idle" });
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedGroup = project?.groups.find((group) => group.spk === selectedGroupSpk);

  useEffect(() => {
    setSelectedGroupSpk(null);
    setSurveyState({ state: "idle" });
    setRatings({});
    setSubmitError(null);
  }, [selectedWeek]);

  useEffect(() => {
    if (!selectedGroupSpk) {
      setSurveyState({ state: "idle" });
      return;
    }

    let active = true;

    const loadSurvey = async () => {
      setSurveyState({ state: "loading" });
      setSubmitError(null);
      try {
        const response = await fetch(`/api/bk-projects/week/${selectedWeek}/groups/${selectedGroupSpk}/survey`);
        const payload = (await response.json()) as { ok: boolean; survey?: BkSurveyPayload; error?: string };
        if (!response.ok || !payload.ok || !payload.survey) {
          throw new Error(payload.error ?? "BK voting survey unavailable.");
        }

        if (!active) {
          return;
        }

        const nextRatings = payload.survey.items
          .filter((item) => item.type === "rating")
          .reduce<Record<string, number>>((accumulator, item) => {
            const submission = payload.survey?.submissions.find((entry) => entry.itemSpk === item.spk);
            accumulator[item.spk] = submission?.rating ?? 3;
            return accumulator;
          }, {});

        setSurveyState({ state: "ready", survey: payload.survey });
        setRatings(nextRatings);
      } catch (error) {
        if (active) {
          setSurveyState({
            state: "error",
            error: error instanceof Error ? error.message : "BK voting survey unavailable.",
          });
        }
      }
    };

    void loadSurvey();

    return () => {
      active = false;
    };
  }, [selectedGroupSpk, selectedWeek]);

  const submitVote = () => {
    if (!selectedGroupSpk || surveyState.state !== "ready") {
      return;
    }

    startTransition(async () => {
      setSubmitError(null);
      try {
        const response = await fetch(`/api/bk-projects/week/${selectedWeek}/groups/${selectedGroupSpk}/vote`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ ratings }),
        });
        const payload = (await response.json()) as { ok: boolean; survey?: BkSurveyPayload; error?: string };
        if (!response.ok || !payload.ok || !payload.survey) {
          throw new Error(payload.error ?? "BK vote submission failed.");
        }

        setSurveyState({ state: "ready", survey: payload.survey });
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "BK vote submission failed.");
      }
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <section className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone.board))}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="kicker">BK Project Workspace</p>
            <h2 className="mt-1 text-lg font-semibold">Week {selectedWeek} team and voting</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              The portal reads your x.bk group from the teacher site. Votes are saved only after you press Submit vote.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {COURSE_WEEKS.map((week) => (
              <button
                key={week}
                type="button"
                onClick={() => setSelectedWeek(week)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition",
                  week === selectedWeek ? "bg-[var(--accent)] text-white" : "surface-muted",
                )}
              >
                Week {week}
              </button>
            ))}
          </div>
        </div>
      </section>

      {projectSource.state === "loading" ? (
        <StateCard title="Loading BK project..." message="Syncing your teacher-site team and voting status." />
      ) : null}

      {projectSource.state === "error" ? (
        <StateCard title="BK project unavailable" message={projectSource.error ?? "Project sync failed."} />
      ) : null}

      {projectSource.state === "ready" && project && project.syncStatus !== "synced" ? (
        <FallbackProjectMode project={project} selectedWeek={selectedWeek} />
      ) : null}

      {projectSource.state === "ready" && project && project.syncStatus === "synced" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
          <div className="space-y-4">
            <section className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone.board))}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="kicker">Current BK Project</p>
                  <h3 className="mt-1 text-base font-semibold">{project.project?.name ?? "BK Project"}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {project.project?.votingClosed ? "Voting is closed for this project." : "Voting is open when the teacher site accepts submissions."}
                  </p>
                </div>
                <span className={project.project?.votingClosed ? "badge bg-rose-500/10 text-[var(--danger)]" : "badge"}>
                  {project.project?.votingClosed ? "Closed" : "Open"}
                </span>
              </div>
            </section>

            <section className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone.board))}>
              <p className="kicker">Your Team</p>
              {project.ownGroup ? (
                <TeamCard group={project.ownGroup} />
              ) : (
                <p className="mt-2 text-sm text-muted">No own group matched the current portal username for this week.</p>
              )}
            </section>

            <section className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone.board))}>
              <p className="kicker">Other Teams</p>
              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {project.groups.map((group) => (
                  <GroupVoteCard
                    key={group.spk}
                    group={group}
                    selected={selectedGroupSpk === group.spk}
                    votingClosed={Boolean(project.project?.votingClosed)}
                    onSelect={() => setSelectedGroupSpk(group.spk)}
                  />
                ))}
              </div>
            </section>
          </div>

          <section className={cn("surface-card module-tone-context module-tone-border p-5", getModuleToneClass(tone.board))}>
            <VotePanel
              group={selectedGroup}
              surveyState={surveyState}
              ratings={ratings}
              submitting={isPending}
              submitError={submitError}
              onRatingChange={(itemSpk, rating) => setRatings((current) => ({ ...current, [itemSpk]: rating }))}
              onSubmit={submitVote}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}

function FallbackProjectMode({
  project,
  selectedWeek,
}: {
  project: BkProjectWeekPayload;
  selectedWeek: WeekNumber;
}) {
  const currentPhase = BK_PROJECT_PHASES.find((phase) => phase.weeks.includes(selectedWeek));
  const votingWeek = isBkPresentationWeek(selectedWeek);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
      <div className="space-y-4">
        <section className="surface-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="kicker">Local Project Overview</p>
              <h3 className="mt-1 text-base font-semibold">
                Week {selectedWeek} {currentPhase?.title ?? "BK Project"}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {project.syncMessage ?? "Teacher-site BK project sync is unavailable for this portal account."}
              </p>
            </div>
            <span className="badge capitalize">{project.syncStatus}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {project.sourceHref ? (
              <a className="button-ghost px-3 py-2 text-sm" href={project.sourceHref} target="_blank" rel="noreferrer">
                Open teacher site
              </a>
            ) : null}
            <span className={votingWeek ? "badge bg-amber-500/15 text-amber-700" : "badge"}>
              {votingWeek ? "Presentation / vote week" : "Project tracking week"}
            </span>
          </div>
        </section>

        <section className="surface-card p-5">
          <p className="kicker">Project Cycles</p>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {BK_PROJECT_PHASES.map((phase) => (
              <article
                key={phase.id}
                className={cn(
                  "rounded-2xl border p-4",
                  phase.id === currentPhase?.id ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-[var(--surface-2)]",
                )}
              >
                <h4 className="text-sm font-semibold">{phase.title}</h4>
                <p className="mt-1 text-xs text-muted">{phase.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {phase.weeks.map((week) => (
                    <span
                      key={week}
                      className={cn(
                        "rounded-full px-2 py-1 text-[11px] font-semibold",
                        week === selectedWeek ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] text-[var(--text)]",
                      )}
                    >
                      Week {week}
                      {isBkPresentationWeek(week) ? " vote" : ""}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="surface-card p-5">
          <p className="kicker">Your Team</p>
          <h3 className="mt-1 text-base font-semibold">Locked until teacher-site sync is configured</h3>
          <p className="mt-2 text-sm text-muted">
            The portal cannot infer your real group from the local-only account. Log in with a mapped netID or configure
            the server-side BK user map to show real members.
          </p>
        </section>

        <section className="surface-card p-5">
          <p className="kicker">Vote</p>
          <h3 className="mt-1 text-base font-semibold">Voting is read-only in local fallback mode</h3>
          <p className="mt-2 text-sm text-muted">
            No fake team choices are generated. Real voting appears here only after the teacher-site group and survey are synced.
          </p>
          <button type="button" disabled className="button-primary mt-4 w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
            Submit vote locked
          </button>
        </section>
      </div>
    </div>
  );
}

function StateCard({ title, message, actionHref }: { title: string; message: string; actionHref?: string }) {
  return (
    <article className="surface-card p-5">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {actionHref ? (
        <a className="button-ghost mt-3 inline-flex px-3 py-2 text-sm" href={actionHref} target="_blank" rel="noreferrer">
          Open teacher site
        </a>
      ) : null}
    </article>
  );
}

function TeamCard({ group }: { group: BkProjectGroup }) {
  return (
    <article className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{group.name}</h3>
          <p className="mt-1 text-xs text-muted">Group id: {group.spk}</p>
        </div>
        <span className="badge">Own team</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {group.members.length > 0 ? (
          group.members.map((member) => (
            <span key={`${group.spk}-${member.username}`} className="badge">
              {member.username}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted">No members listed.</span>
        )}
      </div>
    </article>
  );
}

function GroupVoteCard({
  group,
  selected,
  votingClosed,
  onSelect,
}: {
  group: BkProjectGroup;
  selected: boolean;
  votingClosed: boolean;
  onSelect: () => void;
}) {
  const disabled = group.isOwnGroup || votingClosed;
  return (
    <article className={cn("rounded-2xl border p-4", selected ? "border-[var(--accent)]" : "border-[var(--border)]")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{group.name}</h3>
          <p className="mt-1 text-xs text-muted">{group.members.length} member(s)</p>
        </div>
        {group.isOwnGroup ? <span className="badge">Own</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {group.members.slice(0, 5).map((member) => (
          <span key={`${group.spk}-${member.username}`} className="rounded-full bg-[var(--surface-2)] px-2 py-1 text-[11px]">
            {member.username}
          </span>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className="button-ghost mt-4 w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {group.isOwnGroup ? "Own team" : votingClosed ? "Voting closed" : selected ? "Selected" : `Vote for ${group.name}`}
      </button>
    </article>
  );
}

function VotePanel({
  group,
  surveyState,
  ratings,
  submitting,
  submitError,
  onRatingChange,
  onSubmit,
}: {
  group?: BkProjectGroup;
  surveyState: SurveyState;
  ratings: Record<string, number>;
  submitting: boolean;
  submitError: string | null;
  onRatingChange: (itemSpk: string, rating: number) => void;
  onSubmit: () => void;
}) {
  if (!group) {
    return (
      <div>
        <p className="kicker">Vote</p>
        <h3 className="mt-1 text-base font-semibold">Select another team</h3>
        <p className="mt-2 text-sm text-muted">Choose a non-own team from the list to load the rating survey.</p>
      </div>
    );
  }

  if (surveyState.state === "loading") {
    return <StateCard title="Loading survey..." message={`Fetching vote items for ${group.name}.`} />;
  }

  if (surveyState.state === "error") {
    return <StateCard title="Survey unavailable" message={surveyState.error} />;
  }

  if (surveyState.state !== "ready") {
    return <StateCard title="Survey not loaded" message={`Select Vote for ${group.name} to load the survey.`} />;
  }

  const ratingItems = surveyState.survey.items.filter((item) => item.type === "rating");
  const disabled = !surveyState.survey.canSubmit || submitting;

  return (
    <div>
      <p className="kicker">Vote</p>
      <div className="mt-1 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{group.name}</h3>
          <p className="mt-1 text-sm text-muted">
            {surveyState.survey.canSubmit
              ? "Review each rating, then submit explicitly."
              : surveyState.survey.isOwnGroup
                ? "You cannot vote for your own group."
                : "Voting is closed for this project."}
          </p>
        </div>
        <span className={surveyState.survey.canSubmit ? "badge" : "badge bg-rose-500/10 text-[var(--danger)]"}>
          {surveyState.survey.canSubmit ? "Submittable" : "Read only"}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {ratingItems.length > 0 ? (
          ratingItems.map((item) => (
            <label key={item.spk} className="block rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <span className="text-sm font-semibold">{item.label}</span>
              <select
                aria-label={`Rate ${item.label}`}
                disabled={disabled}
                value={ratings[item.spk] ?? 3}
                onChange={(event) => onRatingChange(item.spk, Number(event.target.value))}
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {ratingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))
        ) : (
          <p className="text-sm text-muted">No rating items were published for this survey.</p>
        )}
      </div>

      {submitError ? <p className="mt-3 text-sm text-[var(--danger)]">{submitError}</p> : null}

      <button
        type="button"
        disabled={disabled || ratingItems.length === 0}
        onClick={onSubmit}
        className="button-primary mt-4 w-full px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Submitting..." : "Submit vote"}
      </button>

      {surveyState.survey.submissions.length > 0 ? (
        <p className="mt-3 text-xs text-muted">Existing teacher-site vote data loaded for this team.</p>
      ) : null}
    </div>
  );
}
