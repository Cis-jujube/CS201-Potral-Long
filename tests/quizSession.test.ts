import { createQuizAccessTokenSession } from "@/lib/quiz/session";

describe("quiz teacher SSO session", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses bearer access tokens when requesting quiz pages", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<html>quiz</html>"));
    vi.stubGlobal("fetch", fetchMock);

    const session = createQuizAccessTokenSession("teacher-access-token", "http://quiz.test");
    await session.request("/cs201/assignment/");

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(fetchMock.mock.calls[0][0]).toEqual(new URL("http://quiz.test/cs201/assignment/"));
    expect(headers.get("authorization")).toBe("Bearer teacher-access-token");
  });
});
