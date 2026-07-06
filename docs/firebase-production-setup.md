# Firebase production setup

## Local config

Keep these files local only. They are ignored by Git:

- `.env`
- `firebase-config.local.js`
- `pm-env.js`
- `pm-firebase-config.js`
- service account JSON files

Create `.env` from `.env.example`, then run:

```powershell
node scripts/generate-firebase-config.mjs
```

For the recording web, create `firebase-config.local.js` with the same Firebase Web config and load it before `config.js`.

## Firestore bootstrap

Use an Admin SDK credential through `FIREBASE_SERVICE_ACCOUNT_PATH`, `FIREBASE_SERVICE_ACCOUNT_JSON`, or `GOOGLE_APPLICATION_CREDENTIALS`.

```powershell
npm run firebase:init-schema
```

After the owner Google account has signed in once and exists in Firebase Auth, grant system owner:

```powershell
npm run firebase:set-system-owner -- --email your-google-account@example.com --workspace-id owner-main --workspace-name "Owner Workspace"
```

This writes:

- `users/{uid}`
- `systemOwners/{uid}`
- `workspaces/{workspaceId}`
- `workspaceMembers/{workspaceId_uid}`
- `workspace_members/{workspaceId_uid}` for legacy compatibility
- `workspaces/{workspaceId}/members/{uid}`
- `systemConfig/bootstrap.ownerCreated = true`

## Shared collections

Both the main web and recording web use the same Firebase project and these collections:

- `users`
- `workspaces`
- `workspaceMembers`
- `adminApplications`
- `chatThreads`
- `chatMessages`
- `logs`
- `driveConnections`
- `recordingJobs`

## Manual smoke checks

1. Sign in with the system owner Google account.
2. Confirm the system owner console opens and all workspaces/applications are visible.
3. Sign in with another Google account and submit an admin application.
4. Approve/reject the application as system owner.
5. Sign in as an approved normal user and confirm only role-allowed menus appear.
6. Open `/chat?source=main` from the main web and create a thread.
7. Open `/chat?source=recording` from the recording web and create a thread with an attached recent log.
8. Confirm another workspace's data is blocked by Firestore Rules.
9. Log out, log back in, refresh, and confirm Firebase Auth persistence keeps the session.
