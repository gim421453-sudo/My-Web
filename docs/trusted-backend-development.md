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

## TB-02 VerifiedActor Contract

TB-02 adds Emulator-only Firebase Authentication middleware. It accepts an ID token only from the HTTP `Authorization: Bearer <ID_TOKEN>` header, verifies it with Firebase Admin Auth with revocation checking enabled, and then loads the Firebase Auth user record to confirm that the account exists and is enabled. The actor UID comes only from the verified token. Email verification comes only from the Auth user record.

`VerifiedActor` is authentication context only. It contains no system-owner, role, workspace, membership, capability, assignment, or identity-verification authority. Authorization remains unresolved for a later trusted-backend layer.

The deployable Functions entry exports no actor, verified-email, debug, dev, or test
probe. Integration tests obtain real Auth Emulator ID tokens and call the
`verifyActorFromRequest` core directly through dependency injection. This preserves
the authentication coverage without registering a deployable diagnostic endpoint.
The build cleans `functions/lib` before TypeScript compilation so a deleted probe
wrapper cannot remain as a stale artifact. A source-and-compiled export gate enforces
the Health-only production entry.

Run build, unit tests, and Emulator integration with an explicitly selected Node 22 executable. Do not store a workstation-specific runtime path in this repository. The current integration creates temporary users only inside the demo Auth Emulator, verifies valid, malformed, disabled, missing-user, email-policy, and revoked-token behavior through the core verifier, performs no Firestore operation, and discards fixture state when the Emulator exits.
- The frontend main/admin/app-next runtime is unchanged.

## Next Batch

TB-03 may add authorization resolvers only after the strict owner and canonical
membership migration policy is implemented and reviewed. It must preserve the
Emulator-only guard until a production deployment design is explicitly approved.
