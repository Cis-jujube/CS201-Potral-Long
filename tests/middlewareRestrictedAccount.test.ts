import { NextRequest } from "next/server";

import { proxy } from "@/proxy";
import { PORTAL_SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";

const requestFor = (path: string, token?: string, method = "GET") =>
  new NextRequest(`http://portal.test${path}`, {
    method,
    headers: token
      ? {
          cookie: `${PORTAL_SESSION_COOKIE}=${token}`,
        }
      : undefined,
  });

describe("restricted local account proxy", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CS201_PORTAL_USERS: "test:T7q!4Lz?,student:secret",
      CS201_PORTAL_SESSION_SECRET: "restricted-test-secret",
      CS201_RESTRICTED_LOCAL_USERS: "test",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("allows restricted local users to browse portal pages and read APIs", async () => {
    const token = await createSessionToken("test");

    await expect(proxy(requestFor("/", token))).resolves.toMatchObject({ status: 200 });
    await expect(proxy(requestFor("/resources", token))).resolves.toMatchObject({ status: 200 });
    await expect(proxy(requestFor("/resources/materials/lecture-week-1", token))).resolves.toMatchObject({
      status: 200,
    });
    await expect(proxy(requestFor("/homework", token))).resolves.toMatchObject({ status: 200 });
    await expect(proxy(requestFor("/projects", token))).resolves.toMatchObject({ status: 200 });
    await expect(proxy(requestFor("/api/class-notes/week/1", token))).resolves.toMatchObject({ status: 200 });
    await expect(proxy(requestFor("/api/course/overview", token))).resolves.toMatchObject({ status: 200 });
    await expect(proxy(requestFor("/api/quiz/week/1", token))).resolves.toMatchObject({ status: 200 });
  });

  it("blocks direct file downloads for restricted local users", async () => {
    const token = await createSessionToken("test");

    await expect(proxy(requestFor("/course-materials/lecture/week-1.pdf", token))).resolves.toMatchObject({
      status: 403,
    });
    await expect(
      proxy(requestFor("/reflection-templates/ai-reflect-template-2026-v2.pdf", token)),
    ).resolves.toMatchObject({ status: 403 });
  });

  it("blocks restricted write APIs and teacher SSO start", async () => {
    const token = await createSessionToken("test");

    await expect(proxy(requestFor("/api/quiz/question/101/submit", token, "POST"))).resolves.toMatchObject({
      status: 403,
    });
    await expect(
      proxy(requestFor("/api/bk-projects/week/1/groups/team-1/vote", token, "POST")),
    ).resolves.toMatchObject({ status: 403 });
    await expect(
      proxy(requestFor("/api/reflections/week/1/questionnaire/1/submit", token, "POST")),
    ).resolves.toMatchObject({ status: 403 });
    await expect(proxy(requestFor("/api/auth/teacher/start?next=/", token))).resolves.toMatchObject({
      status: 403,
    });
  });

  it("does not restrict normal local users", async () => {
    const token = await createSessionToken("student");

    await expect(proxy(requestFor("/projects", token))).resolves.toMatchObject({ status: 200 });
    await expect(proxy(requestFor("/api/quiz/week/1", token))).resolves.toMatchObject({ status: 200 });
  });

  it("auto-starts teacher SSO for page requests when required and configured", async () => {
    process.env.CS201_REQUIRE_TEACHER_SSO = "1";
    process.env.TEACHER_SSO_CLIENT_SECRET = "client-secret";

    const response = await proxy(requestFor("/homework?entry=quiz"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://portal.test/api/auth/teacher/start?next=%2Fhomework%3Fentry%3Dquiz",
    );
  });

  it("falls back to local login when required teacher SSO is missing config", async () => {
    process.env.CS201_REQUIRE_TEACHER_SSO = "1";
    process.env.TEACHER_SSO_CLIENT_SECRET = "";

    const response = await proxy(requestFor("/homework"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://portal.test/login?next=%2Fhomework&local=1&ssoError=teacher_sso_not_configured",
    );
  });

  it("keeps local login and API auth semantics available in teacher SSO mode", async () => {
    process.env.CS201_REQUIRE_TEACHER_SSO = "1";
    process.env.TEACHER_SSO_CLIENT_SECRET = "client-secret";

    await expect(proxy(requestFor("/login?local=1"))).resolves.toMatchObject({ status: 200 });
    await expect(proxy(requestFor("/api/quiz/week/1"))).resolves.toMatchObject({ status: 401 });
  });
});
