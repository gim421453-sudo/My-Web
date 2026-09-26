# Trusted Backend Security Contract

Status: audit and contract design only
Baseline: `5dd1f79`
Implementation: not started
Deployment: hold

## 1. Current Backend Audit

The repository has no deployed trusted application backend.

- `firebase.json` configures static Hosting and Firestore Rules/Indexes only. It has no Functions source, rewrites, or Functions deployment target.
- There is no `functions/`, `backend/`, `server/`, or `api/` application directory, no `firebase-functions` dependency, and no callable or HTTP Function implementation.
- Main, admin, and app-next are browser applications. They use Firebase Auth and Firestore client SDKs directly.
- Docker runs the main Vite development server and the admin static preview. It does not run an authenticated API or Admin SDK service.
- `scripts/static-preview.cjs` and the Vite school proxy are development-only content/proxy servers. They do not verify Firebase ID tokens and must not become trusted security endpoints.
- The root `firebase-admin` dependency is used by local operator scripts for schema initialization, owner setup, destructive test cleanup, and read-only audits. These scripts are not deployed endpoints and are not callable by the browser.
- A local service-account file is present, Git-ignored, and untracked. Its contents were not read. Platform-managed identities must replace key files in any deployed backend.
- No `authPolicies`, trusted identity, trusted MFA recovery, operation nonce, or server-written `securityAuditLogs` implementation exists.
- Existing `adminLogs` and `systemEventLogs` are append-only by Rules after creation, but their payloads can originate from clients. They are operational logs, not trusted security audit evidence.
- Canonical membership client creation is intentionally denied. Existing approval code can update an existing canonical membership but returns `membership-creation-server-required` when the membership is absent.

Current high-risk code is limited to manually invoked local Admin SDK scripts. They can affect real projects when an operator supplies credentials, so they must remain excluded from browser builds and must not be reused as HTTP handlers.

## 2. Recommended Backend Platform

Use **Firebase Cloud Functions v2 with TypeScript** as the initial trusted backend.

Reasons:

- Native Firebase Auth and Admin SDK integration.
- Firestore transactions and Emulator Suite support.
- Managed service identity without repository service-account keys.
- Secret Manager integration and low operational overhead for short administrative operations.
- Straightforward callable endpoints for main/admin/app-next and HTTP endpoints for provider callbacks.
- Appropriate scaling and cost profile for the current Firebase-centric application.

Create an isolated future `functions/` package with its own dependencies, TypeScript configuration, tests, and lint rules. Do not import browser services into it. Co-locate Functions with Firestore after verifying the actual database edition and region during implementation preflight.

Long-running OCR, bulk exports, or complex external integrations may later move to Cloud Run or task queues. That is an extension path, not part of the foundation. The local school proxy is not a backend candidate.

## 3. Trust Boundary

| Boundary | Trusted responsibilities | Must not be trusted for |
| --- | --- | --- |
| Client | UI, collecting intent, Firebase sign-in, displaying safe status | UID authority, role grants, verification results, MFA success, recent-auth, nonce generation |
| Firebase Auth | Primary account, email verification, token claims, `auth_time`, enrolled factors | Workspace role, student relation, guardian relation |
| Firestore | Profile, canonical membership, assignments, server-authored security metadata | Client-written verification booleans or client-written audit evidence |
| Trusted backend | Token verification, Admin SDK checks, transactions, privileged writes, nonce/replay protection, security audit | Trusting client UID, role, timestamps, or success flags |

The backend derives the actor UID from verified Firebase authentication. A payload UID is a target identifier only when the endpoint explicitly accepts a target and authorization permits it.

## 4. Common Request and Authentication Contract

Every authenticated endpoint produces a `VerifiedActor` before domain logic runs:

