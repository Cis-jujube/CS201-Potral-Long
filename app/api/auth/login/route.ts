import { NextResponse } from "next/server";

import {
  PORTAL_SESSION_COOKIE,
  PORTAL_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isValidPortalLogin,
} from "@/lib/auth/session";
import { shouldUseSecureCookies } from "@/lib/auth/cookies";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { username?: unknown; password?: unknown } | null;
  const username = typeof payload?.username === "string" ? payload.username : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!isValidPortalLogin(username, password)) {
    return NextResponse.json({ ok: false, error: "Invalid username or password." }, { status: 401 });
  }

  const token = await createSessionToken(username);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(PORTAL_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: PORTAL_SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
