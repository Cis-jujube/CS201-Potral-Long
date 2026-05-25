import { shouldUseSecureCookies } from "@/lib/auth/cookies";

describe("auth cookie policy", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses secure cookies by default in production", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      CS201_ALLOW_INSECURE_COOKIES: "",
    };

    expect(shouldUseSecureCookies()).toBe(true);
  });

  it("allows an explicit HTTP-only VM deployment override", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      CS201_ALLOW_INSECURE_COOKIES: "true",
    };

    expect(shouldUseSecureCookies()).toBe(false);
  });

  it("keeps local development cookies non-secure", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "development",
    };

    expect(shouldUseSecureCookies()).toBe(false);
  });
});
