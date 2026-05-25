# Restricted Test Account

## Goal

- Add a local portal account with username `test`.
- Use an 8-character complex password for temporary testing.
- Let the account view local/static course resources only.
- Prevent this account from accessing professor-site-backed Quiz, BK, AI Reflection, Projects, BK Project, Admin, and course sync APIs.
- Deploy the same behavior and account credentials to the Duke VCM deployment.

## Scope

- In scope: auth policy helpers, middleware route/API restriction, environment account configuration, tests, VM redeploy.
- Out of scope: teacher-site SSO behavior for normal users, professor-site API implementation, and HTTPS/network changes on the VM.

## Access Contract

- Allowed for restricted local users:
  - `/resources`
  - `/resources/materials/*`
  - `/resources/class-notes/*`
  - `/course-materials/*`
  - `/api/class-notes/week/*`
  - `/faq`
  - `/sag`
  - `/exams`
- Redirected to `/resources`:
  - `/`
  - `/homework`
  - `/projects`
  - `/admin`
  - `/weekly-planner`
- Denied with `403`:
  - restricted API requests outside the allowed class-notes read endpoint
  - teacher SSO start/callback while the restricted account is already logged in

## TODO

- [x] Add restricted user policy helpers.
- [x] Enforce restricted routes in middleware.
- [x] Add local `test` credential and restricted-user environment entry.
- [x] Add unit tests for policy and middleware behavior.
- [x] Run local validation.
- [x] Deploy to VCM and verify credentials plus blocked access.

## Review

- Added `CS201_RESTRICTED_LOCAL_USERS` as the long-term policy switch for local-only test accounts.
- Added middleware enforcement before professor-site-backed APIs run.
- The `test` account is present in both local `.env.local` and VM `.env.local`; the password is not stored in docs.
- Local validation passed: `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`.
- VCM validation passed after rebuilding and restarting `cs201-portal.service`.
- Remote access validation for `test`:
  - login: `200`
  - `/resources`: `200`
  - `/api/class-notes/week/1`: `200`
  - `/` and `/projects`: `307` redirect to `/resources`
  - `/api/quiz/week/1`: `403`
  - `/api/bk-projects/week/1`: `403`
  - `/api/reflections/week/1`: `403`
  - `/api/course/overview`: `403`
  - `/api/auth/teacher/start`: `403`
