import { render, screen } from "@testing-library/react";

import { TaskCalendar } from "@/components/home/TaskCalendar";
import type { DeadlineItem } from "@/lib/course/types";

const deadlines: DeadlineItem[] = [
  {
    id: "ddl-hw1",
    title: "HW1",
    type: "homework",
    dueDate: "2026-03-17T23:59:00",
    week: 1,
    dueKind: "recommended",
    detail: "hw1",
  },
  {
    id: "ddl-bk-presentation-2",
    title: "BK Project Presentation",
    type: "project-presentation",
    dueDate: "2026-03-17T17:00:00",
    week: 1,
    dueKind: "required",
    detail: "Presentation and voting.",
  },
];

describe("TaskCalendar", () => {
  it("shows required and recommended due details", () => {
    render(<TaskCalendar deadlines={deadlines} />);

    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 due item(s) on day 17" })).toBeInTheDocument();
    expect(screen.getByText("HW1")).toBeInTheDocument();
    expect(screen.getByText("BK Project Presentation")).toBeInTheDocument();
    expect(screen.getByText("Project presentation at 5:00 PM")).toBeInTheDocument();
    expect(screen.getByText("recommended")).toBeInTheDocument();
    expect(screen.getAllByText("required").length).toBeGreaterThan(0);
  });
});
