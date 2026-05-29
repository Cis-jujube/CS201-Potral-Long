import { NextRequest } from "next/server";

import {
  collectBkProjectRefs,
  createReflectionAccessTokenSession,
  createReflectionSession,
  fetchReflectionWeekPayload,
  submitReflectionQuestionnaire,
  type ReflectionSession,
} from "@/lib/reflections/session";
import { GET as GET_REFLECTION_WEEK } from "@/app/api/reflections/week/[week]/route";
import { PORTAL_SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";
import { TEACHER_SESSION_COOKIE, createTeacherSessionToken } from "@/lib/auth/teacherSso";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });

describe("reflection teacher-site session", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
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

  it("route uses the teacher bearer token without BK user-map credentials", async () => {
    const issuedAt = Date.now();
    process.env = {
      ...originalEnv,
      CS201_PORTAL_SESSION_SECRET: "portal-session-secret",
      TEACHER_SESSION_ENCRYPTION_SECRET: "teacher-session-secret",
      CS201_BK_BASE_URL: "http://bk.test",
      CS201_BK_USER_MAP: "",
    };

    const portalToken = await createSessionToken("student-account", issuedAt, "teacher");
    const teacherToken = await createTeacherSessionToken({
      username: "student-account",
      accessToken: "teacher-access-token",
      expiresAt: issuedAt + 60_000,
      issuedAt,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 17, username: "student-account" }))
      .mockResolvedValueOnce(
        jsonResponse({
          courses: [{ name: "CS201", children: [{ name: "Week 1 BK", bkproject_spk: "bk1" }] }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ spk: "bk1", num_questionnaires: 1, voting_closed: false }))
      .mockResolvedValueOnce(jsonResponse({ results: [{ spk: "submission-1", response_text: "teacher text" }] }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET_REFLECTION_WEEK(
      new NextRequest("http://portal.test/api/reflections/week/1", {
        headers: {
          cookie: `${PORTAL_SESSION_COOKIE}=${portalToken}; ${TEACHER_SESSION_COOKIE}=${teacherToken}`,
        },
      }),
      { params: Promise.resolve({ week: "1" }) },
    );
    const payload = (await response.json()) as {
      reflection: { syncStatus: string; questionnaires: Array<{ responseText: string }> };
    };

    expect(payload.reflection.syncStatus).toBe("synced");
    expect(payload.reflection.questionnaires[0]?.responseText).toBe("teacher text");
    fetchMock.mock.calls.forEach((call) => {
      const headers = call[1]?.headers as Headers;
      expect(headers.get("authorization")).toBe("Bearer teacher-access-token");
    });
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
