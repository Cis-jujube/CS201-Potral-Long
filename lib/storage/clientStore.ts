const isBrowser = typeof window !== "undefined";

const safeRead = (key: string) => {
  if (!isBrowser) {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const readString = (key: string, fallback: string) => {
  const value = safeRead(key);
  return value ?? fallback;
};

export const readNumber = (key: string, fallback: number) => {
  const value = safeRead(key);
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const readStringArray = (key: string, fallback: string[]) => {
  const value = safeRead(key);
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    return parsed.filter((item) => typeof item === "string");
  } catch {
    return fallback;
  }
};

export const readStringRecord = (key: string, fallback: Record<string, string>) => {
  const value = safeRead(key);
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallback;
    }

    return Object.entries(parsed).reduce<Record<string, string>>((accumulator, [entryKey, entryValue]) => {
      if (typeof entryValue === "string") {
        accumulator[entryKey] = entryValue;
      }
      return accumulator;
    }, {});
  } catch {
    return fallback;
  }
};

export const writeValue = (
  key: string,
  value: string | number | string[] | Record<string, string>,
) => {
  if (!isBrowser) {
    return;
  }

  try {
    const shouldStringify =
      Array.isArray(value) || (typeof value === "object" && value !== null);
    const serialized = shouldStringify ? JSON.stringify(value) : String(value);
    window.localStorage.setItem(key, serialized);
  } catch {
    // ignore write failures in private mode or restricted environments
  }
};
