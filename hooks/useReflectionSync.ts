"use client";

import { useEffect, useState } from "react";

import type { WeekNumber } from "@/lib/course/types";
import type { ReflectionWeekPayload } from "@/lib/reflections/types";

export type ReflectionLoadState = "loading" | "ready" | "error";

export interface ReflectionPracticeSource {
  state: ReflectionLoadState;
  reflection?: ReflectionWeekPayload;
  error?: string;
  sourceHref?: string;
}

export function useReflectionSync(week: WeekNumber): ReflectionPracticeSource {
  const [source, setSource] = useState<ReflectionPracticeSource>({ state: "loading" });

  useEffect(() => {
    let active = true;

    const loadReflection = async () => {
      setSource({ state: "loading" });
      try {
        const response = await fetch(`/api/reflections/week/${week}`);
        const payload = (await response.json()) as {
          ok: boolean;
          reflection?: ReflectionWeekPayload;
          error?: string;
          sourceHref?: string;
        };
        if (!response.ok || !payload.ok || !payload.reflection) {
          throw new Error(payload.error ?? "Reflection sync failed.");
        }

        if (active) {
          setSource({
            state: "ready",
            reflection: payload.reflection,
            sourceHref: payload.reflection.sourceHref,
          });
        }
      } catch (error) {
        if (active) {
          setSource({
            state: "error",
            error: error instanceof Error ? error.message : "Reflection sync failed.",
          });
        }
      }
    };

    void loadReflection();

    return () => {
      active = false;
    };
  }, [week]);

  return source;
}
