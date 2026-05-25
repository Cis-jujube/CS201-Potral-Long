#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(projectRoot, "..");

const archivePath = path.join(projectRoot, "data", "course-site", "normalized.json");
const manifestDir = path.join(projectRoot, "data", "course-materials");
const manifestPath = path.join(manifestDir, "manifest.json");

const slideSourceDir = path.join(workspaceRoot, "Slide");
const labSourceDir = path.join(workspaceRoot, "Lab");
const importedAssetsDir = path.join(projectRoot, "data", "course-site", "raw", "assets");

const publicLectureDir = path.join(projectRoot, "public", "course-materials", "lecture");
const publicLabDir = path.join(projectRoot, "public", "course-materials", "lab");
const publicAnswersDir = path.join(publicLabDir, "answers");

const COURSE_BASE_URL = "http://repolab.colab.duke.edu:8005";

const normalizeFileName = (value) =>
  path
    .basename(value || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

const slugify = (value, fallbackPrefix) => {
  const slug = String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 84);

  if (slug) {
    return slug;
  }

  const hash = crypto.createHash("sha1").update(String(value)).digest("hex").slice(0, 10);
  return `${fallbackPrefix}-${hash}`;
};

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const resetDir = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }

  ensureDir(dirPath);
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const listPdfFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
    .map((entry) => ({
      fileName: entry.name,
      path: path.join(dirPath, entry.name),
      normalized: normalizeFileName(entry.name),
    }));
};

const copyPdf = (sourcePath, targetDir, targetFileName) => {
  ensureDir(targetDir);
  const targetPath = path.join(targetDir, targetFileName);
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
};

const publicHref = (...segments) => `/course-materials/${segments.map(encodeURIComponent).join("/")}`;

const hrefBasename = (href) => {
  if (!href) {
    return "";
  }

  try {
    const url = new URL(href, COURSE_BASE_URL);
    return decodeURIComponent(path.posix.basename(url.pathname));
  } catch {
    return decodeURIComponent(path.posix.basename(href));
  }
};

const makeLinkMatcher = (links) => {
  const downloadLinks = links.filter((link) => link.type === "download");

  return (fileName) => {
    const exact = downloadLinks.find(
      (link) => link.text === fileName || hrefBasename(link.href).toLowerCase() === fileName.toLowerCase(),
    );

    if (exact) {
      return exact.href;
    }

    const normalized = normalizeFileName(fileName);
    return (
      downloadLinks.find((link) => normalizeFileName(hrefBasename(link.href)) === normalized)?.href ??
      downloadLinks.find((link) => normalizeFileName(link.text) === normalized)?.href
    );
  };
};

const findExactLocalPdf = (files, fileName) => {
  const normalized = normalizeFileName(fileName);
  return files.find((file) => file.fileName === fileName) ?? files.find((file) => file.normalized === normalized);
};

const findImportedPdfByHref = (files, href) => {
  const sourceBaseName = hrefBasename(href);
  const normalizedSource = normalizeFileName(sourceBaseName);

  if (!normalizedSource) {
    return undefined;
  }

  return (
    files.find((file) => file.normalized === normalizedSource) ??
    files.find((file) => file.normalized.includes(normalizedSource)) ??
    files.find((file) => normalizedSource.includes(file.normalized))
  );
};

const parseSlideFiles = (cellValue) =>
  String(cellValue || "")
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);

const parseWeekFromLabName = (fileName, fallbackWeek) => {
  const match = fileName.match(/week[_\s.-]*(\d+)/i);
  return match ? Number(match[1]) : fallbackWeek;
};

const createMaterialId = (kind, week, session, fileName) => {
  const sessionPart = session ? `session-${session}-` : "";
  return `${kind}-week-${week}-${sessionPart}${slugify(fileName, kind)}`;
};

const makeMaterialItem = ({
  kind,
  week,
  session,
  date,
  topic,
  title,
  fileName,
  assignment,
  sourceHref,
  publicHref: itemPublicHref,
  available,
  children,
}) => ({
  id: createMaterialId(kind, week, session, `${title}-${fileName}`),
  kind,
  week,
  ...(session ? { session } : {}),
  ...(date ? { date } : {}),
  ...(topic ? { topic } : {}),
  title,
  fileName,
  ...(assignment ? { assignment } : {}),
  ...(itemPublicHref ? { publicHref: itemPublicHref } : {}),
  ...(sourceHref ? { sourceHref } : {}),
  available,
  ...(children?.length ? { children } : {}),
});

const buildLectureItems = ({ schedulePage, slideFiles }) => {
  const findScheduleHref = makeLinkMatcher(schedulePage.links);
  const items = [];

  schedulePage.tables.slice(1).forEach((table, tableIndex) => {
    const week = tableIndex + 1;

    table.rows.forEach((row) => {
      const [sessionValue, date, reading, topic, slideCell, assignment] = row;
      const session = Number(sessionValue);
      const slideFilesInCell = parseSlideFiles(slideCell);

      slideFilesInCell.forEach((fileName) => {
        const sourceHref = findScheduleHref(fileName);
        const localFile = findExactLocalPdf(slideFiles, fileName);
        let itemPublicHref;

        if (localFile) {
          copyPdf(localFile.path, publicLectureDir, localFile.fileName);
          itemPublicHref = publicHref("lecture", localFile.fileName);
        }

        items.push(
          makeMaterialItem({
            kind: "lecture",
            week,
            session,
            date,
            topic,
            title: topic || fileName,
            fileName,
            assignment,
            sourceHref,
            publicHref: itemPublicHref,
            available: Boolean(itemPublicHref),
            children: reading ? [] : undefined,
          }),
        );
      });
    });
  });

  return items;
};

