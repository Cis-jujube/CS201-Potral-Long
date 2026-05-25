# Quiz Submit Context Fix

## Context

- Quiz choices can appear in a different order across teacher-site page loads.
- The portal currently fetches quiz pages for display, then fetches the same problem again during submit to recover form action and CSRF.
- If the upstream page order or session-bound grading context changes between those fetches, a student can submit letters that matched the displayed page but not the refetched submit context.
- Failed submit parsing currently leaks stripped teacher-site page chrome into the student result message.
- The teacher quiz navigation marks solved problems with green/check styling; the portal should parse that status and show those problems as passed.

## Plan

- Cache a server-only submit context when a quiz problem is fetched for display.
- Return only a non-secret `submitContextId` to the client.
- On submit, prefer the cached context for the current portal user and problem id; fall back to refetch only if the context has expired or is missing.
- Sanitize submit result messages so failed attempts show a concise wrong/correct/submitted message instead of raw HTML/JS.
- Parse teacher-site quiz navigation links so green/check-marked problems become `passed` in the portal.
- After a correct submit result, refresh the current live quiz payload so the portal re-reads the teacher-site status.
- Add parser and submit-context tests.

## TODO

- [completed] Add workflow doc and index entry.
- [completed] Add server-only submit context cache.
- [completed] Wire quiz week GET and quiz submit POST through cached context.
- [completed] Improve submit result parser.
- [completed] Map teacher-site passed problem status into Quiz selector/progress UI.
- [completed] Refresh live Quiz data after a correct submit.
- [completed] Update tests and run validation.

## Validation

- `npm run lint`: passed.
- `npm run test`: passed, 34 files / 95 tests.
- `npm run test:e2e`: passed, 14 Playwright tests.
- `npm run build`: passed.
- Mirror runtime check: `http://127.0.0.1:3300/login` returned HTTP 200.
- Live read-only Quiz check: Week 6 progress returned `1/24 passed`; Problem 604 mapped to `passed` and rendered as passed in the Homework UI.
