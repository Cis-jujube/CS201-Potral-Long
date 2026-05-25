# Display Preferences And SSO Homework Sync

## Goal

- Remove the alternate `Bento Box Grid` control and keep the portal on the default Bento Grids layout.
- Keep only Light/Dark display preference controls in the drawer and desktop header switcher.
- Replace synthetic quote suffixes with one pure traditional Chinese quote that rotates by local half-day.
- Evaluate professor-site SSO and live Homework/Quiz/BK/AI Reflection sync without storing student professor-site passwords in this portal.

## Scope

- In scope: display preference UI, UI provider state cleanup, quote source, focused tests, rendered validation, and SSO/API contract documentation.
- Out of scope: professor-site backend changes and fake live Homework completion status without an authenticated API contract.

## Current Professor-Site Probe

- `http://repolab.colab.duke.edu:8005/`: reachable, HTTP 200.
- `http://repolab.colab.duke.edu:8005/portal-sso/authorize/`: HTTP 404.
- `http://repolab.colab.duke.edu:8005/portal-sso/token/`: HTTP 404.
- `http://repolab.colab.duke.edu:8005/cs201/assignment/`: HTTP 404.
- `http://10.200.20.79:81/student.html`: timed out from this environment.
- `http://10.200.20.79:8005/`: timed out from this environment.
- `http://10.200.20.79:8000/api/profile/`: timed out from this environment.

## SSO Contract Needed

- The professor site needs an authorize endpoint and token endpoint matching the existing portal SSO helper:
  - `GET /portal-sso/authorize/`
  - `POST /portal-sso/token/`
- Token exchange must return `username`, optional `displayName`, `accessToken`, and optional `expiresAt`.
- Live Homework status needs a server-side API that accepts the teacher access token and returns per-question status as `correct`, `incorrect`, or `not-started`.
- Quiz/BK/AI Reflection sync can reuse the existing teacher-token-first route pattern once the professor site exposes token-backed endpoints.

## TODO

- [x] Phase 1: Record task scope and professor-site probe results.
- [x] Phase 2: Remove alternate style-mode UI and default all Home layout logic to Bento Grids.
- [x] Phase 3: Replace synthetic daily quote pool with pure traditional Chinese quotes.
- [x] Phase 4: Update focused unit/component/e2e tests.
- [x] Phase 5: Run lint, unit tests, build, e2e, and rendered browser QA.
- [x] Phase 6: Restart local site and review whether reusable docs need updates.

## Validation

- `npm run lint`: pass.
- `npm run test`: pass, 36 files and 105 tests.
- `npm run build`: pass after removing `next/font/google` runtime fetch from `app/layout.tsx`.
- `npm run test:e2e`: pass, 14 tests.
- `http://localhost:3300/login`: HTTP 200 after restarting production server.
- Rendered QA against `http://localhost:3300`: Home is not blank, no framework overlay, drawer display preferences show Light/Dark only, `Bento Box Grid` is absent, the quote renders as one traditional Chinese sentence, dark theme toggle works, and mobile has no horizontal overflow.
- Known external-sync blocker: `/api/quiz/week/1` returns 502 when the professor Quiz host is unreachable from this environment. This is an upstream connectivity/API issue, not a rendered UI crash.

## Review

- Reusable UI rules were updated in `frontend/ui-design.md`: display preferences expose only Light/Dark and Home remains on default Bento Grids.
- Reusable architecture notes were updated in `frontend/architecture.md`: header quotes are sourced from `lib/mock/dailyQuotes.ts` and render one traditional Chinese quote only.
- Professor-site SSO remains implementation-ready on the portal side, but live Homework/Quiz completion cannot be truthfully enabled until the professor site exposes reachable SSO and progress endpoints.