const findLabMaterialLinkIndexes = (labPage, materialNames) => {
  const indexes = [];

  materialNames.forEach((materialName) => {
    const normalizedMaterial = normalizeFileName(materialName);
    const index = labPage.links.findIndex(
      (link) =>
        link.type === "download" &&
        (link.text === materialName ||
          normalizeFileName(link.text) === normalizedMaterial ||
          normalizeFileName(hrefBasename(link.href)) === normalizedMaterial),
    );
    indexes.push(index);
  });

  return indexes;
};

const copyLabLikeFile = ({ sourceHref, fileName, localFiles, importedFiles, targetDir, hrefSegments }) => {
  const exactLocal = findExactLocalPdf(localFiles, fileName);

  if (exactLocal) {
    copyPdf(exactLocal.path, targetDir, fileName);
    return {
      available: true,
      publicHref: publicHref(...hrefSegments, fileName),
    };
  }

  const importedFile = findImportedPdfByHref(importedFiles, sourceHref);

  if (importedFile) {
    copyPdf(importedFile.path, targetDir, fileName);
    return {
      available: true,
      publicHref: publicHref(...hrefSegments, fileName),
    };
  }

  return {
    available: false,
    publicHref: undefined,
  };
};

const buildLabItems = ({ labPage, labFiles, importedFiles }) => {
  const labTable = labPage.tables[0];
  const materialNames = labTable.rows.map((row) => row[0]);
  const materialLinkIndexes = findLabMaterialLinkIndexes(labPage, materialNames);

  return labTable.rows.map((row, rowIndex) => {
    const [materialName] = row;
    const week = parseWeekFromLabName(materialName, rowIndex + 1);
    const materialLinkIndex = materialLinkIndexes[rowIndex];
    const nextMaterialLinkIndex =
      materialLinkIndexes.find((index, indexPosition) => indexPosition > rowIndex && index > materialLinkIndex) ??
      labPage.links.length;
    const materialLink = materialLinkIndex >= 0 ? labPage.links[materialLinkIndex] : undefined;
    const sourceHref = materialLink?.href;
    const labCopy = copyLabLikeFile({
      sourceHref,
      fileName: materialName,
      localFiles: labFiles,
      importedFiles,
      targetDir: publicLabDir,
      hrefSegments: ["lab"],
    });

    const answerLinks =
      materialLinkIndex >= 0
        ? labPage.links
            .slice(materialLinkIndex + 1, nextMaterialLinkIndex)
            .filter((link) => link.type === "download" && /answer/i.test(`${link.text} ${link.href}`))
        : [];

    const children = answerLinks.map((answerLink, answerIndex) => {
      const answerFileName = hrefBasename(answerLink.href) || `${materialName}.answer-${answerIndex + 1}.pdf`;
      const answerCopy = copyLabLikeFile({
        sourceHref: answerLink.href,
        fileName: answerFileName,
        localFiles: [],
        importedFiles,
        targetDir: publicAnswersDir,
        hrefSegments: ["lab", "answers"],
      });

      return makeMaterialItem({
        kind: "answer",
        week,
        session: answerIndex + 1,
        title: answerLink.text || `Answer ${answerIndex + 1}`,
        fileName: answerFileName,
        sourceHref: answerLink.href,
        publicHref: answerCopy.publicHref,
        available: answerCopy.available,
      });
    });

    return makeMaterialItem({
      kind: "lab",
      week,
      title: `Week ${week} Lab`,
      fileName: materialName,
      sourceHref,
      publicHref: labCopy.publicHref,
      available: labCopy.available,
      children,
    });
  });
};

const main = () => {
  ensureDir(manifestDir);
  resetDir(path.join(projectRoot, "public", "course-materials"));
  ensureDir(publicLectureDir);
  ensureDir(publicLabDir);
  ensureDir(publicAnswersDir);

  const archive = readJson(archivePath);
  const schedulePage = archive.pages.find((page) => page.id === "courses-proxy-cs201-schedule-html");
  const labPage = archive.pages.find((page) => page.id === "courses-proxy-cs201-lab-sessions-lab-html");

  if (!schedulePage) {
    throw new Error("Cannot find schedule page in course-site archive.");
  }

  if (!labPage) {
    throw new Error("Cannot find lab session page in course-site archive.");
  }

  const slideFiles = listPdfFiles(slideSourceDir);
  const labFiles = listPdfFiles(labSourceDir);
  const importedFiles = listPdfFiles(importedAssetsDir);

  const lectureItems = buildLectureItems({ schedulePage, slideFiles });
  const labItems = buildLabItems({ labPage, labFiles, importedFiles });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: {
      scheduleUrl: schedulePage.url,
      labUrl: labPage.url,
      slideSourceDir,
      labSourceDir,
      importedAssetsDir,
    },
    items: [...lectureItems, ...labItems],
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const totalChildren = labItems.reduce((count, item) => count + (item.children?.length ?? 0), 0);
  console.log(
    `Wrote ${manifest.items.length} top-level material items and ${totalChildren} lab answer children to ${manifestPath}`,
  );
};

main();
