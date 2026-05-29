import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LoginPage from "@/app/login/page";

const replaceMock = vi.fn();
const refreshMock = vi.fn();
const originalFetch = global.fetch;
const navigationState = vi.hoisted(() => ({
  searchParamValue: "next=/resources&local=1",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => new URLSearchParams(navigationState.searchParamValue),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    refreshMock.mockClear();
    navigationState.searchParamValue = "next=/resources&local=1";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows an error for failed login", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as typeof fetch;
    const user = userEvent.setup();

    render(<LoginPage />);
    await user.type(screen.getByLabelText("Username"), "student");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Login" }));

    expect(await screen.findByText("Invalid username or password.")).toBeInTheDocument();
  });

  it("links to Repolab SSO with the safe next path", () => {
    render(<LoginPage />);

    expect(screen.getByRole("link", { name: "Login with Repolab" })).toHaveAttribute(
      "href",
      "/api/auth/teacher/start?next=%2Fresources",
    );
  });

  it("hides the local login form unless local fallback is requested", () => {
    navigationState.searchParamValue = "next=/resources";

    render(<LoginPage />);

    expect(screen.getByRole("link", { name: "Login with Repolab" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Use local portal login" })).toHaveAttribute(
      "href",
      "/login?local=1&next=%2Fresources",
    );
    expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("shows local login when Repolab SSO returns an error", () => {
    navigationState.searchParamValue = "next=/homework&local=1&ssoError=teacher_sso_failed";

    render(<LoginPage />);

    expect(screen.getByText("Repolab login is unavailable. Use local portal login or try again later.")).toBeVisible();
    expect(screen.getByLabelText("Username")).toBeVisible();
    expect(screen.getByLabelText("Password")).toBeVisible();
  });

  it("redirects to next path after successful login", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true }) as typeof fetch;
    const user = userEvent.setup();

    render(<LoginPage />);
    await user.type(screen.getByLabelText("Username"), "student");
    await user.type(screen.getByLabelText("Password"), "secret");
    await user.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/resources");
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
