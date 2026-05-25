const INSECURE_COOKIE_TRUE_VALUES = new Set(["1", "true", "yes"]);

export const shouldUseSecureCookies = () => {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const allowInsecure = process.env.CS201_ALLOW_INSECURE_COOKIES?.trim().toLowerCase();
  return !INSECURE_COOKIE_TRUE_VALUES.has(allowInsecure ?? "");
};
