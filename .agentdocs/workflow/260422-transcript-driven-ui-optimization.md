# Task: Transcript-Driven UI Optimization (Full Pass)

## Context

- Implement transcript-confirmed UI changes across Home, SAG, Homework, Projects, and Resources.
- Fully deprecate Planner from navigation and redirect `/weekly-planner` to Home.
- Keep backend contracts unchanged and ship placeholder-driven frontend behavior first.

## Decisions Locked

- Delivery mode: one-pass full implementation.
- Planner strategy: fully offline from UI + route redirect to `/`.
- Placeholder strategy: ship placeholders now for links, API-driven text, and videos.
- Language: English-first UI copy, Chinese content only for daily quote + citation.
- Homework data strategy: week-local static mock with local persistence.

## Phases

- [x] Phase 1: Docs/index update and shared placeholder source/type contracts
- [x] Phase 2: Navbar/Home refactor (daily quote, calendar, ED/textbooks cards, remove quick access/recommendation)
- [x] Phase 3: SAG page refactor (OS switch, setup instructions, setup videos, Git Bash table)
- [x] Phase 4: Homework flow rebuild + Planner offline + Projects/Resources updates
- [x] Phase 5: Tests updates/additions + validation (`lint`, `test`, `test:e2e`)

## Validation Notes

- Use ASCII mirror path for runtime/e2e fallback when OneDrive non-ASCII path triggers `EPERM`.
- Validation executed:
  - `npm run lint` (source workspace): pass
  - `npm run test` (source workspace): pass
  - `npm run test:e2e` (ASCII mirror `C:\Users\zaoza\codex-workspace\cs201-portal-local`): pass
