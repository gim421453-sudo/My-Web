# Trusted Backend Authority Migration Plan

## 1. Scope and Evidence

This document is the TB-03M-0 offline readiness audit. It compares the strict
TB-03C resolvers with the repository's current Firestore Rules and operational
write paths. It does not report current production document counts.

Evidence reviewed:

- `functions/src/authz/systemOwnerResolver.ts`
- `functions/src/authz/workspaceMembershipResolver.ts`
- `functions/src/authz/authorizationTypes.ts`
- `firestore.rules`
- the local Rules Emulator harness and fixtures
- current repository writers for owner and membership documents
- the trusted-backend security and authorization contracts

Repository history and older audit documents may contain stale counts. TB-03M-1
must produce a new read-only inventory before any current count is accepted.
Production Firebase access, data mutation, Rules changes, and deployment are out
of scope for TB-03M-0.

The local Rules Emulator identifies the tested Firestore behavior as Standard
edition. The production database edition was not queried because production
access is prohibited in this batch.

## 2. Target System Owner Schema

Canonical path:

```text
systemOwners/{uid}
```

Resolver-required fields:

| Field | Type and value | Authority meaning |
| --- | --- | --- |
| `schemaVersion` | number exactly `1` | selects the supported parser |
| `status` | `active`, `disabled`, `inactive`, or `revoked` | only `active` grants owner authority |
| `source` | `trusted_migration` or `system_bootstrap` | typed provenance |

Resolver-allowed optional fields:

```text
uid
createdAt
createdBy
updatedAt
updatedBy
```

If `uid` is present, it must be a string equal to the document ID and verified
actor UID. The current resolver does not type-check the optional audit fields;
therefore their future timestamp/string validation is a Rules and schema design
decision, not an extra TB-03C authorization requirement.

No boolean `active`, `disabled`, or `revoked` field is part of owner v1. `status`
is the single canonical lifecycle field. Any field outside the resolver allowlist,
including profile or workspace display metadata, makes the document `MALFORMED`.

Resolver classification:

| Record | State |
| --- | --- |
| absent | `NOT_OWNER` |
| complete v1 and `active` | `ACTIVE` |
| complete v1 and disabled/inactive/revoked | `DISABLED` |
| missing schema, status, or source | `MIGRATION_REQUIRED` if otherwise parseable |
| unknown source | `MIGRATION_REQUIRED` if otherwise parseable |
| unknown version/status, UID mismatch, invalid type, or extra field | `MALFORMED` |
| read failure | `READ_ERROR` |

## 3. Current System Owner Rules and Gaps

Current Rules behavior:

- `isSystemOwner()` requires a `systemOwners/{request.auth.uid}` document.
- A missing `status` is treated as active; an explicit status must be `active`.
- self and active owners may read an owner document.
- an active owner may create, update, or delete any owner document.
- no field allowlist, schema version, source, UID, audit field, or transition
  validator applies to owner writes.
- current root Rules do not use `users.role` or `users.globalRole` in
  `isSystemOwner()`.

| Strict resolver expectation | Current Rule | Gap | Risk | Future action |
| --- | --- | --- | --- | --- |
| explicit active status | missing status is active | incompatible | legacy document grants owner authority | inventory and migrate before strict helper |
| schema version 1 | not checked | incompatible | unsupported shape can grant authority | transition then strict validation |
| typed source | not checked | incompatible | provenance is unauditable | evidence-based migration |
| exact allowed fields | unrestricted owner document | incompatible | schema pollution and mixed PII/authority | reduce to authority allowlist |
| trusted writer only | active owner client may write | incompatible | owner propagation or destructive mutation | deny client writes before migration |
| disabled/revoked deny | only active or missing status grants | partially aligned | missing status bypass remains | remove compatibility only after lockout gate |

The existing owner bootstrap script writes profile and workspace metadata that the
strict resolver rejects. It must not be used to create post-migration v1 records
without a separately reviewed replacement.

## 4. Target Canonical Membership Schema

Canonical path:

