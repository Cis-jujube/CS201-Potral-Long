import type { WeekNumber } from "@/lib/course/types";
import { TEACHER_STUDENT_APP_URL, isSupportedReflectionWeek } from "@/lib/reflections/content";
import {
  collectBkProjectRefs,
  createReflectionAccessTokenSession,
  createReflectionSession,
  getReflectionBaseUrl,
  getReflectionCredentialForPortalUser,
  type ReflectionCredential,
  type ReflectionSession,
} from "@/lib/reflections/session";
import type {
  BkProjectGroup,
  BkProjectMember,
  BkProjectSummary,
  BkProjectWeekPayload,
  BkSurveyItem,
  BkSurveyItemType,
  BkSurveyPayload,
  BkSurveySubmission,
  BkVoteRatings,
} from "@/lib/bk-projects/types";
export { BK_PROJECT_PRESENTATION_WEEKS } from "@/lib/bk-projects/content";

interface BkProjectRef {
  spk: string;
  week?: WeekNumber;
  name?: string;
  numQuestionnaires?: number;
}

interface ResolvedProfile {
  id: string | number;
  username: string;
}

interface RawProject {
  spk?: string;
  name?: string;
  title?: string;
  nid?: string;
  survey?: string;
  survey_spk?: string;
  survey_nid?: string;
  survey_id?: string;
  voting_closed?: boolean;
}

interface ResolvedProjectContext {
  profile: ResolvedProfile;
  project: BkProjectSummary;
  groups: BkProjectGroup[];
  ownGroup?: BkProjectGroup;
}

