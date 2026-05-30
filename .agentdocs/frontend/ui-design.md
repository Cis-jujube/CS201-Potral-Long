# Frontend UI Constraints

## Top Navigation

- The first header row is `Week Navigation + week switcher + global search`; do not restore the old brand-only header row.
- Full primary navigation and the Light/Dark switcher share a row only at `>=1800px`; below that breakpoint, use the drawer to avoid crowding.
- Display preferences must not expose the retired `Bento Box Grid` layout option. Home stays on the default Bento Grids layout.
- Header utility actions, including collapse, logout, and drawer menu, stay grouped on the right edge. The daily quote is a compact single-row header element aligned with that utility group rather than a full-width block under the navigation.
- Global search remains visible on all pages. Search submitted outside Home must route to `/?q=...`.

## Home Modules

- `Task Calendar` is embedded inside `This Week Tasks`; do not render it as a standalone Home tile and do not restore an `Upcoming Deadlines` list.
- AI Reflection cards remain visible as reflection entries and use `recommended` due styling, not required styling.
- Required and recommended due states must be visually distinct in task cards and calendar days. Use clear text chips in addition to color so the difference is readable without relying on color alone.
- Home Quiz status colors are fixed: passed/correct is green, closed/not passed is red, and open/not done is gray. The Quiz column must show total/correct/incorrect/not-done counts when live Quiz data is available.
- Search hides modules with no matching content and uses a unified empty state when nothing matches.
- `Learning Map`, `This Week Tasks`, `ED Forum`, and `Textbooks` remain controlled by the shared Home filtering flow.

## Admin Publishing Workbench

- Admin edits are explicit-save local portal changes. Do not imply teacher-site publishing or automatic student sync before Save.
- Admin should behave like a dense professor workbench: status strip, selected-week scope, segmented `Dates` / `Files` / `Preview` sections, sticky save/reset actions, compact rows, and thin bordered surfaces.
- Date editing is weekly and table-driven. Editable fields are title, date, time, visibility, and due display only; do not add description/detail editing back to Admin.
- Editable rows should expose derived status chips: `Student-visible` or `Hidden`, plus `Unsaved changes` or `Saved locally`.
- Preview as student must show only content that is not hidden for the selected week, including class notes.
- Class Notes management supports multi-file PDF/image upload queues, auto-generated titles from file names, week assignment, visibility toggles, preview links, and delete. It should remain searchable and filterable by visibility once uploads become numerous.

## Responsive Rules

- At medium desktop widths, preserve readability and click stability before visual density.
- Do not rely on temporary icon shrinking, text compression, or accidental wrapping to make a layout fit.
- Mobile drawers must be shrink-safe: icons stay `shrink-0`, labels truncate inside `min-w-0`, switcher controls wrap or stack, and drawer content must not create horizontal page overflow.
