import { NextResponse, type NextRequest } from "next/server";

import { readClassNotes } from "@/lib/class-notes/store";
import { getAdminSessionFromRequest } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const forbidden = () => NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });

export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return forbidden();
  }

  return NextResponse.json({ ok: true, username: session.username, notes: await readClassNotes() });
}
