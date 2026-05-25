import { render, screen } from "@testing-library/react";

import { ExamsBoard } from "@/components/pages/ExamsBoard";
import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";

describe("ExamsBoard", () => {
  it("renders the optimized session exam grading policy inside the Exams page content", () => {
    render(<ExamsBoard exams={MOCK_COURSE_OVERVIEW.exams} resources={MOCK_COURSE_OVERVIEW.resources} />);

    expect(screen.getAllByText("Session Exam Grading Policy").length).toBeGreaterThan(0);
    expect(screen.getByText("Category I: graded assignments")).toBeInTheDocument();
    expect(screen.getByText("Category II: AI questionnaires")).toBeInTheDocument();
    expect(screen.getByText("Category III: adaptive exam contribution")).toBeInTheDocument();
    expect(screen.getByText("max(final, 40% * mid + 60% * final)")).toBeInTheDocument();
    expect(screen.getByText("final score = x + y")).toBeInTheDocument();
    expect(screen.queryByText("Course Site Import")).not.toBeInTheDocument();
  });
});
