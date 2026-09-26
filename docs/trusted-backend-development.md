# Trusted Backend Development

## Purpose

TB-01 provides an Emulator-only Firebase Functions v2 TypeScript skeleton. It contains one safe health endpoint and no business operation, membership flow, identity flow, MFA flow, nonce, security audit database, or production backend.

## Runtime Contract

The only accepted runtime is:

```text
MYWEB_TRUSTED_BACKEND_MODE=emulator
project ID starts with demo-
FUNCTIONS_EMULATOR=true
Firestore Emulator host is loopback
Auth Emulator host is loopback
GOOGLE_APPLICATION_CREDENTIALS is absent
```

Missing, unknown, preview, staging, or production-like values fail closed before Admin SDK initialization. Project IDs from HTTP bodies, queries, or headers are never used.

Demo project: `demo-myweb-trusted-backend`

## Ports

| Emulator | Host | Port |
| --- | --- | --- |
| Functions | `127.0.0.1` | `5002` |
| Auth | `127.0.0.1` | `9098` |
| Firestore | `127.0.0.1` | `8084` |
| Emulator UI | `127.0.0.1` | `4001` |

The existing Rules test port `8083` is unchanged.

## Install, Build, and Unit Tests

Run inside `functions/`:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test
```

No service-account file or production credential is needed.

## Emulator Integration Test

From the repository root in PowerShell:

```powershell
$env:MYWEB_TRUSTED_BACKEND_MODE = "emulator"
$previousXdgConfigHome = $env:XDG_CONFIG_HOME
$env:XDG_CONFIG_HOME = Join-Path $env:TEMP "myweb-tb01-firebase-cli"
New-Item -ItemType Directory -Force -Path $env:XDG_CONFIG_HOME | Out-Null
try {
  node .\tools\firestore-rules-tests\node_modules\firebase-tools\lib\bin\firebase.js `
    emulators:exec `
    --config firebase.trusted-backend-emulator.json `
    --project demo-myweb-trusted-backend `
    --only functions,auth,firestore `
    "npm.cmd --prefix functions run test:integration"
} finally {
  Remove-Item Env:\MYWEB_TRUSTED_BACKEND_MODE -ErrorAction SilentlyContinue
  if ($null -eq $previousXdgConfigHome) {
    Remove-Item Env:\XDG_CONFIG_HOME -ErrorAction SilentlyContinue
  } else {
    $env:XDG_CONFIG_HOME = $previousXdgConfigHome
  }
}
```

The isolated CLI config prevents an existing workstation Firebase login from injecting a temporary credential into the Functions Emulator. `emulators:exec` shuts down the Emulator processes after the integration command. Verify the configured ports are free before and after the run. Do not use `.firebaserc`, `firebase use`, login, deploy, or a production project ID.

## Health Endpoint

The Functions Emulator endpoint is:

```text
GET http://127.0.0.1:5002/demo-myweb-trusted-backend/us-central1/trustedBackendHealth
```

The response contains only `ok`, `mode`, `demoProject`, backend version, and contract version. It does not expose the project ID, Firebase config, environment dump, local path, user data, token, or credential. The endpoint performs no Firestore or Auth write.

## Production Hold

- No Functions, Hosting, Rules, or Indexes deployment is authorized.
- No production or preview runtime mode is implemented.
- No service account, Application Default Credential, Secret Manager access, or external API is used.
- `firebase.json` and `.firebaserc` remain unchanged.
- The frontend main/admin/app-next runtime is unchanged.

## Next Batch

TB-02 may add verified-actor middleware for callable and HTTP adapters. It requires a separate review and must preserve the Emulator-only guard until a production deployment design is explicitly approved.