```text
uid                  <- verified token only
firebaseUserEnabled  <- Admin SDK user record
emailVerified        <- Firebase Auth user record
tokenIssuedAt        <- verified token iat
authTime             <- verified token auth_time
mfaChallenge         <- verified Firebase second-factor claim
systemOwner          <- active systemOwners/{uid}
workspaceMembership  <- canonical workspaces/{workspaceId}/members/{uid}
identityState        <- server-only trusted verification result
requestId            <- validated correlation ID or server-generated ID
serverTime           <- backend timestamp
```

Callable endpoints use authenticated callable context, then check the current Admin SDK user record and token revocation time. HTTP endpoints verify the bearer ID token with revocation checking. Both adapters feed the same middleware.

Required checks:

1. Valid and non-expired Firebase token.
2. Token UID matches the authenticated principal.
3. User record exists and is not disabled.
4. Token issue time is newer than token revocation time.
5. Current Firebase email verification when required.
6. Canonical system-owner and membership state.
7. Endpoint operation type and target scope.
8. Server timestamp and safe request correlation ID.
9. Recent-auth, MFA, identity, and nonce policy for sensitive operations.

Client `uid`, `role`, `systemOwner`, `identityVerified`, `mfaVerified`, `reauthenticated`, and client timestamps are never authority.

## 5. Endpoint Inventory

| Endpoint | Form | Purpose | Risk |
| --- | --- | --- | --- |
| `getSecurityStatus` | callable | Return minimal public security status | LOW |
| `createCanonicalMembership` | callable | Consume approved provenance and create one canonical membership | CRITICAL |
| `grantWorkspaceRole` | callable | Change an existing canonical role within hierarchy | CRITICAL |
| `setCapabilityGrant` | callable | Manage capability grants separately from role | HIGH |
| `setAssignment` | callable | Manage school/workspace assignments separately from role | HIGH |
| `startIdentityVerification` | callable | Start provider flow and server state | HIGH |
| `completeIdentityVerification` | HTTP/callable | Accept verified provider completion, never client success | CRITICAL |
| `getIdentityStatus` | callable | Return public-safe status | LOW |
| `linkStudentAccount` | callable | Bind one canonical student to authenticated UID | CRITICAL |
| `startGuardianVerification` | callable | Start guardian identity/relationship proof | HIGH |
| `completeGuardianVerification` | HTTP/callable | Complete trusted guardian proof | CRITICAL |
| `approveGuardianRelationship` | callable | Approve relationship under workspace policy | CRITICAL |
| `requestMfaRecovery` | callable | Create recovery case | HIGH |
| `reviewMfaRecovery` | callable | Approve or reject under independent authority | CRITICAL |
| `completeMfaRecovery` | callable | Revoke factors/tokens and require re-enrollment | CRITICAL |
| `beginSensitiveOperation` | callable | Validate strong auth and issue bound nonce | HIGH |
| `completeSensitiveOperation` | callable/internal | Consume nonce and execute exactly once | CRITICAL |

No endpoint in this inventory exists yet.

## 6. System Owner, Role, Capability, and Assignment Authority

System-owner authority is:

```text
verified Firebase Auth UID
+ active systemOwners/{uid}
```

It never comes from `users.role`, `users.globalRole`, `currentRole`, local/session storage, a client payload, or a workspace membership role.

Role grant hierarchy:

- `system_owner`: may grant valid workspace roles, subject to strong-auth policy.
- `super_manager`: may grant `manager`, `teacher`, `normal`, `viewer`, `print_account`.
- `manager`: may grant `teacher`, `normal`, `viewer`, `print_account`.
- No role can self-promote, grant `system_owner` as a workspace role, or grant an equal/higher protected role outside this hierarchy.

Role, capability, and assignment changes are separate operations and schemas. A role payload must reject capability and assignment keys. Each operation has its own authorization, idempotency, target scope, and audit event.

## 7. `authPolicies` Model

Use a public-safe summary and a server-only internal record.

`authPolicies/{uid}`: server-written, self-readable minimal status.

```text
identityStatus
identityVerifiedAt
identityProviderKey
reviewStatus
mfaRequired
mfaPolicyVersion
guardianConsentStatus
studentLinkStatus
schemaVersion
createdAt
updatedAt
```

