import type { NextRequest } from "next/server";

export const TEACHER_SESSION_COOKIE = "cs201_teacher_session";
export const TEACHER_SSO_STATE_COOKIE = "cs201_teacher_sso_state";
export const TEACHER_SSO_STATE_MAX_AGE_SECONDS = 10 * 60;

const DEFAULT_TEACHER_SSO_BASE_URL = "http://repolab.colab.duke.edu:8005";
const DEFAULT_TEACHER_SSO_CLIENT_ID = "cs201-portal";
const DEV_TEACHER_ENCRYPTION_SECRET = "cs201-dev-teacher-session-secret";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export interface TeacherSsoStatePayload {
  state: string;
  nextPath: string;
  issuedAt: number;
}

export interface TeacherSessionPayload {
  username: string;
  displayName?: string;
  accessToken: string;
  expiresAt: number;
  issuedAt: number;
}

export interface TeacherTokenResponse {
  username?: unknown;
  displayName?: unknown;
  accessToken?: unknown;
  expiresAt?: unknown;
}

const base64UrlEncodeBytes = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  const base64 =
    typeof btoa === "function" ? btoa(binary) : Buffer.from(binary, "binary").toString("base64");

  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const base64UrlDecodeBytes = (value: string) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = typeof atob === "function" ? atob(padded) : Buffer.from(padded, "base64").toString("binary");
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

const randomState = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return base64UrlEncodeBytes(bytes);
};

export const getTeacherSsoBaseUrl = () =>
  (process.env.TEACHER_SSO_BASE_URL || DEFAULT_TEACHER_SSO_BASE_URL).replace(/\/+$/, "");

export const getTeacherSsoClientId = () => process.env.TEACHER_SSO_CLIENT_ID || DEFAULT_TEACHER_SSO_CLIENT_ID;

const getTeacherSsoClientSecret = () => process.env.TEACHER_SSO_CLIENT_SECRET || "";

const getTeacherEncryptionSecret = () => {
  const secret = process.env.TEACHER_SESSION_ENCRYPTION_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("TEACHER_SESSION_ENCRYPTION_SECRET is required in production.");
  }

  return process.env.CS201_PORTAL_SESSION_SECRET || DEV_TEACHER_ENCRYPTION_SECRET;
};

const importEncryptionKey = async () => {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(getTeacherEncryptionSecret()));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
};

const encryptJson = async (payload: unknown) => {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const key = await importEncryptionKey();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );

  return `${base64UrlEncodeBytes(iv)}.${base64UrlEncodeBytes(new Uint8Array(ciphertext))}`;
};

const decryptJson = async <T>(token: string | undefined | null): Promise<T | null> => {
  if (!token) {
    return null;
  }

  const [ivPart, ciphertextPart] = token.split(".");
  if (!ivPart || !ciphertextPart) {
    return null;
  }

  try {
    const key = await importEncryptionKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlDecodeBytes(ivPart) },
      key,
      base64UrlDecodeBytes(ciphertextPart),
    );
    return JSON.parse(decoder.decode(plaintext)) as T;
  } catch {
    return null;
  }
};

export const normalizeNextPath = (value: string | null | undefined) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/";

export const createTeacherSsoState = async (nextPath: string, issuedAt = Date.now()) => {
  const payload: TeacherSsoStatePayload = {
    state: randomState(),
    nextPath: normalizeNextPath(nextPath),
    issuedAt,
  };

  return {
    payload,
    token: await encryptJson(payload),
  };
};

export const getTeacherSsoStatePayload = async (
  token: string | undefined | null,
  now = Date.now(),
): Promise<TeacherSsoStatePayload | null> => {
  const payload = await decryptJson<TeacherSsoStatePayload>(token);
  if (
    !payload ||
    typeof payload.state !== "string" ||
    typeof payload.nextPath !== "string" ||
    typeof payload.issuedAt !== "number"
  ) {
    return null;
  }

  if (payload.issuedAt > now || now - payload.issuedAt > TEACHER_SSO_STATE_MAX_AGE_SECONDS * 1000) {
    return null;
  }

  return {
    state: payload.state,
    nextPath: normalizeNextPath(payload.nextPath),
    issuedAt: payload.issuedAt,
  };
};

export const getPortalBaseUrl = (request: NextRequest) => {
  const configured = process.env.CS201_PORTAL_BASE_URL?.replace(/\/+$/, "");
  if (configured) {
    return configured;
  }

  return request.nextUrl.origin;
};

export const getTeacherSsoRedirectUri = (request: NextRequest) =>
  `${getPortalBaseUrl(request)}/api/auth/teacher/callback`;

export const buildTeacherAuthorizeUrl = (request: NextRequest, state: string) => {
  const url = new URL("/portal-sso/authorize/", getTeacherSsoBaseUrl());
  url.searchParams.set("client_id", getTeacherSsoClientId());
  url.searchParams.set("redirect_uri", getTeacherSsoRedirectUri(request));
  url.searchParams.set("state", state);
  return url;
};

const normalizeExpiresAt = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 10_000_000_000 ? value * 1000 : value;
  }

  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return Number.NaN;
};

export const createTeacherSessionToken = async (payload: TeacherSessionPayload) => encryptJson(payload);

export const getTeacherSessionPayload = async (
  token: string | undefined | null,
  now = Date.now(),
): Promise<TeacherSessionPayload | null> => {
  const payload = await decryptJson<TeacherSessionPayload>(token);
  if (
    !payload ||
    typeof payload.username !== "string" ||
    typeof payload.accessToken !== "string" ||
    typeof payload.expiresAt !== "number" ||
    typeof payload.issuedAt !== "number"
  ) {
    return null;
  }

  if (payload.issuedAt > now || payload.expiresAt <= now) {
    return null;
  }

  return {
    username: payload.username,
    displayName: typeof payload.displayName === "string" ? payload.displayName : undefined,
    accessToken: payload.accessToken,
    expiresAt: payload.expiresAt,
    issuedAt: payload.issuedAt,
  };
};

export const getTeacherSessionFromRequest = async (request: NextRequest, now = Date.now()) =>
  getTeacherSessionPayload(request.cookies.get(TEACHER_SESSION_COOKIE)?.value, now);

export const exchangeTeacherSsoCode = async (
  code: string,
  redirectUri: string,
  now = Date.now(),
): Promise<TeacherSessionPayload> => {
  const clientSecret = getTeacherSsoClientSecret();
  if (!clientSecret) {
    throw new Error("TEACHER_SSO_CLIENT_SECRET is required for teacher SSO.");
  }

  const response = await fetch(new URL("/portal-sso/token/", getTeacherSsoBaseUrl()), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: getTeacherSsoClientId(),
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Teacher SSO token exchange failed: ${response.status}`);
  }

  const payload = (await response.json()) as TeacherTokenResponse;
  const expiresAt = normalizeExpiresAt(payload.expiresAt);
  if (
    typeof payload.username !== "string" ||
    typeof payload.accessToken !== "string" ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= now
  ) {
    throw new Error("Teacher SSO token response is invalid.");
  }

  return {
    username: payload.username,
    displayName: typeof payload.displayName === "string" ? payload.displayName : undefined,
    accessToken: payload.accessToken,
    expiresAt,
    issuedAt: now,
  };
};
