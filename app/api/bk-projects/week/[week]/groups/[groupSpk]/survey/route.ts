import { NextResponse, type NextRequest } from "next/server";

import { getSessionPayload, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { getTeacherSessionFromRequest } from "@/lib/auth/teacherSso";
import { isSupportedReflectionWeek } from "@/lib/reflections/content";
import {
  createBkProjectAccessTokenSession,
  createBkProjectSession,
  fetchBkSurveyPayload,
  getBkProjectBaseUrl,
  getBkProjectCredentialForPortalUser,
} from "@/lib/bk-projects/session";

export const dynamic = "force-dynamic";

const jsonError = (message: string, status: number) => NextResponse.json({ ok: false, error: message }, { status });

export async function GET(
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

  try {
    const bkSession = teacherSession
      ? createBkProjectAccessTokenSession(teacherSession.accessToken, getBkProjectBaseUrl())
      : await createBkProjectSession(credential!, getBkProjectBaseUrl());
    const survey = await fetchBkSurveyPayload(
      bkSession,
      teacherSession?.username ?? credential!.username,
      week,
      params.groupSpk,
    );
    return NextResponse.json({ ok: true, survey });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "BK survey sync failed.", 502);
  }
}
