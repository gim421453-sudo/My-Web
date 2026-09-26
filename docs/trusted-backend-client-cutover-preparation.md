# Trusted Backend Client Cutover Preparation (P0-5)

Status: local/mock only. `TRUSTED_BACKEND_AUTHORITY_ENABLED` defaults to `false`; no production transport or Functions operation export exists.

## Client contract

- Entry: `services/trustedBackendService.js`
- Injection: `window.PMTrustedBackendAuthorityConfig.TRUSTED_BACKEND_AUTHORITY_ENABLED === true`
- Transport: `invokeTrustedOperation(operationName, envelope, context)`
- Envelope: `{ idempotencyKey, operation, target, payload }`
- Response: `{ ok: true, requestId, data }` or `{ ok: false, requestId, code }`
- Flag ON: transport is mandatory; missing, timeout, malformed response, and unknown errors fail closed.
- Flag OFF: existing legacy paths remain unchanged for rollback. They remain a Rules cutover blocker.
- Security boundary remains VerifiedActor + backend AuthZ + backend transaction + Firestore Rules. The flag is routing only.

The adapter generates `idempotencyKey` and per-attempt `requestId` with Web Crypto. A caller must retain one `mutationContext` for retries of the same logical submission. Raw invitation codes are returned once from successful create and are not copied into local invitation state, storage, logs, or transport diagnostics.

## Direct authority write inventory

| Client path | Current write | Trusted operation | Classification |
| --- | --- | --- | --- |
| `services/systemAdminService.js:submitAdminApplication` | `adminApplications`, `users` | `admin_application.create` | Integrated when flag ON; trusted contract requires an existing workspace target. Legacy “new workspace” UI is not equivalent. |
| `approveAdminApplication` | `workspaces`, `users`, `workspace_members`, nested `members`, `adminApplications`, `adminLogs` | `admin_application.approve` | Integrated when flag ON; no direct fallback. Legacy branch retains the undeclared `request` defect. |
| `rejectAdminApplication` | `adminApplications`, `users`, `adminLogs` | `admin_application.reject` | Integrated when flag ON; no direct fallback. |
| `services/invitationService.js:createInvite/saveRemoteInvite` | `invites`, `invitations`, nested `inviteCodes` | `invitation.create` | Integrated when flag ON; local list updates after success only. Target-email semantics are unsupported and fail closed. |
| `revokeInvite` | legacy local state only | `invitation.revoke` | Integrated when flag ON; local status changes after success only. |
| `acceptInviteCode/acceptRemoteInviteCode/saveRemoteMember` | join request, inviter link, `workspace_members` | `invitation.redeem` | Integrated when flag ON; legacy lookup/write is bypassed. Trusted response must provide canonical `workspaceId`. |
| `approveJoinRequest` / `rejectJoinRequest` | `users`, nested `members`, join request, admin log | none | `DEFERRED_TO_P1`; combined legacy membership/profile flow needs canonical operation split. |
| `updateUserAdminFields` | nested membership role/status | `workspace_member.role.update` | `RESOLVED_P0_5B1` when flag ON. |
| `disableUserAccount` / `enableUserAccount` | legacy `users` plus membership mutation | `user_account.disable` / `user_account.enable` | `RESOLVED_P0_5B2` when flag ON; Auth and profile only, membership remains independent. |
| `deleteUserFirestoreProfile` | `users`, root/nested memberships, admin log | none | `DEFERRED_TO_P1`; flag ON fails closed pending retention/tombstone policy. |
| Canonical bootstrap application approval | workspace/user/nested membership bootstrap | `workspace.bootstrap.approve` | `RESOLVED_P0_5B2`; deterministic server ID and exactly one initial `super_manager`. |
| Legacy `ensureSystemOwnerWorkspace` | workspace/user/root membership bootstrap | none | `REMOVE_AFTER_CLIENT_CUTOVER`; not used by trusted bootstrap. |
| Workspace parent lifecycle | workspace status metadata | `workspace.lifecycle.set` | `RESOLVED_P0_5B2`; no Auth or membership cascade. |
| `changeWorkspaceOperationMode` | workspace mode/history | none | `UNKNOWN`: operational metadata mutation, still privileged and not covered by P0 backend operations. |
| `app.js:syncRemoteMemberRoleV39` | disabled legacy reference | `workspace_member.role.update` | `RESOLVED_P0_5B1`; active admin facade uses trusted operation when the flag is ON. |
| Explicit membership status facade | canonical nested membership | `workspace_member.status.set` | `RESOLVED_P0_5B1`; account disable UI remains separate. |
| Explicit membership removal facade | canonical nested membership | `workspace_member.remove` | `RESOLVED_P0_5B1`; audited soft removal only. |

No client path accesses `authorityInvitations`, `invitationCodeIndex`, `securityAuditLogs`, or `trustedOperationIdempotency`; those remain backend-only canonical collections.

## Read disposition

### KEEP_TRANSITION_READ

- Auth/session reads of `users/{uid}`, `systemOwners/{uid}`, current workspace, and canonical nested membership.
- Workspace list and workspace document reads needed to render existing screens.
- Read-only listeners used to keep legacy and trusted results comparable during transition.

### MOVE_TO_BACKEND_P1

- System-owner-wide `adminApplications`, user, and membership administration reads.
- Mutation-precondition reads currently performed by `systemAdminService` before role/status changes.
- A canonical invitation management list endpoint; the client currently has no canonical `authorityInvitations` reader.

### REMOVE_WITH_LEGACY

- `invites/{code}` lookup and all `invitations` / nested `inviteCodes` compatibility reads.
- Root `workspace_members` and camel-case `workspaceMembers` fallback reads after canonical nested membership migration closes.
- Local `authState.invitations` authority interpretation. It may remain a non-authoritative display cache only.

### UNKNOWN

- Whether workspace operation-mode history and system-wide audit browsing require trusted read endpoints or can remain Rules-protected reads.
- Legacy admin application records without canonical `workspaceId` cannot be mapped to `admin_application.create` without a separate migration/operation contract.

## Contract blockers before P1

1. The current administrator application form requests a new workspace name, while trusted create accepts only access to an existing workspace.
2. Target-email invitation semantics are absent from the canonical invitation contract.
3. Join-request approval and hard account deletion remain deferred; account disable/enable and workspace lifecycle now have emulator-only trusted operations.
4. Soft membership removal does not reconcile `users.currentWorkspaceId`; the response requires session refresh instead.
5. Production transport, token attachment, endpoint, export, rollout approval, and production Rules activation remain deliberately absent.

P0-5B2 closes the local/emulator account lifecycle and workspace bootstrap/lifecycle contracts. P1 preflight remains blocked by deletion/retention policy, target-email identity binding, join-request operation split, legacy client cutover, production transport/exports, migration, and Rules activation approval.
