import {
  PORTAL_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getSessionPayload,
  isRestrictedPortalSession,
  isValidPortalLogin,
  verifySessionToken,
} from "@/lib/auth/session";

describe("portal session auth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CS201_PORTAL_USERNAME: "student",
      CS201_PORTAL_PASSWORD: "secret",
      CS201_PORTAL_SESSION_SECRET: "test-session-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("validates configured credentials", () => {
    expect(isValidPortalLogin("student", "secret")).toBe(true);
    expect(isValidPortalLogin("student", "wrong")).toBe(false);
  });

  it("validates multiple configured users", () => {
    process.env.CS201_PORTAL_USERS = "jujube:20260427,baba:20260427";

    expect(isValidPortalLogin("jujube", "20260427")).toBe(true);
    expect(isValidPortalLogin("baba", "20260427")).toBe(true);
    expect(isValidPortalLogin("student", "secret")).toBe(false);
  });

  it("creates and verifies a signed session token", async () => {
    process.env.CS201_PORTAL_USERS = "jujube:20260427,baba:20260427";
    const issuedAt = Date.UTC(2026, 2, 17, 12);
    const token = await createSessionToken("jujube", issuedAt);

    await expect(verifySessionToken(token, issuedAt + 1000)).resolves.toBe(true);
    await expect(getSessionPayload(token, issuedAt + 1000)).resolves.toMatchObject({ username: "jujube" });
  });

  it("allows signed teacher SSO session users that are not local portal credentials", async () => {
    process.env.CS201_PORTAL_USERS = "local:secret";
    const issuedAt = Date.UTC(2026, 2, 17, 12);
    const token = await createSessionToken("teacher-netid", issuedAt, "teacher");

    await expect(verifySessionToken(token, issuedAt + 1000)).resolves.toBe(true);
    await expect(getSessionPayload(token, issuedAt + 1000)).resolves.toMatchObject({
      username: "teacher-netid",
      authSource: "teacher",
    });
  });

  it("marks configured local-only test users as restricted without restricting teacher SSO users", () => {
    process.env.CS201_RESTRICTED_LOCAL_USERS = "test,preview";

    expect(isRestrictedPortalSession({ username: "test", issuedAt: Date.now(), authSource: "local" })).toBe(true);
    expect(isRestrictedPortalSession({ username: "preview", issuedAt: Date.now() })).toBe(true);
    expect(isRestrictedPortalSession({ username: "student", issuedAt: Date.now(), authSource: "local" })).toBe(false);
    expect(isRestrictedPortalSession({ username: "test", issuedAt: Date.now(), authSource: "teacher" })).toBe(false);
  });

  it("rejects tampered and expired tokens", async () => {
    const issuedAt = Date.UTC(2026, 2, 17, 12);
    const token = await createSessionToken("student", issuedAt);
    const [payload] = token.split(".");
    const expiredNow = issuedAt + PORTAL_SESSION_MAX_AGE_SECONDS * 1000 + 1;

    await expect(verifySessionToken(`${payload}.bad-signature`, issuedAt + 1000)).resolves.toBe(false);
    await expect(verifySessionToken(token, expiredNow)).resolves.toBe(false);
  });
});
