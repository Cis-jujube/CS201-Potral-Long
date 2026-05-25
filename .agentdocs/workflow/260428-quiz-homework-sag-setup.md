# Quiz Homework SAG Setup

## Vision

Turn Homework into the weekly practice hub: local JPA homework, required reflections, and the live course Quiz all appear in one selector. Quiz credentials stay server-only, answers are never surfaced, and SAG setup becomes a short checklist that new students can actually follow.

## Implementation Plan

- [x] Add Quiz parsing, session login, and server proxy API routes.
- [x] Add a unified practice-entry model for homework, reflections, and quiz.
- [x] Update Homework UI to render quiz questions, submit attempts, and reflection instructions.
- [x] Rewrite SAG setup instructions and remove placeholder video language.
- [x] Add parser, content, component, and e2e coverage.
- [x] Run lint, unit tests, e2e, and build; then sync the ASCII mirror and restart port 3300.

## Decisions

- Portal auth remains local-cookie based; Quiz auth uses a server-only per-portal-user env mapping.
- Quiz pages are fetched and parsed by route handlers because the upstream site cannot be framed.
- Closed Quiz pages may contain answers upstream, but parser output strips answer labels and answer text.
- If a portal user has no Quiz mapping, the Homework page keeps the Quiz entry and shows a clear source-link fallback.
- SAG setup content is concise and modern; Chocolatey is a Windows fallback matching the official screenshot.

## Validation

- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run build`
