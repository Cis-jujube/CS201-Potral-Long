import { NextResponse, type NextRequest } from "next/server";

import {
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
} from "@/lib/auth/session";
import { shouldUseSecureCookies } from "@/lib/auth/cookies";
import {
  TEACHER_SESSION_COOKIE,
  TEACHER_SSO_STATE_COOKIE,
  createTeacherSessionToken,
  exchangeTeacherSsoCode,
  getTeacherSsoRedirectUri,
  getTeacherSsoStatePayload,
} from "@/lib/auth/teacherSso";

const getPortalCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: shouldUseSecureCookies(),
  path: "/",
});

const getStateCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: shouldUseSecureCookies(),
  path: "/api/auth/teacher",
});

const redirectToLogin = (request: NextRequest, error: string) => {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("ssoError", error);
  return NextResponse.redirect(loginUrl);
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const statePayload = await getTeacherSsoStatePayload(
    request.cookies.get(TEACHER_SSO_STATE_COOKIE)?.value,
  );

  if (!code || !state || !statePayload || statePayload.state !== state) {
    const response = redirectToLogin(request, "invalid_teacher_sso");
    response.cookies.set(TEACHER_SSO_STATE_COOKIE, "", { ...getStateCookieOptions(), maxAge: 0 });
    return response;
  }

  try {
    const teacherSession = await exchangeTeacherSsoCode(code, getTeacherSsoRedirectUri(request));
    const portalToken = await createSessionToken(teacherSession.username, Date.now(), "teacher");
    const teacherToken = await createTeacherSessionToken(teacherSession);
    const maxAge = Math.max(
      1,
      Math.min(
        PORTAL_SESSION_MAX_AGE_SECONDS,
        Math.floor((teacherSession.expiresAt - Date.now()) / 1000),
      ),
    );

    const response = NextResponse.redirect(new URL(statePayload.nextPath, request.nextUrl.origin));
    response.cookies.set(PORTAL_SESSION_COOKIE, portalToken, {
      ...getPortalCookieOptions(),
      maxAge: PORTAL_SESSION_MAX_AGE_SECONDS,
    });
    response.cookies.set(TEACHER_SESSION_COOKIE, teacherToken, {
      ...getPortalCookieOptions(),
      maxAge,
    });
    response.cookies.set(TEACHER_SSO_STATE_COOKIE, "", { ...getStateCookieOptions(), maxAge: 0 });
    return response;
  } catch {
    const response = redirectToLogin(request, "teacher_sso_failed");
    response.cookies.set(TEACHER_SSO_STATE_COOKIE, "", { ...getStateCookieOptions(), maxAge: 0 });
    return response;
  }
}
