# Auth Session Sharing Test Checklist

Use only `127.0.0.1` origins for browser checks.

## Addresses

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=on
```

Do not mix `localhost` and `127.0.0.1` while testing auth/session behavior.

## Before Testing

1. Wait for Firestore daily quota to reset if the project is currently blocked by `resource-exhausted`.
2. Open one browser profile only.
3. Clear only test tabs, not production Firebase data.
4. Open DevTools Console.
5. Run:

```js
window.PMAuthBootstrapDiagnostics?.reset?.()
window.PMAuthBootstrapDiagnostics?.snapshot?.()
```

## Static App Login Check

1. Open `http://127.0.0.1:5173/`.
2. Log in with an existing active account.
3. Wait until the dashboard finishes loading.
4. Run:

```js
window.PMAuthBootstrapDiagnostics?.snapshot?.()
```

Expected after a stable account restore:

```text
bootstrapCommitCount stays 0 or only increases when a real structural diff is repaired
bootstrapSkippedNoDiffCount increases
deviceWriteCount stays 0 if the device doc already exists and matches
welcomeNotificationWriteCount stays 0 if welcome_{uid} already exists
resourceExhaustedCount stays 0
backoffActive false
```

## app-next Session Sharing Check

1. Keep the static app tab open.
2. Open `http://127.0.0.1:5173/app-next.html?appNext=on&appNextLogin=on`.
3. Sign in with Google from app-next.
4. Return to the static app tab.
5. Confirm that any auth state restore does not repeatedly print `commit user workspace bootstrap`.
6. Run diagnostics again in the static app tab.

Expected:

```text
No repeated bootstrap commit loop
No automatic sign-out
No welcome notification duplicate write
No device duplicate write
No Firestore write spike from simply opening app-next
```

## In-flight Deduplication Check

Quickly refresh or open two static app tabs on `127.0.0.1`.

Expected:

```text
bootstrapBlockedInFlightCount may increase
bootstrapCommitCount does not increase once per racing caller
```

## Quota Error Check

If Firestore returns `resource-exhausted`:

```text
resourceExhaustedCount increases
backoffActive true
no automatic retry loop
no automatic sign-out from the changed bootstrap path
```

Remote write validation should be postponed until quota resets.

## What Not To Do

- Do not edit Firestore data manually during this check.
- Do not deploy rules.
- Do not clear real user or workspace documents.
- Do not use `localhost` results as evidence for `127.0.0.1` behavior.

