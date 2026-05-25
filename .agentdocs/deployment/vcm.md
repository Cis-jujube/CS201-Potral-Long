# Duke VCM Deployment

## Runtime

- Host: `vcm-53362.vm.duke.edu`.
- App directory: `/opt/cs201-portal/app`.
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

- Production secrets live in `/opt/cs201-portal/app/.env.local`.
- Do not print secret values while debugging.
- The VCM currently exposes the app over HTTP port `3300` because ports `443` and `8443` are already occupied by an existing `xray` service.
- Remote `.env.local` sets `CS201_ALLOW_INSECURE_COOKIES=true` so local portal login works over HTTP. Normal HTTPS deployments should leave this unset.
- Remote `.env.local` sets `CS201_PORTAL_BASE_URL=http://vcm-53362.vm.duke.edu:3300`.
- Restricted local-only test users are configured with `CS201_RESTRICTED_LOCAL_USERS`; their passwords stay only in `.env.local`.

## Validation Commands

```bash
systemctl is-enabled cs201-portal.service
systemctl is-active cs201-portal.service
systemctl --no-pager --full status cs201-portal.service
curl -I http://127.0.0.1:3300/login
curl -sS http://127.0.0.1:3300/login | grep -o '<title>[^<]*</title>' | head -1
```

From the workstation, verify:

```powershell
Test-NetConnection vcm-53362.vm.duke.edu -Port 3300
Invoke-WebRequest -Uri 'http://vcm-53362.vm.duke.edu:3300/login' -UseBasicParsing
```
