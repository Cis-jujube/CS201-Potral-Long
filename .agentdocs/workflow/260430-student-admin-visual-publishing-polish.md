# Student and Admin Visual Publishing Polish

## Context

- Scope is a medium visual optimization pass, not a full redesign.
- Preserve the existing CS201 information architecture, Week Navigation, module tone tokens, and teacher-site submission semantics.
- Admin remains a local portal content workbench. It does not write to x.bk, Quiz, reflection, or voting systems.

## Goals

- Make Home read more like a weekly command center: clearer task action cards, required vs recommended due states, and a more scannable Learning Map.
- Make Resources prioritize Lecture, Lab, and Class Notes, while keeping Official Course Site as a lower-priority support block.
- Make Admin feel like a publishing workbench with visible state chips for student visibility, hidden state, saved state, and unsaved changes.
- Add Class Notes search and visibility filtering in Admin so uploaded files remain manageable.

## Implementation Notes

- Reuse existing `surface-card`, `surface-muted`, `badge`, `button-*`, and module-tone classes.
- Use derived frontend state for `Unsaved changes` by comparing current overrides to the last saved overrides snapshot.
- Use `hidden !== true` as `Student-visible`; use `hidden === true` as `Hidden`.
- Save remains explicit. Unsaved frontend edits do not affect student views until Save or the class-note item Save is clicked.
- Student Resources class notes should show compact file identity, type, preview, and download actions before any heavier inline preview.

## TODO

- [completed] Create workflow documentation and update project index.
- [completed] Polish Home task, calendar, and Learning Map hierarchy.
- [completed] Polish Resources material and Class Notes hierarchy.
- [completed] Upgrade Admin layout, status chips, filters, and preview.
- [completed] Update component/e2e tests for status chips, visibility filtering, and preview behavior.
- [completed] Run lint, unit tests, e2e tests, build, mirror sync, and local reachability check.

## Validation

- `npm run lint`: passed.
- `npm run test`: passed, 33 files / 90 tests.
- `npm run test:e2e`: passed, 14 Playwright tests.
- `npm run build`: passed.
- Synced to `C:\Users\zaoza\codex-workspace\cs201-portal-local`.
- Verified `http://127.0.0.1:3300` by logging in as local test user and checking Home, Admin, Resources, and mobile overflow.
