# Task: Course Site Content Import and Placement

## Context

- Source course site shown by user: `http://repolab.colab.duke.edu:8005/courses/proxy/cs201/index.html`.
- Goal: pull all available course-site content into local project files, identify structure, and place recognized content into corresponding pages of the existing CS201 portal.
- Whiteboard signal: prioritize SAG, report/repo/code/lab relationships, setup environment, Git repo workflow, input/add instructions/data, and UTM/platform-style workflow concepts.

## Intended Local Artifacts

- Store raw scraped source under a project-owned local folder, likely `data/course-site/`.
- Store a normalized JSON/Markdown extraction next to raw content for repeatable frontend ingestion.
- Keep human-facing UI English-first unless replacing known Chinese quote content.

## Placement Hypothesis

- Course info, staff, schedule, hours, exam policy, grading policy: FAQ, Exams, and Home summary areas.
- Textbook, textbook resources, animation, course supplements: Resources page.
- Lab session materials, lecture videos, homework/repo instructions: Homework and Resources pages.
- SAG client, HW Git repo, working with SAG, SAG error FAQ: SAG page.
- Follow-up courses and general course description: Home or Resources as course overview/reference modules.

## Execution Phases

- [x] Phase 1: Create task doc and update project index.
- [x] Phase 2: Fetch/snapshot source course site and persist raw assets locally.
- [x] Phase 3: Extract navigable sections, links, text tables, and downloadable assets into normalized data.
- [x] Phase 4: Map extracted content into existing mock/config data and page components.
- [x] Phase 5: Add focused unit/e2e tests and run `npm run lint`, `npm run test`, `npm run test:e2e`.

## Implementation Snapshot

- Imported 184 structured course-site pages into `data/course-site/normalized.json`.
- Preserved raw HTML and small downloadable assets under `data/course-site/raw/`.
- Added `/course-site` searchable archive page.
- Added ranked mixed-placement previews to Home, SAG, Homework, Resources, Exams, and FAQ.
- Added `npm run import:course-site`; credentials are environment-only.
- Whiteboard image source path was not available at execution time, so only the interpreted SAG workflow summary was stored.

## Validation Snapshot

- `npm run import:course-site`: pass, 184 pages imported, 3 source 404 failures recorded.
- `npm run lint`: pass.
- `npm run test`: pass, 13 files and 29 tests.
- `npm run test:e2e`: pass, 9 tests.

## Risks

- Source site may require campus/VPN/auth or browser session access.
- Network access may need approval in Codex sandbox.
- Existing `.agentdocs/frontend/ui-design.md` and some Chinese placeholder text appear mojibake; avoid broad rewrites unless directly needed.
