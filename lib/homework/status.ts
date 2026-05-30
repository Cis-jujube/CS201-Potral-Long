import { HOMEWORKS } from "@/lib/homework/content";
import type { HomeworkEntry, HomeworkQuestionDetail } from "@/lib/homework/types";
import type {
  HomeworkQuestionSyncStatus,
  HomeworkStatusPayload,
  HomeworkSummarySyncStatus,
  HomeworkTeacherQuestionStatus,
} from "@/lib/homework/statusTypes";
import { TEACHER_STUDENT_APP_URL } from "@/lib/reflections/content";
import type { ReflectionSession } from "@/lib/reflections/session";

interface ResolvedProfile {
  id?: string | number;
  username: string;
}

interface ResolvedCourse {
  id?: string;
  name?: string;
  courseId: string;
}

interface NormalizedJpaSubmission {
  jpaNid?: string;
  jpaSpk?: string;
  hwName?: string;
  jpaTitle?: string;
  grade?: number;
  status: HomeworkTeacherQuestionStatus;
  timestamp?: string;
  timestampMs: number;
  sequence: number;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const stringField = (value: unknown, keys: string[]) => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim();
    }
    if (typeof raw === "number") {
      return String(raw);
    }
  }

  return undefined;
};

const numberField = (value: unknown, keys: string[]) => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const raw = record[key];
    if (raw === null || raw === undefined || raw === "") {
      continue;
    }

    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const arrayField = (value: unknown, keys: string[]) => {
  if (Array.isArray(value)) {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  for (const key of keys) {
    const raw = record[key];
    if (Array.isArray(raw)) {
      return raw;
    }
  }

  return [];
};

const normalizeJpaKey = (value: string | undefined) =>
  value?.toLowerCase().replace(/[^a-z0-9]+/g, "") ?? "";

const timestampValue = (value: string | undefined) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const readJson = async <T>(response: Response, label: string): Promise<T> => {
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

export const deriveHomeworkQuestionJpaNid = (question: HomeworkQuestionDetail) => {
  const fromHref =
    question.sourceHref.match(/\/((?:E|P)-[^/]+)\/README(?:_raw)?\.html/i)?.[1] ??
    question.sourceHref.match(/\/((?:E|P)-[^/]+)\/?$/i)?.[1];
  if (fromHref) {
    return fromHref;
  }

  const fromTitle = question.title.match(/^Exercise\s+([\d.]+)\s+(.+)$/i);
  if (!fromTitle) {
    return undefined;
  }

  return `E-${fromTitle[1]}-${fromTitle[2].trim().replace(/\s+/g, "-")}`;
};

const isCourseNode = (node: unknown) => {
  const id = stringField(node, ["id"]);
  const name = stringField(node, ["name", "title", "label"]) ?? "";
  return Boolean(id?.startsWith("course-") && /CS201|intro to programming/i.test(name));
};

export const resolveCs201Course = (payload: unknown): ResolvedCourse | null => {
  const roots = arrayField(payload, ["courses", "children", "results"]);
  const queue = [...roots];

  while (queue.length > 0) {
    const node = queue.shift();
    if (isCourseNode(node)) {
      const id = stringField(node, ["id"]);
      const name = stringField(node, ["name", "title", "label"]);
      const courseId =
        stringField(node, ["course_id"]) ??
        name?.match(/\(([^)]+)\)/)?.[1]?.trim() ??
        id?.replace(/^course-/, "");

      return courseId ? { id, name, courseId } : null;
    }

    queue.push(...arrayField(node, ["children", "items", "groups"]));
  }

  return null;
};

const normalizeJpaSubmission = (value: unknown, sequence: number): NormalizedJpaSubmission | null => {
  const event = stringField(value, ["event"])?.toLowerCase();
  if (event && event !== "submit") {
    return null;
  }

  const grade = numberField(value, ["grades", "grade", "score"]);
  const jpaNid = stringField(value, ["jpa_nid", "jpaNid", "nid"]);
  const jpaSpk = stringField(value, ["jpa_spk", "jpaSpk", "jpa", "spk"]);
  if (!jpaNid && !jpaSpk) {
    return null;
  }

  const timestamp = stringField(value, ["timestamp", "updated_at", "last_updated", "created_at", "submitted_at"]);
  return {
    jpaNid,
    jpaSpk,
    hwName: stringField(value, ["hw_name", "hwName", "homework"]),
    jpaTitle: stringField(value, ["jpa_title", "title", "name"]),
    grade,
    status: grade === undefined ? "ungraded" : grade > 0 ? "correct" : "incorrect",
    timestamp,
    timestampMs: timestampValue(timestamp),
    sequence,
  };
};

const isNewerSubmit = (candidate: NormalizedJpaSubmission, existing: NormalizedJpaSubmission) =>
  candidate.timestampMs > existing.timestampMs ||
  (candidate.timestampMs === existing.timestampMs && candidate.sequence > existing.sequence);

export const latestSubmitJpaSubmissions = (payload: unknown) => {
  const rows = arrayField(payload, ["submissions", "results", "data"])
    .map((row, index) => normalizeJpaSubmission(row, index))
    .filter((row): row is NormalizedJpaSubmission => Boolean(row));
  const latestByJpa = new Map<string, NormalizedJpaSubmission>();

  rows.forEach((row) => {
    const key = row.jpaSpk || normalizeJpaKey(row.jpaNid);
    const existing = latestByJpa.get(key);
    if (!existing || isNewerSubmit(row, existing)) {
      latestByJpa.set(key, row);
    }
  });

  return [...latestByJpa.values()];
};

const buildQuestionStatus = (
  homework: HomeworkEntry,
  question: HomeworkQuestionDetail,
  row?: NormalizedJpaSubmission,
): HomeworkQuestionSyncStatus => ({
  questionId: question.id,
  homeworkId: homework.id,
  homeworkTitle: homework.title,
  questionTitle: question.title,
  status: row?.status ?? "not-started",
  source: "teacher-site",
  jpaNid: row?.jpaNid ?? deriveHomeworkQuestionJpaNid(question),
  jpaSpk: row?.jpaSpk,
  grade: row?.grade,
  lastUpdated: row?.timestamp,
});

const summarizeHomework = (
  homework: HomeworkEntry,
  statuses: Record<string, HomeworkQuestionSyncStatus>,
): HomeworkSummarySyncStatus => {
  const counts = homework.questions.reduce(
    (accumulator, question) => {
      const status = statuses[question.id]?.status ?? "not-started";
      if (status === "correct") {
        accumulator.correct += 1;
      } else if (status === "incorrect") {
        accumulator.incorrect += 1;
      } else if (status === "ungraded") {
        accumulator.ungraded += 1;
      } else {
        accumulator.notStarted += 1;
      }
      return accumulator;
    },
    { correct: 0, incorrect: 0, ungraded: 0, notStarted: 0 },
  );
  const total = homework.questions.length;

  return {
    homeworkId: homework.id,
    title: homework.title,
    ...counts,
    total,
    isComplete: total > 0 && counts.correct === total,
  };
};

export const buildHomeworkStatusPayload = ({
  username,
  courseId,
  submissionsPayload,
  syncStatus = "synced",
  syncMessage,
}: {
  username?: string;
  courseId?: string;
  submissionsPayload: unknown;
  syncStatus?: HomeworkStatusPayload["syncStatus"];
  syncMessage?: string;
}): HomeworkStatusPayload => {
  const rowsByNid = latestSubmitJpaSubmissions(submissionsPayload).reduce((accumulator, row) => {
    if (!row.jpaNid) {
      return accumulator;
    }

    const key = normalizeJpaKey(row.jpaNid);
    const existing = accumulator.get(key);
    if (!existing || isNewerSubmit(row, existing)) {
      accumulator.set(key, row);
    }
    return accumulator;
  }, new Map<string, NormalizedJpaSubmission>());
  const questionStatuses: Record<string, HomeworkQuestionSyncStatus> = {};

  HOMEWORKS.forEach((homework) => {
    homework.questions.forEach((question) => {
      const jpaNid = deriveHomeworkQuestionJpaNid(question);
      const row = rowsByNid.get(normalizeJpaKey(jpaNid));
      questionStatuses[question.id] = buildQuestionStatus(homework, question, row);
    });
  });

  const homeworkStatuses = HOMEWORKS.reduce<Record<string, HomeworkSummarySyncStatus>>((accumulator, homework) => {
    accumulator[homework.id] = summarizeHomework(homework, questionStatuses);
    return accumulator;
  }, {});

  return {
    kind: "homework-jpa-status",
    syncStatus,
    syncMessage,
    sourceHref: TEACHER_STUDENT_APP_URL,
    generatedAt: new Date().toISOString(),
    username,
    courseId,
    questionStatuses,
    homeworkStatuses,
  };
};

export const buildFallbackHomeworkStatusPayload = (
  syncStatus: HomeworkStatusPayload["syncStatus"] = "unconfigured",
  syncMessage = "Teacher-site JPA homework sync is not configured.",
): HomeworkStatusPayload => ({
  kind: "homework-jpa-status",
  syncStatus,
  syncMessage,
  sourceHref: TEACHER_STUDENT_APP_URL,
  generatedAt: new Date().toISOString(),
  questionStatuses: {},
  homeworkStatuses: {},
});

const fetchProfile = async (session: ReflectionSession): Promise<ResolvedProfile> => {
  const response = await session.request("/api/profile/");
  const profile = await readJson<unknown>(response, "BK profile fetch");
  const username = stringField(profile, ["username", "netid", "name"]);
  const id = stringField(profile, ["id", "pk", "user_id"]);

  if (!username) {
    throw new Error("BK profile response did not include a username.");
  }

  return { id, username };
};

export const fetchHomeworkStatusPayload = async (
  session: ReflectionSession,
  credentialUsername: string,
): Promise<HomeworkStatusPayload> => {
  const profile = await fetchProfile(session);
  const username = profile.username || credentialUsername;
  const courseTreeResponse = await session.request(`/api/user_courses_bk_jpa/${encodeURIComponent(username)}/`);
  const courseTree = await readJson<unknown>(courseTreeResponse, "BK course tree fetch");
  const course = resolveCs201Course(courseTree);
  if (!course) {
    return buildFallbackHomeworkStatusPayload(
      "fallback",
      "Teacher-site sync succeeded, but no CS201 course node was found.",
    );
  }

  const submissionsResponse = await session.request(
    `/api/user_jpa_submissions/${encodeURIComponent(username)}/${encodeURIComponent(course.courseId)}/`,
  );
  const submissionsPayload = await readJson<unknown>(submissionsResponse, "BK JPA submission fetch");

  return buildHomeworkStatusPayload({
    username,
    courseId: course.courseId,
    submissionsPayload,
  });
};
