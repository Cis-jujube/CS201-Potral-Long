# Home Calendar AI Projects Admin

## Goal

Merge Task Calendar back into the This Week Tasks panel, remove due semantics from AI Reflection across the portal, make Projects useful when BK sync is unavailable, and add an admin v1 surface for local portal content overrides.

## Constraints

- Do not map the local `test` portal account to any teacher-site identity.
- Teacher-site writes remain explicit student actions only.
- Admin v1 edits local portal content only and never writes BK/reflection/vote data to the teacher site.
- Do not store passwords or teacher-site credentials in docs, code, tests, or fixtures.

## Phases

- [x] Phase 1: Move Home Task Calendar into This Week Tasks and remove AI due display/deadlines.
- [x] Phase 2: Add Projects fallback visible mode for unconfigured/fallback sync.
- [x] Phase 3: Add admin authorization, local override store, API routes, and `/admin` UI.
- [x] Phase 4: Update agent docs and local-only admin env setting.
- [x] Phase 5: Add focused tests and run validation.

## Validation

- `npm run lint`: pass.
- `npm run test`: pass, 31 files and 85 tests.
- `npm run test:e2e`: pass, 14 tests.
- `npm run build`: pass.
- Sync to ASCII mirror and verify `http://127.0.0.1:3300`: pass, HTTP 200 with `CS201 Course Portal`.
