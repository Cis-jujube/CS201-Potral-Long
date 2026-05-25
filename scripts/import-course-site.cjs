#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs/promises");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_ROOT = path.join(PROJECT_ROOT, "data", "course-site");
const RAW_ROOT = path.join(OUTPUT_ROOT, "raw");
const ASSET_ROOT = path.join(RAW_ROOT, "assets");
const NORMALIZED_PATH = path.join(OUTPUT_ROOT, "normalized.json");
const COURSE_URL = process.env.COURSE_SITE_URL ?? "http://repolab.colab.duke.edu:8005/courses/proxy/cs201/index.html";
const LOGIN_URL = process.env.COURSE_SITE_LOGIN_URL ?? "http://repolab.colab.duke.edu:8005/login/";
const USERNAME = process.env.COURSE_SITE_USERNAME;
const PASSWORD = process.env.COURSE_SITE_PASSWORD;
const WHITEBOARD_IMAGE = process.env.COURSE_SITE_WHITEBOARD_IMAGE;
const MAX_PAGES = Number(process.env.COURSE_SITE_MAX_PAGES ?? 300);
const MAX_ASSET_BYTES = Number(process.env.COURSE_SITE_MAX_ASSET_BYTES ?? 2 * 1024 * 1024);

const cookieJar = new Map();

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const cookieHeader = () =>
  [...cookieJar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");

const storeCookies = (headers) => {
  const setCookie = headers.getSetCookie ? headers.getSetCookie() : [];
  for (const value of setCookie) {
    const first = value.split(";")[0];
    const index = first.indexOf("=");
    if (index > 0) {
      cookieJar.set(first.slice(0, index), first.slice(index + 1));
    }
  }
};

const fetchWithCookies = async (url, options = {}) => {
  const headers = new Headers(options.headers ?? {});
  const cookies = cookieHeader();
  if (cookies) {
    headers.set("cookie", cookies);
  }

  const response = await fetch(url, {
    redirect: "manual",
    ...options,
    headers,
  });
  storeCookies(response.headers);
  return response;
};

const followRedirect = async (response, baseUrl) => {
  if (![301, 302, 303, 307, 308].includes(response.status)) {
    return response;
  }

  const location = response.headers.get("location");
  if (!location) {
    return response;
  }

  return fetchWithCookies(new URL(location, baseUrl).toString());
};

const htmlToText = (node) => {
  if (!node) {
    return "";
  }
  return node.textContent.replace(/\s+/g, " ").trim();
};

const stableId = (url) => {
  const parsed = new URL(url);
  const raw = `${parsed.pathname}${parsed.search}`.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return raw || "index";
};

const saveRawHtml = async (url, html) => {
  const fileName = `${stableId(url)}.html`;
  await fs.writeFile(path.join(RAW_ROOT, fileName), html, "utf8");
  return fileName;
};

const isLoginPage = (html) => {
  const dom = new JSDOM(html);
  return Boolean(dom.window.document.querySelector('input[name="username"], input[name="password"]'));
};

const login = async () => {
  if (!USERNAME || !PASSWORD) {
    throw new Error("COURSE_SITE_USERNAME and COURSE_SITE_PASSWORD are required for authenticated import.");
  }

  const loginPageResponse = await fetchWithCookies(LOGIN_URL);
  const loginPage = await loginPageResponse.text();
  const dom = new JSDOM(loginPage);
  const token = dom.window.document.querySelector('input[name="csrfmiddlewaretoken"]')?.getAttribute("value") ?? "";
  const form = new URLSearchParams();
  form.set("username", USERNAME);
  form.set("password", PASSWORD);
  if (token) {
    form.set("csrfmiddlewaretoken", token);
  }

  const response = await fetchWithCookies(LOGIN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: LOGIN_URL,
      ...(token ? { "x-csrftoken": token } : {}),
    },
    body: form,
  });

  await followRedirect(response, LOGIN_URL);
};

const normalizeUrl = (href, baseUrl) => {
  try {
    const url = new URL(href, baseUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
};

const isCourseUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.origin === new URL(COURSE_URL).origin && parsed.pathname.startsWith("/courses/proxy/cs201/");
  } catch {
    return false;
  }
};

const isCoursePageUrl = (url) => {
  if (!isCourseUrl(url)) {
    return false;
  }
  const pathname = new URL(url).pathname.toLowerCase();
  return pathname.endsWith("/") || pathname.endsWith(".html") || !path.extname(pathname);
};

