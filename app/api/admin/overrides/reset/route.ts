import { NextResponse, type NextRequest } from "next/server";

import { resetCourseOverrides } from "@/lib/admin/overrides";
import { getAdminSessionFromRequest } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });
  }

  const overrides = await resetCourseOverrides(session.username);
  return NextResponse.json({ ok: true, overrides });
}
