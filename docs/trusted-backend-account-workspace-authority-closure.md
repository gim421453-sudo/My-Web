# Trusted Backend Account and Workspace Authority Closure (P0-5B2)

Status: local / Auth Emulator / Firestore Emulator / mock only. Production exports, Rules, config, and data are unchanged.

## Remaining authority write inventory

| Legacy entry | Actual authority category | P0-5B2 disposition |
| --- | --- | --- |
| `systemAdminService.disableUserAccount` | Firebase Auth account + `users` profile; legacy also changed membership | `RESOLVED_P0_5B2` when flag ON via `user_account.disable` |
| `systemAdminService.enableUserAccount` | Firebase Auth account + `users` profile; legacy restored role/membership | `RESOLVED_P0_5B2` when flag ON via `user_account.enable`; membership is never restored |
| `systemAdminService.deleteUserFirestoreProfile` | Auth identity, profile retention, memberships | `DEFERRED_TO_P1`; flag ON fails closed before transport |
| `systemAdminService.approveAdminApplication` with canonical `WORKSPACE_BOOTSTRAP` | Workspace bootstrap | `RESOLVED_P0_5B2` via `workspace.bootstrap.approve` |
| The same function with `WORKSPACE_ACCESS` | Workspace access approval | Existing P0-2 trusted operation |
| The same function with legacy `workspaceMode=new` | Ambiguous combined legacy operation | Blocked when flag ON; requires canonical bootstrap application |
| `approveJoinRequest` / `rejectJoinRequest` | Membership application decision plus profile compatibility writes | `DEFERRED_TO_P1`; must be split into canonical operations |
| `ensureSystemOwnerWorkspace` | Legacy system-owner workspace bootstrap and root membership compatibility | `REMOVE_AFTER_CLIENT_CUTOVER`; not a trusted bootstrap substitute |
| `setWorkspaceLifecycle` | Workspace parent lifecycle only | `RESOLVED_P0_5B2` when flag ON via `workspace.lifecycle.set` |
| `changeWorkspaceOperationMode` | Operational metadata, not account authority | `UNKNOWN`; outside this authority batch |
| Target-email invitation | Invitation identity binding | `DEFERRED_TO_P1`; flag ON fails closed |
| Root `workspace_members` / `workspaceMembers` writes | Legacy membership authority compatibility | `REMOVE_AFTER_CLIENT_CUTOVER`; trusted operations write nested canonical membership only |

## State model

The following stores are independent and must not be inferred from one another:

1. Firebase Auth account: identity exists and `disabled` state.
2. `users/{uid}`: profile and account lifecycle metadata only.
3. `workspaces/{workspaceId}/members/{uid}`: canonical workspace role and membership status.
4. `systemOwners/{uid}`: global system-owner authority.

Changing `users.status` alone does not disable Firebase Auth. Disabling a workspace membership does not disable the Auth account. Enabling an Auth account does not restore a membership, a previous role, or system-owner authority.

## Trusted Auth Admin boundary

`functions/src/accounts/trustedAuthAdmin.ts` defines `getUser`, `setDisabled`, `revokeRefreshTokens`, and `deleteUser`. Only deterministic test doubles and the guarded Auth Emulator provider are available. The provider requires a demo project, loopback Auth and Firestore Emulator hosts, explicit emulator mode, a Functions Emulator marker, and no credential environment. There is no production ADC fallback.

`deleteUser` exists only in the abstraction so a future reviewed two-phase design can use the same boundary. P0-5B2 never calls it.

## Account lifecycle operations

### Disable

`trustedDisableUserAccount` accepts only a target UID, strict reason code, idempotency key, and request correlation metadata. An active canonical system owner is required. Self-disable and disabling the last active system owner are denied. `users.role` and membership roles do not authorize the operation.

The operation uses a fail-safe cross-service saga:

1. Firestore transaction validates current authority and target, reserves an active target system owner when applicable, and creates a `prepared` intent.
2. Auth Admin sets `disabled=true`.
3. Auth Admin revokes refresh tokens.
4. Auth Admin reads the account back and confirms it is disabled.
5. Firestore transaction finalizes profile lifecycle metadata, audit, idempotency, and intent state.

Auth and Firestore cannot share one transaction. If Auth succeeds and finalization fails, retry observes the already-disabled Auth account and completes the prepared intent. It never reports completion before confirmation. A reserved owner remains fail-safe disabled if the external Auth mutation or finalization is interrupted.

### Enable

`trustedEnableUserAccount` performs the corresponding Auth and profile lifecycle operation. It does not modify canonical membership, role, workspace access, or `systemOwners`. Restoring global owner authority requires a separate future policy and operation.

### Session enforcement

Disable revokes refresh tokens and returns `sessionInvalidated=true` and `signOutRequired=true`. This is a UX signal, not the security boundary. `VerifiedActor` verifies ID tokens with revocation checking enabled and then loads the Auth user, so stale, revoked, missing, or disabled accounts fail on the backend even if a client does not sign out immediately.

## Account deletion and data retention

