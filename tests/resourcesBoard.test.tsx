import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ResourcesBoard } from "@/components/pages/ResourcesBoard";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { CourseUiProvider } from "@/providers/CourseUiProvider";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const renderResourcesBoard = (week = "1") => {
  window.localStorage.setItem(STORAGE_KEYS.selectedWeek, week);

  return render(
    <CourseUiProvider>
      <ResourcesBoard />
    </CourseUiProvider>,
  );
};

describe("ResourcesBoard", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, notes: [] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Lecture, Lab, and Class Notes tabs instead of the old search box", () => {
    renderResourcesBoard();

    expect(screen.getByRole("link", { name: /Download textbook/i })).toHaveAttribute(
      "href",
      "/course-materials/textbook/cs201-textbook.pdf",
    );
    expect(screen.getByRole("button", { name: "Lecture" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Lab" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Class Notes" })).toBeInTheDocument();
    expect(screen.getByText("Official Course Site")).toBeInTheDocument();
    expect(screen.getByText("Course Site Import")).toBeInTheDocument();
    expect(screen.queryByText("Search Resources")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search by title, description, or category...")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CS\.1\.Basics\.pdf/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/resources/materials/lecture-week-1-session-2"),
    );
  });

  it("switches to lab materials and renders answer subitems", async () => {
    const user = userEvent.setup();
    renderResourcesBoard();

    await user.click(screen.getByRole("button", { name: "Lab" }));

    expect(screen.getByRole("button", { name: "Lab" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /Week_1__Lab\.DataTypes\.pdf/i })).toBeInTheDocument();
    expect(screen.getAllByText("Answers by Yike/Isaac").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /CS201\.DKU\.week1\.Lab\.DataTypes\.YikeGuo\.pdf/i })).toBeInTheDocument();
  });

  it("switches to Class Notes and renders PDF/image preview links", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          notes: [
            {
              id: "class-note-1",
              week: 1,
              title: "Week 1 whiteboard",
              description: "Lecture scratch notes.",
              originalFileName: "whiteboard.png",
              storedFileName: "class-note-1.png",
              mimeType: "image/png",
              size: 12,
              fileType: "image",
              publicHref: "/course-materials/class-notes/class-note-1.png",
              previewHref: "/resources/class-notes/class-note-1",
              hidden: false,
              createdAt: "2026-04-30T00:00:00.000Z",
              createdBy: "teacher",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );

    renderResourcesBoard();

    await user.click(screen.getByRole("button", { name: "Class Notes" }));

    expect(await screen.findByText("Week 1 whiteboard")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Preview/i })).toHaveAttribute(
      "href",
      "/resources/class-notes/class-note-1",
    );
    expect(
      screen
        .getAllByRole("link", { name: /Download/i })
        .some((link) => link.getAttribute("href") === "/course-materials/class-notes/class-note-1.png"),
    ).toBe(true);
  });

  it("only renders materials for the selected week", () => {
    renderResourcesBoard("3");

    expect(screen.getByRole("heading", { name: "Week 3 Lecture, Lab, and Class Notes" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CS\.6\.Recursion\.pdf/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /CS\.1\.Basics\.pdf/i })).not.toBeInTheDocument();
  });
});
