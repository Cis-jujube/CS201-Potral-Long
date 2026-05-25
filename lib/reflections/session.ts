import type { WeekNumber } from "@/lib/course/types";
import {
  buildFallbackReflectionWeekPayload,
  buildReflectionQuestionnaire,
  buildReflectionWeekPayload,
  getReflectionQuestionnaireNumbersForWeek,
  isSupportedReflectionWeek,
} from "@/lib/reflections/content";
import type { ReflectionQuestionnaire, ReflectionWeekPayload } from "@/lib/reflections/types";

export interface ReflectionCredential {
  username: string;
  password: string;
}

export interface ReflectionSession {
  baseUrl: string;
  request: (pathOrUrl: string, init?: RequestInit) => Promise<Response>;
}

interface BkProjectRef {
  spk: string;
  week?: WeekNumber;
  name?: string;
  numQuestionnaires?: number;
}

interface ProfileResponse {
  id?: number | string;
  username?: string;
}

interface ResolvedProfile {
  id: number | string;
  username?: string;
}

interface BkProjectResponse {
  spk?: string;
  num_questionnaires?: number;
  voting_closed?: boolean;
}

interface QuestionnaireSubmissionResponse {
  spk?: string;
  response_text?: string;
  accepted?: boolean;
}

const DEFAULT_BK_BASE_URL = "http://10.200.20.79:8000";

const splitSetCookieHeader = (value: string) => value.split(/,(?=\s*[^;,]+=)/g).map((entry) => entry.trim());

class CookieJar {
  private readonly cookies = new Map<string, string>();

  store(response: Response) {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookieHeaders = headers.getSetCookie?.() ?? splitSetCookieHeader(response.headers.get("set-cookie") ?? "");

    setCookieHeaders.filter(Boolean).forEach((header) => {
      const [pair] = header.split(";");
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex > 0) {
        this.cookies.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
      }
    });
  }

  header() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  get(name: string) {
    return this.cookies.get(name);
  }
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
    const numberValue = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return undefined;
};

const arrayField = (value: unknown, keys: string[]) => {
  const record = asRecord(value);
  if (!record) {
    return [];
  }

  return keys.flatMap((key) => (Array.isArray(record[key]) ? (record[key] as unknown[]) : []));
};

export const getReflectionBaseUrl = () =>
  (process.env.CS201_BK_BASE_URL || DEFAULT_BK_BASE_URL).replace(/\/+$/, "");

export const getReflectionCredentialForPortalUser = (portalUsername: string): ReflectionCredential | null => {
  const raw = process.env.CS201_BK_USER_MAP;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<ReflectionCredential> | undefined>;
    const credential = parsed[portalUsername];
    if (typeof credential?.username === "string" && typeof credential.password === "string") {
      return { username: credential.username, password: credential.password };
    }
  } catch {
    return null;
  }

  return null;
};

