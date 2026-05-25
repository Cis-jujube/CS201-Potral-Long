import { NextResponse, type NextRequest } from "next/server";

import { getSessionPayload, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { getTeacherSessionFromRequest } from "@/lib/auth/teacherSso";
import { isSupportedReflectionWeek } from "@/lib/reflections/content";
import {
  createReflectionAccessTokenSession,
  createReflectionSession,
  getReflectionBaseUrl,
  getReflectionCredentialForPortalUser,
  submitReflectionQuestionnaire,
} from "@/lib/reflections/session";

export const dynamic = "force-dynamic";

const jsonError = (message: string, status: number) => NextResponse.json({ ok: false, error: message }, { status });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ week: string; questionnaireNo: string }> },
) {
  const params = await context.params;
  const week = Number(params.week);
  const questionnaireNo = Number(params.questionnaireNo);

  if (!isSupportedReflectionWeek(week)) {
    return jsonError("Week must be from 1 to 7.", 400);
  }

  if (!Number.isInteger(questionnaireNo) || questionnaireNo < 1 || questionnaireNo > 3) {
    return jsonError("Questionnaire number must be 1, 2, or 3.", 400);
  }

  const session = await getSessionPayload(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const teacherSession = await getTeacherSessionFromRequest(request);
  const credential = teacherSession ? null : getReflectionCredentialForPortalUser(session.username);
  if (!teacherSession && !credential) {
    return jsonError("Reflection teacher-site account not configured.", 409);
  }

  const body = (await request.json().catch(() => null)) as { responseText?: unknown } | null;
  if (typeof body?.responseText !== "string") {
    return jsonError("responseText is required.", 400);
  }

  try {
    const reflectionSession = teacherSession
      ? createReflectionAccessTokenSession(teacherSession.accessToken, getReflectionBaseUrl())
      : await createReflectionSession(credential!, getReflectionBaseUrl());
    const questionnaire = await submitReflectionQuestionnaire(
      reflectionSession,
      teacherSession?.username ?? credential!.username,
      week,
      questionnaireNo,
      body.responseText,
    );

    return NextResponse.json({ ok: true, questionnaire });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Reflection submission failed.", 502);
  }
}
