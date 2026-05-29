# Restricted Test Account

## Goal

- Add a local portal account with username `test`.
- Use an 8-character complex password for temporary testing.
- Let the account browse normal portal pages for review.
- Prevent this account from downloading local course files or writing to professor-site-backed Quiz, BK, AI Reflection, BK Project, Admin, and teacher SSO APIs.
- Deploy the same behavior and account credentials to the Duke VCM deployment.

## Scope

- In scope: auth policy helpers, request proxy page/download/write restriction, environment account configuration, tests, VM redeploy.
- Out of scope: teacher-site SSO behavior for normal users, professor-site API implementation, and HTTPS/network changes on the VM.

## Access Contract

- Allowed for restricted local users:
  - normal portal page routes such as `/`, `/homework`, `/projects`, `/resources`, `/faq`, `/sag`, and `/exams`
  - read-only `GET` APIs outside teacher SSO
  - local login/logout APIs
- Denied with `403`:
  - `/course-materials/*`
  - `/reflection-templates/*`
  - non-GET API requests outside local login/logout
  - teacher SSO start/callback while the restricted account is already logged in

## Previous Access Contract

- Earlier restricted behavior allowed only:
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
- [x] Enforce restricted routes in the Next.js request proxy.
- [x] Add local `test` credential and restricted-user environment entry.
- [x] Add unit tests for policy and proxy behavior.
- [x] Run local validation.
- [x] Deploy to VCM and verify credentials plus blocked access.

## Review

- Added `CS201_RESTRICTED_LOCAL_USERS` as the long-term policy switch for local-only test accounts.
- Added request proxy enforcement before professor-site-backed APIs run.
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

## Follow-up Fix

- Fixed a VM `.env.local` duplicate-key regression where a later `CS201_PORTAL_USERS=test:...` line overrode the earlier full user list at Next runtime.
- Deduplicated both local and VM `.env.local` so Next now loads `jujube,baba,zw354,test`.
- Revalidated `zw354`: login `200`, `/` `200`, `/projects` `200`, `/api/quiz/week/1` `200`.
- Revalidated `test`: login `200`, `/resources` `200`, `/projects` `307` to `/resources`, `/api/quiz/week/1` `403`.

## 2026-05-29 Policy Update

- Updated the restricted account rule from resource-only browsing to broad read-only page browsing.
- Restricted accounts can now open normal pages and read GET APIs, but direct course file/template paths return `403`.
- Restricted accounts still cannot use non-GET write APIs or teacher SSO start/callback.
- Remote v2 validation passed for `test`: login `200`, `/projects` `200`, `/course-materials/textbook/cs201-textbook.pdf` `403`, `/api/quiz/question/101/submit` POST `403`.
