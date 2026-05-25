# Class Notes Course Site AI Due

## Goal

Add a student-facing Class Notes material lane with admin-managed uploads, move visible course-site import panels exclusively to Resources, fix mobile drawer overflow, and restore AI Reflection due information as Sunday recommended due dates.

## Constraints

- Class Notes stores files and metadata locally only; it never writes teacher-site x.bk data.
- Admin uploads only allow PDF, PNG, JPG/JPEG, and WEBP.
- Resources is the only page allowed to show visible course-site import/highlight panels or labels.
- AI Reflection due dates are portal display rules only and do not auto-submit to the teacher site.
- Do not store passwords or teacher-site credentials in docs, code, tests, or fixtures.

## Phases

- [x] Phase 1: Update agent docs and replace old AI no-due documentation.
- [x] Phase 2: Change AI Reflection tasks/deadlines/practice entries to recommended Sunday due.
- [x] Phase 3: Add Class Notes metadata store, admin APIs, student API, and preview route.
- [x] Phase 4: Add Resources Class Notes tab and Resources-only Official Course Site section.
- [x] Phase 5: Add Admin Files/Class Notes management UI.
- [x] Phase 6: Remove visible course-site panels from Home/Homework/SAG/Exams/FAQ and fix Navbar mobile drawer overflow.
- [x] Phase 7: Update unit/e2e coverage and run validation.
- [x] Phase 8: Sync ASCII mirror and verify `http://127.0.0.1:3300`.

## Validation

- `npm run lint`: pass.
- `npm run test`: pass, 32 files and 89 tests.
- `npm run test:e2e`: pass, 14 tests.
- `npm run build`: pass.
- ASCII mirror sync and HTTP smoke check: pass, `/login` HTTP 200 and authenticated `/resources` HTTP 200 with `Class Notes` and `Official Course Site`.

## Design Notes

- Class Notes use stable note ids and a separate `/resources/class-notes/[id]` preview route so teacher-uploaded notes do not mix with generated lecture/lab material ids.
- Hidden Class Notes remain visible in Admin and are excluded from student APIs.
- PDF previews use an iframe; images render directly in the preview page and Resources tab.
- The mobile drawer should never create page-level horizontal scrolling; drawer content uses shrink-safe icons, truncating labels, and wrapped display controls.
