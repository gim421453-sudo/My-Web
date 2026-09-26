# Trusted Backend Authorization Boundary and Probe Lifecycle

## 1. Scope and Evidence

This document is the TB-03A read-only design result. It defines the boundary after
TB-02 authentication and does not implement authorization, add a Firestore read,
change Rules, or authorize a deployment.

Evidence inspected:

- `functions/src/index.ts`: before TB-03B, the package entry exported one health
  function and two development probes; it now exports Health only.
- `functions/src/auth/verifiedActor.ts`: authentication-only actor contract.
- `functions/src/auth/verifiedActorProbe.ts`: the former `POST`-only probe adapters,
  removed in TB-03B after their integration coverage moved to the authentication core.
- `functions/src/runtime/adminApp.ts`: lazy Admin Auth/Firestore access.
- `functions/src/runtime/emulatorGuard.ts`: demo-project and loopback fail-closed
  runtime guard.
- `functions/package.json`: `lib/src/index.js` is the deployable package entry.
- `firebase.trusted-backend-emulator.json`: the Emulator loads `functions/`.
- `firestore.rules`: current canonical owner and membership paths.
- `docs/trusted-backend-security-contract.md`: trusted-backend security baseline.

## 2. Current Export Audit

After TB-03B, the package entry exports exactly:

| Export | Classification | Import-time behavior | Request-time behavior |
| --- | --- | --- | --- |
| `trustedBackendHealth` | Emulator health | Creates an `onRequest` definition | Applies the Emulator-only guard; no Auth or Firestore lookup |

Importing the entry does not initialize an Admin app or read Firebase. Admin access
is lazy. The actor and verified-email HTTP wrappers were removed; tests import the
authentication core directly. The build cleans compiled output before TypeScript
compilation, and a static test checks both source and compiled exports. Runtime
rejection remains defense in depth rather than the production export policy.

## 3. Authentication and Authorization Boundary

The required processing chain is:

```text
HTTP/callable adapter
  -> VerifiedActor (authentication)
  -> need-based authority resolvers
  -> AuthorizationContext
  -> endpoint policy
  -> business operation
```

`VerifiedActor` proves only the authenticated principal and current Firebase Auth
state. It may contain:

- UID from the verified Firebase token.
- Token verification status and verified `auth_time`, `iat`, and `exp`.
- Current Auth user existence, enabled state, and `emailVerified` state.
- Provider and MFA token evidence as non-authorizing observations.
- Server-generated request ID and safe source metadata.
- `authorizationStatus: "unresolved"`.

It must not contain or imply:

- system-owner, workspace role, role hierarchy, capability, or assignment authority;
- department, homeroom, subject, club, student, or guardian scope;
- identity verification or sensitive-operation approval;
- authority derived from client payloads or browser storage.

No endpoint may authorize a business operation from `VerifiedActor` alone.

## 4. AuthorizationContext Contract

The future internal context is a discriminated, immutable result. The following is
a contract shape, not implementation code:

```text
AuthorizationContext
  actor: VerifiedActor
  request:
    operation: server allowlisted operation key
    workspaceId: validated server-use workspace ID or null
  global:
    systemOwner: true | false | null
    status: unresolved | active | absent | inactive | malformed | error
    source: systemOwners
  workspace:
    workspaceId: string | null
    membershipStatus: unresolved | active | missing | disabled | inactive | malformed | error
    role: super_manager | manager | teacher | normal | viewer | print_account | null
    source: canonical-membership
  capabilities:
    requested: allowlisted capability keys
    granted: resolved capability keys
    status: unresolved | resolved | missing | denied | malformed | error
  assignments:
    requested: typed scope requests
    resolved: typed assignment references
    status: unresolved | resolved | missing | denied | malformed | error
  scope:
    workspaceBound: boolean
    department/subject/homeroom/club/student: resolved typed scope or null
  resolution:
    status: resolved | partial | denied | missing | error
    reasonCode: safe internal authorization reason
```

`partial` never means general access. An endpoint may proceed only when every
authority component declared by its policy is `resolved` and allowed. Unrequested
components remain `unresolved` without causing extra reads.

