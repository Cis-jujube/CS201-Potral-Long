import { NextResponse, type NextRequest } from "next/server";

import {
  PORTAL_SESSION_COOKIE,
  getSessionPayload,
  isRestrictedPortalSession,
} from "@/lib/auth/session";

const PUBLIC_PATH_PREFIXES = ["/_next"];
const PUBLIC_PATHS = ["/login", "/favicon.ico"];
const AUTH_API_PREFIX = "/api/auth";

const RESTRICTED_PAGE_PATHS = ["/resources", "/faq", "/sag", "/exams"];
const RESTRICTED_PATH_PREFIXES = [
  "/resources/materials",
  "/resources/class-notes",
  "/course-materials",
  "/api/class-notes/week",
];
const RESTRICTED_AUTH_API_PATHS = ["/api/auth/login", "/api/auth/logout"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.includes(pathname) ||
  pathname.startsWith(AUTH_API_PREFIX) ||
  PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const matchesPath = (pathname: string, allowedPath: string) =>
  pathname === allowedPath || pathname.startsWith(`${allowedPath}/`);

const isPublicFilePath = (pathname: string) =>
  !pathname.startsWith("/api/") && /\.[a-zA-Z0-9]+$/.test(pathname);

const isRestrictedAllowedPath = (pathname: string) =>
  RESTRICTED_AUTH_API_PATHS.includes(pathname) ||
  RESTRICTED_PAGE_PATHS.some((allowedPath) => matchesPath(pathname, allowedPath)) ||
  RESTRICTED_PATH_PREFIXES.some((prefix) => matchesPath(pathname, prefix)) ||
  isPublicFilePath(pathname);

const redirectRestrictedUser = (request: NextRequest) => {
  const resourcesUrl = request.nextUrl.clone();
  resourcesUrl.pathname = "/resources";
  resourcesUrl.search = "";
  return NextResponse.redirect(resourcesUrl);
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  const session = await getSessionPayload(token);

  if (isRestrictedPortalSession(session)) {
    if (isRestrictedAllowedPath(pathname)) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { ok: false, error: "This local test account can only access static course resources." },
        { status: 403 },
      );
    }

    return redirectRestrictedUser(request);
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

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
