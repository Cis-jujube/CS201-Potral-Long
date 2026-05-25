import { NextResponse } from "next/server";

import { getOverviewEnvelope } from "@/lib/api/professorClient";
import { getWeekBundle } from "@/lib/course/selectors";

export async function GET() {
  const overview = await getOverviewEnvelope();
  const weekBundles = overview.data.weeks.map((week) => getWeekBundle(overview.data, week));

  return NextResponse.json({
    ...overview,
    weekBundles,
  });
}
