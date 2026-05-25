import { NextResponse } from "next/server";

import { getSagEnvelope } from "@/lib/api/professorClient";

export async function GET() {
  const sag = await getSagEnvelope();
  return NextResponse.json(sag);
}
