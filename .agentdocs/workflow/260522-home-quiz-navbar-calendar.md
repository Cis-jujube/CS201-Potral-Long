# Home Quiz Navbar Calendar

## Goal

Align the Home header and weekly dashboard with the current student workflow: keep utility icons on the right edge, place the daily quote beside Week Navigation, surface live Quiz progress from the same source as Homework, and make Quiz plus AI/BK Reflection due dates land on Sunday.

## Scope

- In scope: `Navbar`, Home Learning Map Quiz display, daily quote pool, Quiz/reflection due-date display rules, focused tests, and rendered verification.
- Out of scope: teacher-site backend behavior, real credential changes, and automatic teacher-site writes.

## Design

- Header layout keeps Week Navigation and week buttons on the left/center while the collapse, logout, and drawer buttons share a right-aligned utility group.
- Daily quote is a compact header element aligned with the Week Navigation row instead of a full-width block under the controls.
- Home imports the same weekly Quiz source used by Homework. When live Quiz data is available, it replaces static Quiz nodes with per-problem nodes and a total/correct/incorrect/not-done summary.
- Quiz status colors: passed is green, closed/not passed is red, and open/not done is gray.
- Sunday due-date rules live in `lib/reflections/dueDates.ts` so Home, Homework, API payloads, and tests share one source.

## TODO

- [x] Phase 1: Update project docs for the active task.
- [x] Phase 2: Implement header quote/utility layout and 1000+ deterministic quote pool.
- [x] Phase 3: Implement live Quiz Home summary and status colors.
- [x] Phase 4: Move Quiz and AI/BK Reflection due-date display rules to Sunday.
- [x] Phase 5: Update unit/component/e2e coverage and run validation.
- [x] Phase 6: Rebuild/restart local site and perform rendered QA.
- [x] Phase 7: Review whether the change creates reusable project memory.

## Validation

- `npm run lint`: pass.
- `npm run test`: pass, 36 files and 104 tests.
- `npm run build`: pass.
- `npm run test:e2e`: pass, 14 tests.
- Rendered QA against `http://localhost:3300`: pass. Header utility icons are right-aligned, daily quote height is aligned with the utility row, mocked live Quiz data renders total/correct/incorrect/not-done counts, day 29 contains Sunday due items, mobile viewport has no horizontal overflow.

## Review

- Reusable rules were written to `frontend/architecture.md` and `frontend/ui-design.md`: Home must reuse the Homework Quiz API, Quiz status colors are fixed, and AI/BK Reflection due dates are Sunday recommended items.
- This workflow document remains active until user acceptance.
