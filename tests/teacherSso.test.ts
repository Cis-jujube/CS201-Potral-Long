import { NextRequest } from "next/server";

import { GET as CALLBACK } from "@/app/api/auth/teacher/callback/route";
import {
  TEACHER_SESSION_COOKIE,
  TEACHER_SSO_STATE_COOKIE,
  createTeacherSessionToken,
  createTeacherSsoState,
  exchangeTeacherSsoCode,
  getTeacherSessionPayload,
  getTeacherSsoStatePayload,
} from "@/lib/auth/teacherSso";
import { PORTAL_SESSION_COOKIE, getSessionPayload } from "@/lib/auth/session";

describe("teacher SSO", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CS201_PORTAL_SESSION_SECRET: "portal-session-secret",
      TEACHER_SESSION_ENCRYPTION_SECRET: "teacher-session-secret",
      TEACHER_SSO_BASE_URL: "http://teacher.test",
      TEACHER_SSO_CLIENT_ID: "cs201-portal",
      TEACHER_SSO_CLIENT_SECRET: "client-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("encrypts state and teacher session cookies", async () => {
    const issuedAt = Date.UTC(2026, 4, 1, 8);
    const { payload, token } = await createTeacherSsoState("/resources", issuedAt);

    await expect(getTeacherSsoStatePayload(token, issuedAt + 1000)).resolves.toMatchObject({
      state: payload.state,
      nextPath: "/resources",
    });
    await expect(getTeacherSsoStatePayload(token, issuedAt + 10 * 60 * 1000 + 1)).resolves.toBeNull();

    const sessionToken = await createTeacherSessionToken({
      username: "zw354",
      accessToken: "teacher-token",
      expiresAt: issuedAt + 60_000,
      issuedAt,
    });

    await expect(getTeacherSessionPayload(sessionToken, issuedAt + 1000)).resolves.toMatchObject({
      username: "zw354",
      accessToken: "teacher-token",
    });
    await expect(getTeacherSessionPayload(sessionToken, issuedAt + 60_001)).resolves.toBeNull();
  });

  it("exchanges an SSO code for a normalized teacher session", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          username: "zw354",
          displayName: "Student Z",
          accessToken: "access-token",
          expiresAt: "2026-05-01T09:00:00.000Z",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const session = await exchangeTeacherSsoCode(
      "one-time-code",
      "http://portal.test/api/auth/teacher/callback",
      Date.UTC(2026, 4, 1, 8),
    );

    expect(session).toMatchObject({
      username: "zw354",
      displayName: "Student Z",
      accessToken: "access-token",
      expiresAt: Date.parse("2026-05-01T09:00:00.000Z"),
    });
    expect(fetchMock).toHaveBeenCalledWith(new URL("http://teacher.test/portal-sso/token/"), expect.any(Object));
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as Record<string, string>;
    expect(body).toMatchObject({
      client_id: "cs201-portal",
      client_secret: "client-secret",
      code: "one-time-code",
      redirect_uri: "http://portal.test/api/auth/teacher/callback",
    });
  });

  it("callback validates state and creates portal plus teacher cookies", async () => {
    const issuedAt = Date.UTC(2026, 4, 1, 8);
    vi.useFakeTimers();
    vi.setSystemTime(issuedAt);
    const { payload, token } = await createTeacherSsoState("/projects", issuedAt);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            username: "zw354",
            accessToken: "access-token",
            expiresAt: issuedAt + 60_000,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const request = new NextRequest(
      `http://portal.test/api/auth/teacher/callback?code=one-time-code&state=${payload.state}`,
      { headers: { cookie: `${TEACHER_SSO_STATE_COOKIE}=${token}` } },
    );
    const response = await CALLBACK(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://portal.test/projects");

    const setCookie = response.headers.getSetCookie().join("; ");
    expect(setCookie).toContain(PORTAL_SESSION_COOKIE);
    expect(setCookie).toContain(TEACHER_SESSION_COOKIE);

    const portalCookie = response.cookies.get(PORTAL_SESSION_COOKIE)?.value;
    await expect(getSessionPayload(portalCookie, issuedAt + 1000)).resolves.toMatchObject({
      username: "zw354",
      authSource: "teacher",
    });

    const teacherCookie = response.cookies.get(TEACHER_SESSION_COOKIE)?.value;
    await expect(getTeacherSessionPayload(teacherCookie, issuedAt + 1000)).resolves.toMatchObject({
      username: "zw354",
      accessToken: "access-token",
    });

    vi.useRealTimers();
  });
});
