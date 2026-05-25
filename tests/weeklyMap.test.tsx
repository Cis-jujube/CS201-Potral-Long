import { render, screen } from "@testing-library/react";

import { WeeklyMap } from "@/components/home/WeeklyMap";
import type { WeekBundle } from "@/lib/course/types";
import { getWeekBundle } from "@/lib/course/selectors";
import { mergeLiveQuizNodes, mergeSyncedReflectionNodes } from "@/lib/home/learningMap";
import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";
import { buildReflectionQuestionnaire, buildReflectionWeekPayload } from "@/lib/reflections/content";

describe("WeeklyMap", () => {
  it("shows week-matched lecture PPTs and lab PDFs inside the learning map", () => {
    render(<WeeklyMap bundle={getWeekBundle(MOCK_COURSE_OVERVIEW, 1)} />);

    expect(screen.getByText("Lectures")).toBeInTheDocument();
    expect(screen.getByText("Lab")).toBeInTheDocument();
    expect(screen.queryByText("Resources")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CS\.1\.Basics\.pdf/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/resources/materials/lecture-week-1-session-2"),
    );
    expect(screen.getByRole("link", { name: /Week_1__Lab\.DataTypes\.pdf/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/resources/materials/lab-week-1"),
    );
  });

  it("replaces static reflection tasks with synced AI and BK reflection nodes", () => {
    const reflection = buildReflectionWeekPayload({
      week: 2,
      syncStatus: "synced",
      questionnaires: [1, 2].map((questionnaireNo) =>
        buildReflectionQuestionnaire({
          week: 2,
          questionnaireNo,
          syncStatus: "synced",
          canSubmit: true,
        }),
      ),
    });

    render(<WeeklyMap bundle={mergeSyncedReflectionNodes(getWeekBundle(MOCK_COURSE_OVERVIEW, 2), reflection)} />);

    expect(screen.getAllByText("AI Reflection").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("BK Reflection").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/BK\/BQ/)).not.toBeInTheDocument();
  });

  it("does not render fake placeholder links for nodes without href", () => {
    const bundle: WeekBundle = {
      ...getWeekBundle(MOCK_COURSE_OVERVIEW, 1),
      mapNodes: [{ id: "lab-without-link", type: "lab", title: "Offline Lab PDF" }],
      mapEdges: [],
    };

    render(<WeeklyMap bundle={bundle} />);

    const labColumn = screen.getByText("Lab").closest("div");
    expect(labColumn).not.toBeNull();
    expect(screen.queryByRole("link", { name: /Offline Lab PDF/i })).not.toBeInTheDocument();
    expect(screen.getByText("No link available")).toBeInTheDocument();
  });

  it("shows live quiz totals and per-question status colors", () => {
    const bundle = mergeLiveQuizNodes(getWeekBundle(MOCK_COURSE_OVERVIEW, 2), {
      kind: "quiz",
      id: "quiz-week-2",
      week: 2,
      title: "Week 2 Quiz",
      sourceHref: "http://quiz.test/cs201/quiz/201/",
      status: "open",
      problems: [
        {
          id: "quiz-problem-201",
          problemId: "201",
          week: 2,
          label: "Problem01",
          title: "Loops",
          sourceHref: "http://quiz.test/cs201/quiz/201/",
          status: "passed",
          prompt: [],
          answerFields: [],
        },
        {
          id: "quiz-problem-202",
          problemId: "202",
          week: 2,
          label: "Problem02",
          title: "Branches",
          sourceHref: "http://quiz.test/cs201/quiz/202/",
          status: "closed",
          prompt: [],
          answerFields: [],
        },
        {
          id: "quiz-problem-203",
          problemId: "203",
          week: 2,
          label: "Problem03",
          title: "Arrays",
          sourceHref: "http://quiz.test/cs201/quiz/203/",
          status: "open",
          prompt: [],
          answerFields: [],
        },
      ],
    });

    render(<WeeklyMap bundle={bundle} />);

    expect(screen.getByText("Total 3")).toBeInTheDocument();
    expect(screen.getByText("Correct 1")).toBeInTheDocument();
    expect(screen.getByText("Incorrect 1")).toBeInTheDocument();
    expect(screen.getByText("Not done 1")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Problem01/i })).toHaveClass("bg-emerald-500/10");
    expect(screen.getByRole("link", { name: /Problem02/i })).toHaveClass("bg-rose-500/10");
  });
});
