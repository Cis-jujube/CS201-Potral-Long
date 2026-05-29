# CS201 Course Portal

A polished, week-driven university course portal built with Next.js App Router, TypeScript, and Tailwind CSS.

Username：test
Password：T7q!4Lz?

## Product Highlights
- 7-week learning navigation with persistent week context (`Week 1` to `Week 7`)
- Top navigation + mobile drawer (sidebar-free shell)
- Fixed Bento Grids layout for the Home dashboard
- Two switchable themes:
  - `Light`
  - `Dark`
- Local progress and personalization persistence:
  - completed tasks
  - bookmarked resources
  - selected week
  - selected theme
- Mock-first API integration via Next.js Route Handlers (`app/api/course/*`)

## Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS (v4)
- Route Handlers for API integration layer
- Vitest + Testing Library for unit/component tests
- Playwright for e2e tests

## Project Structure
```text
app/
  api/course/
  exams/page.tsx
  faq/page.tsx
  homework/page.tsx
  page.tsx
  projects/page.tsx
  resources/page.tsx
  sag/page.tsx
  weekly-planner/page.tsx
components/
  home/
  layout/
  pages/
  sag/
  ui/
hooks/
  useCourseOverview.ts
  useSagOverview.ts
lib/
  api/
  config/
  course/
  mock/
  storage/
providers/
  CourseUiProvider.tsx
styles/
  tokens.css
tests/
e2e/
```

## Environment Variables
Copy `.env.example` to `.env.local`.

```bash
COURSE_API_BASE_URL=
COURSE_API_KEY=
CS201_PORTAL_SESSION_SECRET=
CS201_REQUIRE_TEACHER_SSO=
TEACHER_SSO_BASE_URL=
TEACHER_SSO_CLIENT_ID=cs201-portal
TEACHER_SSO_CLIENT_SECRET=
TEACHER_SESSION_ENCRYPTION_SECRET=
```

Notes:
- If `COURSE_API_BASE_URL` is missing or professor API fails, app automatically falls back to mock data.
- Secrets are never hardcoded in UI components.
- Leave `CS201_REQUIRE_TEACHER_SSO` empty for local fallback login. Set it to `1` only after the professor site deploys `/portal-sso/authorize/` and `/portal-sso/token/`.
- When teacher SSO is required, students are redirected to Repolab and the portal stores only an encrypted httpOnly teacher-session cookie. Local login remains available through `/login?local=1` for development and failure fallback.

## Run Locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Scripts
```bash
npm run dev         # start local dev server
npm run build       # production build
npm run start       # run built app
npm run lint        # lint checks
npm run test        # unit/component tests with coverage
npm run test:watch  # watch mode tests
npm run test:e2e    # Playwright e2e
```

If `localhost:3000` is already occupied by another local app, run e2e on a free port:

```bash
E2E_PORT=3302 npm run test:e2e
```

## Theme Switching
- State is managed in `providers/CourseUiProvider.tsx`.
- Root-level attributes drive theme mode:
  - `data-theme="light" | "dark"`
- Tokens are defined in `styles/tokens.css`.
- Components stay shared; the Home layout uses the default Bento Grids preset.

## Data Architecture
- UI consumes normalized domain types from `lib/course/types.ts`.
- Route handlers under `app/api/course/*` are the integration layer.
- `lib/api/professorClient.ts` handles live fetch + mock fallback.
- `lib/api/normalizers.ts` normalizes unstable payloads into safe internal shapes.
- `lib/course/selectors.ts` provides week filtering, progress calculation, and map derivation.
- `lib/home/weightedLayout.ts` controls weight-to-tile span mapping for homepage modules.

## Future Extension Points
- Add auth and per-user sync (e.g. Supabase) without breaking UI layer contracts.
- Replace mock fallback gradually as professor API coverage grows.
- Add analytics and submission telemetry at route handler level.

## Deployment (Vercel)
1. Push repository to Git provider.
2. Import project into Vercel.
3. Set environment variables:
   - `COURSE_API_BASE_URL`
   - `COURSE_API_KEY` (if needed)
4. Deploy.