```text
workspaces/{workspaceId}/members/{uid}
```

Required v1 fields:

| Field | Type and value |
| --- | --- |
| `schemaVersion` | number exactly `1` |
| `uid` | string exactly matching actor and document ID |
| `workspaceId` | string exactly matching the requested parent workspace |
| `role` | canonical workspace role |
| `status` | `active`, `disabled`, or `inactive` |
| `disabled` | boolean consistent with status |
| `active` | boolean consistent with status |
| `source` | typed membership provenance |

Canonical roles:

```text
super_manager
manager
teacher
normal
viewer
print_account
```

Canonical sources:

```text
invite
admin_approval
trusted_migration
student_link
system_bootstrap
```

Status consistency:

| Status | `disabled` | `active` | Resolver state |
| --- | --- | --- | --- |
| active | false | true | `ACTIVE` |
| disabled | true | false | `DISABLED` |
| inactive | false | false | `INACTIVE` |

Allowed optional fields are `createdAt`, `createdBy`, `updatedAt`, `updatedBy`,
`invitationId`, and `approvalRequestId`. All other fields make the strict record
malformed. In particular, UI profile fields, duplicate workspace keys, legacy
existence flags, role aliases, capability arrays, and assignment arrays do not
belong in the authority record.

Legacy `accepted` is parseable but always `MIGRATION_REQUIRED`; it is never silently
converted by the runtime resolver.

## 5. Current Membership Rules and Gaps

Current Rules behavior:

- canonical client create and delete are denied.
- an existing canonical member can be updated only by an authorized higher role
  under an explicit role allowlist.
- UID, workspace ID, creation provenance, and selected origin fields are immutable.
- `source` is optional, any bounded string is accepted, and a client cannot add or
  change it during a normal update.
- `schemaVersion` is absent from the field allowlist; adding it makes the complete
  post-update document fail validation.
- `accepted` is allowed; `inactive` is not.
- `disabled` and `active` are optional rather than required.
- several PII and compatibility fields are allowed in the membership document.
- legacy root collections are read-only and are not used by current Rules as a
  workspace role source.

| Strict resolver expectation | Current Rule | Gap | Risk | Future action |
| --- | --- | --- | --- | --- |
| schema version 1 required | field rejected | blocking | migrated v1 record cannot receive normal client update | transition Rules before migration |
| typed source required | optional arbitrary string | incompatible | missing/unknown provenance | typed immutable source contract |
| exact required status flags | flags optional | incompatible | legacy partial states | inventory and normalize with evidence |
| inactive supported | inactive rejected | incompatible | inactive v1 update cannot pass | add explicit transition/strict state rules |
| accepted denied by strict resolver | accepted allowed | transitional | backend denies a client-readable member | classify and review before conversion |
| strict resolver field allowlist | broader Rules allowlist | incompatible | migrated extra fields remain malformed | dependency review and previewed field removal |
| authority-only data | PII fields allowed | privacy/schema mismatch | authority reads may expose profile data | move reliance to profile source before removal |

Current partial client updates preserve existing fields. After Admin migration adds
`schemaVersion`, current `membershipHasAllowedFields()` would reject every later
client update because validation sees the complete resulting document. This is the
decisive reason migration must not run before a compatible Rules transition.

## 6. Repository Writer Compatibility

The current repository has these relevant shapes:

- the owner bootstrap script writes a legacy owner document without schema/source
  and with fields outside the strict owner allowlist;
- administrative membership updates omit schema/source and preserve legacy fields;
- some historical approval/bootstrap paths construct membership documents with
  profile and compatibility fields outside the strict resolver allowlist;
- legacy root membership writes remain in historical or local compatibility paths,
  although current Rules deny those client writes;
- strict TB-03C Functions do not expose a production mutation endpoint.

Before migration, TB-03M-2 must map every active writer to one of: retired,
read-only, v1-compatible client update, or future trusted backend write. A writer
that can recreate a legacy authority record blocks migration.

## 7. Recommended Transition Ordering

