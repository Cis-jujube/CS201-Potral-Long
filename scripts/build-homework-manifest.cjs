#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const archivePath = path.join(projectRoot, "data", "course-site", "normalized.json");
const rawDir = path.join(projectRoot, "data", "course-site", "raw");
const outputDir = path.join(projectRoot, "data", "homework");
const outputPath = path.join(outputDir, "manifest.json");

const decodeHtml = (value) =>
  String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

const stripTags = (value) => decodeHtml(String(value || "").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();

const rawFileForPage = (pageId) => path.join(rawDir, `${pageId}.html`);

const getHwNumberFromId = (id) => {
  const match = id.match(/jpax-HW(\d+)-/);
  return match ? Number(match[1]) : null;
};

const getHwId = (number) => `hw${number}`;

const parseScheduleDate = (value) => {
  const match = String(value || "").match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    return undefined;
  }

  return `${match[2]}-${match[3]}-${match[4]}T23:59:00.000Z`;
};

const collectScheduleHomework = (schedulePage) => {
  const map = new Map();

  schedulePage.tables.slice(1).forEach((table, weekIndex) => {
    table.rows.forEach((row) => {
      const [session, date, , topic, , assignment] = row;
      const matches = String(assignment || "").matchAll(/hw\s*(\d+)/gi);
      for (const match of matches) {
        const number = Number(match[1]);
        map.set(number, {
          week: weekIndex + 1,
          session: Number(session),
          topic,
          recommendedDate: parseScheduleDate(date),
          scheduleLabel: assignment,
        });
      }
    });
  });

  return map;
};

const parseRawSections = (page) => {
  const filePath = rawFileForPage(page.id);
  if (!fs.existsSync(filePath)) {
    return { sections: [], codeBlocks: [] };
  }

  const html = fs.readFileSync(filePath, "utf8");
  const main = html.match(/<main>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  const tokenPattern =
    /<h([1-4])[^>]*>([\s\S]*?)<\/h\1>|<p>([\s\S]*?)<\/p>|<li>([\s\S]*?)<\/li>|<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/gi;
  const sections = [];
  const codeBlocks = [];
  let currentSection = null;

  const ensureSection = (heading) => {
    const normalizedHeading = heading || "Details";
    if (!currentSection || currentSection.heading !== normalizedHeading) {
      currentSection = { heading: normalizedHeading, items: [] };
      sections.push(currentSection);
    }
    return currentSection;
  };

  for (const match of main.matchAll(tokenPattern)) {
    if (match[2]) {
      const heading = stripTags(match[2]);
      ensureSection(heading);
      continue;
    }

    if (match[6] !== undefined) {
      const language = match[5] || "text";
      const text = decodeHtml(match[6]).trim();
      if (text) {
        const block = { language, text };
        codeBlocks.push(block);
        ensureSection(currentSection?.heading).items.push({ type: "code", language, text });
      }
      continue;
    }

    const text = stripTags(match[3] ?? match[4]);
    if (text) {
      ensureSection(currentSection?.heading).items.push({ type: "text", text });
    }
  }

  return {
    sections: sections.filter((section) => !/^files to be submitted$/i.test(section.heading)),
    codeBlocks,
  };
};

const filesToSubmit = (page) => {
  const files = page.tables
    .filter((table) => table.headers.some((header) => /^files?$/i.test(header)))
    .flatMap((table) => table.rows.flat())
    .filter(Boolean);

  return [...new Set(files)];
};

const buildQuestion = (page, index) => {
  const parsed = parseRawSections(page);
  const metadata = page.blocks
    .filter((block) => block.heading === page.title && /:/.test(block.text))
    .map((block) => block.text);

  return {
    id: page.id,
    label: `Q${index + 1}`,
    title: page.title,
    sourceHref: page.url,
    metadata,
    sections: parsed.sections,
    codeBlocks: parsed.codeBlocks,
    filesToSubmit: filesToSubmit(page),
  };
};

const main = () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const archive = JSON.parse(fs.readFileSync(archivePath, "utf8"));
  const schedulePage = archive.pages.find((page) => page.id === "courses-proxy-cs201-schedule-html");
  const scheduleMap = collectScheduleHomework(schedulePage);

  const homeworkPages = archive.pages
    .filter((page) => /^courses-proxy-cs201-jpax-HW\d+-HW\d+-html$/.test(page.id))
    .sort((left, right) => getHwNumberFromId(left.id) - getHwNumberFromId(right.id));

  const exercisePagesByPath = new Map(
    archive.pages
      .filter((page) => /courses-proxy-cs201-jpax-HW\d+-E-/.test(page.id))
      .map((page) => [page.navigationPath[0], page]),
  );

  const homeworkByNumber = new Map();

  homeworkPages.forEach((page) => {
    const number = getHwNumberFromId(page.id);
    const schedule = scheduleMap.get(number);
    const exerciseNames = page.links
      .map((link) => link.text)
      .filter((text) => /^E-/.test(text));
    const questions = exerciseNames
      .map((name) => exercisePagesByPath.get(name))
      .filter(Boolean)
      .map(buildQuestion);

    homeworkByNumber.set(number, {
      id: getHwId(number),
      number,
      week: schedule?.week ?? Math.min(7, Math.max(1, Math.ceil((number || 1) / 3))),
      title: `HW${number}`,
      sourceHref: page.url,
      recommendedDate: schedule?.recommendedDate,
      scheduleLabel: schedule?.scheduleLabel,
      topic: schedule?.topic,
      available: true,
      questions,
    });
  });

  scheduleMap.forEach((schedule, number) => {
    if (!homeworkByNumber.has(number)) {
      homeworkByNumber.set(number, {
        id: getHwId(number),
        number,
        week: schedule.week,
        title: `HW${number}`,
        recommendedDate: schedule.recommendedDate,
        scheduleLabel: schedule.scheduleLabel,
        topic: schedule.topic,
        available: false,
        questions: [],
      });
    }
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceArchive: "data/course-site/normalized.json",
    homeworks: [...homeworkByNumber.values()].sort((left, right) => left.number - right.number),
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Wrote ${manifest.homeworks.length} homework entries to ${outputPath}`);
};

main();
