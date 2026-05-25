# BK Project Voting Home Cleanup

## Goal

Connect the Projects page to the teacher x.bk project workflow while cleaning Home deadline presentation and keeping teacher-site writes explicit. Projects should show the logged-in user's team, members, other teams, and a manual vote form. Home should keep tasks separate from calendar-only deadlines.

## Constraints

- Teacher-site credentials stay server-only in environment variables.
- No automatic vote or reflection writes; every teacher-site write requires a clear submit button.
- `test` is a local portal account only unless a server-side teacher-site mapping is added outside source control.
- Week 6 can show project/group data but does not create a BK presentation calendar item.

## Phases

- [x] Phase 1: Add server-only BK project client, types, and API routes.
- [x] Phase 2: Replace Projects placeholder with team and vote UI.
- [x] Phase 3: Clean Home tasks/calendar, remove fake milestones, and fix reflection editing.
- [x] Phase 4: Optimize Exams grading policy copy and layout.
- [x] Phase 5: Add focused tests and run validation.

## Validation

- `npm run lint`: pass.
- `npm run test`: pass, 30 files and 80 tests.
- `npm run test:e2e`: pass, 13 tests.
- `npm run build`: pass.
