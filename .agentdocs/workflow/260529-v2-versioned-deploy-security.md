# V2 Versioned Deploy And Security Hardening

## Goal

- Publish the second CS201 portal version to the Duke VCM without overwriting the existing first version.
- Keep v1 and v2 side by side and make the live service select the active version through a stable pointer.
- Run one security pass before deployment and document any remaining external blockers.

## Scope

- In scope: dependency audit, framework security upgrade, browser response-header hardening, local validation, VCM release layout, and live-pointer switch plan.
- Out of scope: professor-site SSO endpoint deployment, replacing the Duke VCM SSH credential model, and printing production secrets.

## Deployment Model

- This is a versioned release deployment with a rollback-capable `current` symlink.
- v1 remains at `/opt/cs201-portal/app`.
- v2 should be uploaded to `/opt/cs201-portal/releases/<timestamp>-v2`.
- `/opt/cs201-portal/current` selects the active version used by `cs201-portal.service`.

## TODO

- [x] Run local dependency and security audit.
- [x] Upgrade vulnerable framework/runtime dependencies.
- [x] Add route-level browser hardening headers.
- [x] Validate lint, unit/integration tests, production build, and E2E locally.
- [x] Add a repeatable versioned VCM deployment script.
- [ ] Authenticate to the VCM over SSH.
- [ ] Upload v2 into a separate release directory.
- [ ] Switch `/opt/cs201-portal/current` to v2 and restart the service.
- [ ] Validate remote health and record the active release.

## Current Blocker

- `vcm-53362.vm.duke.edu` is reachable on ports `22` and `3300`.
- SSH host key trust has been established locally.
- SSH authentication currently fails with `Permission denied (publickey,password)` because this workstation has no private key in `~/.ssh` and no running `ssh-agent` identity.

## Security Review

- Fixed dependency audit findings by upgrading Next.js to `16.2.6`, aligning `eslint-config-next`, and forcing `postcss@8.5.10`.
- Migrated route protection from deprecated `middleware.ts` to Next.js `proxy.ts`.
- Added global hardening headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Permissions-Policy`.
- Teacher SSO status API returns only configuration/session metadata and never returns the teacher access token.
- Real professor SSO end-to-end validation remains blocked until the professor site exposes `/portal-sso/authorize/` and `/portal-sso/token/`.
