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
    {
      id: "ddl-exam-final",
      title: "Final Exam",
      type: "exam",
      dueDate: "2026-05-02T09:00:00",
      week: 1,
      dueKind: "required",
      detail: "Comprehensive final exam.",
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

const makeUploadNote = (title: string, originalFileName: string) => ({
  id: `class-note-${title.toLowerCase().replace(/\s+/g, "-")}`,
  week: 1,
  title,
  originalFileName,
  storedFileName: originalFileName,
  mimeType: originalFileName.endsWith(".png") ? "image/png" : "application/pdf",
  size: 12,
  fileType: originalFileName.endsWith(".png") ? "image" : "pdf",
  publicHref: `/course-materials/class-notes/${originalFileName}`,
  previewHref: `/resources/class-notes/${title}`,
  hidden: false,
  createdAt: "2026-04-30T00:00:00.000Z",
  createdBy: "test",
});

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

        if (url === "/api/admin/class-notes/upload") {
          const form = init?.body as FormData;
          const title = String(form.get("title"));
          const originalFileName = String(form.get("originalFileName"));
          return new Response(
            JSON.stringify({
              ok: true,
              note: makeUploadNote(title, originalFileName),
            }),
            { status: 201, headers: { "content-type": "application/json" } },
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

  it("renders the date workbench, edits dates, omits description fields, and previews visible content only", async () => {
    const user = userEvent.setup();
    render(<AdminBoard />);

    expect(await screen.findByText("Professor date and file controls")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Weekly schedule table" })).toBeInTheDocument();
    expect(screen.getByLabelText("Final Exam title")).toBeInTheDocument();
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Detail")).not.toBeInTheDocument();

    const hwTitle = screen.getByLabelText("HW1 title");
    const hwTime = screen.getByLabelText("HW1 time");
    await user.clear(hwTitle);
    await user.type(hwTitle, "Edited HW1");
    await user.clear(hwTime);
    await user.type(hwTime, "18:30");
    expect(screen.getAllByText("Unsaved").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Saved local portal overrides.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preview" }));
    const preview = screen.getByRole("region", { name: "Preview as student" });
    expect(within(preview).getByText("Visible class note")).toBeInTheDocument();
    expect(within(preview).queryByText("Hidden class note")).not.toBeInTheDocument();
  });

  it("queues multiple class note uploads, rejects invalid files, and adds uploaded notes", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<AdminBoard />);

    await screen.findByText("Professor date and file controls");
    await user.click(screen.getByRole("button", { name: "Files" }));

    await user.upload(screen.getByLabelText("Class note files"), [
      new File(["%PDF-1.4"], "week-one-board.pdf", { type: "application/pdf" }),
      new File(["PNG"], "diagram.png", { type: "image/png" }),
      new File(["bad"], "draft.pdf", { type: "text/plain" }),
    ]);

    expect(screen.getByDisplayValue("week one board")).toBeInTheDocument();
    expect(screen.getByDisplayValue("diagram")).toBeInTheDocument();
    expect(screen.getByText("Invalid")).toBeInTheDocument();
    expect(screen.getByText("File type does not match the allowed extension.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Upload queued" }));
    expect((await screen.findAllByText("Uploaded")).length).toBeGreaterThan(0);
    expect(await screen.findByText("week one board")).toBeInTheDocument();
    expect(await screen.findByText("diagram")).toBeInTheDocument();
  });
});
