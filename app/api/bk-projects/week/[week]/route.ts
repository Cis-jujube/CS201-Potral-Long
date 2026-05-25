import { NextResponse, type NextRequest } from "next/server";

import { getSessionPayload, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { getTeacherSessionFromRequest } from "@/lib/auth/teacherSso";
import { isSupportedReflectionWeek } from "@/lib/reflections/content";
import {
  buildFallbackBkProjectWeekPayload,
  createBkProjectAccessTokenSession,
  createBkProjectSession,
  fetchBkProjectWeekPayload,
  getBkProjectBaseUrl,
  getBkProjectCredentialForPortalUser,
} from "@/lib/bk-projects/session";

export const dynamic = "force-dynamic";

const jsonError = (message: string, status: number) => NextResponse.json({ ok: false, error: message }, { status });

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ week: string }> },
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
    return NextResponse.json({
      ok: true,
      project: buildFallbackBkProjectWeekPayload(week),
    });
  }

  try {
    const bkSession = teacherSession
      ? createBkProjectAccessTokenSession(teacherSession.accessToken, getBkProjectBaseUrl())
      : await createBkProjectSession(credential!, getBkProjectBaseUrl());
    const project = await fetchBkProjectWeekPayload(
      bkSession,
      teacherSession?.username ?? credential!.username,
      week,
    );
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      project: buildFallbackBkProjectWeekPayload(
        week,
        "error",
        error instanceof Error ? error.message : "Teacher-site BK project sync failed.",
      ),
    });
  }
}
