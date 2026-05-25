# Task: Week Navigation Rewrite

## Context

- Replace old top brand row with a Week Navigation control row.
- Merge `Upcoming Deadlines` into `This Week Tasks`.
- Add homepage-wide global filtering driven by one query.
- Keep week progress local-only but reserve adapter expansion points.

## Design Decisions

- Top-row controls: title + week switch + global search.
- Search precedence: URL `q` > persisted local query > empty query.
- Search scope: learning map, tasks, deadlines, week progress, lecture mapping, quick access, recommendations.
- No standalone deadlines tile in home weighted layout.
- External progress signals stay disabled in v1.

## Implementation Phases

- [x] Provider and state contracts (`globalQuery`, persistence key, URL precedence)
- [x] Navbar rewrite (Week Navigation row + cross-page search routing)
- [x] Home rewrite (merged task/deadline section + module-level filtering)
- [x] Layout weight update (remove standalone `deadlines` key)
- [x] Progress adapter reservation (`lib/progress/engine.ts`, env placeholders)
- [x] Unit tests + e2e updates
- [x] Validation: lint + unit tests + e2e (e2e executed on ASCII mirror path)

## Validation Snapshot

- `npm run lint`: pass
- `npm run test`: pass
- `npm run test:e2e`: pass on `C:\Users\zaoza\codex-workspace\cs201-portal-local` due non-ASCII path EPERM in source workspace

## Pending User Acceptance

- Confirm visual outcome for local runtime at `http://127.0.0.1:3300`.
- After acceptance, move this file to `.agentdocs/workflow/done/` and remove from index active list.
