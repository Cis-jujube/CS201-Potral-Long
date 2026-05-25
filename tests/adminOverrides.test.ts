import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";

import { PATCH } from "@/app/api/admin/overrides/route";
import { POST as RESET } from "@/app/api/admin/overrides/reset/route";
import {
  applyCourseOverrides,
  EMPTY_COURSE_OVERRIDES,
  readCourseOverrides,
  sanitizeCourseOverrides,
} from "@/lib/admin/overrides";
import { createSessionToken, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";

const makeRequest = (url: string, token: string, method: string, body?: unknown) =>
  new NextRequest(url, {
    method,
    headers: {
      cookie: `${PORTAL_SESSION_COOKIE}=${token}`,
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

describe("admin overrides", () => {
  const originalEnv = process.env;
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "cs201-admin-"));
    process.env = {
      ...originalEnv,
      CS201_PORTAL_USERS: "teacher:secret,student:secret",
      CS201_PORTAL_SESSION_SECRET: "admin-test-secret",
      CS201_ADMIN_USERS: "teacher",
      CS201_ADMIN_OVERRIDES_PATH: path.join(tempDir, "course-overrides.json"),
    };
  });

  afterEach(async () => {
    process.env = originalEnv;
    await rm(tempDir, { recursive: true, force: true });
  });

  it("applies task, resource, deadline, and AI recommended due overrides safely", () => {
    const overview = applyCourseOverrides(MOCK_COURSE_OVERVIEW, {
      ...EMPTY_COURSE_OVERRIDES,
      tasks: {
        hw1: { title: "Edited HW1", dueDate: "2026-03-18T23:59:00" },
      },
      resources: {
        "res-1": { hidden: true },
      },
      deadlines: {
        "ddl-bk-presentation-2": { title: "Edited Presentation" },
      },
      reflections: {
        "air-1": { showDue: true, title: "Edited AI" },
      },
    });

    expect(overview.tasks.find((task) => task.id === "hw1")?.title).toBe("Edited HW1");
    expect(overview.deadlines.find((deadline) => deadline.id === "ddl-hw1")?.dueDate).toBe("2026-03-18T23:59:00");
    expect(overview.resources.some((resource) => resource.id === "res-1")).toBe(false);
    expect(overview.deadlines.find((deadline) => deadline.id === "ddl-bk-presentation-2")?.title).toBe("Edited Presentation");
    expect(overview.tasks.find((task) => task.id === "air-1")?.showDue).toBe(true);
    expect(overview.deadlines.find((deadline) => deadline.id === "ddl-air-1")?.title).toBe("Edited AI");
    expect(overview.deadlines.find((deadline) => deadline.id === "ddl-air-1")?.dueKind).toBe("recommended");
  });

  it("rejects invalid override payloads", () => {
    expect(() => sanitizeCourseOverrides({ tasks: { hw1: { hidden: "yes" } } })).toThrow("tasks.hw1.hidden");
  });

  it("requires admin access for API writes and supports save/reset", async () => {
    const studentToken = await createSessionToken("student");
    const denied = await PATCH(
      makeRequest("http://localhost/api/admin/overrides", studentToken, "PATCH", {
        overrides: EMPTY_COURSE_OVERRIDES,
      }),
    );

    expect(denied.status).toBe(403);

    const teacherToken = await createSessionToken("teacher");
    const saved = await PATCH(
      makeRequest("http://localhost/api/admin/overrides", teacherToken, "PATCH", {
        overrides: {
          ...EMPTY_COURSE_OVERRIDES,
          tasks: { hw1: { title: "Teacher Edit" } },
        },
      }),
    );
    const savedPayload = (await saved.json()) as { ok: boolean };

    expect(saved.status).toBe(200);
    expect(savedPayload.ok).toBe(true);
    expect((await readCourseOverrides()).updatedBy).toBe("teacher");
    expect((await readCourseOverrides()).tasks.hw1?.title).toBe("Teacher Edit");

    const reset = await RESET(makeRequest("http://localhost/api/admin/overrides/reset", teacherToken, "POST"));
    expect(reset.status).toBe(200);
    expect(Object.keys((await readCourseOverrides()).tasks)).toHaveLength(0);
  });
});
