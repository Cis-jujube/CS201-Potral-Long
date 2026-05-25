"use client";

import { useEffect, useState } from "react";

import type { BkProjectWeekPayload } from "@/lib/bk-projects/types";
import type { WeekNumber } from "@/lib/course/types";

export type BkProjectLoadState = "loading" | "ready" | "error";

export interface BkProjectSource {
  state: BkProjectLoadState;
  project?: BkProjectWeekPayload;
  error?: string;
}

interface BkProjectWeekResponse {
  ok: boolean;
  project?: BkProjectWeekPayload;
  error?: string;
}

export function useBkProjectSync(week: WeekNumber): BkProjectSource {
  const [source, setSource] = useState<BkProjectSource>({ state: "loading" });

  useEffect(() => {
    let active = true;

    const loadProject = async () => {
      setSource({ state: "loading" });
      try {
        const response = await fetch(`/api/bk-projects/week/${week}`);
        const payload = (await response.json()) as BkProjectWeekResponse;
        if (!response.ok || !payload.ok || !payload.project) {
          throw new Error(payload.error ?? "BK project sync failed.");
        }

        if (active) {
          setSource({ state: "ready", project: payload.project });
        }
      } catch (error) {
        if (active) {
          setSource({
            state: "error",
            error: error instanceof Error ? error.message : "BK project sync failed.",
          });
        }
      }
    };

    void loadProject();

    return () => {
      active = false;
    };
  }, [week]);

  return source;
}
