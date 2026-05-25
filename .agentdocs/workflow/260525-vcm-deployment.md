# VCM Deployment

## Goal

- Deploy the CS201 portal from this workspace to the Duke Ubuntu VM `vcm-53362.vm.duke.edu`.
- Keep the deployed site running after the upload command exits.
- Verify both local service reachability on the VM and browser/public HTTP reachability from the workstation when network policy allows it.

## Scope

- In scope: local validation, deployment packaging, remote Node runtime checks, project upload, environment file transfer, dependency install, production build, persistent process/service setup, and HTTP validation.
- Out of scope: changing CS201 portal product behavior, changing professor-site APIs, changing Duke VCM network/firewall policy, and exposing secrets in docs or logs.

## Deployment Plan

- Use `vcm` as the remote admin account from Duke VCM.
- Deploy the app under a stable directory such as `/opt/cs201-portal`.
- Use the existing Next.js production path: `npm install`, `npm run build`, `npm run start -- --hostname 0.0.0.0 --port 3300`.
- Prefer a `systemd` service when available so the app restarts after VM reboot.
- Preserve `.env.local` values by copying the local file without printing secret values.

## TODO

- [x] Confirm project and deployment target.
- [x] Run local validation/build checks.
- [x] Connect to the VM and inspect runtime prerequisites.
- [x] Upload source and environment files.
- [x] Install production/runtime dependencies and build on the VM.
- [x] Configure persistent service.
- [x] Verify deployed HTTP endpoint.

## Review

- Local validation passed before deployment: `npm run lint`, `npm run test`, `npm run build`, and `npm run test:e2e`.
- VM upload used a compressed tarball and one-time `nc` TCP stream because SFTP was too slow for the 265 MB package.
- Remote build completed successfully and produced `.next/BUILD_ID`.
- `cs201-portal.service` is enabled and active on port `3300`.
- Workstation validation passed for `http://vcm-53362.vm.duke.edu:3300/login`.
- Login session validation passed over HTTP with `CS201_ALLOW_INSECURE_COOKIES=true` set only in the VM environment.

## Validation

- Local: `npm run lint`, `npm run test`, `npm run build`.
- Remote: `node --version`, `npm --version`, `npm run build`, `systemctl status cs201-portal`, and `curl http://127.0.0.1:3300`.
- Workstation/public: open or request `http://vcm-53362.vm.duke.edu:3300` if Duke network policy exposes that port.
