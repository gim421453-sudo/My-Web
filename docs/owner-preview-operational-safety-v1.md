# Owner Preview Operational Safety V1

## 1. Baseline Commit

- Branch: `checkpoint/notice-auth-recovery-20260723`
- Baseline commit at start: `8a1d739 feat: add owner preview baseline and stabilize timetable periods`
- This step does not commit, push, stage, deploy, or modify Firebase data.

## 2. Preview Scope

- Production static app remains `index.html` plus `app.js`.
- `app-next.html` remains a separate Owner Preview entry.
- Owner Preview is for `system_owner` verification before broader rollout.
- Firestore Rules, indexes, real Firestore data, auth role documents, notice save, schedule V121 save, timetable V111/V120/V124 save, and workspace sync structure are out of scope.

## 3. Development Page Blocking

- Production Vite inputs are limited to `index.html` and `app-next.html`.
- Development or test HTML entries such as `owner-admin-diagnostics.html`, `shadow-auth-test.html`, and `auth-regression-preview.html` are not production build inputs.
- These pages remain available locally as source files for development only.
- Direct production URL access should return 404 because the files are not emitted to `dist`.

## 4. Global Error Handling

- Shared runtime: `shared/operationalSafety.js`
- Operational app integration: final `app.js` V125 wrapper.
- app-next integration: `src/release/operationalSafetyAdapter.ts` and `src/app-next/AppNextErrorBoundary.tsx`.
- Captured classes:
  - `window.error`
  - `unhandledrejection`
  - React render errors
  - Firebase init failure classification
  - Auth init failure classification
  - Workspace init failure classification
  - Manifest missing/loaded state
- The UI shows safe error codes only, not raw stack traces or sensitive values.
- Errors do not trigger automatic logout.

## 5. Maintenance Status

- Single source: `shared/operationalSafety.js`
- Supported modes:
  - `normal`
  - `maintenance`
  - `partial-outage`
  - `emergency`
- Default mode is `normal`.
- `maintenance` and `emergency` block general users with a safe notice screen.
- `partial-outage` keeps read access available and exposes a write-block structure for future write gates.
- The current implementation is static/local only. Remote Firestore-based switching is intentionally deferred.

## 6. Release Information

- Source: Owner Preview release manifest plus safe runtime fallbacks.
- `system_owner` can see:
  - release channel
  - manifest version
  - build date
  - app version
  - Git short commit or `unavailable`
  - stable/beta/hidden/planned counts
- Ordinary users do not receive the detailed Owner Preview release panel.
- No UID, email, workspaceId, tokens, API keys, or service account values are displayed.

## 7. Build Artifact Checks

- Script: `scripts/test-owner-preview-operational-safety.mjs`
- Source/config checks run without arguments.
- After build, run with `--dist` to verify generated artifacts:
  - development HTML not emitted
  - source maps not emitted
  - `.env` and `.env.local` not emitted
  - `firebase-config.local.js` not emitted
  - `firestore.rules.console-current` and `firestore.rules.next` not emitted
  - backup/log/temp/credential-like files not emitted
  - `shared/operationalSafety.js` is emitted
  - noindex is present in production HTML

## 8. Sensitive Information Checks

- Diagnostics only store category, code, counters, and state strings.
- Raw error messages and stack traces are not persisted in diagnostics.
- Sensitive text detection flips `sensitiveValueDetected` if suspicious raw text is observed, but the raw value is not exposed.

## 9. Pre-Deploy Checklist

- Run:
  - `node --check shared/operationalSafety.js`
  - `node --check scripts/test-owner-preview-operational-safety.mjs`
  - `node scripts/test-owner-preview-operational-safety.mjs`
  - `node scripts/test-owner-preview-release-manifest.mjs`
  - `node scripts/test-role-workspace-release-gate.mjs`
  - `npm.cmd run typecheck`
  - `npm.cmd test`
  - `npm.cmd run build`
  - `node scripts/test-owner-preview-operational-safety.mjs --dist`
  - `git diff --check`
- Confirm `dist/owner-admin-diagnostics.html` and `dist/shadow-auth-test.html` do not exist.
- Confirm Owner Preview pages are reachable only through approved entries.
- Confirm operational notices, schedules, and timetable manual checks still pass.

## 10. Post-Deploy Checks

- Open the Owner Preview URL.
- Confirm `<meta name="robots" content="noindex,nofollow">`.
- Confirm `window.PMOperationalSafetyDiagnostics?.snapshot?.()` exists.
- Confirm default `maintenanceMode` is `normal`.
- Confirm system owner sees release and operational safety panels.
- Confirm ordinary users do not see release details.
- Confirm no automatic logout happens after a safe runtime error.

## 11. Rollback Procedure

- Do not run rollback commands automatically.
- Recommended rollback path:
  1. Stop deployment.
  2. Revert the Owner Preview Operational Safety V1 changes in a normal Git workflow.
  3. Restore the previous stable commit if needed: `8a1d739`.
  4. Re-run the pre-deploy checklist.
  5. Redeploy only after checks pass.

## 12. Previous Stable Commit Recovery

- Previous stable baseline for this step: `8a1d739`.
- If a production issue appears before release, return to the last known good branch state using the team's approved Git rollback workflow.
- Avoid `git reset --hard` unless explicitly approved by the user.

## 13. Deployment Blockers

- Any Firestore Rules or index change included in the diff.
- Any Firebase real data mutation.
- Development HTML emitted into `dist`.
- Missing `noindex,nofollow` on Owner Preview entries.
- `sensitiveValueDetected: true` in normal manual checks.
- Build or test failure.
- Notice, schedule, or timetable save regression.
- Automatic logout triggered by runtime error handling.

## 14. Next Stage

- Add remote, admin-controlled maintenance mode only after a separate design and rules review.
- Add explicit write gates for `partial-outage` only after each write flow is enumerated.
- Consider a dedicated production error page if Owner Preview is promoted beyond system owner.