const classifyLink = (href, text) => {
  const value = `${href} ${text}`.toLowerCase();
  const hrefValue = href.toLowerCase();
  if (/(youtube|youtu\.be|panopto|zoom|video|lecture video|\.mp4|\.mov|\.webm)/.test(value)) {
    return "video";
  }
  if (/\.(pdf|zip|tar|gz|ipynb|py|java|txt|csv|xlsx|docx|pptx|md|png|jpg|jpeg|gif|svg)(\?|$)/.test(hrefValue)) {
    return "download";
  }
  if (isCourseUrl(href)) {
    return "internal";
  }
  return "external";
};

const inferPlacements = (input) => {
  const value = input.toLowerCase();
  const placements = new Set();
  const hasAny = (terms) => terms.some((term) => value.includes(term));
  const hasPattern = (pattern) => pattern.test(value);

  if (
    hasAny(["setting up environment", "auto-grading", "auto grading", "hw git repo", "git repo"]) ||
    hasPattern(/\bsag\b|\bworking with sag\b|\bsag error\b/)
  ) {
    placements.add("sag");
  }
  if (hasAny(["homework", "hw ", "hw-", "lab session", "lab material", "assignment", "git repo"])) {
    placements.add("homework");
  }
  if (
    hasAny([
      "textbook",
      "lecture video",
      "video",
      "animation",
      "course supplement",
      "quick guide",
      "resource",
      "slides",
    ])
  ) {
    placements.add("resources");
  }
  if (hasAny(["exam policy", "final assessment", "midterm"]) || hasPattern(/\bexams?\b/)) {
    placements.add("exams");
  }
  if (hasAny(["staff", "hours", "location", "grading", "policy", "faq", "flex-weighted"])) {
    placements.add("faq");
  }
  if (hasAny(["follow up", "follow-up", "course description", "schedule", "compsci 201", "intro to programming"])) {
    placements.add("home");
  }

  return placements.size > 0 ? [...placements] : ["archive"];
};

const getContentRoot = (document) => {
  const root =
    document.querySelector("main") ??
    document.querySelector("article") ??
    document.querySelector(".content") ??
    document.querySelector(".page") ??
    document.body;
  const clone = root.cloneNode(true);
  clone.querySelectorAll("script, style, nav, header, footer, .sidebar, .toc, .wy-nav-side").forEach((node) => node.remove());
  return clone;
};

const parseTables = (root) =>
  [...root.querySelectorAll("table")].map((table) => {
    const headers = [...table.querySelectorAll("thead th")].map(htmlToText);
    const bodyRows = [...table.querySelectorAll("tbody tr")];
    const rows = (bodyRows.length > 0 ? bodyRows : [...table.querySelectorAll("tr")]).map((row) =>
      [...row.querySelectorAll("th,td")].map(htmlToText),
    );

    if (headers.length === 0 && rows.length > 0) {
      return {
        caption: htmlToText(table.querySelector("caption")) || undefined,
        headers: rows[0],
        rows: rows.slice(1),
      };
    }

    return {
      caption: htmlToText(table.querySelector("caption")) || undefined,
      headers,
      rows,
    };
  });

const parseBlocks = (root) => {
  const blocks = [];
  let currentHeading = "";
  for (const node of [...root.querySelectorAll("h1,h2,h3,h4,p,li")]) {
    const tag = node.tagName.toLowerCase();
    const text = htmlToText(node);
    if (!text) {
      continue;
    }
    if (/^h[1-4]$/.test(tag)) {
      currentHeading = text;
    } else {
      blocks.push({ heading: currentHeading || undefined, text });
    }
  }
  return blocks;
};

const parsePage = (url, html, navTitleByUrl) => {
  const dom = new JSDOM(html, { url });
  const { document } = dom.window;
  const root = getContentRoot(document);
  const headings = [...root.querySelectorAll("h1,h2,h3,h4")].map(htmlToText).filter(Boolean);
  const title = headings[0] || htmlToText(document.querySelector("title")) || navTitleByUrl.get(url) || "Untitled Course Page";
  const links = [];
  const seenLinks = new Set();

  for (const anchor of [...root.querySelectorAll("a[href]")]) {
    const normalized = normalizeUrl(anchor.getAttribute("href"), url);
    if (!normalized || seenLinks.has(normalized)) {
      continue;
    }
    seenLinks.add(normalized);
    const text = htmlToText(anchor) || normalized;
    links.push({ text, href: normalized, type: classifyLink(normalized, text) });
  }

  const navigationLabel = navTitleByUrl.get(url);
  const textForPlacement = [title, navigationLabel, headings.join(" "), root.textContent].join(" ");

  return {
    id: stableId(url),
    title,
    url,
    navigationPath: navigationLabel ? [navigationLabel] : [title],
    headings,
    blocks: parseBlocks(root).slice(0, 80),
    tables: parseTables(root),
    links,
    placements: inferPlacements(textForPlacement),
  };
};