`trustedDeleteUserAccount` is not implemented. The existing client delete facade fails closed while the trusted flag is ON.

A future deletion operation needs a two-phase prepare/confirm contract, TTL-bound confirmation, authority and lockout revalidation, dependency inventory, Auth deletion, and auditable finalization. Whether `users/{uid}` becomes a tombstone, an anonymized record, or is retained cannot be decided safely without retention, recovery, legal, and reference-integrity policy.

- Account hard delete: `DEFERRED_TO_P1`
- User profile tombstone/anonymization: `POLICY_DECISION_REQUIRED`
- Retention duration and dependent records: `POLICY_DECISION_REQUIRED`

## Workspace bootstrap

`trustedApproveWorkspaceBootstrap` is distinct from ordinary `WORKSPACE_ACCESS` approval. It requires an active canonical system owner and a canonical pending `WORKSPACE_BOOTSTRAP` application. A legacy record or a client `workspaceMode=new` hint cannot select this operation.

The server derives `ws_<32 hex>` from the application and applicant identities. A single Firestore transaction reads the actor owner record, application, target profile, deterministic workspace location, per-applicant bootstrap guard, canonical membership, and idempotency state. It writes:

- `workspaces/{workspaceId}`
- exactly one `workspaces/{workspaceId}/members/{applicantUid}` with fixed role `super_manager`
- `users/{applicantUid}` profile linkage without role authority fields
- `adminApplications/{applicationId}` decision and `provisionedWorkspaceId`
- `workspaceBootstrapKeys/{hash}`
- `securityAuditLogs/{hash}`
- `trustedOperationIdempotency/{hash}`

It writes neither `workspace_members` nor `workspaceMembers`. A system owner is not represented as a workspace role. Name collisions do not define identity; deterministic ID and guard collisions fail closed.

## Workspace lifecycle

The supported parent states are `active`, `disabled`, and `archived`, matching existing status/disabled/archived fields. `archived` is terminal in this operation. A lifecycle transition updates only the workspace parent metadata and audit/idempotency records. It does not disable Auth accounts, mutate or delete memberships, change users, or cascade-delete data.

Workspace hard delete is `DEFERRED_TO_P1` because membership, invitation, application, audit, and user references require an explicit retention and cascade policy.

## Legacy approval mapping

The UI label commonly translated as "join approval" is not one canonical operation:

- Workspace join request approval: membership creation/status plus user-profile compatibility updates.
- Admin application access approval: existing P0-2 `admin_application.approve`.
- Canonical new workspace application: P0-5B2 `workspace.bootstrap.approve`.
- Invitation redemption: P0-3 `invitation.redeem`.
- Auth account enable: P0-5B2 `user_account.enable`, explicitly separate from membership approval.

The combined legacy flows must not be copied into one trusted endpoint.

## Target-email invitations and legacy membership

Target-email invitations remain fail closed. Secure implementation requires normalized verified Auth email identity, privacy-preserving binding, email-change behavior, and PII policy. Plaintext email replication or a fake success path is forbidden.

Root membership paths remain compatibility reads/writes only in legacy flag-OFF code. Trusted flag-ON mutations use the canonical nested path. Removal is classified `REMOVE_AFTER_CLIENT_CUTOVER`; existing data is not deleted or migrated in this batch.

## Verification summary

- Functions unit tests: 441/441 passed under isolated Node 22.
- Client adapter tests: 77/77 passed.
- Auth + Firestore + Functions Emulator integration passed, including concurrent owner disable, bootstrap replay, bootstrap/reject, and bootstrap/user-disable races.
- Production Functions runtime loaded only `trustedBackendHealth`.
- Account partial-failure tests cover Auth mutation, token revocation, Firestore finalization, retry, missing Auth target, replay, and membership non-mutation.
- Trusted account/workspace client paths perform no local authority mutation on failure.
- Actual Rules/config files and production data were not accessed or changed.

## Closure classification

### RESOLVED_P0_5B2

- Auth Emulator-only admin abstraction.
- Trusted account disable/enable with revocation, idempotency, retry, and owner lockout.
- Canonical workspace bootstrap with deterministic identity and one initial `super_manager`.
- Workspace parent lifecycle state machine.
- Flag-ON trusted client routing and strict response validation.
- Production export remains health-only.

### DEFERRED_TO_P1

- Account hard delete and two-phase confirmation.
- Workspace hard delete.
- Target-email invitation.
- Join-request canonical operation split.
- Legacy root membership removal after client cutover and migration closure.
- Production transport, endpoint exports, Rules activation, rollout, and data migration.

### POLICY_DECISION_REQUIRED

- User profile retention, tombstone, and anonymization.
- Restoration of disabled `systemOwners` authority.
- Workspace hard-delete cascade and retention.

### UNKNOWN

- Whether workspace operation-mode changes belong in the trusted authority backend or a separate operational administration boundary.
- Final read endpoints required for system-wide administration after legacy client reads are removed.

P0 authority remediation is code-complete for the local/emulator scope, but P1 Production Activation Preflight is not ready until deferred policies, migration state, production endpoint/export review, and Rules rollout gates are approved.
