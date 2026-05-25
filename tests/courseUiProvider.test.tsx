import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { STORAGE_KEYS } from "@/lib/storage/keys";
import { CourseUiProvider, useCourseUi } from "@/providers/CourseUiProvider";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

function ProviderProbe() {
  const { globalQuery, selectedWeek, setGlobalQuery, setWeekNavCollapsed, weekNavCollapsed } = useCourseUi();

  return (
    <div>
      <p data-testid="global-query">{globalQuery}</p>
      <p data-testid="selected-week">{selectedWeek}</p>
      <p data-testid="week-nav-collapsed">{weekNavCollapsed ? "collapsed" : "expanded"}</p>
      <button type="button" onClick={() => setGlobalQuery("typed query")}>
        Update Query
      </button>
      <button type="button" onClick={() => setWeekNavCollapsed(true)}>
        Collapse Week Nav
      </button>
    </div>
  );
}

describe("CourseUiProvider globalQuery", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSearchParams = new URLSearchParams();
  });

  it("loads persisted query and writes updates", async () => {
    window.localStorage.setItem(STORAGE_KEYS.homeSearchQuery, "persisted query");

    render(
      <CourseUiProvider>
        <ProviderProbe />
      </CourseUiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("global-query")).toHaveTextContent("persisted query");
    });

    fireEvent.click(screen.getByRole("button", { name: "Update Query" }));

    await waitFor(() => {
      expect(screen.getByTestId("global-query")).toHaveTextContent("typed query");
      expect(window.localStorage.getItem(STORAGE_KEYS.homeSearchQuery)).toBe("typed query");
    });
  });

  it("restores persisted week without overwriting it", async () => {
    window.localStorage.setItem(STORAGE_KEYS.selectedWeek, "3");

    render(
      <CourseUiProvider>
        <ProviderProbe />
      </CourseUiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("selected-week")).toHaveTextContent("3");
      expect(window.localStorage.getItem(STORAGE_KEYS.selectedWeek)).toBe("3");
    });
  });

  it("gives URL query higher priority than local storage", async () => {
    window.localStorage.setItem(STORAGE_KEYS.homeSearchQuery, "local query");
    mockSearchParams = new URLSearchParams("q=url query");

    render(
      <CourseUiProvider>
        <ProviderProbe />
      </CourseUiProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("global-query")).toHaveTextContent("url query");
    });
  });

  it("persists collapsed week navigation state", async () => {
    render(
      <CourseUiProvider>
        <ProviderProbe />
      </CourseUiProvider>,
    );

    expect(screen.getByTestId("week-nav-collapsed")).toHaveTextContent("expanded");

    fireEvent.click(screen.getByRole("button", { name: "Collapse Week Nav" }));

    await waitFor(() => {
      expect(screen.getByTestId("week-nav-collapsed")).toHaveTextContent("collapsed");
      expect(window.localStorage.getItem(STORAGE_KEYS.weekNavCollapsed)).toBe("true");
    });
  });
});
