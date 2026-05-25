import { NextResponse, type NextRequest } from "next/server";

import { getVisibleClassNotesForWeek, parseClassNoteWeek } from "@/lib/class-notes/store";

export const dynamic = "force-dynamic";

interface ClassNotesWeekRouteProps {
  params: Promise<{ week: string }>;
}

export async function GET(_request: NextRequest, { params }: ClassNotesWeekRouteProps) {
  try {
    const { week } = await params;
    const notes = await getVisibleClassNotesForWeek(parseClassNoteWeek(week));
    return NextResponse.json({ ok: true, notes });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Class notes unavailable." },
      { status: 400 },
    );
  }
}