Raw UID and workspace ID may exist inside the trusted in-memory context for exact
document access. They must not appear in client errors or ordinary logs. A future
audit projection uses request ID and a keyed actor/workspace identifier placeholder,
not raw identifiers.

## 5. Canonical Authority Sources

| Authority | Canonical source | Explicitly untrusted sources |
| --- | --- | --- |
| System owner | active `systemOwners/{uid}` | `users.role`, `users.globalRole`, membership role, client claims |
| Workspace membership | `workspaces/{workspaceId}/members/{uid}` | root/legacy membership collections, users document, browser storage |
| Workspace role | validated canonical membership `role` | client role, `users.currentRole`, `users.workspaceRole` |
| Capability | future canonical capability grant store | role payload arrays, client capability list |
| Department assignment | future canonical typed assignment store | client department IDs or profile metadata |
| Homeroom assignment | future canonical typed assignment store | teacher role alone |
| Subject assignment | future canonical typed assignment store | teacher role alone |
| Club assignment | future canonical typed assignment store | teacher role alone |
| Student self | future trusted student ID to Auth UID link | email/name match or client student ID |

Legacy data may be inspected for migration evidence but never used as runtime
authorization fallback.

## 6. System-owner Resolution

Resolution starts from `VerifiedActor.uid` and directly reads
`systemOwners/{uid}`. A positive result requires:

- the document exists;
- `status` is exactly `active` under the new backend contract;
- any UID field, if present, matches the document/actor UID;
- the schema version is supported, or an explicitly reviewed compatibility parser
  validates the complete legacy record;
- no revoked, disabled, inactive, or contradictory marker exists.

Missing means `systemOwner: false`. Inactive or revoked means false. Malformed or
read failure is a fail-closed error, not ordinary-user continuation.

The current Rules compatibility helper treats a missing owner `status` as active.
The trusted backend contract is intentionally stricter. Existing owner records must
be inventoried before TB-03 production use; any compatibility or migration requires
a separate reviewed batch.

System owner is global authority, never a workspace role. A global policy may allow
workspace creation or protected administration without membership. A workspace-bound
operation still requires an explicit target workspace, target existence checks, and
the endpoint's system-owner workspace policy. Global authority does not invent a
membership or assignment.

## 7. Canonical Membership Resolution

The resolver directly reads `workspaces/{workspaceId}/members/{uid}` and validates
the entire authority-relevant record:

- path UID equals record `uid`;
- path workspace ID equals record `workspaceId`;
- role is one of `super_manager`, `manager`, `teacher`, `normal`, `viewer`, or
  `print_account`;
- status is a reviewed active state (`active`, or the currently supported
  transitional `accepted` state with all consistency checks);
- `disabled` is not true and `active` is not false;
- provenance/source and schema version meet the versioned contract;
- no contradictory or authority-injection fields are present.

Missing, disabled, inactive, wrong UID/workspace, unknown role, malformed schema,
or read failure denies the required membership. A missing schema/provenance field
does not silently become trusted; legacy compatibility needs an explicit parser and
test matrix before implementation.

## 8. Role Hierarchy

- `system_owner` is global only and is excluded from the workspace role enum.
- `super_manager` may manage lower workspace roles only; creating or promoting a
  `super_manager` requires a separate protected server policy.
- `manager` may manage `teacher`, `normal`, `viewer`, and `print_account`, but not
  another manager or a super manager.
- `teacher`, `normal`, `viewer`, and `print_account` receive no role-grant authority.
- Self-promotion and client-selected target authority are always denied.

Endpoint policies consume the resolved role; they do not repeat string hierarchy
comparisons throughout business handlers.

## 9. Capability and Assignment Separation

Role, capability, and assignment are separate authority dimensions:

- A role describes a broad workspace relationship.
- A capability allows a named operation family.
- An assignment binds that capability or role to a concrete department, subject,
  homeroom, club, or student scope.

The initial storage candidate is a canonical subcollection beneath the member,
using one deterministic, typed document per grant:

```text
workspaces/{workspaceId}/members/{uid}/capabilityGrants/{capabilityKey}
workspaces/{workspaceId}/members/{uid}/assignments/{assignmentKey}
```

