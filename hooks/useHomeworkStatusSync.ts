"use client";

import { useEffect, useState } from "react";

import type { HomeworkStatusPayload } from "@/lib/homework/statusTypes";

export type HomeworkStatusLoadState = "loading" | "ready" | "error";

export interface HomeworkStatusSource {
  state: HomeworkStatusLoadState;
  status?: HomeworkStatusPayload;
  error?: string;
  sourceHref?: string;
  refresh: () => void;
}

export const useHomeworkStatusSync = (): HomeworkStatusSource => {
  const [source, setSource] = useState<Omit<HomeworkStatusSource, "refresh">>({ state: "loading" });
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      setSource({ state: "loading" });
      try {
        const response = await fetch("/api/homework/status");
        const payload = (await response.json()) as {
          ok: boolean;
          status?: HomeworkStatusPayload;
          error?: string;
          sourceHref?: string;
        };
        if (!response.ok || !payload.ok || !payload.status) {
          throw new Error(payload.error ?? "Homework status sync failed.");
        }

        if (active) {
          setSource({
            state: "ready",
            status: payload.status,
            sourceHref: payload.status.sourceHref,
          });
        }
      } catch (error) {
        if (active) {
          setSource({
            state: "error",
            error: error instanceof Error ? error.message : "Homework status sync failed.",
          });
        }
      }
    };

    void loadStatus();

    return () => {
      active = false;
    };
  }, [refreshIndex]);

  return {
    ...source,
    refresh: () => setRefreshIndex((current) => current + 1),
  };
};
