# app-next Workspace Notices Integration

## Status

The app-next workspace notices tab is a read-only React view backed by the new `AuthProvider`. It does not mount the legacy `src/context/AuthContext.tsx` and does not modify the operational static app.

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

## Firestore Path

```text
workspaces/{currentWorkspaceId}/notices
```

Read method:

```text
getDocs(collection(...))
```

The service intentionally does not use `addDoc`, `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`, `runTransaction`, or `onSnapshot`.

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
write API imported = false
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
notice create/edit/delete flows
workspaceDataService
```

This is still a parallel read-only migration surface.