Each record needs status, typed key, target scope where applicable, provenance,
schema version, and server timestamps. This is a design candidate requiring Rules,
index, and transaction review. Capability or assignment arrays must not be added to
the membership role document merely for convenience.

A teacher role alone never grants all-student, all-grade, all-club, or all-timetable
access.

## 10. Need-based Resolution Order

The policy declares its required authority inputs before resolution:

1. Verify the actor.
2. Validate the endpoint operation and target identifiers.
3. Resolve system-owner authority only if the policy has a global-owner branch.
4. Resolve canonical membership only for workspace-bound policy branches.
5. Validate workspace role if required.
6. Resolve only requested capabilities.
7. Resolve only requested assignments/scopes.
8. Evaluate one centralized endpoint policy.
9. Invoke the business operation only after an allow decision.

This avoids reading global authority for endpoints that cannot use it and avoids
loading all capabilities or assignments for a single scoped operation.

## 11. Cache Policy

TB-03 initial implementation must use no application-level authority cache.
Process-memory, token-claim, browser, and general TTL caches can preserve revoked
authority after a role or membership change. Firebase SDK internal certificate and
transport caches are outside this policy, but resolved system-owner, membership,
capability, and assignment decisions are per request.

A later cache design requires versioned authority records, a short bounded TTL,
revocation/invalidation behavior, concurrency tests, and a demonstrated cost need.
Unknown or stale cache state always denies.

## 12. Expected Authority Read Cost

The counts below are Firestore authority reads and exclude Auth token verification
and the current explicit Auth user lookup:

| Endpoint policy | Expected reads without cache | Worst normal path |
| --- | ---: | ---: |
| Global system-owner only | owner document: 1 | 1 |
| Workspace role only, no owner branch | membership document: 1 | 1 |
| Workspace role with owner override | owner + membership as required by branch | 2 |
| One capability in a workspace | optional owner + membership + capability | 3 |
| One subject-scoped operation | optional owner + membership + capability + assignment | 4 |

Resolvers short-circuit on decisive denial and never prefetch every authority
collection. The current `verifyIdToken(token, true)` and explicit `getUser()` may
perform overlapping Auth user lookups; performance review must not weaken revocation
or current-user checks.

## 13. Authorization Error Taxonomy

Planned internal codes:

- `AUTHZ_CONTEXT_REQUIRED`
- `AUTHZ_SYSTEM_OWNER_REQUIRED`
- `AUTHZ_WORKSPACE_REQUIRED`
- `AUTHZ_MEMBERSHIP_MISSING`
- `AUTHZ_MEMBERSHIP_DISABLED`
- `AUTHZ_ROLE_DENIED`
- `AUTHZ_CAPABILITY_REQUIRED`
- `AUTHZ_ASSIGNMENT_REQUIRED`
- `AUTHZ_SCOPE_DENIED`
- `AUTHZ_CONTEXT_MALFORMED`
- `AUTHZ_INTERNAL_ERROR`

Client responses expose only the safe code, request ID, and a stable HTTP status.
They do not reveal whether another user's owner, role, capability, or assignment
record exists. Authentication failures remain in the TB-02 `AUTH_*` taxonomy;
authorization failures use `AUTHZ_*`.

## 14. Endpoint Policy API

Planned centralized interfaces:

```text
resolveGlobalAuthority(actor)
resolveWorkspaceMembership(actor, workspaceId)
resolveCapability(actor, workspaceId, capability)
resolveAssignment(actor, workspaceId, assignmentRequest)

requireGlobalSystemOwner(context)
requireWorkspaceRole(context, allowedRoles)
requireCapability(context, capability)
requireSubjectAssignment(context, subjectId)
requireHomeroomAssignment(context, homeroomId)
```

Resolvers obtain canonical server data. `require*` policies consume only resolver
results and cannot read client role/capability fields. Endpoint code must not contain
ad hoc role strings or bypass the shared policy layer.

## 15. Fail-closed Rules

The following always deny a policy that requires the affected authority:

