import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminBoard } from "@/components/pages/AdminBoard";

const emptyOverrides = {
  version: 1 as const,
  tasks: {},
  deadlines: {},
  resources: {},
  reflections: {},
};

const basePayload = {
  weeks: [1, 2, 3, 4, 5, 6, 7],
  tasks: [
    {
      id: "hw1",
      type: "homework",
      title: "HW1",
      description: "Practice setup.",
      weeks: [1],
      dueDate: "2026-03-17T23:59:00",
      linkedLectureIds: ["lec-1"],
      priority: "high",
      dueKind: "recommended",
    },
    {
      id: "air-1",
      type: "ai-reflection",
      title: "AI Reflection 1",
      description: "Reflect on AI use.",
      weeks: [1],
      dueDate: "2026-03-22T23:59:00",
      linkedLectureIds: ["lec-1"],
      priority: "medium",
      dueKind: "recommended",
    },
  ],
  deadlines: [
    {
      id: "ddl-hw1",
      title: "HW1",
      type: "homework",
      dueDate: "2026-03-17T23:59:00",
      week: 1,
      dueKind: "recommended",
      detail: "HW1 recommended date.",
    },
  ],
  resources: [
    {
      id: "res-1",
      type: "resource",
      title: "Starter Guide",
      description: "Guide.",
      weeks: [1],
      category: "reading",
      relatedTaskIds: ["hw1"],
      href: "/resources",
    },
  ],
};

const classNotes = [
  {
    id: "class-note-visible",
    week: 1,
    title: "Visible class note",
    description: "Shown to students.",
    originalFileName: "visible.pdf",
    storedFileName: "visible.pdf",
    mimeType: "application/pdf",
    size: 12,
    fileType: "pdf",
    publicHref: "/course-materials/class-notes/visible.pdf",
    previewHref: "/resources/class-notes/class-note-visible",
    hidden: false,
    createdAt: "2026-04-30T00:00:00.000Z",
    createdBy: "teacher",
  },
  {
    id: "class-note-hidden",
    week: 1,
    title: "Hidden class note",
    description: "Not shown to students.",
    originalFileName: "hidden.pdf",
    storedFileName: "hidden.pdf",
    mimeType: "application/pdf",
    size: 12,
    fileType: "pdf",
    publicHref: "/course-materials/class-notes/hidden.pdf",
    previewHref: "/resources/class-notes/class-note-hidden",
    hidden: true,
    createdAt: "2026-04-30T00:00:00.000Z",
    createdBy: "teacher",
  },
];

describe("AdminBoard", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url === "/api/admin/overrides" && init?.method === "PATCH") {
          return new Response(
            JSON.stringify({
              ok: true,
              overrides: {
                ...emptyOverrides,
                updatedAt: "2026-04-30T00:00:00.000Z",
                updatedBy: "test",
                tasks: { hw1: { title: "Edited HW1" } },
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (url === "/api/admin/overrides") {
          return new Response(
            JSON.stringify({
              ok: true,
              username: "test",
              overrides: emptyOverrides,
              base: basePayload,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (url === "/api/admin/class-notes") {
          return new Response(
            JSON.stringify({
              ok: true,
              username: "test",
              notes: classNotes,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows publishing status chips, dirty state, filters class notes, and previews visible content only", async () => {
    const user = userEvent.setup();
    render(<AdminBoard />);

    expect(await screen.findByText("Local content publishing workbench")).toBeInTheDocument();
    expect(screen.getAllByText("Student-visible").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Saved locally").length).toBeGreaterThan(0);

    const preview = screen.getByRole("complementary", { name: "Preview as student" });
    expect(within(preview).getByText("Visible class note")).toBeInTheDocument();
    expect(within(preview).queryByText("Hidden class note")).not.toBeInTheDocument();

    await user.clear(screen.getAllByLabelText("Title")[0]);
    await user.type(screen.getAllByLabelText("Title")[0], "Edited HW1");
    expect(screen.getAllByText("Unsaved changes").length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: "Save" })[0]);
    expect(await screen.findByText("Saved local portal overrides.")).toBeInTheDocument();
    expect(screen.getAllByText("Saved locally").length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText("Visibility"), "hidden");
    expect(screen.getByText("Showing 1 of 2 Week 1 note(s)")).toBeInTheDocument();
    expect(screen.getByText("Hidden class note")).toBeInTheDocument();
  });
});