Option A, broad v1 Rules then migration, can be safe only if it preserves current
legacy reads and authorized updates without allowing clients to set authority
provenance. Option B, migration before Rules, is unsafe operationally because current
membership Rules reject the resulting `schemaVersion` on later updates.

The recommended sequence is option C, a two-stage compatibility transition:

1. Complete TB-03M-1 read-only inventory and writer inventory.
2. Complete encrypted backup and approved migration preview with write count zero.
3. Implement and test transition Rules without deploying them.
4. Freeze or retire legacy owner/bootstrap writers.
5. Deploy reviewed transition Rules:
   - deny all client create/update/delete on `systemOwners`;
   - retain the minimum legacy owner read compatibility needed to avoid lockout;
   - keep canonical membership client create/delete denied;
   - allow both existing legacy and strict v1 membership result shapes;
   - make schema version and source immutable to clients;
   - never allow a client to add or choose migration provenance.
6. Re-run inventory and lockout gates.
7. Run the approved Admin migration with per-document preconditions.
8. Validate every migrated document through the strict resolver.
9. Deploy strict Rules that require the v1 contract and remove legacy owner
   compatibility.
10. Enable production trusted authorization only after all deployment gates pass.

Transition Rules must not create a privilege-escalation window. Admin migration may
bypass Firestore Rules, but client operations remain least-privileged throughout.

## 8. TB-03M-1 Read-Only Inventory

System owner classifications:

```text
total
v1-valid-active
v1-valid-disabled
schema-version-missing
status-missing
source-missing
unknown-source
revoked-or-inactive
unsupported-version
extra-fields
uid-mismatch
malformed
read-error
```

Canonical membership classifications, globally and per workspace:

```text
total
v1-valid-active
v1-valid-disabled
v1-valid-inactive
schema-version-missing
source-missing
unknown-source
accepted-status
unknown-role
uid-mismatch
workspace-mismatch
inconsistent-status-flags
extra-fields
unsupported-version
malformed
read-error
```

Legacy evidence collections are counted separately:

```text
workspace_members
workspaceMembers
```

Legacy documents are evidence only. They never become resolver fallback authority.
The inventory must also record active owner count and, per workspace, canonical
super-manager/manager counts before and after the proposed transform.

## 9. Read-Only Audit Execution Contract

TB-03M-1 requires separate explicit approval. Its tool must:

- contain no create, set, update, delete, batch, transaction, import, or deploy path;
- require an explicit read-only mode flag and an exact external project allowlist;
- require an operator-entered project fingerprint confirmation;
- reject Emulator and production context ambiguity;
- read only the four approved authority collection scopes;
- use bounded pagination and deterministic classification;
- write only redacted local reports outside the repository;
- keep raw documents in memory only for the minimum necessary duration;
- never print raw UID, email, workspace ID, document ID, token, credential, or path;
- report read counts and prove write API count zero;
- stop on project mismatch, credential ambiguity, partial read, or classification
  exception rather than reporting a complete inventory.

The repository must not contain the production project allowlist value or output.

## 10. Credential Strategy

Preferred: a dedicated, short-lived impersonated or managed identity with a custom
IAM role limited to Firestore entity `get` and `list` for the approved audit. Use
Workload Identity or service-account impersonation so no long-lived JSON key exists.

Fallback only after security approval: an operator user credential with equivalent
read-only IAM and short lifetime. Firebase CLI login state is not an audit authority.
A service-account JSON key is not recommended and must never be created or stored in
the repository. Credential provisioning and production access are separate approved
operations outside TB-03M-0.

## 11. Backup Contract

Before any migration write, create two artifacts:

1. an encrypted targeted JSONL snapshot for exact field-level rollback;
2. an optional managed Firestore export when broader disaster recovery is approved.

Each secure JSONL record includes the raw document path only inside the encrypted
archive, the complete typed Firestore value, document create/update time when
available, classification, and a content checksum. A separate redacted manifest
contains collection class, keyed-HMAC reference, count, backup time, batch ID,
schema classification totals, archive checksum, and tool version.

