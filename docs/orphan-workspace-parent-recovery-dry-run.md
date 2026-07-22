# Orphan Workspace Parent Recovery Dry-run

Date: 2026-07-23

## Purpose

This document describes the development-only dry-run tool for restoring a missing workspace parent document while preserving the existing raw workspace id and all existing child collections.

No real recovery was executed in this step.

## Confirmed Target

| Item | Value |
| --- | --- |
| Target workspace fingerprint | `e46e7e6e` |
| Parent workspace document | missing |
| Canonical nested membership | missing |
| Legacy membership | present |
| Legacy role | `system_owner` |
| Legacy status | `active` |
| users.currentWorkspaceId change | false |
| Child collection move/copy | false |
| Firestore Rules change | false |

## Known Child Collection Counts

These counts were confirmed by read-only Firestore REST checks before creating the tool.

| Collection | Count |
| --- | ---: |
| members | 1 |
| notices | 7 |
| academicSchedules | 210 |
| assignments | 1 |
| lessons | 9 |
| timetable | 14 |
| timetableSets | 4 |
| periodTimes | 46 |
| afterschoolPrograms | 2 |
| clubPrograms | 1 |
| specialLecturePrograms | 1 |

The dry-run page also counts the configured child collections live from the browser session.

## Tool

Development URL:

```text
http://127.0.0.1:5173/workspace-parent-recovery.html
```

Files:

- `workspace-parent-recovery.html`
- `src/dev-recovery/main.tsx`
- `src/dev-recovery/WorkspaceParentRecoveryApp.tsx`
- `src/dev-recovery/workspaceParentRecoveryService.ts`
- `src/dev-recovery/workspaceParentRecoveryUtils.ts`
- `src/dev-recovery/styles.css`

## Safety Controls

- The page is gated by `import.meta.env.DEV`.
- The page is gated to `127.0.0.1` or `localhost`.
- The Vite production input does not include `workspace-parent-recovery.html`.
- The service imports only Firestore read APIs.
- `ALLOW_REAL_RECOVERY=false`.
- `executeRecovery()` always throws a disabled error.
- The dry-run result always reports `writeExecuted=false`.
- The dry-run result always reports:
  - `usersCurrentWorkspaceWillChange=false`
  - `childCollectionsWillMove=false`
  - `rulesWillChange=false`

## Dry-run Conditions

The tool marks the recovery blocked unless all required checks pass:

- Firebase Auth user is present.
- `systemOwners/{uid}` exists.
- `users/{uid}` exists.
- `users.currentWorkspaceId` exists.
- `workspaces/{currentWorkspaceId}` parent does not exist.
- Child collection traces exist under the target workspace path.
- Legacy membership exists.
- Required parent field evidence exists.
- Required nested membership field evidence exists.

## Expected Current Result

The current data is expected to produce:

```text
dryRun: true
writeExecuted: false
targetWorkspaceFingerprint: e46e7e6e
parentWorkspaceExists: false
canonicalMembershipExists: false
legacyMembershipExists: true
legacyMembershipRole: system_owner
legacyMembershipStatus: active
usersCurrentWorkspaceWillChange: false
childCollectionsWillMove: false
rulesWillChange: false
```

`readyForRecovery` may be false because the legacy role is `system_owner`, which is not a valid workspace role. That is intentional. The tool must not silently convert `system_owner` into `super_manager`.

## Field Evidence Policy

Parent workspace field proposals are classified as:

- `required-with-evidence`
- `optional-with-evidence`
- `no-evidence`
- `recovery-forbidden`

Nested membership field proposals use legacy membership as evidence only. If the legacy role is `system_owner`, the role proposal is blocked rather than converted automatically.

## Sensitive Information Policy

The UI and copied JSON must not include:

- full UID
- full workspaceId
- full document id
- full Firestore path
- tokens
- raw API keys

Fingerprints are namespace SHA-256 prefixes only.

