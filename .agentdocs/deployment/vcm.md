# Duke VCM Deployment

## Runtime

- Host: `vcm-53362.vm.duke.edu`.
- Legacy v1 app directory: `/opt/cs201-portal/app`.
- Versioned release root: `/opt/cs201-portal/releases`.
- Active app pointer: `/opt/cs201-portal/current`.
- Service: `cs201-portal.service`.
- Public URL: `http://vcm-53362.vm.duke.edu:3300`.
- Runtime user: `vcm`.
- Node runtime installed from NodeSource: Node `22.x`, npm `10.x`.

## Service Contract

- `systemd` owns process persistence and restart behavior.
- Service file: `/etc/systemd/system/cs201-portal.service`.
- Start command: `npm run start -- --hostname 0.0.0.0 --port 3300`.
- The service is enabled for boot with `systemctl enable cs201-portal.service`.

## Environment

- Production secrets live in `/opt/cs201-portal/shared/.env.local` for versioned releases. If the VM has not been migrated yet, copy the existing `/opt/cs201-portal/app/.env.local` there without printing values.
- Do not print secret values while debugging.
- The VCM currently exposes the app over HTTP port `3300` because ports `443` and `8443` are already occupied by an existing `xray` service.
- Remote `.env.local` sets `CS201_ALLOW_INSECURE_COOKIES=true` so local portal login works over HTTP. Normal HTTPS deployments should leave this unset.
- Remote `.env.local` sets `CS201_PORTAL_BASE_URL=http://vcm-53362.vm.duke.edu:3300`.
- Restricted local-only test users are configured with `CS201_RESTRICTED_LOCAL_USERS`; their passwords stay only in `.env.local`.
- Keep only one `CS201_PORTAL_USERS=` entry in `.env.local`. Next loads the later duplicate value if the key appears more than once, which can accidentally hide normal users such as `zw354`.

## Versioned Release Contract

- Do not overwrite `/opt/cs201-portal/app`; treat it as the preserved v1 fallback.
- Upload each new build into `/opt/cs201-portal/releases/<timestamp>-vN`.
- Link the shared environment file into the release as `.env.local`.
- Install dependencies and run `npm run build` inside the new release before changing live traffic.
- Switch live traffic by atomically updating `/opt/cs201-portal/current` to the new release and restarting `cs201-portal.service` with `WorkingDirectory=/opt/cs201-portal/current`.
- Rollback means pointing `/opt/cs201-portal/current` back to the previous release or to `/opt/cs201-portal/app`, then restarting the service.
- Use `scripts/deploy-vcm-versioned.ps1` from the project root once SSH authentication is available on the workstation. The script requires a clean Git worktree because it packages `HEAD` with `git archive`.

## Validation Commands

```bash
systemctl is-enabled cs201-portal.service
systemctl is-active cs201-portal.service
systemctl --no-pager --full status cs201-portal.service
readlink -f /opt/cs201-portal/current
curl -I http://127.0.0.1:3300/login
curl -sS http://127.0.0.1:3300/login | grep -o '<title>[^<]*</title>' | head -1
```

From the workstation, verify:

```powershell
Test-NetConnection vcm-53362.vm.duke.edu -Port 3300
Invoke-WebRequest -Uri 'http://vcm-53362.vm.duke.edu:3300/login' -UseBasicParsing
```