The backup is invalid unless it can be read back and its checksums verified before
migration.

## 12. Backup Location Policy

Production authority backups must be outside the repository and outside ordinary
developer sync folders. Use approved encrypted storage with access logging,
restricted operators, retention, and deletion policy. Encryption keys must be held
separately from the archive. `.gitignore` is defense in depth, not permission to
place production backups in the repository.

No raw backup, redacted report containing reversible IDs, credential, or migration
output may be committed.

## 13. Migration Preview Format

One redacted preview row per document:

```text
documentType
documentReferenceHmac
currentClassification
currentSchemaVersion
targetSchemaVersion
fieldAdditions
fieldChanges
fieldRemovals
provenanceEvidenceClass
proposedSource
action
reasonCode
risk
beforeHash
targetHash
manualReviewRequired
```

Allowed actions are `NOOP`, `MIGRATE`, `MANUAL_REVIEW`, `BLOCKED`, and `CONFLICT`.
The preview shows aggregate impact and lockout deltas before an operator can approve
any write batch.

## 14. Owner Transform Rules

- complete valid v1: `NOOP`;
- legacy active owner with independently verified bootstrap evidence: add
  `schemaVersion: 1`, explicit `status: active`, and the evidence-backed source;
- legacy inactive/revoked evidence: preserve the denying lifecycle state;
- optional UID is retained only when it exactly matches the document ID;
- profile/workspace metadata outside the strict allowlist is removed from the owner
  authority document only after its canonical non-authority source is confirmed;
- missing status without independent owner evidence: `MANUAL_REVIEW`;
- unknown status/version, UID mismatch, conflicting evidence, or unknown extra
  authority fields: `BLOCKED`;
- no owner document is created from a users role, membership role, or browser data.

## 15. Membership Transform Rules

- complete valid v1: `NOOP`;
- UID and workspace ID must match path segments exactly;
- role aliases and `system_owner` are never normalized automatically;
- `accepted` becomes active only with trusted invitation/approval evidence;
- status flags are normalized only when lifecycle evidence is unambiguous;
- source is derived only from trusted invite, approval, student link, bootstrap, or
  migration evidence;
- optional audit/reference fields are retained only if compatible with the strict
  allowlist;
- profile, duplicate workspace, compatibility, capability, and assignment fields are
  removed only after consumer dependency review;
- unknown role/source, mismatched identifiers, contradictory state, or missing
  approval evidence: `MANUAL_REVIEW` or `BLOCKED`, never guessed.

Legacy root documents may support evidence comparison but are not copied blindly to
the canonical path.

## 16. Provenance Policy

Use the most specific verified source: invite, admin approval, student link, or
system bootstrap. `trusted_migration` is allowed only when a named review process
confirms the original authority and the migration audit links to the evidence class.
It must not mean "source unknown."

When provenance cannot be recovered, the document is `MANUAL_REVIEW`; no generic
`admin`, `trusted`, or `legacy` value is invented. Whether a future private audit
record needs an `originalProvenanceKnown` flag is deferred; it is not added to the
v1 authority document because the current resolver would reject it.

## 17. Lockout Gates

Global owner gate:

- baseline and target active owner counts are recorded;
- target active owner count must be at least one;
- every currently active owner is v1-valid or explicitly blocked for manual review;
- recovery operator and verified rollback archive are available;
- a migration that produces zero active owners is prohibited.

Workspace gate, for every active workspace:

- baseline canonical member and active manager counts are recorded;
- target has at least one active `super_manager` or otherwise explicitly approved
  management recovery path;
- no currently effective manager is silently dropped by field cleanup;
- any workspace with zero target managers is `BLOCKED` for manual review.

## 18. Idempotency and Concurrency

Idempotency:

- valid v1 and matching target hash: `NOOP`;
- legacy document with the same deterministic target: one `MIGRATE` result;
- target differs from an earlier approved preview: `CONFLICT` and stop;
- a partially completed batch is safe to re-preview and resume by target hash.

Concurrency:

