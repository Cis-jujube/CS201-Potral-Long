import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { Navbar } from "@/components/layout/Navbar";
import { STORAGE_KEYS } from "@/lib/storage/keys";
import { CourseUiProvider } from "@/providers/CourseUiProvider";

const mockUsePathname = vi.fn<() => string>();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Navbar", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
    window.localStorage.clear();
  });

  it("renders week navigation controls and responsive desktop-nav classes", () => {
    render(
      <CourseUiProvider>
        <Navbar />
      </CourseUiProvider>,
    );

    expect(screen.getByRole("heading", { name: "Week Navigation" })).toBeInTheDocument();
    expect(screen.queryByRole("search", { name: "Global home search" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select week 1" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Planner" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Course Site" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary navigation" })).toHaveClass("min-[1800px]:flex");
    expect(screen.getByRole("button", { name: "Toggle menu" })).toHaveClass("min-[1800px]:hidden");
    expect(screen.getByRole("group", { name: "Display preferences" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Switch to Bento Box Grid" })).not.toBeInTheDocument();
    expect(screen.queryByText(/学习注记|边界条件|先读题/)).not.toBeInTheDocument();
  });

  it("collapses week navigation into a compact bar", async () => {
    render(
      <CourseUiProvider>
        <Navbar />
      </CourseUiProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Collapse week navigation" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Week 1" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Select week 1" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Expand week navigation" })).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(window.localStorage.getItem(STORAGE_KEYS.weekNavCollapsed)).toBe("true");
    });
  });

  it("does not render on the login route", () => {
    mockUsePathname.mockReturnValue("/login");

    render(
      <CourseUiProvider>
        <Navbar />
      </CourseUiProvider>,
    );

    expect(screen.queryByRole("heading", { name: "Week Navigation" })).not.toBeInTheDocument();
  });
});
