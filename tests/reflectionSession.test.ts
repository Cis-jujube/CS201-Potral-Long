import {
  collectBkProjectRefs,
  createReflectionAccessTokenSession,
  createReflectionSession,
  fetchReflectionWeekPayload,
  submitReflectionQuestionnaire,
  type ReflectionSession,
} from "@/lib/reflections/session";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });

describe("reflection teacher-site session", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("logs in with CSRF and sends the CSRF header on API writes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('<input type="hidden" name="csrfmiddlewaretoken" value="csrf-login">', {
          headers: { "set-cookie": "csrftoken=csrf-cookie; Path=/, prelogin=1; Path=/" },
        }),
      )
      .mockResolvedValueOnce(new Response("<html>dashboard</html>", { headers: { "set-cookie": "sessionid=sid; Path=/" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const session = await createReflectionSession(
      { username: "student", password: "fake-password" },
      "http://bk.test",
    );
    await session.request("/api/example/", { method: "POST", body: "{}" });

    const loginPost = fetchMock.mock.calls[1][1] as RequestInit;
    expect(String(loginPost.body)).toContain("username=student");
    expect(String(loginPost.body)).toContain("password=fake-password");
    expect(String(loginPost.body)).toContain("csrfmiddlewaretoken=csrf-login");

    const apiWrite = fetchMock.mock.calls[2][1] as RequestInit;
    const headers = apiWrite.headers as Headers;
    expect(headers.get("x-csrftoken")).toBe("csrf-cookie");
    expect(headers.get("cookie")).toContain("sessionid=sid");
  });

  it("uses bearer access tokens for teacher SSO sessions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          headers: { "set-cookie": "csrftoken=csrf-cookie; Path=/" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const session = createReflectionAccessTokenSession("teacher-access-token", "http://bk.test");
    await session.request("/api/profile/");
    await session.request("/api/write/", { method: "POST", body: "{}" });

    const firstHeaders = fetchMock.mock.calls[0][1].headers as Headers;
    expect(firstHeaders.get("authorization")).toBe("Bearer teacher-access-token");

    const writeHeaders = fetchMock.mock.calls[1][1].headers as Headers;
    expect(writeHeaders.get("authorization")).toBe("Bearer teacher-access-token");
    expect(writeHeaders.get("x-csrftoken")).toBe("csrf-cookie");
  });

  it("collects BK project refs from the course tree with week inference", () => {
    const refs = collectBkProjectRefs({
      courses: [
        {
          name: "CS201",
          children: [
            { name: "Week 2 BK project", bkproject_spk: "bk2" },
            { name: "Week 7 reflection", course_bkproject_spk: "bk7", num_questionnaires: 3 },
          ],
        },
      ],
    });

    expect(refs).toEqual([
      { spk: "bk2", week: 2, name: "Week 2 BK project", numQuestionnaires: undefined },
      { spk: "bk7", week: 7, name: "Week 7 reflection", numQuestionnaires: 3 },
    ]);
  });

  it("builds week payloads from teacher-site projects and submissions", async () => {
    const request = vi
      .fn<ReflectionSession["request"]>()
      .mockResolvedValueOnce(jsonResponse({ id: 17, username: "student-account" }))
      .mockResolvedValueOnce(
        jsonResponse({
          courses: [{ name: "CS201", children: [{ name: "Week 7 BK", bkproject_spk: "bk7" }] }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ spk: "bk7", num_questionnaires: 3, voting_closed: false }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ spk: "s1", response_text: "AI text", accepted: true }] }))
      .mockResolvedValueOnce(jsonResponse({ results: [] }))
      .mockResolvedValueOnce(jsonResponse({ results: [] }));

    const payload = await fetchReflectionWeekPayload({ baseUrl: "http://bk.test", request }, "student-account", 7);

    expect(payload.syncStatus).toBe("synced");
    expect(payload.questionnaires.map((item) => item.questionnaireNo)).toEqual([1, 2, 3]);
    expect(payload.questionnaires[0]).toMatchObject({
      kind: "ai-reflection",
      responseText: "AI text",
      accepted: true,
      canSubmit: true,
    });
    expect(payload.questionnaires[1]).toMatchObject({ kind: "bk-reflection" });
  });

  it("patches existing questionnaire submissions", async () => {
    const request = vi
      .fn<ReflectionSession["request"]>()
      .mockResolvedValueOnce(jsonResponse({ id: 17, username: "student-account" }))
      .mockResolvedValueOnce(
        jsonResponse({
          courses: [{ name: "CS201", children: [{ name: "Week 2 BK", bkproject_spk: "bk2" }] }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ spk: "bk2", num_questionnaires: 2, voting_closed: false }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ spk: "submission-2", response_text: "old" }] }))
      .mockResolvedValueOnce(jsonResponse({ spk: "submission-2", response_text: "new", accepted: false }));

    const questionnaire = await submitReflectionQuestionnaire(
      { baseUrl: "http://bk.test", request },
      "student-account",
      2,
      2,
      "new",
    );

    expect(questionnaire).toMatchObject({
      questionnaireNo: 2,
      responseText: "new",
      accepted: false,
      submissionSpk: "submission-2",
    });
    expect(request.mock.calls[4][0]).toBe("/api/coursebkquestionnairesubmission/submission-2/");
    expect(request.mock.calls[4][1]?.method).toBe("PATCH");
  });
});
