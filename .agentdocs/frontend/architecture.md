# Frontend Architecture

## Core Structure

- `app/layout.tsx` mounts root providers and the top-level navigation shell.
- `components/layout/Navbar.tsx` owns Week Navigation controls, primary route navigation, global search submit routing, and mobile drawer behavior.
- `providers/CourseUiProvider.tsx` owns shared UI state: selected week, theme mode, global query, task completion, and bookmarks.
- `data/course-site/normalized.json` is the local structured archive of the imported official CS201 site.
- `lib/course-site/content.ts` is the single frontend entry point for imported course-site content and placement-ranked previews.
- `data/course-materials/manifest.json` is the generated Lecture/Lab materials manifest; refresh it and copied PDFs with `npm run build:materials` after changing `../Slide/`, `../Lab/`, or imported course-site tables.
- `lib/course-materials/content.ts` is the single frontend entry point for material grouping, nested answer lookup, and preview-route ids.
- Class Notes are local admin-managed course material uploads. Store metadata in `data/admin-overrides/class-notes.json`, files in `public/course-materials/class-notes/`, expose visible student notes through `/api/class-notes/week/[week]`, and preview them through `/resources/class-notes/[id]`.
- Home Learning Map reuses the Lecture/Lab manifest directly: `Lectures` shows current-week PPTs and `Lab` shows current-week lab PDFs; do not add a separate Home materials panel for the same files.
- Home Learning Map also reads the same `/api/quiz/week/[week]` source as Homework. When live Quiz data is available, the Quiz column shows per-problem status plus total/correct/incorrect/not-done counts.
- Header quotes come from `lib/mock/dailyQuotes.ts`. They render as one traditional Chinese quote only, without source text or synthetic study-note suffixes.
- Reflection schedule is course-specific: weeks 1, 4, and 6 have only AI Reflection; weeks 2, 3, 5, and 7 have AI Reflection plus two BK Reflection questionnaires.
- `data/homework/manifest.json` is the generated Homework/JPA manifest; refresh it with `npm run build:homework` after re-importing course-site raw HTML.
- HW18 and HW19 are excluded in `lib/homework/content.ts` because they do not exist in the current course workflow even if they appear as scheduled placeholders.
- `components/pages/ExamsBoard.tsx` owns the optimized Session Exam Grading Policy card shown on the Exams page.
- `lib/homework/content.ts` is the single frontend entry point for imported homework entries and question details.
- `lib/home/homeFilters.ts` is the single pure selector for homepage-wide filtering.
- `lib/progress/engine.ts` is the single week-progress entry point. v1 uses local task completion only and reserves external adapter config.
- `lib/auth/session.ts` owns the local portal session token contract used by login/logout routes and route protection.
- `lib/practice/content.ts` adapts local homework, required reflections, and live Quiz payloads into the unified Homework page selector model.
- `lib/reflections/*` owns server-side teacher-site questionnaire login, course-tree discovery, fallback data, and sanitized reflection payloads. Teacher-site credentials never reach client components.
- `lib/bk-projects/*` owns server-side teacher-site BK project group, survey, and vote sync. It reuses the server-only teacher-site login pattern and never returns credentials to client components.
- `lib/quiz/*` owns server-side Quiz login, HTML parsing, answer filtering, and submit result parsing. Quiz credentials are never passed to client components.
- Quiz problem fetches create a server-only submit context and expose only a non-secret `submitContextId` to the client. Submit routes must prefer that cached context so answer letters match the exact shuffled teacher-site page the student saw.

## Contracts

