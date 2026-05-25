import { NextResponse } from "next/server";

import { getWeekEnvelope } from "@/lib/api/professorClient";
import type { WeekNumber } from "@/lib/course/types";

const isWeekNumber = (value: number): value is WeekNumber => value >= 1 && value <= 7;

export async function GET(
  _request: Request,
  context: { params: Promise<{ week: string }> },
) {
  const params = await context.params;
  const week = Number(params.week);

  if (!isWeekNumber(week)) {
    return NextResponse.json({ error: "Week must be from 1 to 7." }, { status: 400 });
  }

  const bundle = await getWeekEnvelope(week);
  return NextResponse.json(bundle);
}