- permission, network, unavailable, timeout, or internal Firestore read failure;
- missing required workspace or membership;
- malformed owner, membership, capability, or assignment record;
- unknown role, capability, assignment type, or schema version;
- UID/workspace mismatch;
- legacy-only role or membership;
- client-supplied authority;
- incomplete, partial, cached-unknown, or contradictory context.

An authority read error must not continue as an ordinary user. It becomes an explicit
safe denial/error result and prevents business logic execution.

## 16. Probe Lifecycle Decision

**Implemented decision: test-harness only (option D), with a separate dev source as
a fallback only when Cloud Functions HTTP discovery itself must be tested.**

The TB-03B structure is:

1. `functions/src/index.ts` exports Health only.
2. The deployable Probe HTTP wrapper and its wrapper-specific tests are removed.
3. Emulator integration tests invoke `verifyActorFromRequest` directly and will
   invoke future authorization resolvers directly.
4. The build removes stale compiled output before compiling.
5. If HTTP semantics need integration coverage, start an ephemeral loopback-only
   test server or use a test-only adapter outside the production Functions entry.
6. Do not create an authorization debug endpoint.

This removes probe symbols from production function discovery, avoids conditional
ES module exports, keeps tests simple, and preserves the existing runtime guard as
defense in depth.

If Firebase Functions discovery must be tested end to end, use a physically separate
dev-only Functions source selected only by `firebase.trusted-backend-emulator.json`.
That source must not appear in production Firebase configuration or deployment
commands. Runtime environment gating alone is not the primary recommendation.

## 17. Health Lifecycle

The current health function remains **Emulator-only**. It is unauthenticated but
returns only static safe metadata and performs no Auth or Firestore lookup. It must
not absorb actor or authorization diagnostics.

A future production liveness endpoint requires a separate approval and entry. It
should return a minimal constant response and no project identifiers. Readiness that
touches dependencies should be internal/controlled, bounded, and separate from
liveness. No production health endpoint is approved by this audit.

## 18. Production Export and Deployment Gates

Before any production deployment pipeline exists, static gates must fail when:

- the production entry exports a symbol matching `Probe`, `Debug`, `Dev`, or `Test`;
- the compiled production entry contains a probe registration;
- production Firebase configuration references a dev-only Functions source;
- a deployment target uses `demo-*` as if it were production;
- production mode or credentials are enabled before explicit security approval;
- an authorization endpoint bypasses the centralized policy helper.

The gate should inspect source exports, compiled exports, Firebase configuration,
and the Emulator-only allowlist. The runtime Emulator guard remains mandatory but
does not replace the static release gate.

## 19. Emulator Fixture Strategy

TB-03 integration uses only a demo project and local Auth/Firestore Emulators.
Production Firebase reads and writes remain zero.

Minimal Admin-authored fixtures:

- active, inactive, malformed, and absent `systemOwners` records;
- active, accepted, disabled, malformed, wrong-UID, and wrong-workspace canonical
  membership records;
- only the capability/assignment records needed by a specific test when those
  resolvers are implemented.

Admin fixture writes seed trusted server state; they are not Rules authorization
tests. Client Rules tests remain in the existing Rules harness. Every fixture uses
fake identifiers, is isolated by test namespace, and disappears when the Emulator
stops.

## 20. TB-03 Test Matrix

At minimum, implementation must cover:

1. Verified actor plus active system owner allows an owner policy.
2. Missing owner record is not owner.
3. Inactive owner is not owner.
4. Revoked/disabled owner is not owner.
5. Missing owner status follows the reviewed strict/compatibility decision.
6. Malformed owner record fails closed.
7. `users.role=system_owner` alone grants nothing.
8. Workspace operation requires an explicit workspace.
9. Active canonical member resolves.
10. Transitional accepted member follows the reviewed compatibility policy.
11. Missing membership denies.
12. Disabled membership denies.
13. Inactive membership denies.
14. Wrong membership workspace denies.
15. Wrong membership UID denies.
16. Unknown workspace role denies.
17. Malformed membership fails closed.
18. Legacy membership alone grants nothing.
19. `super_manager` resolves as a workspace role only.
20. `manager` resolves without equal/higher grant authority.
21. `teacher` resolves without global student/grade access.
22. `normal` resolves with only endpoint-approved access.
23. `viewer` resolves read-only where policy allows.
24. `print_account` resolves only where policy allows.
25. `system_owner` is rejected as a workspace role.
26. Different workspace scope denies.
27. Client role is ignored.
28. Client capability is ignored.
29. Client assignment is ignored.
30. Client membership object is ignored.
31. Missing capability denies a capability policy.
32. Unknown capability fails closed.
33. Missing assignment denies a scoped policy.
34. Wrong assignment target denies.
35. Firestore owner read error denies.
36. Firestore membership read error denies.
37. Partial context is never upgraded to allow.
38. Production entry excludes actor probe.
39. Production entry excludes verified-email and authorization probes.
40. Approved test harness works only with demo loopback Emulators.
41. Health remains isolated from Auth and authorization resolution.
42. Logs and client errors contain no raw UID, workspace ID, or authority record.