`authPolicyPrivate/{uid}`: server-only read/write.

```text
identityReferenceHmac
providerSubjectHmac
providerTransactionHmac
riskState
recoveryState
callbackStateHash
lastVerifiedEvidenceVersion
createdAt
updatedAt
```

`identityReferenceHash` belongs in the private record. Firebase Authentication remains the authority for actual MFA enrollment and challenge state; `authPolicies` contains policy and projection metadata only.

Future Rules contract:

- Client create/update/delete: deny for both collections.
- Public summary read: self and narrowly authorized security administration only.
- Private record read/write: backend only; no direct client access.
- Admin SDK bypasses Rules, so endpoint authorization and schema validation are mandatory.

No Rules change is made in this audit.

## 8. Canonical Membership Onboarding Transaction

Inputs:

```text
workspaceId
targetUid
requestedRole
invitationId or approvalRequestId
source
idempotencyKey
```

The actor UID is not accepted as authority from the payload.

Pre-transaction checks:

1. Verified actor and active Firebase account.
2. Required actor identity, MFA, and recent-auth state.
3. Target Firebase account exists and is enabled.
4. Requested workspace exists and is active.

One Firestore transaction then:

1. Reads actor canonical membership and active `systemOwners` record when applicable.
2. Reads invitation or approval provenance.
3. Validates role hierarchy and target binding.
4. Rejects expired, revoked, consumed, email-mismatched, or disabled provenance.
5. Rejects an existing canonical membership.
6. Creates exactly `workspaces/{workspaceId}/members/{targetUid}` with the canonical allowlist.
7. Marks the invitation/approval consumed exactly once.
8. Updates the join request and safe user workspace projection if required.
9. Creates an idempotency result and server audit event.

Firestore transaction retries must produce one result. Auth account verification is outside the Firestore transaction, so a post-commit account-state recheck and compensating disable path are required if the Auth account changes during the transaction.

## 9. Identity Verification Contract

Provider selection is deferred. Implement a provider adapter interface before choosing a vendor:

```text
startIdentityVerification
verifyProviderCallback
getIdentityStatus
```

The backend stores only status and non-reversible keyed references. It must not store resident registration numbers, raw identity documents, challenge answers, OTP values, credentials, tokens, or raw provider responses.

Provider callback requirements:

- Provider signature verification.
- Server-issued state/nonce verification.
- Transaction/reference binding.
- Expiry and replay checks.
- Exact provider result mapping.
- Server-only transition to `verified`.

A client callback, redirect, or `success: true` never verifies identity.

## 10. Student UID Linking

Canonical student source: `workspaces/{workspaceId}/students/{studentId}`. The current read-only roster already exposes `studentId` and optional `authUid`; it does not implement linking.

`linkStudentAccount` accepts `workspaceId`, `studentId`, and a one-time proof. It derives `authUid` from the verified actor.

Required checks:

- Trusted identity state and workspace/school policy.
- Canonical student exists and is active.
- Student has no existing `authUid`.
- Auth UID is not linked to another student.
- One-time proof is valid, unexpired, scoped, and unused.
- Grade/class/school scope matches the proof.

One transaction updates the canonical student, creates a server-only UID link registry, updates public-safe `studentLinkStatus`, consumes the proof, and writes an audit event. Name, student number, birth date, or same-name matching alone is never sufficient.

## 11. Guardian Verification

Guardian identity and guardian-student relationship approval are separate from student login and MFA.

Flow:

1. `startGuardianVerification` verifies the guardian actor and issues provider state.
2. `completeGuardianVerification` records trusted guardian identity status.
3. `approveGuardianRelationship` validates relationship proof, workspace policy, student scope, duplicate relationships, and required school approval.

A guardian verification result cannot authenticate a student session, satisfy student MFA, or assign a workspace role.

## 12. MFA Recovery

Recovery is a staged server workflow:

