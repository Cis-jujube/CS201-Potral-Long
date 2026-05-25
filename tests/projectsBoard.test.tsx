import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ProjectsBoard } from "@/components/pages/ProjectsBoard";
import type { BkProjectWeekPayload, BkSurveyPayload } from "@/lib/bk-projects/types";

const mocks = vi.hoisted(() => ({
  useBkProjectSync: vi.fn(),
  setSelectedWeek: vi.fn(),
}));

vi.mock("@/hooks/useBkProjectSync", () => ({
  useBkProjectSync: () => mocks.useBkProjectSync(),
}));

vi.mock("@/providers/CourseUiProvider", () => ({
  useCourseUi: () => ({
    selectedWeek: 5,
    setSelectedWeek: mocks.setSelectedWeek,
  }),
}));

const project: BkProjectWeekPayload = {
  kind: "bk-project-week",
  week: 5,
  sourceHref: "http://teacher.test/student.html",
  syncStatus: "synced",
  generatedAt: "2026-04-29T00:00:00.000Z",
  project: {
    spk: "bk5",
    name: "Week 5 BK",
    surveySpk: "survey-5",
    votingClosed: false,
  },
  ownGroup: {
    spk: "own",
    name: "Team 3",
    members: [{ username: "student1" }, { username: "student2" }],
    isOwnGroup: true,
  },
  groups: [
    {
      spk: "own",
      name: "Team 3",
      members: [{ username: "student1" }, { username: "student2" }],
      isOwnGroup: true,
    },
    {
      spk: "target",
      name: "Team 4",
      members: [{ username: "student3" }],
      isOwnGroup: false,
    },
  ],
  canVote: true,
};

const survey: BkSurveyPayload = {
  kind: "bk-survey",
  week: 5,
  sourceHref: "http://teacher.test/student.html",
  project: project.project!,
  group: project.groups[1],
  items: [{ spk: "item-1", nid: "quality", label: "Quality", type: "rating" }],
  submissions: [],
  votingClosed: false,
  isOwnGroup: false,
  canSubmit: true,
};

describe("ProjectsBoard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders own team and submits votes explicitly", async () => {
    mocks.useBkProjectSync.mockReturnValue({ state: "ready", project });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, survey }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, survey: { ...survey, submissions: [{ spk: "sub-1", itemSpk: "item-1", rating: 4 }] } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<ProjectsBoard />);

    expect(screen.getAllByText("Team 3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("student1").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Vote for Team 4" }));

    expect(await screen.findByLabelText("Rate Quality")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Rate Quality"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit vote" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/bk-projects/week/5/groups/target/vote", expect.any(Object));
    });
    expect(String((fetchMock.mock.calls[1][1] as RequestInit).body)).toContain("\"item-1\":4");
  });

  it("renders a useful local fallback when sync is unavailable", () => {
    mocks.useBkProjectSync.mockReturnValue({
      state: "ready",
      project: {
        kind: "bk-project-week",
        week: 5,
        sourceHref: "http://teacher.test/student.html",
        syncStatus: "unconfigured",
        syncMessage: "Teacher-site BK project sync is not configured.",
        generatedAt: "2026-04-29T00:00:00.000Z",
        groups: [],
        canVote: false,
      },
    });

    render(<ProjectsBoard />);

    expect(screen.getByText("Local Project Overview")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Locked until teacher-site sync is configured" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Voting is read-only in local fallback mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit vote locked" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Open teacher site" })).toHaveAttribute(
      "href",
      "http://teacher.test/student.html",
    );
  });
});
