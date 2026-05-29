import { NextResponse, type NextRequest } from "next/server";

import { PORTAL_SESSION_COOKIE, getSessionPayload } from "@/lib/auth/session";
import {
  getTeacherSessionFromRequest,
  isTeacherSsoConfigured,
  isTeacherSsoRequired,
} from "@/lib/auth/teacherSso";

export async function GET(request: NextRequest) {
  const portalSession = await getSessionPayload(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
  const teacherSession = await getTeacherSessionFromRequest(request);

  return NextResponse.json({
    ok: true,
    configured: isTeacherSsoConfigured(),
    required: isTeacherSsoRequired(),
    authenticated: Boolean(portalSession),
    authSource: portalSession?.authSource ?? null,
    username: portalSession?.username ?? null,
    displayName: teacherSession?.displayName ?? null,
    teacherSession: teacherSession
      ? {
          issuedAt: teacherSession.issuedAt,
          expiresAt: teacherSession.expiresAt,
        }
      : null,
  });
}