- Global search precedence is fixed: URL `q` parameter > persisted query > empty query.
- Search submitted outside Home always routes to `/?q=...`.
- Home keeps `Task Calendar` embedded inside the `This Week Tasks` panel. Deadline and presentation details appear only in the calendar hover/focus panel, not as an `Upcoming Deadlines` list or standalone Home tile.
- Home tile ranking and class mapping are driven by `lib/home/weightedLayout.ts`, now without a standalone `deadlines` module key.
- Course-site import flow is script-driven via `npm run import:course-site`; credentials must be provided through environment variables only and must never be written into source files or docs.
- The standalone `/course-site` archive UI has been removed. Imported course-site data remains available to page-specific panels and generated manifests only.
- `/resources` is the focused Lecture/Lab/Class Notes material workspace. Lecture/Lab read the generated material manifest and open through `/resources/materials/[id]`; Class Notes read local admin metadata and open through `/resources/class-notes/[id]`.
- Visible course-site import/highlight UI is allowed only on `/resources`, inside the Official Course Site section. Other pages may read course-site data internally but must not render `Course Site Import` or `Official Course Site Highlights` UI labels.
- Public course PDFs are generated under `public/course-materials/`; do not point UI directly at OneDrive sibling folders.
- Reflection templates live under `public/reflection-templates/`; the CS201 textbook lives under `public/course-materials/textbook/`.
- Portal pages and public course materials are protected by the local login session. Credentials must come from `CS201_PORTAL_USERS` or the legacy pair `CS201_PORTAL_USERNAME` / `CS201_PORTAL_PASSWORD`, plus `CS201_PORTAL_SESSION_SECRET`; source code may only contain non-secret development fallbacks.
- Week Navigation collapse state is stored through `CourseUiProvider` as `weekNavCollapsed`; collapsed mode keeps only CS201, current week, expand/logout/menu controls, and hides week buttons plus the daily quote.
- Homework, AI Reflection, and BK Reflection due dates are recommended due items. AI/BK Reflection use Sunday `23:59` for each course week and appear in the calendar with recommended styling. Quiz due dates are required Sunday `23:59`; BK project presentation and exam due items remain required.
- Homework page selector entries are ordered as local HW entries, AI/BK reflection entries, then Quiz. Reflections are generated from weekly task data; Quiz is loaded through `/api/quiz/week/[week]` and Home must reuse that same API instead of keeping a separate static Quiz source.
- Homework question, reflection, and Quiz detail bodies render through a document-style view inside `HomeworkPracticeBoard`: preserve structured sections, render prose with inline-code emphasis, render code blocks separately, and show submitted files as a checklist instead of a table.
- `/api/quiz/*` routes must validate the portal session, map the portal username through `CS201_QUIZ_USER_MAP`, and return sanitized prompt/status data only. Do not return correct Quiz answers, even for closed upstream pages.
- `CS201_QUIZ_BASE_URL` points at the upstream Quiz host. `CS201_QUIZ_USER_MAP` is server-only JSON keyed by portal username.
- `/api/reflections/*` routes must validate the portal session, map the portal username through `CS201_BK_USER_MAP`, and return sanitized questionnaire metadata/submission text only. Manual Submit is the only client action that writes to the teacher site.
- `/api/bk-projects/*` routes must validate the portal session, map the portal username through `CS201_BK_USER_MAP`, and return sanitized group/survey metadata only. Manual Submit vote is the only client action that writes survey submissions.
- `CS201_BK_BASE_URL` points at the teacher-site backend. `CS201_BK_USER_MAP` is server-only JSON keyed by portal username.
- `/admin` is a local portal editor protected by `CS201_ADMIN_USERS`. Admin v1 writes only local override JSON and never writes teacher-site BK/reflection/vote data.
- LocalStorage-backed UI state must use the provider's hydration-safe external-store pattern: server and initial hydration render the default snapshot, then the client reads persisted values. Do not read `window.localStorage` inside `useState` initializers for rendered state.

## Testing Rules

- Navbar behavior changes require component tests plus Playwright coverage for desktop and mobile.
- Homepage filter changes require dedicated unit tests for hit and no-hit paths.
- Progress-source changes must preserve local-only fallback behavior.
- Course-site parser or placement changes require fixture tests for link classification, table extraction, and destination mapping.
- Lecture/Lab material changes require manifest/content tests plus Resources tab and preview-route e2e coverage.
- Auth, Homework manifest, and calendar due-kind changes require unit/component tests plus Playwright coverage for login redirects, Homework detail rendering, and calendar hover/focus detail.
- Quiz integration changes require parser fixture tests for assignment/problem/submit pages, plus component/e2e coverage proving answers are not rendered.
- Reflection integration changes require server-client mocked fetch tests, component coverage for templates and disabled fallback, and Playwright coverage for manual submit UI without real teacher-site writes.
