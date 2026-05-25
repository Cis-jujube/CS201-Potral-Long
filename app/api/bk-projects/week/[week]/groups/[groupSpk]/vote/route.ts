import { NextResponse, type NextRequest } from "next/server";

import { getSessionPayload, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { getTeacherSessionFromRequest } from "@/lib/auth/teacherSso";
import { isSupportedReflectionWeek } from "@/lib/reflections/content";
import {
  createBkProjectAccessTokenSession,
  createBkProjectSession,
  getBkProjectBaseUrl,
  getBkProjectCredentialForPortalUser,
  submitBkProjectVote,
} from "@/lib/bk-projects/session";
import type { BkVoteRatings } from "@/lib/bk-projects/types";

export const dynamic = "force-dynamic";

const jsonError = (message: string, status: number) => NextResponse.json({ ok: false, error: message }, { status });

const parseRatings = (value: unknown): BkVoteRatings | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return Object.entries(value as Record<string, unknown>).reduce<BkVoteRatings>((accumulator, [key, raw]) => {
    if (typeof raw === "number" || typeof raw === "string") {
      accumulator[key] = Number(raw);
    }
    return accumulator;
  }, {});
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ week: string; groupSpk: string }> },
) {
  const params = await context.params;
  const week = Number(params.week);

  if (!isSupportedReflectionWeek(week)) {
    return jsonError("Week must be from 1 to 7.", 400);
  }

  const session = await getSessionPayload(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const teacherSession = await getTeacherSessionFromRequest(request);
  const credential = teacherSession ? null : getBkProjectCredentialForPortalUser(session.username);
  if (!teacherSession && !credential) {
    return jsonError("BK teacher-site account not configured.", 409);
  }

  const body = (await request.json().catch(() => null)) as { ratings?: unknown } | null;
  const ratings = parseRatings(body?.ratings);
  if (!ratings || Object.keys(ratings).length === 0) {
    return jsonError("ratings is required.", 400);
  }

  try {
    const bkSession = teacherSession
      ? createBkProjectAccessTokenSession(teacherSession.accessToken, getBkProjectBaseUrl())
      : await createBkProjectSession(credential!, getBkProjectBaseUrl());
    const survey = await submitBkProjectVote(
      bkSession,
      teacherSession?.username ?? credential!.username,
      week,
      params.groupSpk,
      ratings,
    );
    return NextResponse.json({ ok: true, survey });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "BK vote submission failed.", 502);
  }
}
