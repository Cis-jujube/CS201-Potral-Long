import { inferCourseSitePlacements } from "@/lib/course-site/placement";
import type { CourseSiteLink, CourseSiteLinkType, CourseSiteTable } from "@/lib/course-site/types";

export const classifyCourseSiteLink = (href: string, text = ""): CourseSiteLinkType => {
  const value = `${href} ${text}`.toLowerCase();
  const hrefValue = href.toLowerCase();
  if (/(youtube|youtu\.be|panopto|zoom|video|lecture video|\.mp4|\.mov|\.webm)/.test(value)) {
    return "video";
  }

  if (/\.(pdf|zip|tar|gz|ipynb|py|java|txt|csv|xlsx|docx|pptx|md|png|jpg|jpeg|gif|svg)(\?|$)/.test(hrefValue)) {
    return "download";
  }

  try {
    const url = new URL(href);
    if (url.origin === "http://repolab.colab.duke.edu:8005" && url.pathname.startsWith("/courses/proxy/cs201/")) {
      return "internal";
    }
  } catch {
    return "internal";
  }

  return "external";
};

const textOf = (node: Element | null) => node?.textContent?.replace(/\s+/g, " ").trim() ?? "";

export const parseCourseSiteFixture = (html: string, url: string) => {
  const document = new DOMParser().parseFromString(html, "text/html");
  const root = document.querySelector("main") ?? document.body;
  const title = textOf(root.querySelector("h1")) || textOf(document.querySelector("title")) || "Untitled Course Page";
  const headings = [...root.querySelectorAll("h1,h2,h3")].map(textOf).filter(Boolean);
  const links = [...root.querySelectorAll("a[href]")].reduce<CourseSiteLink[]>((accumulator, anchor) => {
    const rawHref = anchor.getAttribute("href") ?? "";
    const href = new URL(rawHref, url).toString();
    if (accumulator.some((link) => link.href === href)) {
      return accumulator;
    }

    const text = textOf(anchor);
    const rawType = classifyCourseSiteLink(rawHref, text);
    accumulator.push({ text, href, type: rawType === "download" ? rawType : classifyCourseSiteLink(href, text) });
    return accumulator;
  }, []);
  const tables = [...root.querySelectorAll("table")].map<CourseSiteTable>((table) => {
    const rows = [...table.querySelectorAll("tr")].map((row) => [...row.querySelectorAll("th,td")].map(textOf));
    return {
      headers: rows[0] ?? [],
      rows: rows.slice(1),
    };
  });
  const bodyText = root.textContent ?? "";

  return {
    title,
    headings,
    links,
    tables,
    placements: inferCourseSitePlacements(`${title} ${headings.join(" ")} ${bodyText}`),
  };
};
