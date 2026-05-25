import { NextResponse, type NextRequest } from "next/server";

import { shouldUseSecureCookies } from "@/lib/auth/cookies";
import {
  TEACHER_SSO_STATE_COOKIE,
  TEACHER_SSO_STATE_MAX_AGE_SECONDS,
  buildTeacherAuthorizeUrl,
  createTeacherSsoState,
  normalizeNextPath,
} from "@/lib/auth/teacherSso";

const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: shouldUseSecureCookies(),
  path: "/api/auth/teacher",
});

export async function GET(request: NextRequest) {
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"));

  try {
    const { payload, token } = await createTeacherSsoState(nextPath);
    const response = NextResponse.redirect(buildTeacherAuthorizeUrl(request, payload.state));
    response.cookies.set(TEACHER_SSO_STATE_COOKIE, token, {
      ...getCookieOptions(),
      maxAge: TEACHER_SSO_STATE_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", nextPath);
    loginUrl.searchParams.set("ssoError", "teacher_sso_not_configured");
    return NextResponse.redirect(loginUrl);
  }
}
