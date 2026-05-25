import { render, screen } from "@testing-library/react";

import { FAQBoard } from "@/components/pages/FAQBoard";
import { SAGPanel } from "@/components/pages/SAGPanel";
import { MOCK_SAG_OVERVIEW } from "@/lib/mock/sagData";

describe("imported course content panels", () => {
  it("keeps SAG focused on local workflow without course-site import panels", () => {
    render(<SAGPanel sag={MOCK_SAG_OVERVIEW} />);

    expect(screen.getByText("Whiteboard Workflow")).toBeInTheDocument();
    expect(screen.queryByText("Official SAG Sections")).not.toBeInTheDocument();
    expect(screen.queryByText("Course Site Import")).not.toBeInTheDocument();
  });

  it("keeps FAQ focused on local entries without course-site import panels", () => {
    render(<FAQBoard />);

    expect(screen.getByText("Weekly Workflow")).toBeInTheDocument();
    expect(screen.queryByText("Official Course Policies")).not.toBeInTheDocument();
    expect(screen.queryByText("Course Site Import")).not.toBeInTheDocument();
  });
});