```text
requested -> identity_recheck -> risk_review -> approved -> executing
-> factors_revoked -> sessions_revoked -> re_enrollment_required -> completed
```

Requirements:

- Independent identity re-verification.
- Risk evaluation and short-lived approval.
- Separate system-owner recovery procedure, preferably dual control or an offline break-glass runbook.
- Admin SDK selects factors; clients cannot nominate factor IDs for removal.
- Refresh tokens are revoked after factor changes.
- The next sign-in requires new MFA enrollment according to policy.
- Every transition produces a server audit event.

Setting a Firestore `mfaVerified=false`, checking email alone, or allowing a manager reset button is prohibited. Firebase Auth/Identity Platform capabilities and billing must be confirmed before implementation.

## 13. Sensitive Reauthentication

Risk policy:

| Level | Examples | Requirement |
| --- | --- | --- |
| LOW | Read public-safe account state | Current valid token |
| MEDIUM | Scoped sensitive record read | Valid token, membership, policy check |
| HIGH | Bulk grade read/export, assignment change, backup | Recent auth, MFA when required, bound nonce |
| CRITICAL | Role/capability changes, user approval/deletion, MFA recovery, operation mode, restore/deploy operations | Recent strong auth, MFA, single-use nonce, audit, optional dual approval |

`beginSensitiveOperation` checks verified token `auth_time`, current account state, MFA challenge evidence, actor authority, operation type, and target scope. A client `reauthenticated: true` value is ignored.

## 14. Operation Nonce

The backend generates a cryptographically random nonce and returns it once. Firestore stores only a hash/HMAC record:

```text
nonceHash
actorPrincipalHash
operation
targetReferenceHash
requestId
issuedAt
expiresAt
consumedAt
state
schemaVersion
```

The nonce is actor-bound, operation-bound, target-bound, short-lived, single-use, and replay-resistant. Consumption and the protected Firestore mutation occur in one transaction when possible. A client-generated nonce is invalid.

## 15. Security Audit Log

Use server-only append-only `securityAuditLogs/{eventId}` records:

```text
eventType
actorPrincipalHmac
actorRoleSnapshot
targetType
targetReferenceHmac
workspaceReferenceHmac
result
reasonCode
riskLevel
requestId
createdAt
authContextSummary
schemaVersion
```

Use keyed HMAC references rather than plain hashes for identifiers. `authContextSummary` contains booleans/statuses and an auth-age bucket, never tokens or raw claims.

Never store passwords, OTP values, credentials, national identifiers, raw identity responses, raw tokens, or provider secrets. Clients cannot create, update, or delete trusted security logs. Security log reads should be mediated by a narrowly authorized endpoint, with export and retention policies defined before deployment.

## 16. Idempotency and Concurrency

Every mutating endpoint requires an idempotency key with bounded length and format. Store only its hash with actor, operation, request fingerprint, state, result reference, and expiry.

Fail-closed rules:

- Same key and same request returns the prior result.
- Same key and different request is rejected.
- In-progress duplicate joins the existing operation or returns a retry-safe state.
- Completed or failed records have a retention/TTL policy.

Concurrency protection:

- Invite consumption: transaction precondition allows one success.
- Student link: student document and UID link registry are created in one transaction.
- Role grant: transaction reads current actor/target roles and rejects stale state.
- Approval/recovery: state-machine transition requires expected prior state/version.
- Nonce: transaction changes `issued` to `consumed` once.
- Admin Auth operations that cannot join Firestore transactions use a documented saga, durable state, compensation, and audit events.

## 17. Secret Management

Deployed code uses platform-managed service identity. Provider secrets, webhook signing secrets, payment secrets, and audit HMAC keys use Secret Manager or deployment environment secrets.

Repository prohibitions:

- Service-account JSON and private keys.
- Identity-provider, payment, or webhook secrets.
- Production tokens and credentials.
- Secret values in `.env` committed to Git.

