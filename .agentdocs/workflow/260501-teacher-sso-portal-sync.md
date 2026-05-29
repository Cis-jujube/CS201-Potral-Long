# Teacher SSO Portal Sync

## Goal

- Add portal-side SSO entry and callback for teacher-site login from `http://repolab.colab.duke.edu:8005`.
- Use teacher-site identity as the portal username after SSO callback succeeds.
- Store teacher-site access token only in an encrypted httpOnly cookie.
- Keep legacy local portal login and env-based Quiz/BK user maps as fallback.

## Scope

- In scope: CS201 portal login UI, auth routes, auth helpers, Quiz/BK/Reflection server-side sync resolution, tests, environment docs.
- Out of scope: teacher-site implementation, because teacher-site source is not present in this repository.

## TODO

- [x] Add portal SSO helper and encrypted teacher session cookie.
- [x] Add SSO start/callback API routes.
- [x] Update login page with Repolab login entry.
- [x] Update Quiz/BK/Reflection routes to prefer teacher token sessions.
- [x] Add optional teacher-site-first login mode with local fallback.
- [x] Add teacher SSO status API that does not expose access tokens.
- [x] Add unit and route tests.
- [x] Run lint/test/e2e.

## Contracts

- Teacher authorize endpoint: `/portal-sso/authorize/`.
- Teacher token endpoint: `/portal-sso/token/`.
- Token exchange request body: `client_id`, `client_secret`, `code`, `redirect_uri`.
- Token exchange response body: `username`, optional `displayName`, `accessToken`, `expiresAt`.
- `CS201_REQUIRE_TEACHER_SSO=1` auto-starts teacher SSO for unauthenticated page access when SSO is configured.
- `/login?local=1` remains the local portal fallback for development, admin, restricted test accounts, and SSO failure recovery.
- `/api/auth/teacher/status` returns configuration/session metadata only; the teacher access token stays inside the encrypted httpOnly cookie.
