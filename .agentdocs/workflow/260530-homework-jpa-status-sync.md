# Homework JPA Status Sync

## Goal

- Make `/homework` show real JPA completion status from the teacher site for the current portal user.
- Prefer the teacher SSO access token when present and fall back to `CS201_BK_USER_MAP` only for local development/test users.
- Keep local `questionProgressMap` as a fallback note source, not the primary completion authority when teacher-site JPA data is available.

## Current Finding

- The existing Homework board reads status only from local browser storage, so completed JPA work on the teacher site does not appear in the portal.
- The teacher student app loads JPA grades through `GET /api/user_jpa_submissions/{username}/{course_id}/`.
- For this course tree, the course node is `course-CO0000009` but the teacher frontend resolves the API course id from the display name: `intro to programming (CS201-S4-SP-2026)` becomes `CS201-S4-SP-2026`.
- Live read-only probe confirmed that the endpoint returns per-submission rows with `hw_name`, `jpa_nid`, `jpa_spk`, `event`, `grades`, and `timestamp`.

## Design

- Add a server-only Homework JPA sync module that:
  - fetches the current teacher profile,
  - discovers the CS201 course node from `/api/user_courses_bk_jpa/{username}/`,
  - resolves the frontend-compatible course id,
  - fetches `/api/user_jpa_submissions/{username}/{course_id}/`,
  - keeps the latest `submit` event per JPA id, including ungraded latest submits,
  - maps teacher rows to local homework manifest questions by normalized `jpa_nid`,
  - returns only sanitized status payloads to the browser.
- Last-submit status is authoritative: positive numeric `grade`/`grades` is correct, `0` is incorrect, null/missing grade is ungraded, and no submit row is not-started.
- Add `/api/homework/status` with the same portal-session and teacher-token-first access pattern used by Quiz, Reflections, and BK Projects.
- Add a client hook for `/homework` and update `HomeworkPracticeBoard` so the teacher-site status drives entry chips, question selector chips, detail badges, and the progress card.

## TODO

- [x] Phase 1: Audit current Homework local-progress flow and teacher-site JPA API shape.
- [x] Phase 2: Record reusable sync design and course-id discovery rule.
- [x] Phase 3: Implement server parser/API, client hook, and Homework UI integration.
- [x] Phase 4: Add parser/API/component/e2e coverage.
- [x] Phase 5: Run lint, unit tests, e2e, and rendered `/homework` desktop/mobile QA.
- [x] Phase 6: Review whether frontend docs need durable architecture updates.
- [x] Phase 7: Correct status semantics from latest graded submit to latest submit with ungraded handling.

## Validation

- Live teacher-site probe: `GET /api/user_jpa_submissions/zw354/CS201-S4-SP-2026/` returned 396 submission rows.
- `npm run lint`: pass.
- `npm run test`: pass, 40 files and 136 tests.
- `npm run test:e2e`: pass, 14 tests. The run used the existing CS201 dev server on port `3302` because another project owned port `3000`.
- Rendered QA against `http://localhost:3302/homework`: desktop and mobile both show `Teacher-site JPA status synced from CS201-S4-SP-2026`, teacher-site `Correct` badges, no blank page, and no horizontal overflow after the mobile progress-row badge fix.

## Review

- The durable architecture note now records `/api/homework/status`, `lib/homework/status.ts`, and the teacher-site-status-primary contract.
- The implementation stays per-user: the route reads the active portal/teacher session, resolves the teacher profile username, discovers the course id from the teacher course tree, and fetches submissions for that username instead of hardcoding one student.
- The status parser now follows the teacher workflow literally: only `submit` events decide state, the latest submit overrides earlier grades, and null/missing latest grades display as ungraded instead of reusing an older correct result.