- use a maintenance window or authority-write freeze;
- use document update-time preconditions for every write;
- do not overwrite a document changed after backup/preview;
- commit bounded batches with a batch ID and per-batch result;
- re-read and resolve each written document before the next enforcement stage.

## 19. Rollback Contract

Rollback restores the complete original snapshot, not merely removal of v1 fields.
Each rollback requires the original document, original update time, migration batch
ID, before/target checksum, and a precondition proving the document still equals the
migrated target. A document changed after migration is never automatically rolled
back; it becomes `CONFLICT` and requires manual review.

Rollback is validated with the compatibility Rules and strict resolver disabled from
production enforcement. After restoration, owner/workspace lockout gates and counts
must be rechecked.

## 20. Migration Audit Log

Future append-only server audit fields:

```text
migrationBatchId
documentReferenceHmac
documentType
classification
action
result
reasonCode
operatorPrincipalHmac
beforeHash
afterHash
timestamp
toolVersion
```

The audit contains no raw identifier or document payload. It is server-written and
client immutable. Its collection, retention, and read policy require a separate
Rules and security review before implementation.

## 21. Planned Rules Tests

Keep all existing 171 Rules Emulator tests. Add at least 28 transition/strict tests:

System owner:

- valid v1 active, disabled, inactive, and revoked;
- legacy missing schema/status/source under transition and strict modes;
- unsupported schema and unknown source;
- client create, update, delete, and owner propagation denial;
- strict field allowlist and UID mismatch.

Membership:

- valid v1 for all six roles and three lifecycle states;
- missing/unknown schema and source;
- accepted transition behavior;
- UID/workspace mismatch and unknown role;
- status flag contradictions and extra fields;
- client cannot add/change schema or provenance;
- existing v1 administrative update remains possible;
- client create/delete and legacy collection writes remain denied.

Minimum expected suite after additions: 199 tests, with no existing test removed.
Rules implementation must repeat the full adversarial review before any deployment.

## 22. Deployment and Enforcement Gate

Production strict authorization remains blocked until all are true:

- TB-03M-1 inventory completed without partial reads;
- backup restore test and preview approval completed;
- migration-required, malformed, unsupported, unknown-source, unknown-role, and
  identifier-mismatch counts are zero or individually approved and resolved;
- active system owner count is at least one;
- every active workspace passes its management lockout gate;
- legacy writers are retired or v1-compatible;
- transition and strict Rules pass the existing and new Emulator matrix;
- Rules/schema/client compatibility review is approved;
- production Functions exports contain no Probe/Debug/Dev/Test endpoint;
- post-migration strict resolver validation is complete;
- rollback remains available through the observation window.

## 23. TB-03M Stage Plan

| Stage | Purpose | Production writes | Separate approval |
| --- | --- | --- | --- |
| TB-03M-0 | offline readiness and compatibility audit | 0 | current batch |
| TB-03M-1 | production read-only authority inventory | 0 | required |
| TB-03M-2 | encrypted backup and migration preview | 0 | required |
| TB-03M-3 | transition/strict Rules implementation and Emulator tests | 0 | required; deploy excluded |
| TB-03M-4 | approved trusted migration | yes | explicit write approval required |
| TB-03M-5 | post-migration server validation and rollback observation | read-only except approved rollback | required |
| TB-03M-6 | strict production authorization rollout | deployment | explicit deployment approval required |

Each stage receives its own checkpoint. No stage inherits approval for production
read, write, Rules deployment, Functions deployment, or rollback execution.

## 24. TB-03M-1 Readiness Decision

TB-03M-1 is design-ready but not execution-approved. Its next batch must first review
a read-only tool implementation, prove write imports and write paths are absent, fix
the exact collection scope and IAM identity, define external encrypted output, and
receive explicit approval before any production connection.

Current blockers for migration or enforcement are production inventory unknowns,
legacy writer compatibility, owner and workspace lockout evidence, backup/restore
proof, and the undeployed Rules transition. TB-03M-0 does not remove any blocker by
itself.
