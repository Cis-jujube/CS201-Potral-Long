# V3 Versioned Release

## Goal

Publish the current CS201 Portal workspace as version 3:

- Commit and push the current local portal implementation to `origin/main`.
- Deploy the same committed `HEAD` to the Duke VCM as a versioned release.
- Preserve the legacy `/opt/cs201-portal/app` fallback and use `/opt/cs201-portal/current` for live traffic.

## Scope

- Include the current Admin workbench optimization, Homework JPA status sync, tests, agent docs, and generated beginner architecture DOCX/PDF.
- Do not include ignored restricted course assets from `public/course-materials/` or `data/course-site/raw/`.
- Do not print or commit `.env.local` secrets, VM password values, teacher-site credentials, or token values.

## Release Plan

1. Inspect `git status`, deployment docs, and remote configuration.
2. Run local validation: `npm run lint`, `npm run test`, and `npm run build`.
3. Commit the validated workspace as the v3 release candidate.
4. Push to `https://github.com/Cis-jujube/CS201-Potral-Long`.
5. Package committed `HEAD` with `git archive`.
6. Upload to `/opt/cs201-portal/releases/<timestamp>-v3`.
7. Link the shared production `.env.local` into the release.
8. Run `npm ci` and `npm run build` on the VCM.
9. Point `/opt/cs201-portal/current` at the v3 release and restart `cs201-portal.service`.
10. Validate service status and `http://vcm-53362.vm.duke.edu:3300/login`.

## TODO

- [x] Local validation passed.
- [x] GitHub push completed.
- [x] VCM v3 release directory created.
- [x] Remote build completed.
- [x] `cs201-portal.service` active after restart.
- [x] Public login URL responds.

## Validation Evidence

- Local validation passed: `npm run lint`, `npm run test`, `npm run build`, and `E2E_PORT=3310 npm run test:e2e`.
- Git commit published to GitHub: `7e72e62 Release CS201 portal v3`.
- First VCM v3 release validation passed at `/opt/cs201-portal/releases/20260530-2321-v3`.
- Remote service validation passed: `systemctl is-active cs201-portal.service` returned `active`.
- Public workstation validation passed: `http://vcm-53362.vm.duke.edu:3300/login` returned HTTP `200`.
