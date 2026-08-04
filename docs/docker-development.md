# Docker Development

## Scope

This setup runs the main Vite app and the standalone admin preview without changing `package.json` or the host Vite defaults.

- Main: `http://127.0.0.1:3000/`
- Admin: `http://127.0.0.1:2801/`
- Admin runtime config check: `http://127.0.0.1:2801/pm-env.js?v=1`

The default bindings are loopback-only. LAN or Tailscale exposure requires an explicit, reviewed port override.

## Prerequisites

1. Start Docker Desktop and select the Linux container engine.
2. Keep the six public `VITE_FIREBASE_*` web configuration values in the host `.env` file.
3. Do not put service-account JSON, private keys, Rules drafts, or credentials in Compose overrides.

Compose passes only the six named public Firebase web values. It does not mount or copy `.env`.

## Start

```powershell
docker compose -f compose.dev.yaml config --quiet
docker compose -f compose.dev.yaml build
docker compose -f compose.dev.yaml up -d
docker compose -f compose.dev.yaml ps
```

Check recent output:

```powershell
docker compose -f compose.dev.yaml logs --no-color --tail=200
```

Check tool versions inside the main container:

```powershell
docker compose -f compose.dev.yaml exec myweb-main node --version
docker compose -f compose.dev.yaml exec myweb-main npm --version
```

## Source Watch

The project root is not bind-mounted. `docker compose watch` synchronizes only the allowlisted runtime paths for the main Vite service. Admin source changes rebuild its isolated image and regenerate `dist-admin`.

```powershell
docker compose -f compose.dev.yaml watch
```

Changes to `package.json` or `package-lock.json` trigger an image rebuild. This setup does not modify either file.

## Stop

```powershell
docker compose -f compose.dev.yaml down
docker compose -f compose.dev.yaml ps
```

Do not add `-v` during normal shutdown. There are no project-root or credential mounts to remove.

## Safety

`.dockerignore` is deny-by-default. The image receives only the runtime source, the three required build/preview scripts, and package lock files. It excludes `.env*`, `.git`, `.firebase`, `node_modules`, build outputs, documentation, backups, logs, Rules drafts, private keys, service-account files, and archives.

The containers run as the unprivileged `node` user, drop Linux capabilities, and enable `no-new-privileges`. Neither service performs Firebase Admin operations or Firestore migrations.

## Troubleshooting

- Docker API pipe missing: start Docker Desktop, wait for the Linux engine, then rerun `docker info`.
- Missing Firebase values: verify the six public `VITE_FIREBASE_*` keys exist in the host `.env`; do not copy `.env` into the image.
- Port occupied: stop the process using 3000 or 2801. Do not permanently change app URLs or Vite defaults for a local conflict.
- Admin startup takes longer because it runs typecheck and creates `dist-admin` before serving.
- A school integration endpoint is optional. When it is not explicitly configured, the UI reports `not_configured` and sends no `/api` request.

Docker and Windows-host development use the same source and package lock, but have separate runtime filesystems. Host `node_modules`, generated build directories, and local secrets are never mounted into the containers.
