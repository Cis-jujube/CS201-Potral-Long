import { parseQuizProblemPage } from "@/lib/quiz/parser";

export interface QuizCredential {
  username: string;
  password: string;
}

export interface QuizSession {
  baseUrl: string;
  request: (pathOrUrl: string, init?: RequestInit) => Promise<Response>;
}

const DEFAULT_QUIZ_BASE_URL = "http://10.200.20.79:8005";

const splitSetCookieHeader = (value: string) => value.split(/,(?=\s*[^;,]+=)/g).map((entry) => entry.trim());

class CookieJar {
  private readonly cookies = new Map<string, string>();

  store(response: Response) {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookieHeaders = headers.getSetCookie?.() ?? splitSetCookieHeader(response.headers.get("set-cookie") ?? "");

    setCookieHeaders.filter(Boolean).forEach((header) => {
      const [pair] = header.split(";");
      const separatorIndex = pair.indexOf("=");
      if (separatorIndex > 0) {
        this.cookies.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
      }
    });
  }

  header() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

export const getQuizBaseUrl = () => (process.env.CS201_QUIZ_BASE_URL || DEFAULT_QUIZ_BASE_URL).replace(/\/+$/, "");

export const getQuizCredentialForPortalUser = (portalUsername: string): QuizCredential | null => {
  const raw = process.env.CS201_QUIZ_USER_MAP;
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<QuizCredential> | undefined>;
    const credential = parsed[portalUsername];
    if (typeof credential?.username === "string" && typeof credential.password === "string") {
      return { username: credential.username, password: credential.password };
    }
  } catch {
    return null;
  }

  return null;
};

const extractCsrfToken = (html: string) =>
  html.match(/name=["']csrfmiddlewaretoken["'][^>]*value=["']([^"']+)["']/i)?.[1] ??
  html.match(/value=["']([^"']+)["'][^>]*name=["']csrfmiddlewaretoken["']/i)?.[1];

export const createQuizSession = async (credential: QuizCredential, baseUrl = getQuizBaseUrl()): Promise<QuizSession> => {
  const jar = new CookieJar();

  const request = async (pathOrUrl: string, init: RequestInit = {}, redirects = 5): Promise<Response> => {
    const url = new URL(pathOrUrl, baseUrl);
    const headers = new Headers(init.headers);
    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
    });
    jar.store(response);

    if (response.status >= 300 && response.status < 400 && redirects > 0) {
      const location = response.headers.get("location");
      if (location) {
        return request(location, { method: "GET" }, redirects - 1);
      }
    }

    return response;
  };

  const loginPage = await request("/signin?next=/cs201/assignment/");
  const loginHtml = await loginPage.text();
  const csrfToken = extractCsrfToken(loginHtml);
  if (!csrfToken) {
    throw new Error("Quiz login page did not include a CSRF token.");
  }

  const body = new URLSearchParams({
    username: credential.username,
    pass1: credential.password,
    csrfmiddlewaretoken: csrfToken,
  });

  const loginResponse = await request("/signin?next=/cs201/assignment/", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: `${baseUrl}/signin?next=/cs201/assignment/`,
    },
    body,
  });

  const loginResultHtml = await loginResponse.clone().text();
  if (!loginResponse.ok || /name=["']pass1["']/i.test(loginResultHtml)) {
    throw new Error("Quiz login failed.");
  }

  return { baseUrl, request };
};

export const createQuizAccessTokenSession = (
  accessToken: string,
  baseUrl = getQuizBaseUrl(),
): QuizSession => {
  const jar = new CookieJar();

  const request = async (pathOrUrl: string, init: RequestInit = {}, redirects = 5): Promise<Response> => {
    const url = new URL(pathOrUrl, baseUrl);
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${accessToken}`);
    const cookieHeader = jar.header();
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
    });
    jar.store(response);

    if (response.status >= 300 && response.status < 400 && redirects > 0) {
      const location = response.headers.get("location");
      if (location) {
        return request(location, { method: "GET" }, redirects - 1);
      }
    }

    return response;
  };

  return { baseUrl, request };
};

export const fetchParsedQuizProblem = async (session: QuizSession, sourceHref: string) => {
  const response = await session.request(sourceHref);
  if (!response.ok) {
    throw new Error(`Quiz problem fetch failed: ${response.status}`);
  }

  const html = await response.text();
  return parseQuizProblemPage(html, sourceHref, session.baseUrl);
};