export const getBkProjectBaseUrl = getReflectionBaseUrl;
export const getBkProjectCredentialForPortalUser = getReflectionCredentialForPortalUser;
export const createBkProjectSession = createReflectionSession;
export const createBkProjectAccessTokenSession = createReflectionAccessTokenSession;

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
    const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const booleanField = (value: unknown, keys: string[]) => {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  for (const key of keys) {
    const raw = record[key];
    if (typeof raw === "boolean") {
      return raw;
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

const readJson = async <T>(response: Response, label: string): Promise<T> => {
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status}`);
  }

  return (await response.json()) as T;
};

const sameUsername = (left: string | undefined, right: string | undefined) =>
  Boolean(left && right && left.toLowerCase() === right.toLowerCase());

const fetchProfile = async (session: ReflectionSession): Promise<ResolvedProfile> => {
  const response = await session.request("/api/profile/");
  const profile = await readJson<unknown>(response, "BK profile fetch");
  const id = stringField(profile, ["id", "pk", "user_id"]);
  const username = stringField(profile, ["username", "netid", "name"]);

  if (!id) {
    throw new Error("BK profile response did not include a user id.");
  }

  return { id, username: username ?? "" };
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

const fetchProject = async (session: ReflectionSession, ref: BkProjectRef): Promise<BkProjectSummary> => {
  const response = await session.request(`/api/coursebkproject/${encodeURIComponent(ref.spk)}/?context=student`);
  const project = await readJson<RawProject>(response, "BK project fetch");
  const spk = stringField(project, ["spk"]) ?? ref.spk;
  const name = stringField(project, ["name", "title", "nid"]) ?? ref.name ?? spk;
  const surveySpk = stringField(project, ["survey", "survey_spk", "survey_nid", "survey_id"]);

  return {
    spk,
    name,
    surveySpk,
    votingClosed: booleanField(project, ["voting_closed"]) ?? false,
  };
};

const normalizeMember = (value: unknown): BkProjectMember | null => {
  const username = stringField(value, ["username", "netid", "user_username", "name"]);
  if (!username) {
    return null;
  }

  return {
    id: stringField(value, ["id", "pk", "user", "user_id"]),
    username,
    displayName: stringField(value, ["display_name", "full_name", "real_name", "name"]),
    role: stringField(value, ["role", "position"]),
  };
};

const normalizeGroup = (value: unknown, username: string, projectSpk: string): BkProjectGroup | null => {
  const spk = stringField(value, ["spk", "group_spk", "id"]);
  if (!spk) {
    return null;
  }

  const members = arrayField(value, ["members", "students", "users", "member_list"])
    .map(normalizeMember)
    .filter((member): member is BkProjectMember => Boolean(member));
  const groupNo = numberField(value, ["group_no", "number", "no"]);
  const name =
    stringField(value, ["group_name", "nickname", "name", "title"]) ??
    (groupNo ? `Team ${groupNo}` : spk);

  const groupProjectSpk = stringField(value, ["course_bkproject_spk", "bkproject_spk"]);
  const belongsToProject = groupProjectSpk === projectSpk;
  const includesCurrentUser = members.some((member) => sameUsername(member.username, username));

  return {
    spk,
    id: stringField(value, ["id", "pk"]),
    name,
    groupNo,
    nickname: stringField(value, ["nickname"]),
    members,
    isOwnGroup: includesCurrentUser && (belongsToProject || !groupProjectSpk),
  };
};

const fetchGroups = async (
  session: ReflectionSession,
  projectSpk: string,
  username: string,
): Promise<BkProjectGroup[]> => {
  const response = await session.request(`/api/bk_groups/${encodeURIComponent(projectSpk)}/`);
  const payload = await readJson<unknown>(response, "BK groups fetch");
  return arrayField(payload, ["groups", "results"])
    .map((group) => normalizeGroup(group, username, projectSpk))
    .filter((group): group is BkProjectGroup => Boolean(group));
};

const resolveProjectContext = async (
  session: ReflectionSession,
  credentialUsername: string,
  week: WeekNumber,
): Promise<ResolvedProjectContext | null> => {
  const profile = await fetchProfile(session);
  const username = profile.username || credentialUsername;
  const projectRefs = await findWeekProjectRefs(session, username, week);

  for (const ref of projectRefs) {
    const project = await fetchProject(session, ref);
    const groups = await fetchGroups(session, project.spk, username);
    const ownGroup = groups.find((group) => group.isOwnGroup);
    return { profile: { ...profile, username }, project, groups, ownGroup };
  }

  return null;
};

export const buildFallbackBkProjectWeekPayload = (
  week: WeekNumber,
  syncStatus: BkProjectWeekPayload["syncStatus"] = "unconfigured",
  syncMessage = "Teacher-site BK project sync is not configured.",
): BkProjectWeekPayload => ({
  kind: "bk-project-week",
  week,
  sourceHref: TEACHER_STUDENT_APP_URL,
  syncStatus,
  syncMessage,
  generatedAt: new Date().toISOString(),
  groups: [],
  canVote: false,
});

const buildWeekPayload = (week: WeekNumber, context: ResolvedProjectContext): BkProjectWeekPayload => ({
  kind: "bk-project-week",
  week,
  sourceHref: TEACHER_STUDENT_APP_URL,
  syncStatus: "synced",
  generatedAt: new Date().toISOString(),
  project: context.project,
  ownGroup: context.ownGroup,
  groups: context.groups,
  canVote: Boolean(context.project.surveySpk && !context.project.votingClosed && context.ownGroup),
});

export const fetchBkProjectWeekPayload = async (
  session: ReflectionSession,
  credentialUsername: string,
  week: WeekNumber,
) => {
  const context = await resolveProjectContext(session, credentialUsername, week);
  if (!context) {
    return buildFallbackBkProjectWeekPayload(
      week,
      "fallback",
      "Teacher-site sync succeeded, but no week-matched BK project was found.",
    );
  }

  return buildWeekPayload(week, context);
};

const normalizeSurveyItemType = (value: string | undefined): BkSurveyItemType => {
  if (value === "rating") {
    return "rating";
  }

  if (value === "text" || value === "comment") {
    return "text";
  }

  return "unknown";
};

const normalizeSurveyItem = (value: unknown): BkSurveyItem | null => {
  const spk = stringField(value, ["spk", "id"]);
  if (!spk) {
    return null;
  }

  const nid = stringField(value, ["nid", "handle", "name"]) ?? spk;
  return {
    spk,
    nid,
    label: stringField(value, ["label", "title", "question", "text", "name"]) ?? nid,
    type: normalizeSurveyItemType(stringField(value, ["type", "item_type"])),
  };
};

const fetchSurveyItems = async (session: ReflectionSession, surveySpk: string): Promise<BkSurveyItem[]> => {
  const response = await session.request(`/api/student-survey/${encodeURIComponent(surveySpk)}/items/`);
  const payload = await readJson<unknown>(response, "BK survey items fetch");
  return arrayField(payload, ["results", "items"])
    .map(normalizeSurveyItem)
    .filter((item): item is BkSurveyItem => Boolean(item));
};

const normalizeSubmission = (value: unknown, items: BkSurveyItem[]): BkSurveySubmission | null => {
  const spk = stringField(value, ["spk", "id"]);
  const rawItem = asRecord(value)?.item;
  const itemSpk =
    typeof rawItem === "object" && rawItem !== null
      ? stringField(rawItem, ["spk", "id"])
      : stringField(value, ["item", "item_spk", "survey_item"]);
  if (!spk || !itemSpk) {
    return null;
  }

  const item = items.find((candidate) => candidate.spk === itemSpk);
  return {
    spk,
    itemSpk,
    itemNid: item?.nid,
    rating: numberField(value, ["rating"]),
    responseText: stringField(value, ["response_text", "text"]),
  };
};

const fetchSubmissions = async (
  session: ReflectionSession,
  groupSpk: string,
  userId: string | number,
  items: BkSurveyItem[],
): Promise<BkSurveySubmission[]> => {
  const params = new URLSearchParams({
    bkgroup: groupSpk,
    user: String(userId),
  });
  const response = await session.request(`/api/coursebksurveysubmission/?${params.toString()}`);
  const payload = await readJson<unknown>(response, "BK survey submission fetch");
  return arrayField(payload, ["results", "submissions"])
    .map((submission) => normalizeSubmission(submission, items))
    .filter((submission): submission is BkSurveySubmission => Boolean(submission));
};

const resolveSurveyContext = async (
  session: ReflectionSession,
  credentialUsername: string,
  week: WeekNumber,
  groupSpk: string,
) => {
  const context = await resolveProjectContext(session, credentialUsername, week);
  if (!context) {
    throw new Error(`Week ${week} BK project was not found on the teacher site.`);
  }

  const group = context.groups.find((candidate) => candidate.spk === groupSpk);
  if (!group) {
    throw new Error("BK group was not found for this week.");
  }

  if (!context.project.surveySpk) {
    throw new Error("This BK project does not expose a voting survey.");
  }

  const items = await fetchSurveyItems(session, context.project.surveySpk);
  const submissions = await fetchSubmissions(session, group.spk, context.profile.id, items);

  return { ...context, group, items, submissions };
};

const buildSurveyPayload = (
  week: WeekNumber,
  context: Awaited<ReturnType<typeof resolveSurveyContext>>,
): BkSurveyPayload => ({
  kind: "bk-survey",
  week,
  sourceHref: TEACHER_STUDENT_APP_URL,
  project: context.project,
  group: context.group,
  items: context.items,
  submissions: context.submissions,
  votingClosed: context.project.votingClosed,
  isOwnGroup: context.group.isOwnGroup,
  canSubmit: !context.project.votingClosed && !context.group.isOwnGroup,
});

export const fetchBkSurveyPayload = async (
  session: ReflectionSession,
  credentialUsername: string,
  week: WeekNumber,
  groupSpk: string,
): Promise<BkSurveyPayload> => buildSurveyPayload(week, await resolveSurveyContext(session, credentialUsername, week, groupSpk));

const getRatingForItem = (ratings: BkVoteRatings, item: BkSurveyItem) => {
  const raw = ratings[item.spk] ?? ratings[item.nid];
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new Error(`Rating for ${item.label} must be an integer from 1 to 5.`);
  }

  return value;
};

const saveSubmission = async (
  session: ReflectionSession,
  submissionSpk: string | undefined,
  payload: Record<string, string | number>,
) => {
  const response = await session.request(
    submissionSpk
      ? `/api/coursebksurveysubmission/${encodeURIComponent(submissionSpk)}/`
      : "/api/coursebksurveysubmission/",
    {
      method: submissionSpk ? "PATCH" : "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
  return readJson<unknown>(response, "BK survey submission save");
};

export const submitBkProjectVote = async (
  session: ReflectionSession,
  credentialUsername: string,
  week: WeekNumber,
  groupSpk: string,
  ratings: BkVoteRatings,
): Promise<BkSurveyPayload> => {
  if (!isSupportedReflectionWeek(week)) {
    throw new Error("Week must be from 1 to 7.");
  }

  const context = await resolveSurveyContext(session, credentialUsername, week, groupSpk);
  if (context.project.votingClosed) {
    throw new Error("Voting is closed for this BK project.");
  }

  if (context.group.isOwnGroup) {
    throw new Error("You cannot vote for your own group.");
  }

  const ratingItems = context.items.filter((item) => item.type === "rating");
  if (ratingItems.length === 0) {
    throw new Error("This survey does not include rating items.");
  }

  const existingByItem = new Map(context.submissions.map((submission) => [submission.itemSpk, submission]));
  const savedSubmissions: BkSurveySubmission[] = [];

  for (const item of ratingItems) {
    const rating = getRatingForItem(ratings, item);
    const existing = existingByItem.get(item.spk);
    const saved = await saveSubmission(session, existing?.spk, {
      bkgroup: context.group.spk,
      item: item.spk,
      user: context.profile.id,
      rating,
    });
    const savedSpk = stringField(saved, ["spk", "id"]) ?? existing?.spk;
    if (savedSpk) {
      savedSubmissions.push({
        spk: savedSpk,
        itemSpk: item.spk,
        itemNid: item.nid,
        rating,
      });
    }
  }

  const mergedSubmissions = new Map(context.submissions.map((submission) => [submission.itemSpk, submission]));
  savedSubmissions.forEach((submission) => mergedSubmissions.set(submission.itemSpk, submission));

  return buildSurveyPayload(week, {
    ...context,
    submissions: [...mergedSubmissions.values()],
  });
};

export type { ReflectionCredential, ReflectionSession };
