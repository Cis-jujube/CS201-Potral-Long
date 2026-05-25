import type {
  ParsedQuizProblem,
  QuizAnswerField,
  QuizAssignment,
  QuizProblemLink,
  QuizPromptBlock,
  QuizSubmitResult,
} from "@/lib/quiz/types";

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const decodeHtml = (value: string) =>
  value
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCharCode(Number(code)))
    .replace(/&([a-z]+);/gi, (match, entity: string) => ENTITY_MAP[entity.toLowerCase()] ?? match);

const normalizeText = (value: string) => decodeHtml(value.replace(/\s+/g, " ").trim());

const stripTags = (value: string) => normalizeText(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "));

const toAbsoluteHref = (href: string, baseUrl: string) => {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
};

const getAttribute = (tag: string, name: string) => {
  const pattern = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i");
  return tag.match(pattern)?.[1];
};

const removeAnswerContent = (html: string) =>
  html
    .replace(/<p[^>]*>\s*Answer:\s*<\/p>\s*<p[^>]*style=["'][^"']*color\s*:\s*orange[^"']*["'][\s\S]*?<\/p>/gi, "")
    .replace(/<[^>]+style=["'][^"']*color\s*:\s*orange[^"']*["'][\s\S]*?<\/[^>]+>/gi, "")
    .replace(/<p[^>]*>\s*Answer:\s*<\/p>/gi, "");

const removeChrome = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");

const rowMatches = (html: string) => [...html.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((match) => match[0]);

const inferWeekFromProblemId = (problemId: string) => {
  const numeric = Number(problemId);
  return Number.isFinite(numeric) ? Math.floor(numeric / 100) : 0;
};

const formatProblemLabel = (problemId: string) => {
  const numeric = Number(problemId);
  if (!Number.isFinite(numeric)) {
    return `Problem${problemId}`;
  }

  const problemNumber = numeric % 100;
  return `Problem${String(problemNumber).padStart(2, "0")}`;
};

export const parseAssignmentPage = (html: string, baseUrl: string): QuizAssignment[] => {
  const rows = rowMatches(html);
  const sourceRows = rows.length > 0 ? rows : [html];
  const seen = new Set<string>();

  return sourceRows.flatMap((row) => {
    const link = row.match(/<a[^>]+href=["']([^"']*\/cs201\/quiz\/(\d+)\/?)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link) {
      return [];
    }

    const [, href, problemId, labelHtml] = link;
    const week = inferWeekFromProblemId(problemId);
    if (week < 1 || week > 7 || seen.has(String(week))) {
      return [];
    }
    seen.add(String(week));

    const rowText = stripTags(row);
    const progress = rowText.match(/(\d+)\s*\/\s*(\d+)/);
    const due = rowText.match(/due\s*:?\s*([^|]+?)(?:\s{2,}|$)/i)?.[1]?.trim();
    const status = /open/i.test(rowText) ? "open" : /closed/i.test(rowText) ? "closed" : "unknown";

    return [
      {
        week,
        title: stripTags(labelHtml) || `Week ${week} Quiz`,
        sourceHref: toAbsoluteHref(href, baseUrl),
        status,
        due,
        passed: progress ? Number(progress[1]) : undefined,
        total: progress ? Number(progress[2]) : undefined,
      },
    ];
  });
};

export const parseQuizProblemLinks = (html: string, baseUrl: string): QuizProblemLink[] => {
  const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']*\/cs201\/quiz\/(\d+)\/?)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const seen = new Set<string>();

  return links
    .flatMap((link) => {
      const [anchorHtml, href, problemId, labelHtml] = link;
      if (seen.has(problemId)) {
        return [];
      }
      seen.add(problemId);
      const rawText = stripTags(labelHtml);
      const linkStatus: QuizProblemLink["status"] =
        /(?:\u221a|\u2713|\u2714|correct)/i.test(rawText) || /color\s*:\s*green/i.test(anchorHtml) ? "passed" : "open";

      const text = rawText.replace(/[\u221a\u2713\u2714]/g, "").trim();
      return [
        {
          problemId,
          label: /problem/i.test(text) ? text : formatProblemLabel(problemId),
          sourceHref: toAbsoluteHref(href, baseUrl),
          status: linkStatus,
        },
      ];
    })
    .sort((left, right) => Number(left.problemId) - Number(right.problemId));
};

const parseAnswerFields = (html: string): QuizAnswerField[] => {
  const inputs = [...html.matchAll(/<input\b[^>]*>/gi)];
  return inputs.flatMap((input) => {
    const tag = input[0];
    const name = getAttribute(tag, "name");
    if (!name || !/^\d+$/.test(name)) {
      return [];
    }

    const placeholder = getAttribute(tag, "placeholder");
    return [
      {
        name,
        label: placeholder ? decodeHtml(placeholder) : `Blank ${Number(name) + 1}`,
        placeholder,
        required: /\srequired(?:\s|>|=)/i.test(tag),
      },
    ];
  });
};

const parsePromptBlocks = (html: string): QuizPromptBlock[] => {
  const sanitized = removeChrome(removeAnswerContent(html));
  const blockMatches = [
    ...sanitized.matchAll(/<(p|li|h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi),
    ...sanitized.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi).map((match) => ({ ...match, 1: "pre", 2: match[1] })),
  ];

  const blocks = blockMatches.flatMap((match) => {
    const tag = String(match[1]).toLowerCase();
    const text = stripTags(String(match[2] ?? ""));
    if (
      !text ||
      /^answer:?$/i.test(text) ||
      /^cs201$/i.test(text) ||
      /^compsci\s*201/i.test(text) ||
      /^problem\d+$/i.test(text) ||
      /^week\d+$/i.test(text)
    ) {
      return [];
    }

    return [{ type: tag === "pre" ? "code" : "text", text } satisfies QuizPromptBlock];
  });

  if (blocks.length > 0) {
    return blocks;
  }

  const text = stripTags(sanitized);
  return text ? [{ type: "text", text }] : [];
};

const parseTitle = (html: string, problemId: string) => {
  const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
  return headings.find((heading) => !/^problem\d+$/i.test(heading)) ?? `Week ${inferWeekFromProblemId(problemId)} Quiz`;
};

export const parseQuizProblemPage = (html: string, sourceHref: string, baseUrl: string): ParsedQuizProblem => {
  const problemId = sourceHref.match(/\/quiz\/(\d+)\/?/)?.[1] ?? "0";
  const answerFields = parseAnswerFields(html);
  const problemLinks = parseQuizProblemLinks(html, baseUrl);
  const ownLinkStatus = problemLinks.find((link) => link.problemId === problemId)?.status;
  const formTag = html.match(/<form\b[^>]*>/i)?.[0] ?? "";
  const formAction = getAttribute(formTag, "action");
  const csrfToken =
    html.match(/name=["']csrfmiddlewaretoken["'][^>]*value=["']([^"']+)["']/i)?.[1] ??
    html.match(/value=["']([^"']+)["'][^>]*name=["']csrfmiddlewaretoken["']/i)?.[1];

  return {
    id: `quiz-problem-${problemId}`,
    problemId,
    week: inferWeekFromProblemId(problemId),
    label: formatProblemLabel(problemId),
    title: parseTitle(html, problemId),
    sourceHref,
    status: ownLinkStatus === "passed" ? "passed" : answerFields.length > 0 ? "open" : "closed",
    prompt: parsePromptBlocks(html),
    answerFields,
    formAction: formAction ? toAbsoluteHref(formAction, baseUrl) : undefined,
    csrfToken,
    problemLinks,
  };
};

export const parseQuizSubmitPage = (html: string): QuizSubmitResult => {
  const sanitizedText = stripTags(removeChrome(removeAnswerContent(html)));
  const progressFromText = sanitizedText.match(/Passed\s*:?\s*(\d+)\s*\/\s*(\d+)/i);
  const progressFromScript = html.match(/result\s*=\s*['"]?(\d+)['"]?\s*\/\s*['"]?(\d+)['"]?/i);
  const passedMatch = progressFromText ?? progressFromScript;
  const attemptsMatch = sanitizedText.match(/(\d+)\s+times?\s+left/i) ?? html.match(/(\d+)\s+times?\s+left/i);
  const failed = /\b(wrong|incorrect|failed)\b/i.test(sanitizedText) || /Test\s+Wrong\s+Answer/i.test(html);
  const passed = (/\b(correct|passed)\b/i.test(sanitizedText) || /Test\s+Correct\s+Answer/i.test(html)) && !failed;
  const message = passed
    ? "Correct answer."
    : failed
      ? "Wrong answer. The teacher site received the submission; try another answer for the displayed choice order."
      : "Submission received.";

  return {
    status: passed ? "passed" : failed ? "failed" : "unknown",
    message,
    passed: passedMatch ? Number(passedMatch[1]) : undefined,
    total: passedMatch ? Number(passedMatch[2]) : undefined,
    attemptsLeft: attemptsMatch ? Number(attemptsMatch[1]) : undefined,
  };
};
