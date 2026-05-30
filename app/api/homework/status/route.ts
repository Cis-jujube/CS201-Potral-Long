import { NextResponse, type NextRequest } from "next/server";

import { getSessionPayload, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { getTeacherSessionFromRequest } from "@/lib/auth/teacherSso";
import {
  buildFallbackHomeworkStatusPayload,
  fetchHomeworkStatusPayload,
} from "@/lib/homework/status";
import {
  createReflectionAccessTokenSession,
  createReflectionSession,
  getReflectionBaseUrl,
  getReflectionCredentialForPortalUser,
} from "@/lib/reflections/session";

export const dynamic = "force-dynamic";

const jsonError = (message: string, status: number, sourceHref?: string) =>
  NextResponse.json({ ok: false, error: message, sourceHref }, { status });

export async function GET(request: NextRequest) {
  const session = await getSessionPayload(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const teacherSession = await getTeacherSessionFromRequest(request);
  const credential = teacherSession ? null : getReflectionCredentialForPortalUser(session.username);
  if (!teacherSession && !credential) {
    return NextResponse.json({
      ok: true,
      status: buildFallbackHomeworkStatusPayload(),
    });
  }

  try {
    const homeworkSession = teacherSession
      ? createReflectionAccessTokenSession(teacherSession.accessToken, getReflectionBaseUrl())
      : await createReflectionSession(credential!, getReflectionBaseUrl());
    const status = await fetchHomeworkStatusPayload(
      homeworkSession,
      teacherSession?.username ?? credential!.username,
    );
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      status: buildFallbackHomeworkStatusPayload(
        "error",
        error instanceof Error ? error.message : "Teacher-site JPA homework sync failed.",
      ),
    });
  }
}
