"use client";

import { useEffect, useState } from "react";

import { getSagClient } from "@/lib/api/clientCourseApi";
import type { ApiEnvelope, SagOverview } from "@/lib/course/types";

export const useSagOverview = () => {
  const [data, setData] = useState<ApiEnvelope<SagOverview> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getSagClient();
        if (!cancelled) {
          setData(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load SAG details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
};
