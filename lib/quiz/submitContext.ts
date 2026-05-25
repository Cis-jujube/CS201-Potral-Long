import { randomUUID } from "node:crypto";

import type { QuizSession } from "@/lib/quiz/session";

const CONTEXT_TTL_MS = 30 * 60 * 1000;

export interface QuizSubmitContext {
  id: string;
  portalUsername: string;
  problemId: string;
  sourceHref: string;
  formAction: string;
  csrfToken: string;
  session: QuizSession;
  expiresAt: number;
}

const contexts = new Map<string, QuizSubmitContext>();

const pruneExpiredContexts = (now = Date.now()) => {
  for (const [id, context] of contexts.entries()) {
    if (context.expiresAt <= now) {
      contexts.delete(id);
    }
  }
};

export const createQuizSubmitContext = ({
  portalUsername,
  problemId,
  sourceHref,
  formAction,
  csrfToken,
  session,
}: Omit<QuizSubmitContext, "id" | "expiresAt">) => {
  pruneExpiredContexts();

  const id = `quiz-submit-${randomUUID()}`;
  contexts.set(id, {
    id,
    portalUsername,
    problemId,
    sourceHref,
    formAction,
    csrfToken,
    session,
    expiresAt: Date.now() + CONTEXT_TTL_MS,
  });
  return id;
};

export const getQuizSubmitContext = (id: string | undefined, portalUsername: string, problemId: string) => {
  if (!id) {
    return null;
  }

  pruneExpiredContexts();
  const context = contexts.get(id);
  if (!context || context.portalUsername !== portalUsername || context.problemId !== problemId) {
    return null;
  }

  context.expiresAt = Date.now() + CONTEXT_TTL_MS;
  return context;
};

export const clearQuizSubmitContextsForTest = () => {
  contexts.clear();
};
