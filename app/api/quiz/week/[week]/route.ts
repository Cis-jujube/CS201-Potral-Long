import { NextResponse, type NextRequest } from "next/server";

import { getSessionPayload, PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { getTeacherSessionFromRequest } from "@/lib/auth/teacherSso";
import { parseAssignmentPage } from "@/lib/quiz/parser";
import {
  createQuizAccessTokenSession,
  createQuizSession,
  fetchParsedQuizProblem,
  getQuizBaseUrl,
  getQuizCredentialForPortalUser,
} from "@/lib/quiz/session";
import { createQuizSubmitContext } from "@/lib/quiz/submitContext";
import { getQuizRequiredDueDate } from "@/lib/reflections/dueDates";
import type { WeekNumber } from "@/lib/course/types";
import type { QuizProblem, QuizProblemLink, QuizWeekPayload } from "@/lib/quiz/types";

const isSupportedWeek = (value: number) => value >= 1 && value <= 7;

const jsonError = (message: string, status: number, sourceHref?: string) =>
  NextResponse.json({ ok: false, error: message, sourceHref }, { status });

const fallbackProblemLinks = (week: number, baseUrl: string): QuizProblemLink[] => {
  const baseProblemId = week * 100;
  return Array.from({ length: 24 }, (_item, index) => {
    const problemId = String(baseProblemId + index + 1);
    return {
      problemId,
      label: `Problem${String(index + 1).padStart(2, "0")}`,
      sourceHref: `${baseUrl}/cs201/quiz/${problemId}/`,
    };
  });
};

const toQuizProblem = (
  parsed: Awaited<ReturnType<typeof fetchParsedQuizProblem>>,
  portalUsername: string,
  quizSession: Awaited<ReturnType<typeof createQuizSession>>,
): QuizProblem => {
  const submitContextId =
    parsed.status === "open" && parsed.formAction && parsed.csrfToken
      ? createQuizSubmitContext({
          portalUsername,
          problemId: parsed.problemId,
          sourceHref: parsed.sourceHref,
          formAction: parsed.formAction,
          csrfToken: parsed.csrfToken,
          session: quizSession,
        })
      : undefined;

  return {
    id: parsed.id,
    problemId: parsed.problemId,
    week: parsed.week,
    label: parsed.label,
    title: parsed.title,
    sourceHref: parsed.sourceHref,
    status: parsed.status,
    prompt: parsed.prompt,
    answerFields: parsed.answerFields,
    submitContextId,
  };
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ week: string }> },
) {
  const params = await context.params;
  const week = Number(params.week);

  if (!isSupportedWeek(week)) {
    return jsonError("Week must be from 1 to 7.", 400);
  }
  const supportedWeek = week as WeekNumber;

  const session = await getSessionPayload(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session) {
    return jsonError("Authentication required.", 401);
  }

  const baseUrl = getQuizBaseUrl();
  const sourceHref = `${baseUrl}/cs201/assignment/`;
  const teacherSession = await getTeacherSessionFromRequest(request);
  const credential = teacherSession ? null : getQuizCredentialForPortalUser(session.username);
  if (!teacherSession && !credential) {
    return jsonError("Quiz account not configured.", 409, sourceHref);
  }

  try {
    const quizSession = teacherSession
      ? createQuizAccessTokenSession(teacherSession.accessToken, baseUrl)
      : await createQuizSession(credential!, baseUrl);
    const assignmentResponse = await quizSession.request("/cs201/assignment/");
    if (!assignmentResponse.ok) {
      return jsonError(`Quiz assignment fetch failed: ${assignmentResponse.status}`, 502, sourceHref);
    }

    const assignmentHtml = await assignmentResponse.text();
    const assignment = parseAssignmentPage(assignmentHtml, baseUrl).find((item) => item.week === week);
    if (!assignment) {
      return jsonError(`Week ${week} quiz was not found on the assignment page.`, 404, sourceHref);
    }

    const firstProblem = await fetchParsedQuizProblem(quizSession, assignment.sourceHref);
    const links = firstProblem.problemLinks.length >= 24 ? firstProblem.problemLinks : fallbackProblemLinks(week, baseUrl);
    const problems = await Promise.all(
      links.map(async (link): Promise<QuizProblem> => {
        if (link.problemId === firstProblem.problemId) {
          return toQuizProblem(firstProblem, session.username, quizSession);
        }

        const parsed = await fetchParsedQuizProblem(quizSession, link.sourceHref);
        return toQuizProblem(parsed, session.username, quizSession);
      }),
    );

    const payload: QuizWeekPayload = {
      kind: "quiz",
      id: `quiz-week-${week}`,
      week,
      title: `Week ${week} Quiz`,
      sourceHref: assignment.sourceHref,
      status: assignment.status,
      due: getQuizRequiredDueDate(supportedWeek),
      progressLabel:
        typeof assignment.passed === "number" && typeof assignment.total === "number"
          ? `${assignment.passed}/${assignment.total} passed`
          : undefined,
      problems: problems.sort((left, right) => Number(left.problemId) - Number(right.problemId)),
    };

    return NextResponse.json({ ok: true, quiz: payload });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Quiz fetch failed.", 502, sourceHref);
  }
}
