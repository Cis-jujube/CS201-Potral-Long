import { NextResponse, type NextRequest } from "next/server";

import {
  PORTAL_SESSION_COOKIE,
  getSessionPayload,
  isRestrictedPortalSession,
} from "@/lib/auth/session";
import { isTeacherSsoConfigured, isTeacherSsoRequired } from "@/lib/auth/teacherSsoConfig";

const PUBLIC_PATH_PREFIXES = ["/_next"];
const PUBLIC_PATHS = ["/login", "/favicon.ico"];
const AUTH_API_PREFIX = "/api/auth";

const RESTRICTED_AUTH_API_PATHS = ["/api/auth/login", "/api/auth/logout"];
const RESTRICTED_AUTH_API_PREFIXES = ["/api/auth/teacher"];
const RESTRICTED_DOWNLOAD_PATH_PREFIXES = ["/course-materials", "/reflection-templates"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.includes(pathname) ||
  pathname.startsWith(AUTH_API_PREFIX) ||
  PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const matchesPath = (pathname: string, allowedPath: string) =>
  pathname === allowedPath || pathname.startsWith(`${allowedPath}/`);

const isRestrictedDownloadPath = (pathname: string) =>
  RESTRICTED_DOWNLOAD_PATH_PREFIXES.some((prefix) => matchesPath(pathname, prefix));

const isRestrictedAuthApiPath = (pathname: string) =>
  RESTRICTED_AUTH_API_PREFIXES.some((prefix) => matchesPath(pathname, prefix));

const getNextPath = (request: NextRequest) => `${request.nextUrl.pathname}${request.nextUrl.search}`;

const redirectToLogin = (request: NextRequest, nextPath: string, ssoError?: string) => {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", nextPath);
  if (ssoError) {
    loginUrl.searchParams.set("local", "1");
    loginUrl.searchParams.set("ssoError", ssoError);
  }
  return NextResponse.redirect(loginUrl);
};

const redirectToTeacherSso = (request: NextRequest, nextPath: string) => {
  const ssoUrl = request.nextUrl.clone();
  ssoUrl.pathname = "/api/auth/teacher/start";
  ssoUrl.search = "";
  ssoUrl.searchParams.set("next", nextPath);
  return NextResponse.redirect(ssoUrl);
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  const session = await getSessionPayload(token);

  if (isRestrictedPortalSession(session)) {
    if (isRestrictedDownloadPath(pathname)) {
      return NextResponse.json(
        { ok: false, error: "This local test account cannot download course files." },
        { status: 403 },
      );
    }

    if (pathname.startsWith("/api/")) {
      if (request.method === "GET" && !isRestrictedAuthApiPath(pathname)) {
        return NextResponse.next();
      }

      if (RESTRICTED_AUTH_API_PATHS.includes(pathname)) {
        return NextResponse.next();
      }

      return NextResponse.json(
        { ok: false, error: "This local test account can browse the portal but cannot write or start teacher SSO." },
        { status: 403 },
      );
    }

    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (session) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  const nextPath = getNextPath(request);
  if (isTeacherSsoRequired()) {
    return isTeacherSsoConfigured()
      ? redirectToTeacherSso(request, nextPath)
      : redirectToLogin(request, nextPath, "teacher_sso_not_configured");
  }

  return redirectToLogin(request, nextPath);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
