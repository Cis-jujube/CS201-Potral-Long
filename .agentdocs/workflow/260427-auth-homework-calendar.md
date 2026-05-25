# Auth Homework Calendar

## Vision

Make the CS201 portal feel like a personal working app: the top Week Navigation can collapse into a compact control bar, the app is protected by a lightweight login, Homework uses real imported JPA exercise content, and the calendar explains which due dates are required versus recommended.

## Implementation Plan

- [x] Add local session auth, login/logout routes, login UI, and route protection.
- [x] Add persistent collapsible Week Navigation state.
- [x] Generate and load real homework manifest data from imported course-site JPA pages.
- [x] Render imported Homework question details with sections, code blocks, and files to submit.
- [x] Add due kind classification and calendar hover/focus details.
- [x] Add unit/component/e2e coverage.
- [x] Run validation, sync ASCII mirror, and restart `127.0.0.1:3300`.

## Decisions

- Login v1 is local-cookie based and uses env credentials; development/test fallback credentials are non-secret placeholders.
- All pages and public course materials are protected except `/login`, auth API routes, and Next static assets.
- Homework due dates are recommended; every non-homework deadline is required.
- Collapsed navigation keeps CS201, current week, and menu/logout controls visible.
- Portal-facing due dates use local date-time strings so the calendar keeps the official schedule day instead of drifting across time zones.

## Validation

- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
