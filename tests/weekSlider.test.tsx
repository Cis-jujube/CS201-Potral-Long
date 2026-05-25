import { fireEvent, render, screen } from "@testing-library/react";

import { WeekSlider } from "@/components/ui/WeekSlider";
import type { WeekNumber } from "@/lib/course/types";

describe("WeekSlider", () => {
  it("renders weeks and triggers onChange", () => {
    const onChange = vi.fn<(week: WeekNumber) => void>();
    render(<WeekSlider value={1} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Week 3" }));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
