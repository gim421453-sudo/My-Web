# Owner Preview Firebase Hosting Preview Deployment V1

## 1. Baseline

- Branch: `checkpoint/notice-auth-recovery-20260723`
- Baseline commit: `1266665 feat: finalize owner preview pre-deploy safety gates`
- Previous commits:
  - `8a94e20 feat: add owner preview operational safety baseline`
  - `8a1d739 feat: add owner preview baseline and stabilize timetable periods`
- Working tree before this preparation had only the known excluded files:
  - `scripts/generate-blog-pdfs.py`
  - `firestore.rules.console-current`
  - `firestore.rules.next`

## 2. Firebase Project And Hosting

- Firebase CLI: installed, `15.22.4`
- Login state: a cached account is present, but remote project and channel queries require reauthentication.
- Connected project: `.firebaserc` default project is masked as `my-man...8a933`.
- Hosting site/target: no explicit deploy target is configured. The default Hosting site for the Firebase project should be used unless Firebase Console shows multiple sites.
- Do not run `firebase use --add`, create projects, or change the active project during preview preparation.

## 3. Hosting Configuration

`firebase.json` now contains a minimal Hosting configuration:

- `hosting.public`: `dist`
- `ignore`: excludes dotfiles, `node_modules`, the current rules drafts, and the excluded blog PDF script.
- `headers`: applies `X-Robots-Tag: noindex, nofollow` to all served files.
- `rewrites`: not configured.
- `redirects`: not configured.

No catch-all SPA rewrite is configured because this project serves both `index.html` and `app-next.html`. Direct access to `/app-next.html` must continue to work.

## 4. Build Command

Use a clean production build:

```powershell
Remove-Item .\dist -Recurse -Force -ErrorAction SilentlyContinue
npm.cmd run build
```

Expected production files:

- `dist/index.html`
- `dist/app-next.html`
- `dist/app.js`
- `dist/styles.css`
- `dist/robots.txt`
- `dist/pm-env.js`
- `dist/shared/*`
- `dist/services/*`
- `dist/assets/*`

Development-only HTML files must not be present in `dist`, including:

- `owner-admin-diagnostics.html`
- `shadow-auth-test.html`
- `auth-regression-preview.html`

## 5. Preview Deploy Command

Do not run this command in the preparation step.

```powershell
firebase.cmd hosting:channel:deploy owner-preview-v1
```

If the Firebase project has multiple Hosting sites, use the exact target or site option after confirming it in Firebase Console or with authenticated CLI access.

The default preview channel expiry is 7 days. Set an explicit expiry only if the deployment owner decides it is needed.

## 6. Preview URL Record

Record the returned URL here after the actual deployment:

```text
Preview URL: <paste Firebase Hosting preview URL here>
Deployed at: <timestamp>
Deployed by: <masked operator>
Channel: owner-preview-v1
```

Firebase Hosting preview URLs are public to anyone with the URL. Treat the URL as sensitive operational information even though it is not easily guessable.

## 7. Post-Deploy Manual Checklist

Use `127.0.0.1` for local comparison and the Firebase preview URL for deployed verification.

- Login page shows no sensitive data before sign-in.
- Google login works.
- `system_owner` is recognized.
- General users are blocked from Owner Preview-only surfaces.
- Dashboard renders.
- Workspace notices read correctly.
- Workspace notice writes are blocked in `partial-outage`.
- Schedule save completes with server confirmation.
- Timetable period add/delete works.
- App-next read-only routes render.
- Operational Safety state is `normal`.
- `partial-outage` blocks writes without blocking reads.
- Firestore Listen WebChannel 400 errors do not repeat.
- Build/version information is visible only to `system_owner`.
- Console does not expose full UID, email, workspaceId, token, API key debug logs, or raw Firestore paths.

## 8. Rollback Plan

Do not execute rollback commands during preparation.

- Current baseline commit: `1266665`
- Previous stable checkpoint: `8a94e20`
- Before actual preview deployment, keep a copy of the built `dist` artifact if required by the operator.
- If preview deployment is bad, do not clone the preview channel to live.
- Rebuild from the previous stable commit in a separate worktree or branch, then deploy a replacement preview channel only after repeating the gates.
- Preview channel management reference:

```powershell
firebase.cmd hosting:channel:list
firebase.cmd hosting:channel:open owner-preview-v1
firebase.cmd hosting:channel:delete owner-preview-v1
```

Do not delete the preview channel without explicit operator confirmation.

## 9. Deployment Stop Conditions

Stop before deployment if any of the following are true:

- Firebase CLI login requires reauthentication and cannot list the project/channel.
- `firebase.json` does not target `dist`.
- Production build fails.
- Development-only HTML appears in `dist`.
- Source maps, `.env`, local Firebase config, rules drafts, logs, backup files, or service account material appear in `dist`.
- Sensitive IDs or emails appear in diagnostics or console output.
- Operational Safety is not `normal` by default.
- `partial-outage` does not block writes.
- Notice/schedule/timetable regression tests fail.
- Firestore Listen 400 errors recur during manual preview checks.

## 10. Final Pass Criteria

- All automated gates pass.
- `dist` contains only expected production assets.
- Preview deploy command is known but not run during preparation.
- Rollback path is documented.
- No Firebase data, Rules, Indexes, commits, pushes, or staging actions were performed.
