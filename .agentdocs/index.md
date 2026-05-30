# Project Index

## Global Notes

- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Vitest, Playwright
- Runtime constraint: local workspace path contains non-ASCII segments under OneDrive; run stable local server from an ASCII mirror path when needed.
- Validation baseline for frontend changes: `npm run lint`, `npm run test`, `npm run test:e2e`.
- Imported official CS201 course-site archive lives under `data/course-site/`; refresh it with `npm run import:course-site` using environment-only credentials.
- Restricted course assets, including lecture/PPT slides, lab PDFs, imported raw course-site files, and the textbook PDF, must stay local/private and must not be committed or pushed to GitHub. `public/course-materials/` and `data/course-site/raw/` are intentionally ignored.
- Class Notes are admin-managed local assets. Metadata lives in `data/admin-overrides/class-notes.json`, files live under `public/course-materials/class-notes/`, and student preview pages use `/resources/class-notes/[id]`.
- Current Duke VCM deployment runs on `vcm-53362.vm.duke.edu` via `cs201-portal.service` on port `3300`. Preserve legacy v1 at `/opt/cs201-portal/app`; new releases should live under `/opt/cs201-portal/releases` and be selected through `/opt/cs201-portal/current`.

## Frontend Docs

- [frontend/architecture.md](./frontend/architecture.md): component boundaries, provider responsibilities, search/filter data flow
- [frontend/ui-design.md](./frontend/ui-design.md): Week Navigation top-bar rules, responsive behavior, merged task/deadline panel rules

## Deployment Docs

- [deployment/vcm.md](./deployment/vcm.md): Duke VCM runtime path, systemd service, HTTP cookie override, and validation commands.

## Active Workflow Docs

- [workflow/260530-homework-jpa-status-sync.md](./workflow/260530-homework-jpa-status-sync.md): Sync real per-user JPA homework completion from the teacher site into `/homework`.
- [workflow/260530-admin-workbench-optimization.md](./workflow/260530-admin-workbench-optimization.md): Optimize `/admin` into a professor-focused date and Class Notes workbench with no description/detail editing.
- [workflow/260530-v3-release.md](./workflow/260530-v3-release.md): Publish the current portal workspace as version 3 to GitHub and the Duke VCM versioned release path.
- [workflow/260525-restricted-test-account.md](./workflow/260525-restricted-test-account.md): Maintain the local-only restricted `test` account; it can browse portal pages but cannot download course files or use write/teacher SSO APIs.
- [workflow/260529-v2-versioned-deploy-security.md](./workflow/260529-v2-versioned-deploy-security.md): Publish v2 through a rollback-capable VCM release directory and record the security hardening pass.
- [workflow/260525-vcm-deployment.md](./workflow/260525-vcm-deployment.md): Deploy the CS201 portal to the Duke Ubuntu VM, including remote runtime setup, file upload, service persistence, and public access validation.
- [workflow/260522-display-sso-homework-sync.md](./workflow/260522-display-sso-homework-sync.md): Remove alternate Bento Box layout control, keep pure traditional Chinese quotes, and document professor-site SSO/Homework sync boundary.
- [workflow/260522-home-quiz-navbar-calendar.md](./workflow/260522-home-quiz-navbar-calendar.md): Move Home header utilities/quote, surface live Quiz progress on Home, and align Quiz/Reflection due dates to Sunday.
- [workflow/260501-teacher-sso-portal-sync.md](./workflow/260501-teacher-sso-portal-sync.md): Add portal-side teacher SSO callback, encrypted teacher session cookie, and teacher-token-first content sync fallback.
- [workflow/260430-quiz-submit-context-fix.md](./workflow/260430-quiz-submit-context-fix.md): Fix Quiz submit context reuse for shuffled teacher-site choices and sanitize submit result messages
- [workflow/260430-student-admin-visual-publishing-polish.md](./workflow/260430-student-admin-visual-publishing-polish.md): Medium student UI polish for Home/Resources and Admin local publishing status/preview workflow
- [workflow/260430-class-notes-course-site-ai-due.md](./workflow/260430-class-notes-course-site-ai-due.md): Add Class Notes uploads/previews, Resources-only course-site placement, mobile drawer overflow fix, and AI Reflection recommended Sunday due dates
- [workflow/260429-home-calendar-ai-projects-admin.md](./workflow/260429-home-calendar-ai-projects-admin.md): Merge Home calendar into tasks, remove AI Reflection due semantics, add Projects fallback visibility, and add Admin v1 local override editing
- [workflow/260429-bk-project-voting-home-cleanup.md](./workflow/260429-bk-project-voting-home-cleanup.md): Connect Projects to BK team/voting sync, clean Home calendar/task behavior, fix reflection editing, and refine Exams grading policy
- [workflow/260428-reflection-resources-sync.md](./workflow/260428-reflection-resources-sync.md): Add Home week-matched PPT/Lab resources, reflection templates, teacher-site questionnaire sync, and CS201 textbook links
- [workflow/260428-quiz-homework-sag-setup.md](./workflow/260428-quiz-homework-sag-setup.md): Add weekly Quiz and Reflection entries to Homework, proxy Quiz interactions, and simplify SAG setup guidance
- [workflow/260427-auth-homework-calendar.md](./workflow/260427-auth-homework-calendar.md): Add login protection, collapsible Week Navigation, real JPA Homework details, and due-kind calendar interactions
- [workflow/260427-lecture-lab-materials.md](./workflow/260427-lecture-lab-materials.md): Build local Lecture/Lab material manifest, public PDF assets, Resources tabs, and preview routes
- [workflow/260425-course-site-content-import.md](./workflow/260425-course-site-content-import.md): Pull course-site content locally, normalize it, and place recognized sections into the CS201 portal
- [workflow/260420-week-navigation-rewrite.md](./workflow/260420-week-navigation-rewrite.md): Week Navigation rewrite, global search rollout, merged tasks/deadlines implementation status
- [workflow/260420-color-harmonization.md](./workflow/260420-color-harmonization.md): Remove home hero, roll out semantic module tones, and harmonize cross-page panel colors
- [workflow/260422-transcript-driven-ui-optimization.md](./workflow/260422-transcript-driven-ui-optimization.md): Full transcript-driven rewrite for Home/SAG/Homework/Projects/Resources and Planner deprecation
