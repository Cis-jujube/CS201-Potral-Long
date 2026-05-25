import { NextResponse } from "next/server";

import { getResourcesEnvelope } from "@/lib/api/professorClient";
import { filterByWeek } from "@/lib/course/selectors";
import type { WeekNumber } from "@/lib/course/types";

const asWeek = (value: string | null): WeekNumber | null => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 7) {
    return null;
  }

  return parsed as WeekNumber;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const week = asWeek(url.searchParams.get("week"));
  const resources = await getResourcesEnvelope();

  if (!week) {
    return NextResponse.json(resources);
  }

  return NextResponse.json({
    ...resources,
    data: filterByWeek(resources.data, week),
  });
}
