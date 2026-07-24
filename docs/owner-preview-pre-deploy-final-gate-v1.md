# Owner Preview Pre-Deploy Final Gate V1

## 1. Baseline

- Branch: `checkpoint/notice-auth-recovery-20260723`
- Baseline commit at gate start: `8a94e20 feat: add owner preview operational safety baseline`
- Previous commits reviewed:
  - `8a1d739 feat: add owner preview baseline and stabilize timetable periods`
  - `21bffdb test: add role workspace release gate`

## 2. Scope

This gate verifies the current Owner Preview build output before any Hosting deploy.

No Firebase Hosting deploy, Firestore Rules/Indexes deploy, Firestore data update, Auth user update, role update, or staging/commit/push is part of this step.

The following intentionally dirty or untracked files are excluded from this gate and must not be staged by this task:

- `scripts/generate-blog-pdfs.py`
- `firestore.rules.console-current`
- `firestore.rules.next`

## 3. Build Command

Production preview artifact command:

```powershell
Remove-Item .\dist -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
```

If Vite/esbuild fails inside the Codex sandbox with `spawn EPERM`, rerun the same build command once in the approved external environment and record that distinction.

## 4. Dist Inspection

Expected public entries:

- `dist/index.html`
- `dist/app-next.html`
- `dist/app.js`
- `dist/styles.css`
- `dist/robots.txt`
- `dist/pm-env.js`
- `dist/shared/operationalSafety.js`
- `dist/shared/ownerPreviewReleaseManifest.js`
- `dist/services/*`
- `dist/assets/*`

Development-only pages must not be present:

- `owner-admin-diagnostics.html`
- `shadow-auth-test.html`
- `auth-regression-preview.html`
- `auth-provider-preview.html`
- `legacy-auth-adapter-preview.html`
- `legacy-auth-guard-preview.html`
- `login-bridge-preview.html`
- `protected-route-bridge-preview.html`
- `require-auth-bridge-preview.html`
- `require-workspace-role-bridge-preview.html`
- `workspace-parent-recovery.html`

## 5. Sensitive Information Gate

Forbidden in public dist:

- `.env`, `.env.local`, `firebase-config.local.js`
- service account JSON or admin SDK key files
- `firestore.rules.console-current`
- `firestore.rules.next`
- backup, log, tmp, zip, and source map files
- private keys, service account emails, bearer tokens, ID tokens, refresh tokens, access tokens
- local absolute paths such as `C:\Users\...` or `/home/...`

Firebase Web config may exist only in expected config/runtime surfaces. It must not appear as debug logging, diagnostics output, or UI text.

## 6. Source Map Policy

Owner Preview public artifacts should not include source maps by default.

Gate checks:

- no `*.map` files in `dist`
- no `sourceMappingURL` references in public JS/CSS/HTML
- Vite `build.sourcemap` is not enabled

## 7. noindex and robots

Owner Preview must not be indexed.

Required:

- `index.html` contains `noindex,nofollow`
- `app-next.html` contains `noindex,nofollow`
- `robots.txt` blocks all crawling:

```text
User-agent: *
Disallow: /
```

## 8. Allowed URLs

Manual preview URLs use `127.0.0.1` during local validation:

- `http://127.0.0.1:5173/`
- `http://127.0.0.1:5173/app-next.html`
- `http://127.0.0.1:5173/app-next.html#/dashboard`
- `http://127.0.0.1:5173/app-next.html#/timetable-readonly`
- `http://127.0.0.1:5173/app-next.html#/schedules-readonly`
- `http://127.0.0.1:5173/app-next.html#/notices`

Blocked or not-included direct URLs:

- `http://127.0.0.1:5173/owner-admin-diagnostics.html`
- `http://127.0.0.1:5173/shadow-auth-test.html`
- `http://127.0.0.1:5173/auth-regression-preview.html`
- other bridge/test/recovery HTML pages

## 9. Feature Manifest Classification

The Owner Preview release manifest is the source of feature exposure.

Stable Owner Preview surfaces include the operational owner console, dashboard, schedules, notices, timetable, print, and app-next account/state/read-only pilot surfaces marked as first-preview included.

Beta features are allowed only when they are owner-preview scoped, reversible, or read-only enough for system owner validation.

Hidden or planned entries must have a block reason and must not be exposed as launchable Owner Preview features.

## 10. Write Gate

The status source is:

```js
window.PMOperationalSafety.isWriteBlocked()
```

Current enforced or structured state:

