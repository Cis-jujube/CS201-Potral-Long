import { NextResponse } from "next/server";

import { shouldUseSecureCookies } from "@/lib/auth/cookies";
import { PORTAL_SESSION_COOKIE } from "@/lib/auth/session";
import { TEACHER_SESSION_COOKIE, TEACHER_SSO_STATE_COOKIE } from "@/lib/auth/teacherSso";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(TEACHER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(TEACHER_SSO_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/api/auth/teacher",
    maxAge: 0,
  });

  return response;
}
