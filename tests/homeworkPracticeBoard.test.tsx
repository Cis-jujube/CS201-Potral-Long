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

  it("uses teacher-site JPA status as the primary homework progress source", () => {
    const entries = buildPracticeEntriesForWeek(1, getHomeworksForWeek(1), MOCK_COURSE_OVERVIEW.tasks, {
      state: "unconfigured",
      error: "Quiz account not configured.",
    });
    const hw1 = entries.find((entry) => entry.id === "hw1")!;
    const question = hw1.questions[0];

    render(
      <HomeworkPracticeBoard
        entries={entries}
        questionProgressMap={{ [question.id]: "not-started" }}
        onSetQuestionStatus={vi.fn()}
        homeworkStatusSource={{
          state: "ready",
          refresh: vi.fn(),
          status: {
            kind: "homework-jpa-status",
            syncStatus: "synced",
            sourceHref: "http://teacher.test/student.html",
            generatedAt: "2026-05-30T00:00:00.000Z",
            username: "student1",
            courseId: "CS201-S4-SP-2026",
            questionStatuses: {
              [question.id]: {
                questionId: question.id,
                homeworkId: "hw1",
                homeworkTitle: "HW1",
                questionTitle: question.title,
                status: "correct",
                source: "teacher-site",
                jpaNid: "E-1.2.18-EuclideanDistance",
                jpaSpk: "JPA0000049",
                grade: 1,
                lastUpdated: "2026-05-01T10:00:00",
              },
            },
            homeworkStatuses: {
              hw1: {
                homeworkId: "hw1",
                title: "HW1",
                correct: 1,
                incorrect: 0,
                ungraded: 0,
                notStarted: hw1.questions.length - 1,
                total: hw1.questions.length,
                isComplete: false,
              },
            },
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^HW1/ }));

    expect(screen.getByText("Teacher-site JPA status synced from CS201-S4-SP-2026.")).toBeInTheDocument();
    expect(screen.getAllByText("Teacher site: Correct")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Grade 1")[0]).toBeInTheDocument();
    expect(screen.getAllByText("1/6 correct")[0]).toBeInTheDocument();
  });

  it("renders incorrect, ungraded, and not-started teacher-site homework states distinctly", () => {
    const entries = buildPracticeEntriesForWeek(1, getHomeworksForWeek(1), MOCK_COURSE_OVERVIEW.tasks, {
      state: "unconfigured",
      error: "Quiz account not configured.",
    });
    const hw1 = entries.find((entry) => entry.id === "hw1")!;
    const [firstQuestion, secondQuestion, thirdQuestion] = hw1.questions;

    render(
      <HomeworkPracticeBoard
        entries={entries}
        questionProgressMap={{
          [firstQuestion.id]: "correct",
          [secondQuestion.id]: "correct",
        }}
        onSetQuestionStatus={vi.fn()}
        homeworkStatusSource={{
          state: "ready",
          refresh: vi.fn(),
          status: {
            kind: "homework-jpa-status",
            syncStatus: "synced",
            sourceHref: "http://teacher.test/student.html",
            generatedAt: "2026-05-30T00:00:00.000Z",
            username: "student1",
            courseId: "CS201-S4-SP-2026",
            questionStatuses: {
              [firstQuestion.id]: {
                questionId: firstQuestion.id,
                homeworkId: "hw1",
                homeworkTitle: "HW1",
                questionTitle: firstQuestion.title,
                status: "incorrect",
                source: "teacher-site",
                grade: 0,
                lastUpdated: "2026-05-02T10:00:00",
              },
              [secondQuestion.id]: {
                questionId: secondQuestion.id,
                homeworkId: "hw1",
                homeworkTitle: "HW1",
                questionTitle: secondQuestion.title,
                status: "ungraded",
                source: "teacher-site",
                lastUpdated: "2026-05-02T11:00:00",
              },
              [thirdQuestion.id]: {
                questionId: thirdQuestion.id,
                homeworkId: "hw1",
                homeworkTitle: "HW1",
                questionTitle: thirdQuestion.title,
                status: "not-started",
                source: "teacher-site",
              },
            },
            homeworkStatuses: {
              hw1: {
                homeworkId: "hw1",
                title: "HW1",
                correct: 0,
                incorrect: 1,
                ungraded: 1,
                notStarted: hw1.questions.length - 2,
                total: hw1.questions.length,
                isComplete: false,
              },
            },
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^HW1/ }));

    expect(screen.getAllByText("Teacher site: Incorrect")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Grade 0")[0]).toBeInTheDocument();
    expect(screen.getAllByText("0/6 correct · 1 wrong · 1 ungraded")[0]).toBeInTheDocument();
    expect(screen.getByText("4 not started")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: secondQuestion.label || secondQuestion.title }));
    expect(screen.getAllByText("Teacher site: Ungraded")[0]).toBeInTheDocument();
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

  it("refreshes the live quiz after a failed teacher-site submit", async () => {
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
          result: { status: "failed", message: "Try again.", passed: 0, total: 24, attemptsLeft: 2 },
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
    fireEvent.change(screen.getByLabelText("(0)"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it("lets students manually refresh a live quiz question", () => {
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

    render(
      <HomeworkPracticeBoard
        entries={entries}
        questionProgressMap={{}}
        onSetQuestionStatus={vi.fn()}
        onQuizRefresh={refresh}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Quiz/ }));
    fireEvent.change(screen.getByLabelText("(0)"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Refresh question" }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("(0)")).toHaveValue("");
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
