"use client";

import { useEffect, useState } from "react";

import type { WeekNumber } from "@/lib/course/types";
import type { QuizPracticeSource } from "@/lib/practice/content";
import type { QuizWeekPayload } from "@/lib/quiz/types";

interface QuizWeekResponse {
  ok: boolean;
  quiz?: QuizWeekPayload;
  error?: string;
  sourceHref?: string;
}

export interface WeeklyQuizSource extends QuizPracticeSource {
  refresh: () => void;
}

export const useWeeklyQuiz = (week: WeekNumber): WeeklyQuizSource => {
  const [state, setState] = useState<QuizPracticeSource>({ state: "loading" });
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadQuiz = async () => {
      setState({ state: "loading" });
      try {
        const response = await fetch(`/api/quiz/week/${week}`);
        const payload = (await response.json()) as QuizWeekResponse;
        if (cancelled) {
          return;
        }

        if (response.ok && payload.ok && payload.quiz) {
          setState({ state: "ready", quiz: payload.quiz, sourceHref: payload.quiz.sourceHref });
          return;
        }

        setState({
          state: response.status === 409 ? "unconfigured" : "error",
          error: payload.error ?? "Quiz unavailable.",
          sourceHref: payload.sourceHref,
        });
      } catch (error) {
        if (!cancelled) {
          setState({
            state: "error",
            error: error instanceof Error ? error.message : "Quiz unavailable.",
          });
        }
      }
    };

    void loadQuiz();
    return () => {
      cancelled = true;
    };
  }, [week, refreshIndex]);

  return {
    ...state,
    refresh: () => setRefreshIndex((current) => current + 1),
  };
};
