import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LoginPage from "@/app/login/page";

const replaceMock = vi.fn();
const refreshMock = vi.fn();
const originalFetch = global.fetch;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => new URLSearchParams("next=/resources"),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    refreshMock.mockClear();
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
