import { NextResponse, type NextRequest } from "next/server";

import { getAdminSessionFromRequest } from "@/lib/auth/admin";
import {
  buildAdminEditableContent,
  readCourseOverrides,
  sanitizeCourseOverrides,
  writeCourseOverrides,
} from "@/lib/admin/overrides";
import { MOCK_COURSE_OVERVIEW } from "@/lib/mock/courseData";

export const dynamic = "force-dynamic";

const forbidden = () => NextResponse.json({ ok: false, error: "Admin access required." }, { status: 403 });

export async function GET(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return forbidden();
  }

  const overrides = await readCourseOverrides();
  return NextResponse.json({
    ok: true,
    username: session.username,
    overrides,
    base: buildAdminEditableContent(MOCK_COURSE_OVERVIEW),
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    return forbidden();
  }

  try {
    const payload = (await request.json()) as { overrides?: unknown } | null;
    const overrides = sanitizeCourseOverrides(payload?.overrides);
    const saved = await writeCourseOverrides(overrides, session.username);
    return NextResponse.json({ ok: true, overrides: saved });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid admin override payload." },
      { status: 400 },
    );
  }
}
