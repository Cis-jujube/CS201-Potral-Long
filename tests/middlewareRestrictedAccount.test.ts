import { NextRequest } from "next/server";

import { middleware } from "@/middleware";
import { PORTAL_SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";

const requestFor = (path: string, token: string) =>
  new NextRequest(`http://portal.test${path}`, {
    headers: {
      cookie: `${PORTAL_SESSION_COOKIE}=${token}`,
    },
  });

describe("restricted local account middleware", () => {
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

  it("allows local resource pages and class note reads", async () => {
    const token = await createSessionToken("test");

    await expect(middleware(requestFor("/resources", token))).resolves.toMatchObject({ status: 200 });
    await expect(middleware(requestFor("/resources/materials/lecture-week-1", token))).resolves.toMatchObject({
      status: 200,
    });
    await expect(middleware(requestFor("/course-materials/lecture/week-1.pdf", token))).resolves.toMatchObject({
      status: 200,
    });
    await expect(middleware(requestFor("/api/class-notes/week/1", token))).resolves.toMatchObject({ status: 200 });
  });

  it("redirects restricted page access to resources", async () => {
    const token = await createSessionToken("test");
    const response = await middleware(requestFor("/projects", token));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://portal.test/resources");
  });

  it("blocks restricted API access before professor-backed sync routes run", async () => {
    const token = await createSessionToken("test");

    await expect(middleware(requestFor("/api/quiz/week/1", token))).resolves.toMatchObject({ status: 403 });
    await expect(middleware(requestFor("/api/bk-projects/week/1", token))).resolves.toMatchObject({ status: 403 });
    await expect(middleware(requestFor("/api/reflections/week/1", token))).resolves.toMatchObject({ status: 403 });
    await expect(middleware(requestFor("/api/auth/teacher/start?next=/", token))).resolves.toMatchObject({
      status: 403,
    });
  });

  it("does not restrict normal local users", async () => {
    const token = await createSessionToken("student");

    await expect(middleware(requestFor("/projects", token))).resolves.toMatchObject({ status: 200 });
    await expect(middleware(requestFor("/api/quiz/week/1", token))).resolves.toMatchObject({ status: 200 });
  });
});