- Operational Safety status correctly reports `writeBlocked` for `maintenance`, `partial-outage`, and `emergency`.
- Workspace data sync checks `isWriteBlocked()` in its save readiness helper.
- Schedule server-confirm path blocks when the safety status blocks writes.

Critical deployment check:

- Schedules: server-confirmed and safety-gated.
- Notices: server-confirmed; full safety write block enforcement should be manually checked before a broad public release.
- Timetable: V111/V120/V124 checks pass; full safety write block enforcement should be manually checked before a broad public release.

If schedules, notices, or timetable cannot be safely blocked in `maintenance` or `partial-outage`, Owner Preview deploy should remain blocked or those surfaces should be hidden by manifest.

## 11. Normal Mode Checks

In `normal` mode:

- schedule save reaches server confirm
- notices read/write behavior remains unchanged from the current stable baseline
- timetable period add/delete behavior remains unchanged from V124
- listener count remains stable after tab switches
- no repeated Firestore Listen 400
- workspace readiness is ready
- `pendingSave` is false after idle
- `saveInFlight` is false after idle

## 12. Operational Safety Checks

Manual local checks:

```js
window.PMOperationalSafetyTestControls.setMode("maintenance")
window.PMOperationalSafety.status()
window.PMOperationalSafety.isWriteBlocked()
window.PMOperationalSafetyTestControls.clearMode()
window.PMOperationalSafety.status()
window.PMWorkspaceDataService?.diagnostics?.()
```

Expected:

- mode changes immediately
- flags match mode
- clear returns to `normal`
- workspace sync lifecycle is not reset by mode changes
- listener count does not multiply
- raw UID/email/workspaceId values are not exposed

## 13. Version Information

Owner-only release panel can display:

- release channel
- manifest version
- app version
- build date
- short git commit
- stable/beta/hidden/planned counts

The build generates safe runtime fields in `pm-env.js`:

- `PM_BUILD_DATE`
- `PM_GIT_COMMIT`
- `PM_APP_VERSION`

These fields must not include local absolute paths or sensitive values.

## 14. Rollback Preparation

Do not run reset/revert during this gate.

Rollback reference:

- Current baseline: `8a94e20`
- Previous stable candidate: `8a1d739`

If deployed later and a blocker appears:

1. preserve the deployed artifact for audit
2. compare against this checklist and automated gate output
3. prefer Firebase Hosting rollback if a Hosting version exists
4. prefer Git revert of the deployment commit over destructive reset
5. never run `git reset --hard` without explicit user instruction

## 15. Automated Gate

Run:

```powershell
node --check scripts/test-owner-preview-pre-deploy-final-gate.mjs
node scripts/test-owner-preview-pre-deploy-final-gate.mjs
node scripts/test-owner-preview-operational-safety.mjs
node scripts/test-owner-preview-operational-safety.mjs --dist
node scripts/test-owner-preview-release-manifest.mjs
node scripts/test-role-workspace-release-gate.mjs
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
git diff --check
```

The final gate script checks development-page exclusion, source map policy, sensitive file exclusion, safe web config classification, noindex/robots, manifest presence, operational safety presence, version fields, and critical write-gate classification.

## 16. Deployment Block Conditions

Block Owner Preview deployment if any of the following is true:

- development/test HTML appears in `dist`
- `.env`, local Firebase config, rules draft, backup, log, tmp, zip, source map, or service account material appears in `dist`
- sensitive tokens or local absolute paths appear in public artifacts
- noindex or robots blocking is missing
- app-next or operational entry is missing
- manifest or operational safety runtime is missing
- critical schedules/notices/timetable surfaces cannot be safely validated
- Firestore Listen 400 repeats after idle/tab switching
- workspace diagnostics expose raw UID/email/workspaceId
- build/version metadata remains unavailable when deployment traceability is required

## 17. Manual Checklist

- Log in as the existing owner account.
- Confirm operational app loads at `http://127.0.0.1:5173/`.
- Confirm app-next loads at `http://127.0.0.1:5173/app-next.html`.
- Confirm Owner Preview release panel is visible only to the owner.
- Confirm ordinary user release details are hidden using test harness or route matrix only.
- Confirm schedule save server-confirm succeeds in normal mode.
- Confirm notice read/write baseline behavior remains unchanged.
- Confirm timetable V124 add/delete behavior remains unchanged.
- Confirm `maintenance`, `partial-outage`, and `emergency` do not reset workspace listeners.
- Confirm `clearMode()` restores normal and write readiness.
- Confirm `PMWorkspaceDataService.diagnostics()` masks identifiers.
