# Trusted Backend Membership Authority Operations (P0-5B1)

Status: local, mock, and demo Emulator only. Production export, transport, Rules, and data are unchanged.

## Canonical boundary

- Authority document: `workspaces/{workspaceId}/members/{uid}` only.
- Global owner: active canonical `systemOwners/{uid}` only.
- `workspace_members`, `workspaceMembers`, `users.role`, `users.currentRole`, and client role caches grant no authority.
- Workspace membership statuses remain the existing v1 vocabulary: `active`, `disabled`, `inactive`.
- Removal is soft removal to `inactive`; no document delete, user profile write, or Firebase Auth mutation occurs.

## Operations

| Client method | Operation | Mutation |
| --- | --- | --- |
| `updateWorkspaceMemberRole` | `workspace_member.role.update` | Canonical nested membership `role`, `updatedAt`, `updatedBy` |
| `setWorkspaceMemberStatus` | `workspace_member.status.set` | `active <-> disabled` plus canonical booleans and update metadata |
| `removeWorkspaceMember` | `workspace_member.remove` | Soft removal to `inactive`, `active=false`, `disabled=false` |

Each operation uses strict input, VerifiedActor, backend authorization, one Firestore transaction, completed-only idempotency, and an atomic `securityAuditLogs` create. Responses contain only `workspaceId`, role/status summaries, and `sessionRefreshRequired=true`.

## Hierarchy and lockout

- `system_owner` may manage workspace roles but is never a workspace membership role.
- `super_manager` may manage `manager`, `teacher`, `normal`, `viewer`, and `print_account`.
- `manager` may manage `teacher`, `normal`, `viewer`, and `print_account`.
- Lower roles cannot mutate authority.
- Self role/status/removal mutations fail closed.
- Managing another `super_manager` is denied because existing product policies conflict; this remains an explicit product-policy decision.
- Demoting, disabling, or removing the final active `super_manager` is denied even for `system_owner`.

The lockout check performs a transaction query limited to canonical members where `role == super_manager`, validates every returned v1 record, and counts active records. Emulator races confirm that concurrent operations cannot reduce the final active top-manager count below one. No denormalized counter was introduced.

## Client routing

- `TRUSTED_BACKEND_AUTHORITY_ENABLED=true`: role update and the explicit membership status/removal facades use trusted transport only. Transport failure leaves local state unchanged.
- Flag off: existing `updateUserAdminFields` legacy role path remains available as rollback compatibility and remains a Rules cutover blocker.
- Existing `disableUserAccount`, `enableUserAccount`, and `deleteUserFirestoreProfile` combine user-profile or account semantics and are intentionally not redirected to membership-only operations.

## Closure inventory

### RESOLVED_P0_5B1

- Invitation redeem returns backend-derived `workspaceId`.
- Canonical member role update.
- Canonical member active/disabled state transition.
- Audited soft removal.
- Hierarchy, self-mutation denial, last-admin protection, idempotency, audit atomicity, and concurrency coverage.

### P0_5B2_REQUIRED

- Join request approval/rejection trusted operations.
- Firebase Auth account disable/delete and account deletion.
- User-profile status reconciliation.
- Workspace bootstrap and lifecycle operations.
- Target-email invitation contract.
- UI replacement for current account-level disable/delete controls.

### NON_AUTHORITY

- Local member rows updated after a trusted success are display cache only.
- Display name and email profile fields are not part of membership authorization.

### UNKNOWN

- Whether a `super_manager` may manage another `super_manager`; current product policy sources conflict, so backend denies it.
- Whether soft removal should clear `users.currentWorkspaceId`; P0-5B1 performs no user write and reports session refresh required.

P0-5B2 is required before P1 preflight. Production activation remains blocked.