## 21. Expected Implementation Files

The later TB-03 implementation is expected to be narrowly split across:

```text
functions/src/authz/authorizationTypes.ts
functions/src/authz/authorizationErrors.ts
functions/src/authz/globalAuthorityResolver.ts
functions/src/authz/workspaceMembershipResolver.ts
functions/src/authz/capabilityResolver.ts          (later sub-batch)
functions/src/authz/assignmentResolver.ts          (later sub-batch)
functions/src/authz/endpointPolicies.ts
functions/test/authz/*.test.ts
functions/test/support/*EmulatorFixtures.ts
functions/src/index.ts                             (production-safe exports)
firebase.trusted-backend-emulator.json             (only if separate dev source is required)
release-gate test script                           (probe export exclusion)
```

Initial implementation should start with global authority and canonical membership
only. Capability and assignment stores need their own schema and Rules review before
code is added.

## 22. Readiness and Open Risks

TB-03 implementation planning is ready, subject to these blockers before production:

- settle owner records with missing `status` versus the stricter backend contract;
- settle unversioned membership/provenance compatibility;
- approve capability and assignment schemas before implementing those resolvers;
- add static deployment export gates;
- retain no-cache authority resolution for the initial security implementation;
- keep all implementation and integration work Emulator-only until a separate
  production security review approves deployment.

## 23. TB-03B Legacy Compatibility Policy

### Repository evidence

Current Rules and fixtures establish a legacy compatibility surface, not the strict
trusted-backend schema:

- `systemOwners/{uid}` fixtures contain only `status: "active"`.
- current Rules and operational readers treat a missing owner `status` as active;
  some React readers treat document existence alone as owner authority.
- current canonical membership fixtures contain `uid`, `workspaceId`, `role`,
  `status`, `disabled`, `active`, and timestamps, but generally omit `source` and
  have no `schemaVersion`.
- membership Rules allow an optional `source` field but do not currently allow a
  `schemaVersion` field.
- current Rules accept both `active` and `accepted` membership status and keep
  malformed legacy records readable for repair.

These behaviors remain unchanged in TB-03B. They are evidence for a later migration,
not authority for the future backend resolver.

### Canonical owner version 1

The future strict owner record requires:

```text
schemaVersion: 1
status: active | disabled | inactive | revoked
source: trusted_migration | system_bootstrap
```

An optional record UID, if present, must equal the document/actor UID. The resolver
states are:

| Evidence | Resolution | Authorization |
| --- | --- | --- |
| no document | `NOT_OWNER` | deny owner policy |
| complete version 1, active, consistent | `ACTIVE` | owner branch may continue |
| complete version 1, disabled/inactive/revoked | `DISABLED` | deny |
| parseable legacy record missing status, source, or schema version | `MIGRATION_REQUIRED` | deny |
| unknown status/version, invalid type, mismatch, or contradiction | `MALFORMED` | deny |
| read failure | `READ_ERROR` | deny/error |

Document existence, a missing status, or `users.role/globalRole=system_owner` never
upgrades a record to `ACTIVE`. Unknown higher schema versions fail closed.

### Canonical membership version 1

The future strict membership record requires these authorization-critical fields:

