import { NextRequest } from "next/server";

import { GET as GET_HOMEWORK_STATUS } from "@/app/api/homework/status/route";
import { PORTAL_SESSION_COOKIE, createSessionToken } from "@/lib/auth/session";
import { TEACHER_SESSION_COOKIE, createTeacherSessionToken } from "@/lib/auth/teacherSso";
import { getHomeworksForWeek } from "@/lib/homework/content";
import {
  buildHomeworkStatusPayload,
  deriveHomeworkQuestionJpaNid,
  fetchHomeworkStatusPayload,
  latestSubmitJpaSubmissions,
  resolveCs201Course,
} from "@/lib/homework/status";
import type { ReflectionSession } from "@/lib/reflections/session";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });

describe("homework JPA status sync", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("derives local question JPA ids from source URLs", () => {
    const hw1 = getHomeworksForWeek(1).find((homework) => homework.id === "hw1");
    expect(deriveHomeworkQuestionJpaNid(hw1!.questions[0])).toBe("E-1.2.18-EuclideanDistance");
  });

  it("resolves the teacher frontend course id from the CS201 course tree", () => {
    expect(
      resolveCs201Course({
        courses: [
          {
            id: "course-CO0000009",
            name: "intro to programming (CS201-S4-SP-2026)",
            children: [{ id: "jpa-layer", name: "JPA Sets" }],
          },
        ],
      }),
    ).toMatchObject({
      id: "course-CO0000009",
      courseId: "CS201-S4-SP-2026",
    });
  });

  it("uses the latest submit event even when it overrides an earlier correct grade", () => {
    const rows = latestSubmitJpaSubmissions({
      submissions: [
        {
          event: "status",
          jpa_nid: "E-1.2.18-EuclideanDistance",
          jpa_spk: "JPA0000049",
          grades: null,
          timestamp: "2026-05-02T09:00:00",
        },
        {
          event: "submit",
          jpa_nid: "E-1.2.18-EuclideanDistance",
          jpa_spk: "JPA0000049",
          grades: 0,
          timestamp: "2026-05-02T10:00:00",
        },
        {
          event: "submit",
          jpa_nid: "E-1.2.18-EuclideanDistance",
          jpa_spk: "JPA0000049",
          grades: 1,
          timestamp: "2026-05-01T10:00:00",
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      jpaNid: "E-1.2.18-EuclideanDistance",
      grade: 0,
      status: "incorrect",
    });
  });

  it("marks the latest submit as ungraded when grade data is empty", () => {
    const rows = latestSubmitJpaSubmissions({
      submissions: [
        {
          event: "submit",
          jpa_nid: "E-1.2.18-EuclideanDistance",
          jpa_spk: "JPA0000049",
          grades: 1,
          timestamp: "2026-05-01T10:00:00",
        },
        {
          event: "submit",
          jpa_nid: "E-1.2.18-EuclideanDistance",
          jpa_spk: "JPA0000049",
          grades: null,
          timestamp: "2026-05-02T10:00:00",
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      jpaNid: "E-1.2.18-EuclideanDistance",
      grade: undefined,
      status: "ungraded",
    });
  });

  it("ignores newer non-submit events when deciding the current status", () => {
    const rows = latestSubmitJpaSubmissions({
      submissions: [
        {
          event: "submit",
          jpa_nid: "E-1.2.18-EuclideanDistance",
          jpa_spk: "JPA0000049",
          grades: 0,
          timestamp: "2026-05-01T10:00:00",
        },
        {
          event: "view",
          jpa_nid: "E-1.2.18-EuclideanDistance",
          jpa_spk: "JPA0000049",
          grades: 1,
          timestamp: "2026-05-02T10:00:00",
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      grade: 0,
      status: "incorrect",
    });
  });

  it("maps teacher-site JPA rows onto local homework questions", () => {
    const hw1 = getHomeworksForWeek(1).find((homework) => homework.id === "hw1")!;
    const question = hw1.questions[0];
    const payload = buildHomeworkStatusPayload({
      username: "student1",
      courseId: "CS201-S4-SP-2026",
      submissionsPayload: {
        submissions: [
          {
            event: "submit",
            hw_name: "HW1",
            jpa_nid: "E-1.2.18-EuclideanDistance",
            jpa_spk: "JPA0000049",
            grades: 1,
            timestamp: "2026-05-01T10:00:00",
          },
        ],
      },
    });

    expect(payload.questionStatuses[question.id]).toMatchObject({
      homeworkId: "hw1",
      status: "correct",
      grade: 1,
      jpaNid: "E-1.2.18-EuclideanDistance",
    });
    expect(payload.homeworkStatuses.hw1).toMatchObject({
      correct: 1,
      incorrect: 0,
      ungraded: 0,
      total: hw1.questions.length,
      isComplete: false,
    });
  });

  it("fetches profile, course tree, and per-user JPA submissions with the resolved course id", async () => {
    const request = vi
      .fn<ReflectionSession["request"]>()
      .mockResolvedValueOnce(jsonResponse({ id: 17, username: "student1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          courses: [{ id: "course-CO0000009", name: "intro to programming (CS201-S4-SP-2026)" }],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ submissions: [] }));

    const payload = await fetchHomeworkStatusPayload({ baseUrl: "http://bk.test", request }, "fallback-user");

    expect(payload).toMatchObject({
      syncStatus: "synced",
      username: "student1",
      courseId: "CS201-S4-SP-2026",
    });
    expect(request.mock.calls[2][0]).toBe("/api/user_jpa_submissions/student1/CS201-S4-SP-2026/");
  });

  it("route uses the teacher bearer token and returns sanitized homework status", async () => {
    const issuedAt = Date.now();
    process.env = {
      ...originalEnv,
      CS201_PORTAL_SESSION_SECRET: "portal-session-secret",
      TEACHER_SESSION_ENCRYPTION_SECRET: "teacher-session-secret",
      CS201_BK_BASE_URL: "http://bk.test",
      CS201_BK_USER_MAP: "",
    };

    const portalToken = await createSessionToken("student1", issuedAt, "teacher");
    const teacherToken = await createTeacherSessionToken({
      username: "student1",
      accessToken: "teacher-access-token",
      expiresAt: issuedAt + 60_000,
      issuedAt,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: 17, username: "student1" }))
      .mockResolvedValueOnce(
        jsonResponse({
          courses: [{ id: "course-CO0000009", name: "intro to programming (CS201-S4-SP-2026)" }],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          submissions: [
            {
              event: "submit",
              jpa_nid: "E-1.2.18-EuclideanDistance",
              jpa_spk: "JPA0000049",
              grades: 1,
              timestamp: "2026-05-01T10:00:00",
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET_HOMEWORK_STATUS(
      new NextRequest("http://portal.test/api/homework/status", {
        headers: {
          cookie: `${PORTAL_SESSION_COOKIE}=${portalToken}; ${TEACHER_SESSION_COOKIE}=${teacherToken}`,
        },
      }),
    );
    const payload = (await response.json()) as {
      status: {
        syncStatus: string;
        courseId: string;
        questionStatuses: Record<string, { status: string; grade?: number }>;
      };
    };
    const hw1Question = getHomeworksForWeek(1).find((homework) => homework.id === "hw1")!.questions[0];

    expect(payload.status.syncStatus).toBe("synced");
    expect(payload.status.courseId).toBe("CS201-S4-SP-2026");
    expect(payload.status.questionStatuses[hw1Question.id]).toMatchObject({ status: "correct", grade: 1 });
    expect(String(fetchMock.mock.calls[2][0])).toBe("http://bk.test/api/user_jpa_submissions/student1/CS201-S4-SP-2026/");
    fetchMock.mock.calls.forEach((call) => {
      const headers = call[1]?.headers as Headers;
      expect(headers.get("authorization")).toBe("Bearer teacher-access-token");
    });
  });
});