The existing local service-account file is ignored and untracked, but it remains an operator-machine risk. Future backend setup must not copy it into Functions, Docker images, build output, logs, or CI artifacts.

## 18. Emulator Strategy and Test Matrix

Use a demo project ID with Auth, Firestore, and Functions Emulators. Tests must fail before running if emulator hosts are absent or a non-demo project is resolved. Do not permit fallback to production.

Required 35-test matrix:

1. Unauthenticated membership create denied.
2. Normal user membership create denied.
3. Teacher membership create denied.
4. Manager can create teacher through valid server flow.
5. Manager cannot create manager.
6. Super manager can create manager.
7. Super manager cannot create super manager.
8. System owner can grant the highest valid workspace role.
9. Invalid invitation denied.
10. Expired invitation denied.
11. Revoked invitation denied.
12. Consumed invitation denied.
13. Duplicate membership denied.
14. Concurrent invite use produces one success.
15. Client identity success boolean ignored.
16. Invalid identity callback denied.
17. Replayed identity callback denied.
18. Verified provider callback succeeds.
19. Raw identity payload is not stored.
20. Name-only student link denied.
21. Student-number-only link denied.
22. Wrong one-time proof denied.
23. Duplicate student link denied.
24. Duplicate Auth UID link denied.
25. Approved valid student link succeeds.
26. Client `reauthenticated=true` ignored.
27. Expired `auth_time` denied.
28. Wrong operation nonce denied.
29. Expired nonce denied.
30. Used nonce replay denied.
31. Correct nonce and auth context succeed once.
32. Unauthorized MFA recovery denied.
33. Manager arbitrary MFA reset denied.
34. Verified recovery workflow completes through expected states.
35. Every sensitive operation creates one server audit event.

Add unit tests for pure policy/state machines and Emulator integration tests for transactions. Mock external identity providers; never call production providers in CI.

## 19. Implementation Batches and Expected Files

Recommended order:

1. **TB-01**: isolated `functions/` skeleton, emulator-only Admin SDK, fail-closed project guard.
2. **TB-02**: shared verified-actor middleware for callable and HTTP adapters.
3. **TB-03**: public/private auth policy schemas and server-only repositories.
4. **TB-04**: membership onboarding and role/capability/assignment transactions.
5. **TB-05**: identity provider adapter contract and mocked callback flow.
6. **TB-06**: recent-auth policy and operation nonce.
7. **TB-07**: append-only server audit service and retention contract.
8. **TB-08**: student UID and guardian relationship linking.
9. **TB-09**: Firebase MFA enrollment/recovery integration after capability preflight.

Expected future areas, not changed by this audit:

```text
functions/
shared/security-contracts/
firebase.json
firestore.rules
firestore.indexes.json
services/authService.js
services/systemAdminService.js
services/invitationService.js
shared/authSecurityState.js
src/auth/*
app.js
tools/trusted-backend-emulator-tests/
```

Each batch should have its own review, Emulator tests, rollback plan, and explicit deployment approval. TB-01 must not include a production deploy.

## 20. Deployment Hold Criteria

Deployment remains blocked until all applicable conditions are met:

- Firestore edition, region, and target project are explicitly verified.
- Functions package is isolated and production project fallback is impossible in tests.
- No service-account key is required by deployed code or CI.
- Token, disabled-user, revocation, role, membership, identity, MFA, and nonce checks are implemented.
- `authPolicies`, private records, idempotency, nonce, and audit schemas are reviewed.
- Client access Rules are designed, Emulator-tested, and approved in a separate batch.
- Membership and student-link transactions pass concurrency tests.
- Identity provider callback signature and replay protections pass mocked integration tests.
- MFA recovery and system-owner break-glass procedures are approved.
- Security audit retention, access, export, and incident-response policies are approved.
- The 35 required tests pass with zero production Firebase access.
- Main, admin, and app-next regression tests pass in observe mode without new enforcement.

This audit performs no backend initialization, package installation, Firebase read/write, Rules change, deployment, staging, or commit.
