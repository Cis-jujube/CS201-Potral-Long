import { NextResponse, type NextRequest } from "next/server";

import { getSessionPayload, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { getTeacherSessionFromRequest } from "@/lib/auth/teacherSso";
import { parseQuizSubmitPage } from "@/lib/quiz/parser";
import {
  createQuizAccessTokenSession,
  createQuizSession,
  fetchParsedQuizProblem,
  getQuizBaseUrl,
  getQuizCredentialForPortalUser,
} from "@/lib/quiz/session";
import { getQuizSubmitContext } from "@/lib/quiz/submitContext";

const jsonError = (message: string, status: number) => NextResponse.json({ ok: false, error: message }, { status });

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ problemId: string }> },
) {
  const params = await context.params;
  const problemId = params.problemId;
  if (!/^\d+$/.test(problemId)) {
    return jsonError("Problem id must be numeric.", 400);
  }

  const session = await getSessionPayload(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const teacherSession = await getTeacherSessionFromRequest(request);
  const credential = teacherSession ? null : getQuizCredentialForPortalUser(session.username);
  if (!teacherSession && !credential) {
    return jsonError("Quiz account not configured.", 409);
  }

  const body = (await request.json().catch(() => null)) as {
    answers?: Record<string, string>;
    submitContextId?: string;
  } | null;
  const answers = body?.answers ?? {};
  const baseUrl = getQuizBaseUrl();
  const sourceHref = `${baseUrl}/cs201/quiz/${problemId}/`;

  try {
    const cachedContext = getQuizSubmitContext(body?.submitContextId, session.username, problemId);
    const quizSession =
      cachedContext?.session ??
      (teacherSession
        ? createQuizAccessTokenSession(teacherSession.accessToken, baseUrl)
        : await createQuizSession(credential!, baseUrl));
    const problem = cachedContext ? null : await fetchParsedQuizProblem(quizSession, sourceHref);
    const answerFields = problem?.answerFields ?? Object.keys(answers).map((name) => ({ name }));
    const action = cachedContext?.formAction ?? problem?.formAction;
    const csrfToken = cachedContext?.csrfToken ?? problem?.csrfToken;
    const referer = cachedContext?.sourceHref ?? sourceHref;

    if (!cachedContext && (!problem || problem.status !== "open" || problem.answerFields.length === 0)) {
      return jsonError("This quiz problem is not open for submission.", 409);
    }

    if (!action || !csrfToken || answerFields.length === 0) {
      return jsonError("Quiz submit form is unavailable.", 502);
    }

    const form = new URLSearchParams();
    form.set("csrfmiddlewaretoken", csrfToken);
    answerFields.forEach((field) => {
      form.set(field.name, answers[field.name] ?? "");
    });

    const submitResponse = await quizSession.request(action, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        referer,
      },
      body: form,
    });
    const html = await submitResponse.text();

    return NextResponse.json({ ok: true, result: parseQuizSubmitPage(html) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Quiz submission failed.", 502);
  }
}