const extractCsrfToken = (html: string) =>
  html.match(/name=["']csrfmiddlewaretoken["'][^>]*value=["']([^"']+)["']/i)?.[1] ??
  html.match(/value=["']([^"']+)["'][^>]*name=["']csrfmiddlewaretoken["']/i)?.[1];

export const createReflectionSession = async (
  credential: ReflectionCredential,
  baseUrl = getReflectionBaseUrl(),
): Promise<ReflectionSession> => {
  const jar = new CookieJar();

  const request = async (pathOrUrl: string, init: RequestInit = {}, redirects = 5): Promise<Response> => {
    const url = new URL(pathOrUrl, baseUrl);
    const headers = new Headers(init.headers);
    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    const method = (init.method ?? "GET").toUpperCase();
    const csrfToken = jar.get("csrftoken");
    if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      headers.set("x-csrftoken", csrfToken);
    }

    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
    });
    jar.store(response);

    if (response.status >= 300 && response.status < 400 && redirects > 0) {
      const location = response.headers.get("location");
      if (location) {
        return request(location, { method: "GET" }, redirects - 1);
      }
    }

    return response;
  };

  const loginPage = await request("/login/");
  const loginHtml = await loginPage.text();
  const csrfToken = extractCsrfToken(loginHtml);
  if (!csrfToken) {
    throw new Error("BK login page did not include a CSRF token.");
  }

  const body = new URLSearchParams({
    username: credential.username,
    password: credential.password,
    csrfmiddlewaretoken: csrfToken,
  });

  const loginResponse = await request("/login/", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: `${baseUrl}/login/`,
    },
    body,
  });
  const loginResultHtml = await loginResponse.clone().text();
  if (!loginResponse.ok || /name=["']password["']/i.test(loginResultHtml)) {
    throw new Error("BK login failed.");
  }

  return { baseUrl, request };
};

export const createReflectionAccessTokenSession = (
  accessToken: string,
  baseUrl = getReflectionBaseUrl(),
): ReflectionSession => {
  const jar = new CookieJar();

  const request = async (pathOrUrl: string, init: RequestInit = {}, redirects = 5): Promise<Response> => {
    const url = new URL(pathOrUrl, baseUrl);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${accessToken}`);
    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    const method = (init.method ?? "GET").toUpperCase();
    const csrfToken = jar.get("csrftoken");
    if (csrfToken && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      headers.set("x-csrftoken", csrfToken);
    }

    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
    });
    jar.store(response);

    if (response.status >= 300 && response.status < 400 && redirects > 0) {
      const location = response.headers.get("location");
      if (location) {
        return request(location, { method: "GET" }, redirects - 1);
      }
    }

    return response;
  };

  return { baseUrl, request };
};

export const inferWeekFromText = (value: string): WeekNumber | undefined => {
  const match =
    value.match(/\bweek\s*([1-7])\b/i) ??
    value.match(/\bw\s*([1-7])\b/i) ??
    value.match(/\b(?:bk|project|questionnaire)\s*([1-7])\b/i) ??
    value.match(/第\s*([1-7])\s*周/);
  const parsed = match ? Number(match[1]) : Number.NaN;
  return isSupportedReflectionWeek(parsed) ? parsed : undefined;
};

export const collectBkProjectRefs = (input: unknown): BkProjectRef[] => {
  const roots = Array.isArray(input) ? input : arrayField(input, ["courses", "children"]);
  const refs = new Map<string, BkProjectRef>();

  const visit = (node: unknown, ancestors: string[]) => {
    const name = stringField(node, ["name", "label", "title", "id"]);
    const lineage = [...ancestors, name ?? ""].filter(Boolean);
    const directWeek = numberField(node, ["week", "week_no", "weekNumber"]);
    const week =
      directWeek && isSupportedReflectionWeek(directWeek)
        ? directWeek
        : inferWeekFromText(lineage.join(" "));
    const spk = stringField(node, ["bkproject_spk", "course_bkproject_spk"]);
    const numQuestionnaires = numberField(node, ["num_questionnaires", "questionnaires"]);

    if (spk && !refs.has(spk)) {
      refs.set(spk, { spk, week, name, numQuestionnaires });
    }

    arrayField(node, ["children", "groups", "items"]).forEach((child) => visit(child, lineage));
  };

  roots.forEach((root) => visit(root, []));
  return [...refs.values()];
};

const readJson = async <T>(response: Response, label: string): Promise<T> => {
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

const fetchProfile = async (session: ReflectionSession): Promise<ResolvedProfile> => {
  const response = await session.request("/api/profile/");
  const profile = await readJson<ProfileResponse>(response, "BK profile fetch");
  if (profile.id === undefined || profile.id === null) {
    throw new Error("BK profile response did not include a user id.");
  }

  return { id: profile.id, username: profile.username };
};

const findWeekProjectRefs = async (
  session: ReflectionSession,
  username: string,
  week: WeekNumber,
): Promise<BkProjectRef[]> => {
  const response = await session.request(`/api/user_courses_bk_jpa/${encodeURIComponent(username)}/`);
  const payload = await readJson<unknown>(response, "BK course tree fetch");
  return collectBkProjectRefs(payload).filter((ref) => ref.week === week);
};

const fetchBkProject = async (session: ReflectionSession, spk: string) => {
  const response = await session.request(`/api/coursebkproject/${encodeURIComponent(spk)}/?context=student`);
  return readJson<BkProjectResponse>(response, "BK project fetch");
};

const getQuestionnaireSubmission = async (
  session: ReflectionSession,
  bkProjectSpk: string,
  userId: string | number,
  questionnaireNo: number,
) => {
  const params = new URLSearchParams({
    bkproj: bkProjectSpk,
    user: String(userId),
    questionnaire_no: String(questionnaireNo),
  });
  const response = await session.request(`/api/coursebkquestionnairesubmission/?${params.toString()}`);
  const payload = await readJson<
    { results?: QuestionnaireSubmissionResponse[] } | QuestionnaireSubmissionResponse[]
  >(response, "BK questionnaire submission fetch");

  if (Array.isArray(payload)) {
    return payload[0] ?? null;
  }

  return payload.results?.[0] ?? null;
};

export const fetchReflectionWeekPayload = async (
  session: ReflectionSession,
  credentialUsername: string,
  week: WeekNumber,
): Promise<ReflectionWeekPayload> => {
  const profile = await fetchProfile(session);
  const username = profile.username || credentialUsername;
  const projectRefs = await findWeekProjectRefs(session, username, week);

  if (projectRefs.length === 0) {
    return buildFallbackReflectionWeekPayload(
      week,
      "fallback",
      "Teacher-site sync succeeded, but no week-matched BK project was found. Showing local fallback data.",
    );
  }

  const questionnaires: ReflectionQuestionnaire[] = [];
  const scheduledQuestionnaireNumbers = getReflectionQuestionnaireNumbersForWeek(week);
  const maxScheduledQuestionnaireNo = Math.max(...scheduledQuestionnaireNumbers);

  for (const ref of projectRefs) {
    const project = await fetchBkProject(session, ref.spk);
    const numQuestionnaires = project.num_questionnaires ?? ref.numQuestionnaires ?? maxScheduledQuestionnaireNo;
    const canSubmit = !project.voting_closed;

    for (const questionnaireNo of scheduledQuestionnaireNumbers) {
      if (questionnaireNo > numQuestionnaires) {
        continue;
      }

      const submission = await getQuestionnaireSubmission(session, ref.spk, profile.id, questionnaireNo);
      questionnaires.push(
        buildReflectionQuestionnaire({
          week,
          questionnaireNo,
          syncStatus: "synced",
          canSubmit,
          responseText: submission?.response_text ?? "",
          accepted: submission?.accepted,
          submissionSpk: submission?.spk,
        }),
      );
    }
  }

  return buildReflectionWeekPayload({
    week,
    syncStatus: "synced",
    questionnaires,
  });
};

const selectProjectForQuestionnaire = async (
  session: ReflectionSession,
  credentialUsername: string,
  week: WeekNumber,
  questionnaireNo: number,
) => {
  if (!getReflectionQuestionnaireNumbersForWeek(week).includes(questionnaireNo)) {
    return null;
  }

  const profile = await fetchProfile(session);
  const username = profile.username || credentialUsername;
  const projectRefs = await findWeekProjectRefs(session, username, week);
  const maxScheduledQuestionnaireNo = Math.max(...getReflectionQuestionnaireNumbersForWeek(week));

  for (const ref of projectRefs) {
    const project = await fetchBkProject(session, ref.spk);
    const numQuestionnaires = project.num_questionnaires ?? ref.numQuestionnaires ?? maxScheduledQuestionnaireNo;
    if (questionnaireNo <= numQuestionnaires) {
      return { profile, projectRef: ref, project };
    }
  }

  return null;
};

export const submitReflectionQuestionnaire = async (
  session: ReflectionSession,
  credentialUsername: string,
  week: WeekNumber,
  questionnaireNo: number,
  responseText: string,
) => {
  const target = await selectProjectForQuestionnaire(session, credentialUsername, week, questionnaireNo);
  if (!target) {
    throw new Error(`Week ${week} questionnaire ${questionnaireNo} was not found on the teacher site.`);
  }

  if (target.project.voting_closed) {
    throw new Error("Questionnaire submission is closed for this BK project.");
  }

  const existing = await getQuestionnaireSubmission(
    session,
    target.projectRef.spk,
    target.profile.id,
    questionnaireNo,
  );
  const payload = existing?.spk
    ? {
        bkproj: target.projectRef.spk,
        response_text: responseText,
        questionnaire_no: questionnaireNo,
      }
    : {
        bkproj: target.projectRef.spk,
        user: target.profile.id,
        response_text: responseText,
        questionnaire_no: questionnaireNo,
      };
  const path = existing?.spk
    ? `/api/coursebkquestionnairesubmission/${encodeURIComponent(existing.spk)}/`
    : "/api/coursebkquestionnairesubmission/";
  const response = await session.request(path, {
    method: existing?.spk ? "PATCH" : "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const saved = await readJson<QuestionnaireSubmissionResponse>(response, "BK questionnaire submission save");

  return buildReflectionQuestionnaire({
    week,
    questionnaireNo,
    syncStatus: "synced",
    canSubmit: !target.project.voting_closed,
    responseText: saved.response_text ?? responseText,
    accepted: saved.accepted,
    submissionSpk: saved.spk,
  });
};
