# Task: Global Color Harmonization and Home Hero Removal

## Context

- Remove the Home hero block (`Week-Driven Navigation`) while keeping week controls in the top navigation.
- Apply low-saturation semantic color tones across Home, SAG, Homework, Planner, Projects, Resources, Exams, and FAQ.
- Keep layout structure and existing interaction behavior stable.

## Decision Snapshot

- Tone palette: `violet / blue / cyan / emerald / amber / rose` for both light and dark themes.
- Introduce reusable utility classes:
  - `panel-gradient-soft`
  - `module-tone-{tone}`
  - `module-tone-subtle-{tone}`
  - `module-tone-border`
- Home tiles reduced from 7 to 6 modules by removing the standalone hero slot.

## Execution Phases

- [x] Add semantic tone types and shared mapping config (`moduleTones`)
- [x] Add global tone tokens and utility classes in CSS (light + dark)
- [x] Remove Home hero and rewire Home tile layout + tone assignments
- [x] Apply tone mapping to secondary pages and page intro surfaces
- [x] Update/extend tests (weighted layout count, tone mapping unit tests, e2e assertions)
- [x] Run validation (`npm run lint`, `npm run test`, `npm run test:e2e`)

## Validation Snapshot

- `npm run lint`: pass
- `npm run test`: pass (9 files, 18 tests)
- `npm run test:e2e`: pass (8 tests) on ASCII mirror path `C:\Users\zaoza\codex-workspace\cs201-portal-local`
- Note: hydration mismatch warning still appears from `CourseUiProvider` localStorage week state, but it is pre-existing and does not block current assertions.
