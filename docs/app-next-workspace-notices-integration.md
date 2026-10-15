# app-next Workspace Notices Integration

## Status

The App Next workspace notices tab is a React view backed by the new `AuthProvider`. It retains the existing mixed-schema read model and adds guarded CRUD only for documents created and marked by App Next. It does not mount the legacy `src/context/AuthContext.tsx` or modify operational CRUD.

## Entry

Use:

```text
http://127.0.0.1:5173/app-next.html
```

Open the `워크스페이스 공지` tab inside app-next.

## Provider

```text
AuthProvider
-> LegacyAuthAdapterProvider
-> AppNextWorkspaceNotices
```

The legacy operational login flow remains in `index.html + app.js?v=111`.

The beta release manifest explicitly allows this route for active workspace roles. Other App Next beta routes remain owner-preview-only.

## Read Policy

The tab reads only when:

```text
phase = authenticated
status = active
currentWorkspaceId exists
```

Blocked states:

```text
signed_out
pending
rejected
disabled
error
workspace missing
```

`system_owner` is treated as a global role. A system owner still needs a selected workspace for this workspace-scoped notice list.

The existing `RequireWorkspaceRole` guard gates write controls to `system_owner`, `super_manager`, `manager`, `teacher`, and `normal`. Firestore Rules remain authoritative. `viewer` and `print_account` remain read-only.

## Firestore Path

```text
workspaces/{currentWorkspaceId}/notices
```

Read method:

```text
getDocs(collection(...))
```

The read service remains one-time and listener-free. A separate mutation service uses `addDoc`, `updateDoc`, and `deleteDoc` only at this workspace path. New documents include `workspaceId`, `authorUid`, and an `appNextManaged` marker. Only marked App Next documents are offered for edit/delete; manager roles can manage all such documents, while teacher/normal can manage only their own. Firestore Rules independently enforce the existing membership and author contract.

Each mutation waits for the Firestore write acknowledgement and then uses `getDocFromServer` to verify the resulting document state. The UI reports success only after that check, and reloads the list from the server. Permission, network, quota, and unconfirmed outcomes are reported without optimistic success.

## Mixed Schema Handling

The read model classifies visible rows into:

```text
modern_workspace_notice
legacy_general_notice
legacy_school_notice
legacy_academy_notice
system_notice_reference
unknown_notice_schema
```

Unknown but visible documents are not hidden silently. They are displayed with safe fallback labels and counted in diagnostics.

## Display Model

The UI uses a canonical display model instead of raw Firestore fields:

```text
title
summary
detailText
categoryLabel
scopeLabel
publishedAt
priorityLabel
pinnedLabel
authorLabel
hasAttachments
hasExternalLink
```

The detail view shows only these canonical fields. It does not expose full UID, full email, workspace IDs, Firebase paths, or raw document keys.

## Sort Policy

```text
pinned desc
-> published/created/notice date desc
-> legacy snapshot order
-> document id asc
```

This replaces the previous ambiguous `firestore-return-order` diagnostic.

## Development Diagnostics

Development mode displays aggregate-only diagnostics:

```text
raw read count
filtered count
displayed count
excluded count
excluded reasons
schema kind counts
unknown schema count
source counts
sort policy
content/date/author/category mapping by schema
listener count = 0
write API imported = true
write attempt/create/update/delete counts
last write result category
automatic signOut = none
```

No raw notice values, full emails, full UIDs, tokens, or workspace IDs are printed.

## Operational App Impact

Unchanged:

```text
index.html
app.js
root services/*
Firestore Rules
Firestore indexes
Firebase data
workspaceDataService
```

The operational static app's notice create/edit/delete flows are unchanged. This is a parallel App Next surface for its own marked notice documents; no Rules, Functions, dependency, or production data changes are part of this integration.

## Verification Status (2026-10-15)

- Browser: `npm run test:recovery:browser` passed all 13 tests (13 pass, 0 fail, 0 skipped, 0 todo). This includes all seven legacy role flows, account fail-closed, protected App Next URLs, App Next notice role CRUD with Firestore server state, error/validation/server-confirmation delay UI, and loopback/runtime checks.
- Regression: `npm test`, `npm run typecheck`, `npm run build`, and `npm run build:admin` all exited 0. Builds emitted the existing Vite non-module script and React Router `use client` warnings; neither blocked output.
- Emulator: demo project `demo-myweb-recovery-e2e` with loopback Auth/Firestore only. Requested ports had no stale listeners before the run; no locator existed. Emulator services shut down normally. The run's unlocked `firestore-debug.log` was removed afterward.
- The WebChannel transport-level failure injection remains removed from browser E2E; deterministic unavailable/server-confirmation error classification is covered at the utility test boundary. Service create/update/delete continue to call `getDocFromServer` after writing.
- Production Firebase/data, deploy, IAM, Rules, Functions, and dependency manifests were not accessed or changed. Git review confirmed the prohibited files have no diff. `git diff --check` passed.