```text
schemaVersion: 1
uid: exact actor UID
workspaceId: exact requested workspace ID
role: super_manager | manager | teacher | normal | viewer | print_account
status: active | disabled | inactive
disabled: boolean consistent with status
active: boolean consistent with status
source: invite | admin_approval | trusted_migration | student_link | system_bootstrap
```

The resolver states are:

| Evidence | Resolution | Authorization |
| --- | --- | --- |
| complete version 1 active record | `ACTIVE` | endpoint policy may continue |
| no canonical path document | `MISSING` | deny |
| disabled record | `DISABLED` | deny |
| inactive record | `INACTIVE` | deny |
| parseable legacy record missing schema version or source | `MIGRATION_REQUIRED` | deny |
| path/field UID mismatch | `WRONG_UID` | deny |
| path/field workspace mismatch | `WRONG_WORKSPACE` | deny |
| unknown role, including workspace `system_owner` | `UNKNOWN_ROLE` | deny |
| invalid types, contradictory flags, forbidden authority fields, unknown version/status | `MALFORMED` | deny |
| read failure | `READ_ERROR` | deny/error |

The transitional legacy `accepted` status is not silently converted to active. It
is `MIGRATION_REQUIRED` when the rest of the record is parseable and must be reviewed
before a migration writes the strict active state. Role aliases such as `admin`,
`owner`, or `superadmin` are never normalized.

### Provenance policy

Provenance is mandatory for both new and migrated authority records. A missing or
unknown `source` produces `MIGRATION_REQUIRED` when the record is otherwise safe to
parse; it never grants temporary authority. Migration must derive the typed source
from trusted invite, approval, bootstrap, or reviewed backup evidence. It must not
infer provenance from the current role or client data.

### Migration and deployment gates

The separate `TB-03M AUTHORITY DATA MIGRATION` batch must perform a read-only audit,
backup, preview, approved diff, trusted transaction/batch update, validation,
rollback plan, and append-only audit record. TB-03B performs none of those steps.

Production authorization deployment remains blocked until all of the following are
zero or explicitly migrated under an approved policy:

- legacy or migration-required owner records;
- malformed, disabled-as-active, or unknown-version owner records;
- legacy or migration-required canonical memberships;
- unknown/aliased workspace roles and UID/workspace mismatches;
- production `Probe`, `Debug`, `Dev`, or `Test` exports.

Because membership Rules do not currently allow `schemaVersion`, schema migration
and the corresponding Rules contract require a separate reviewed change before
strict production enforcement. No Rules change is authorized by TB-03B.

## 24. TB-03C Emulator-Only Implementation

TB-03C implements the strict contract without exporting a new Function or enabling
production enforcement:

- `firestoreEmulatorGuard.ts` requires Emulator mode, a `demo-` project, no external
  credential environment, and a loopback Firestore Emulator host before Admin
  Firestore can be resolved.
- `adminFirestore.ts` is the sole trusted Admin Firestore boundary for authority
  reads. Importing it performs no Firebase operation, and a different-project Admin
  app fails closed.
- `resolveSystemOwner` reads only `systemOwners/{verifiedActor.uid}`.
- `resolveWorkspaceMembership` reads only
  `workspaces/{workspaceId}/members/{verifiedActor.uid}` after validating the
  workspace document segment.
- global, workspace-only, and explicit owner-override context builders perform at
  most one, one, and two authoritative reads respectively. No authority cache or
  legacy fallback exists.
- `requireGlobalSystemOwner`, `requireWorkspaceRole`, and
  `requireWorkspaceRoleOrSystemOwner` keep owner override explicit. Ordinary
  workspace policy never grants an implicit owner bypass.
- capability and assignment remain `unresolved`; no collection or authority helper
  is defined for either one.

Unit coverage fixes every owner, membership, role, mismatch, error, and policy state.
The direct Emulator integration obtains an Auth Emulator token, verifies the actor,
writes two v1 authority fixtures to the Firestore Emulator, performs four resolver
reads, and exercises both owner and workspace policy. It creates no HTTP authz
endpoint and performs no production Firebase operation.

Production rollout remains blocked by TB-03M, the corresponding reviewed Rules
schema change, capability/assignment contracts, and a separate final security
review.
