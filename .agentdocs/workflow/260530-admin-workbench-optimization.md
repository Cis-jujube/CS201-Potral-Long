# Admin Workbench Optimization

## Goal

Make `/admin` a professor-focused local portal workbench for date management and Class Notes uploads, while preserving the existing student-facing information architecture and local JSON storage.

## Constraints

- Admin remains protected by the current `CS201_ADMIN_USERS` behavior. Professor-only hardening is deferred.
- Admin changes remain explicit-save local portal edits and never write to teacher-site Quiz, reflection, BK, or voting systems.
- No Admin-managed item exposes description/detail editing. Existing base course descriptions remain in source data for student pages.
- Class Notes remain local assets under `data/admin-overrides/class-notes.json` and `public/course-materials/class-notes/`.
- Validation baseline is `npm run lint`, `npm run test`, and `npm run test:e2e`.

## Phases

- [completed] Phase 1: Create workflow documentation and update project index.
- [completed] Phase 2: Simplify Admin override sanitization so description/detail overrides are no longer produced or applied.
- [completed] Phase 3: Rebuild AdminBoard as a compact date/file/preview workbench with weekly date table and bulk Class Notes upload queue.
- [completed] Phase 4: Update component, API, and e2e tests for the new Admin behavior.
- [completed] Phase 5: Run lint, tests, e2e, and rendered Admin QA.

## Design Notes

- Borrow from `vibeui.top` only at the interaction rhythm level: compact stats, segmented filters, search, thin borders, dense rows, and calm spacing.
- Keep current CS201 tokens: `surface-card`, `surface-muted`, `badge`, `button-*`, module tones, light/dark compatibility.
- Date rows should prioritize the professor's common workflow: adjust title, date, time, visibility, and due display without editing assignment descriptions.

## Validation

- `npx vitest run tests/adminBoard.test.tsx tests/adminOverrides.test.ts tests/classNotes.test.ts --configLoader native`: passed, 11 tests.
- `npm run lint`: passed.
- `npm run test`: passed, 39 files and 129 tests.
- `$env:E2E_PORT='3301'; npm run test:e2e`: passed, 14 tests. The default `3000` port was occupied, so e2e ran on `3301`.
- Rendered Admin QA used Playwright after the in-app Browser runtime timed out during navigation. Desktop and mobile checks passed with `0` horizontal overflow, `0` Description inputs, `0` Detail inputs, upload auto-title `qa week note`, visible invalid-file state, and no console errors.

## Review

- Reusable Admin constraints were written into `frontend/ui-design.md` and `frontend/architecture.md`: Admin remains a local workbench, date editing is weekly/table-driven, and Admin must not reintroduce `description` or `detail` override editing.
