import { fireEvent, render, screen } from "@testing-library/react";

import { SAGPanel } from "@/components/pages/SAGPanel";
import { MOCK_SAG_OVERVIEW } from "@/lib/mock/sagData";

describe("SAGPanel", () => {
  it("renders concise Windows and Mac setup steps without placeholder videos", () => {
    render(<SAGPanel sag={MOCK_SAG_OVERVIEW} />);

    expect(screen.getByRole("heading", { name: "Setup Checks" })).toBeInTheDocument();
    expect(screen.queryByText(/Placeholder/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Install Git Bash/)).toBeInTheDocument();
    expect(screen.getByText("choco install make python temurin21 -y")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mac" }));
    expect(screen.getByText(/Install Miniconda or Anaconda/)).toBeInTheDocument();
    expect(screen.getByText("pip install --user ptree tabulate natsort numpy pydot macht")).toBeInTheDocument();
  });
});
