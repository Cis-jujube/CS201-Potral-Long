import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HomeworkPracticeBoard } from "@/components/pages/HomeworkPracticeBoard";
import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";
import { getHomeworksForWeek } from "@/lib/homework/content";
import { buildPracticeEntriesForWeek } from "@/lib/practice/content";
import type { QuizWeekPayload } from "@/lib/quiz/types";
import { buildReflectionQuestionnaire, buildReflectionWeekPayload } from "@/lib/reflections/content";

describe("HomeworkPracticeBoard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders imported exercise detail content", () => {
    const entries = buildPracticeEntriesForWeek(1, getHomeworksForWeek(1), MOCK_COURSE_OVERVIEW.tasks, {
      state: "unconfigured",
      error: "Quiz account not configured.",
    });

    render(
      <HomeworkPracticeBoard entries={entries} questionProgressMap={{}} onSetQuestionStatus={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^HW1/ }));

    expect(screen.getAllByText("Exercise 1.2.18 EuclideanDistance")[0]).toBeInTheDocument();
    expect(screen.getByText("Program description")).toBeInTheDocument();
    expect(screen.getByText("Illustrating example(s)")).toBeInTheDocument();
    expect(screen.getByText("EuclideanDistance.java")).toBeInTheDocument();
  });

  it("shows reflections and quiz in the same selector without rendering quiz answers", () => {
    const quiz: QuizWeekPayload = {
      kind: "quiz",
      id: "quiz-week-1",
      week: 1,
      title: "Week 1 Quiz",
      sourceHref: "http://example.test/cs201/quiz/101/",
      status: "open",
      progressLabel: "0/24 passed",
      problems: [
        {
          id: "quiz-problem-101",
          problemId: "101",
          week: 1,
          label: "Problem01",
          title: "Programming in Java",
          sourceHref: "http://example.test/cs201/quiz/101/",
          status: "open",
          prompt: [{ type: "text", text: "Fill in the command sequence." }],
          answerFields: [{ name: "0", label: "(0)", required: true }],
        },
        {
          id: "quiz-problem-102",
          problemId: "102",
          week: 1,
          label: "Problem02",
          title: "Already passed",
          sourceHref: "http://example.test/cs201/quiz/102/",
          status: "passed",
          prompt: [{ type: "text", text: "Teacher site says this one is done." }],
          answerFields: [{ name: "0", label: "(0)", required: true }],
        },
      ],
    };
    const entries = buildPracticeEntriesForWeek(1, getHomeworksForWeek(1), MOCK_COURSE_OVERVIEW.tasks, {
      state: "ready",
      quiz,
    });

    render(<HomeworkPracticeBoard entries={entries} questionProgressMap={{}} onSetQuestionStatus={vi.fn()} />);

    expect(screen.getByRole("button", { name: /AI Reflection/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Quiz/ }));
    expect(screen.getByRole("button", { name: "Problem01" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Problem02/ })).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
    expect(screen.getByText("Fill in the command sequence.")).toBeInTheDocument();
    expect(screen.queryByText(/Answer:/i)).not.toBeInTheDocument();
  });

  it("refreshes the live quiz after a correct teacher-site submit", async () => {
    const quiz: QuizWeekPayload = {
      kind: "quiz",
      id: "quiz-week-6",
      week: 6,
      title: "Week 6 Quiz",
      sourceHref: "http://example.test/cs201/quiz/601/",
      status: "open",
      progressLabel: "0/24 passed",
      problems: [
        {
          id: "quiz-problem-601",
          problemId: "601",
          week: 6,
          label: "Problem01",
          title: "Turing machine model",
          sourceHref: "http://example.test/cs201/quiz/601/",
          status: "open",
          prompt: [{ type: "text", text: "Fill in the command sequence." }],
          answerFields: [{ name: "0", label: "(0)", required: true }],
          submitContextId: "context-601",
        },
      ],
    };
    const entries = buildPracticeEntriesForWeek(6, getHomeworksForWeek(6), MOCK_COURSE_OVERVIEW.tasks, {
      state: "ready",
      quiz,
    });
    const refresh = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          result: { status: "passed", message: "Correct answer.", passed: 1, total: 24 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <HomeworkPracticeBoard
        entries={entries}
        questionProgressMap={{}}
        onSetQuestionStatus={vi.fn()}
        onQuizRefresh={refresh}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Quiz/ }));
    fireEvent.change(screen.getByLabelText("(0)"), { target: { value: "D" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/quiz/question/601/submit",
        expect.objectContaining({
          body: JSON.stringify({ answers: { "0": "D" }, submitContextId: "context-601" }),
        }),
      );
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("renders reflection template downloads and submits through the teacher-site endpoint", async () => {
    const questionnaire = buildReflectionQuestionnaire({
      week: 7,
      questionnaireNo: 2,
      syncStatus: "synced",
      canSubmit: true,
      responseText: "old response",
    });
    const reflection = buildReflectionWeekPayload({
      week: 7,
      syncStatus: "synced",
      questionnaires: [questionnaire],
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          questionnaire: {
            ...questionnaire,
            responseText: "updated response",
            submissionSpk: "submission-2",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const entries = buildPracticeEntriesForWeek(
      7,
      getHomeworksForWeek(7),
      MOCK_COURSE_OVERVIEW.tasks,
      {
        state: "unconfigured",
        error: "Quiz account not configured.",
      },
      { state: "ready", reflection },
    );

    render(<HomeworkPracticeBoard entries={entries} questionProgressMap={{}} onSetQuestionStatus={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /BK Reflection/ }));
    expect(screen.getByRole("link", { name: /Download BK reflection template/i })).toHaveAttribute(
      "href",
      "/reflection-templates/weekly-bk-questionnaire-template.pdf",
    );

    fireEvent.change(screen.getByLabelText("Response text"), { target: { value: "updated response" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit to teacher site" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/reflections/week/7/questionnaire/2/submit", expect.any(Object));
    });
    expect(await screen.findByText(/Submission id: submission-2/)).toBeInTheDocument();
  });

  it("keeps reflection drafts editable when teacher-site submit is unavailable", () => {
    const questionnaire = buildReflectionQuestionnaire({
      week: 1,
      questionnaireNo: 1,
      syncStatus: "unconfigured",
      canSubmit: false,
      syncMessage: "Teacher-site sync is unavailable.",
    });
    const reflection = buildReflectionWeekPayload({
      week: 1,
      syncStatus: "unconfigured",
      questionnaires: [questionnaire],
    });
    const entries = buildPracticeEntriesForWeek(
      1,
      getHomeworksForWeek(1),
      MOCK_COURSE_OVERVIEW.tasks,
      {
        state: "unconfigured",
        error: "Quiz account not configured.",
      },
      { state: "ready", reflection },
    );

    render(<HomeworkPracticeBoard entries={entries} questionProgressMap={{}} onSetQuestionStatus={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /AI Reflection/ }));
    const textarea = screen.getByLabelText("Response text");
    fireEvent.change(textarea, { target: { value: "local draft" } });

    expect(textarea).toHaveValue("local draft");
    expect(screen.getByText("Due")).toBeInTheDocument();
    expect(screen.getByText(/Mar 22/)).toBeInTheDocument();
    expect(screen.getByText("Recommended due")).toBeInTheDocument();
    expect(screen.queryByText("Required submission")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit to teacher site" })).toBeDisabled();
  });
});
