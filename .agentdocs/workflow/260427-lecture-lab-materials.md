# Lecture Lab Materials

## Vision

Resources becomes the focused place for CS201 learning materials: Lecture and Lab tabs show the exact local PDFs that match the official schedule and lab-session tables, while the full imported archive stays on `/course-site`.

## Current Sources

- `data/course-site/normalized.json` contains the imported official schedule and lab session tables.
- Workspace sibling folder `../Slide/` contains local lecture PDFs.
- Workspace sibling folder `../Lab/` contains local lab PDFs.
- `data/course-site/raw/assets/` contains imported lab PDFs and some answer PDFs from the official site.

## Implementation Plan

- [x] Confirm source tables and local folders.
- [x] Generate `data/course-materials/manifest.json` from the imported course-site tables.
- [x] Copy public PDFs into `public/course-materials/lecture/`, `public/course-materials/lab/`, and `public/course-materials/lab/answers/`.
- [x] Replace Resources search library with `Lecture` and `Lab` tabs.
- [x] Add `/resources/materials/[id]` preview route with download/open actions.
- [x] Add parser/content, component, and e2e coverage.
- [x] Run lint, unit tests, e2e tests, then sync the ASCII mirror and restart `127.0.0.1:3300`.

## Validation

- `npm run build:materials`: passed, generated 32 top-level material items and 11 answer children.
- `npm run lint`: passed.
- `npm run test`: passed, 37 tests across 15 files.
- `npm run test:e2e`: passed, 9 Playwright tests.
- `http://127.0.0.1:3300/resources`: smoke checked after ASCII mirror restart.
- `http://127.0.0.1:3300/resources/materials/[id]`: smoke checked with `CS.1.Basics.pdf`.
- `http://127.0.0.1:3300/course-materials/lecture/CS.1.Basics.pdf`: returns `application/pdf`.

## Design Notes

- Missing local lecture files are not fabricated; they remain visible with source links or an unavailable state.
- Lab entries show the primary material first, then answer children under the same week item.
- Preview routes always use stable manifest ids so Resources links do not depend on raw disk paths.
