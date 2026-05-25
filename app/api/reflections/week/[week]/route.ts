import { NextResponse, type NextRequest } from "next/server";

import { getSessionPayload, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { getTeacherSessionFromRequest } from "@/lib/auth/teacherSso";
import { buildFallbackReflectionWeekPayload, isSupportedReflectionWeek } from "@/lib/reflections/content";
import {
  createReflectionAccessTokenSession,
  createReflectionSession,
  fetchReflectionWeekPayload,
  getReflectionBaseUrl,
  getReflectionCredentialForPortalUser,
} from "@/lib/reflections/session";

export const dynamic = "force-dynamic";

const jsonError = (message: string, status: number, sourceHref?: string) =>
  NextResponse.json({ ok: false, error: message, sourceHref }, { status });

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
  const credential = teacherSession ? null : getReflectionCredentialForPortalUser(session.username);
  if (!teacherSession && !credential) {
    return NextResponse.json({
      ok: true,
      reflection: buildFallbackReflectionWeekPayload(week),
    });
  }

  try {
    const reflectionSession = teacherSession
      ? createReflectionAccessTokenSession(teacherSession.accessToken, getReflectionBaseUrl())
      : await createReflectionSession(credential!, getReflectionBaseUrl());
    const reflection = await fetchReflectionWeekPayload(
      reflectionSession,
      teacherSession?.username ?? credential!.username,
      week,
    );
    return NextResponse.json({ ok: true, reflection });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      reflection: buildFallbackReflectionWeekPayload(
        week,
        "error",
        error instanceof Error ? error.message : "Teacher-site reflection sync failed.",
      ),
    });
  }
}
