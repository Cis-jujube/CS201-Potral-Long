import type { NextRequest } from "next/server";

import { getSessionPayload, PORTAL_SESSION_COOKIE, type PortalSessionPayload } from "@/lib/auth/session";

const parseAdminUsers = (value: string | undefined) =>
  new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

export const isAdminUsername = (username: string) => {
  const configuredAdmins = parseAdminUsers(process.env.CS201_ADMIN_USERS);
  if (configuredAdmins.has(username)) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    return new Set([process.env.E2E_PORTAL_USERNAME, "cs201", "test", "zw354"].filter(Boolean)).has(username);
  }

  return false;
};

export const getAdminSessionFromRequest = async (request: NextRequest): Promise<PortalSessionPayload | null> => {
  const session = await getSessionPayload(request.cookies.get(PORTAL_SESSION_COOKIE)?.value);
  if (!session || !isAdminUsername(session.username)) {
    return null;
  }

  return session;
};
