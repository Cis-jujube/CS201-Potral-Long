import {
  clearQuizSubmitContextsForTest,
  createQuizSubmitContext,
  getQuizSubmitContext,
} from "@/lib/quiz/submitContext";
import type { QuizSession } from "@/lib/quiz/session";

const makeSession = (): QuizSession => ({
  baseUrl: "http://quiz.test",
  request: vi.fn(),
});

describe("quiz submit context", () => {
  afterEach(() => {
    clearQuizSubmitContextsForTest();
  });

  it("returns only matching portal user and problem contexts", () => {
    const session = makeSession();
    const id = createQuizSubmitContext({
      portalUsername: "test",
      problemId: "603",
      sourceHref: "http://quiz.test/cs201/quiz/603/",
      formAction: "http://quiz.test/cs201/index/603/checking/",
      csrfToken: "csrf-603",
      session,
    });

    expect(getQuizSubmitContext(id, "test", "603")).toMatchObject({
      id,
      formAction: "http://quiz.test/cs201/index/603/checking/",
      csrfToken: "csrf-603",
    });
    expect(getQuizSubmitContext(id, "other", "603")).toBeNull();
    expect(getQuizSubmitContext(id, "test", "604")).toBeNull();
    expect(getQuizSubmitContext(undefined, "test", "603")).toBeNull();
  });
});
