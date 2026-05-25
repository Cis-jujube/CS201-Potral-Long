export const PORTAL_SESSION_COOKIE = "cs201_portal_session";
export const PORTAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const DEV_USERNAME = "cs201";
const DEV_PASSWORD = "cs201";
const DEV_SECRET = "cs201-dev-session-secret";

const encoder = new TextEncoder();

export interface PortalCredential {
  username: string;
  password: string;
}

export interface PortalSessionPayload {
  username: string;
  issuedAt: number;
  authSource?: "local" | "teacher";
}

const parsePortalUsers = (value: string | undefined): PortalCredential[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");
      if (separatorIndex <= 0) {
        return null;
      }

      const username = entry.slice(0, separatorIndex).trim();
      const password = entry.slice(separatorIndex + 1).trim();
      return username && password ? { username, password } : null;
    })
    .filter((entry): entry is PortalCredential => Boolean(entry));
};

const parseUsernameList = (value: string | undefined): Set<string> =>
  new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

export const getPortalCredentials = (): PortalCredential[] => {
  const configuredUsers = parsePortalUsers(process.env.CS201_PORTAL_USERS);
  if (configuredUsers.length > 0) {
    return configuredUsers;
  }

  return [
    {
      username: process.env.CS201_PORTAL_USERNAME || DEV_USERNAME,
      password: process.env.CS201_PORTAL_PASSWORD || DEV_PASSWORD,
    },
  ];
};

export const getRestrictedLocalPortalUsers = () =>
  parseUsernameList(process.env.CS201_RESTRICTED_LOCAL_USERS);

export const isRestrictedLocalPortalUser = (username: string) =>
  getRestrictedLocalPortalUsers().has(username);

export const isRestrictedPortalSession = (session: PortalSessionPayload | null | undefined) =>
  Boolean(session && session.authSource !== "teacher" && isRestrictedLocalPortalUser(session.username));

const getSessionSecret = () => {
  const secret = process.env.CS201_PORTAL_SESSION_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("CS201_PORTAL_SESSION_SECRET is required in production.");
  }

  return DEV_SECRET;
};

const base64UrlEncodeBytes = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const base64 =
    typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlEncodeString = (value: string) => base64UrlEncodeBytes(encoder.encode(value));

const base64UrlDecodeString = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const importSecretKey = async () =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

const signPayload = async (payload: string) => {
  const key = await importSecretKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64UrlEncodeBytes(new Uint8Array(signature));
};

export const isValidPortalLogin = (username: string, password: string) => {
  return getPortalCredentials().some((credentials) => {
    return username === credentials.username && password === credentials.password;
  });
};

export const createSessionToken = async (
  username: string,
  issuedAt = Date.now(),
  authSource: PortalSessionPayload["authSource"] = "local",
) => {
  const payload = base64UrlEncodeString(JSON.stringify({ username, issuedAt, authSource }));
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
};

export const verifySessionToken = async (token: string | undefined | null, now = Date.now()) => {
  const payload = await getSessionPayload(token, now);
  return Boolean(payload);
};

export const getSessionPayload = async (
  token: string | undefined | null,
  now = Date.now(),
): Promise<PortalSessionPayload | null> => {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = await signPayload(payload);
  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecodeString(payload)) as {
      username?: unknown;
      issuedAt?: unknown;
      authSource?: unknown;
    };
    if (typeof parsed.username !== "string" || typeof parsed.issuedAt !== "number") {
      return null;
    }

    const authSource = parsed.authSource === "teacher" ? "teacher" : "local";
    if (
      authSource !== "teacher" &&
      !getPortalCredentials().some((credentials) => credentials.username === parsed.username)
    ) {
      return null;
    }

    const maxAgeMs = PORTAL_SESSION_MAX_AGE_SECONDS * 1000;
    if (parsed.issuedAt > now || now - parsed.issuedAt > maxAgeMs) {
      return null;
    }

    return { username: parsed.username, issuedAt: parsed.issuedAt, authSource };
  } catch {
    return null;
  }
};