const extractNavLinks = (html, baseUrl) => {
  const dom = new JSDOM(html, { url: baseUrl });
  const { document } = dom.window;
  const candidates = [
    ...document.querySelectorAll("nav a[href], aside a[href], .sidebar a[href], .toc a[href], .wy-menu a[href], a[href]"),
  ];
  const links = [];
  const seen = new Set();
  for (const anchor of candidates) {
    const normalized = normalizeUrl(anchor.getAttribute("href"), baseUrl);
    if (!normalized || !isCoursePageUrl(normalized) || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    links.push({ url: normalized, label: htmlToText(anchor) });
  }
  return links;
};

const downloadSmallAssets = async (page) => {
  for (const link of page.links.filter((item) => item.type === "download")) {
    try {
      const head = await fetchWithCookies(link.href, { method: "HEAD" });
      const length = Number(head.headers.get("content-length") ?? "0");
      if (length > MAX_ASSET_BYTES) {
        continue;
      }
      const response = await fetchWithCookies(link.href);
      if (!response.ok) {
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_ASSET_BYTES) {
        continue;
      }
      const parsed = new URL(link.href);
      const fileName = `${stableId(link.href)}${path.extname(parsed.pathname) || ".bin"}`;
      await fs.writeFile(path.join(ASSET_ROOT, fileName), buffer);
    } catch {
      // Download links are preserved even if local asset capture fails.
    }
  }
};

const copyWhiteboard = async () => {
  if (!WHITEBOARD_IMAGE) {
    return undefined;
  }
  try {
    const ext = path.extname(WHITEBOARD_IMAGE) || ".jpg";
    const targetDir = path.join(OUTPUT_ROOT, "whiteboard");
    await ensureDir(targetDir);
    const target = path.join(targetDir, `sag-workflow-whiteboard${ext}`);
    await fs.copyFile(WHITEBOARD_IMAGE, target);
    return "data/course-site/whiteboard/sag-workflow-whiteboard" + ext;
  } catch {
    return undefined;
  }
};

const main = async () => {
  await fs.rm(RAW_ROOT, { recursive: true, force: true });
  await ensureDir(RAW_ROOT);
  await ensureDir(ASSET_ROOT);

  await login();

  const firstResponse = await fetchWithCookies(COURSE_URL);
  const firstHtml = await firstResponse.text();
  if (isLoginPage(firstHtml)) {
    throw new Error("Course site still returned the login page after authentication.");
  }

  const queue = [COURSE_URL];
  const seen = new Set();
  const pages = [];
  const failedUrls = [];
  const navTitleByUrl = new Map();

  for (const link of extractNavLinks(firstHtml, COURSE_URL)) {
    navTitleByUrl.set(link.url, link.label);
    queue.push(link.url);
  }

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift();
    if (!url || seen.has(url) || !isCoursePageUrl(url)) {
      continue;
    }
    seen.add(url);

    try {
      const response = url === COURSE_URL ? firstResponse : await fetchWithCookies(url);
      const html = url === COURSE_URL ? firstHtml : await response.text();
      if (!response.ok || isLoginPage(html)) {
        failedUrls.push({ url, reason: `HTTP ${response.status}` });
        continue;
      }

      await saveRawHtml(url, html);
      for (const link of extractNavLinks(html, url)) {
        navTitleByUrl.set(link.url, navTitleByUrl.get(link.url) ?? link.label);
        if (!seen.has(link.url)) {
          queue.push(link.url);
        }
      }

      const page = parsePage(url, html, navTitleByUrl);
      await downloadSmallAssets(page);
      pages.push(page);
    } catch (error) {
      failedUrls.push({ url, reason: error instanceof Error ? error.message : "Unknown import error" });
    }
  }

  const imagePath = await copyWhiteboard();
  const archive = {
    generatedAt: new Date().toISOString(),
    sourceUrl: COURSE_URL,
    pages,
    failedUrls,
    whiteboard: {
      ...(imagePath ? { imagePath } : {}),
      summary:
        "Whiteboard notes emphasize SAG as the submission and feedback hub connected to repository, report, lab, code HTML, setup instructions, and data inputs.",
      workflow: [
        "Start from SAG as the visible submission and feedback entry point.",
        "Connect SAG outcomes to repository, report, code HTML, and lab resources.",
        "Use setup instructions and data inputs as the base layer for the workflow.",
        "Keep error FAQ and retry guidance close to the SAG workflow.",
      ],
    },
  };

  await fs.writeFile(path.join(RAW_ROOT, "manifest.json"), JSON.stringify({ sourceUrl: COURSE_URL, pages, failedUrls }, null, 2));
  await fs.writeFile(NORMALIZED_PATH, JSON.stringify(archive, null, 2), "utf8");
  console.log(`Imported ${pages.length} pages with ${failedUrls.length} failures.`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(() => {
  process.exit(process.exitCode ?? 0);
});
