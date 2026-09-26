# P1.5-C2H2E3D-W1B Minimal Class Migration Writer IAM Mutation Approval Gate

## Verdict

`P1_5_C2H2E3D_W1B_IAM_MUTATION_APPROVAL_GATE_PASS`

W1B freezes a future IAM mutation package only. It performs zero IAM mutations,
zero token operations, zero Firestore operations, and grants no Class-create approval.

## Verified inputs

W1 and W1A are required inputs:

- W1: `P1_5_C2H2E3D_W1_MINIMAL_WRITER_IAM_APPROVAL_GATE_PASS`
- W1A: `P1_5_C2H2E3D_W1A_IAM_PRESTATE_INVENTORY_PASS`
- W1A writer SA: `ABSENT`
- W1A custom role: `ABSENT`
- W1A writer role binding: `ABSENT`
- Caller project-wide Token Creator: `absent`
- Firebase Admin project-wide Token Creator: `absent`
- Audit reader bindings: present and unchanged
- Audit SA Class-create role: no
- Active caller fingerprint: `sha256/12:5e6692dda08c`

The raw caller principal is not copied into this document. The Functions test blocker
also remains: `ENVIRONMENT_BLOCKED_BY_SPAWN_EPERM`, with no assertion failure observed.
It must be resolved before final production Class-create approval.

## Locked identity and role

```text
SERVICE_ACCOUNT_ID = myweb-class-migration-writer
SERVICE_ACCOUNT_EMAIL = myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com
SERVICE_ACCOUNT_PROJECT = my-management-app-8a933

ROLE_ID = mywebClassMigrationCreateOnly
ROLE_RESOURCE = projects/my-management-app-8a933/roles/mywebClassMigrationCreateOnly
PROPOSED_CUSTOM_ROLE_STAGE = GA
```

`GA` follows the existing local custom-role contract used by
`mywebStage1CollectionIdReader`. This is a design value, not a role creation.

Exact role permissions:

```text
PROPOSED_CUSTOM_ROLE_PERMISSIONS = [
  datastore.databases.get,
  datastore.entities.create
]
CUSTOM_ROLE_PERMISSION_COUNT = 2
EXTRA_PERMISSIONS = 0
MISSING_PERMISSIONS = 0
```

Forbidden: `datastore.entities.get`, `datastore.entities.list`, update, delete, any
broader data permission, built-in Owner/Editor/Datastore/Firebase Admin roles, and
reuse of the audit reader or Firebase Admin service account.

## Exact member and scope

```text
WRITER_ROLE_MEMBER = serviceAccount:myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com
WRITER_DATA_ROLE_BINDING_SCOPE = project-level candidate: projects/my-management-app-8a933
PROPOSED_TOKEN_CREATOR_RESOURCE_SCOPE = exact writer service-account resource
PROJECT_WIDE_TOKEN_CREATOR_BINDING_ALLOWED = no
```

IAM scope is not document-level isolation. The future runtime must independently lock
the project, default database, workspace, `classRegistry`, `class_2026_g2_c5`, exact
payload/provenance, and `CREATE_ONLY` operation before any token or write.

## Four mutation candidates and order

Based on the W1A absent prestate:

```text
PLANNED_IAM_MUTATIONS = [
  M1 CREATE_WRITER_SERVICE_ACCOUNT,
  M2 CREATE_CLASS_MIGRATION_CUSTOM_ROLE,
  M3 ADD_CALLER_TOKEN_CREATOR_ON_EXACT_WRITER_SA,
  M4 ADD_WRITER_CUSTOM_ROLE_BINDING
]
PLANNED_IAM_MUTATION_COUNT = 4
FIRESTORE_DATA_PERMISSION_ACTIVATION_MUTATION = M4
WRITER_DATA_CREATE_ACTIVE_BEFORE_M4 = no
```

Order:

1. Create exactly the dedicated writer service account, without keys or runtime attachment.
2. Create exactly the `GA` custom role with the two locked permissions.
3. Add the transiently verified caller as Token Creator on the exact writer SA resource.
4. Add the writer custom-role binding at the approved project scope, last.

M1-M3 do not activate the writer's Firestore data-create permission. M4 is the
privilege activation edge and must not be moved earlier for convenience.

## Drift gates before any W1C mutation

W1C must perform a fresh bounded pre-mutation recheck. It must stop before mutation if
any of these differ from W1A:

- writer SA is no longer absent;
- custom role is no longer absent;
- writer role binding is no longer absent;
- caller or Firebase Admin project-wide Token Creator is present;
- audit reader baseline changed;
- active caller count/fingerprint differs.

Collision results are `PRESTATE_DRIFT_WRITER_SA_EXISTS` or
`PRESTATE_DRIFT_CUSTOM_ROLE_EXISTS`; no reuse, update, or blind replacement is allowed.

## Per-mutation failure and partial-state policy

- M1 failure: stop; no retry. If outcome is ambiguous, stop and perform a separately
  approved exact metadata read. Do not auto-delete a possibly created SA.
- M2 failure after M1: stop. The SA may remain without data authority; record partial
  state and wait for separately approved cleanup/review.
- M3 failure: stop before M4. The writer has no data role and must not receive one.
- M4 failure: stop. Do not retry or replace the project policy blindly.

No automatic rollback or service-account deletion is permitted. Cleanup is a separate
approval gate. Every policy mutation must preserve the existing IAM policy etag or
equivalent concurrency precondition; additive get/modify/set must not overwrite
concurrent unrelated changes.

## Poststate verification

After each confirmed mutation, W1C must perform only the exact bounded metadata/policy
read needed to verify that mutation. A successful full sequence must prove:

```text
WRITER_SA = EXISTS_ENABLED
CUSTOM_ROLE = EXISTS_EXACT
WRITER_ROLE_BINDING = PRESENT
CALLER_TOKEN_CREATOR_ON_EXACT_WRITER_SA = PRESENT
CALLER_PROJECT_WIDE_TOKEN_CREATOR = ABSENT
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR = ABSENT
AUDIT_SA_STAGE1_READER_BINDING = PRESENT
AUDIT_SA_CANONICAL_STATE_READER_BINDING = PRESENT
AUDIT_SA_CLASS_CREATE_ROLE = NO
```

The raw policy and caller identity must never be emitted. No writer token is generated
for poststate verification.

## Budgets and lifecycle

```text
ACTIVE_CALLER_DISCOVERY_MAX = 1
WRITER_SA_METADATA_PRECHECK_MAX = 1
CUSTOM_ROLE_PRECHECK_MAX = 1
PROJECT_IAM_POLICY_PRECHECK_MAX = 1
AUDIT_SA_POLICY_PRECHECK_MAX = 1 only if required
IAM_MUTATION_RETRY_MAX = 0
SERVICE_ACCOUNT_KEY_ALLOWED = no
AUTOMATIC_IAM_ROLLBACK = no
WRITER_PRIVILEGE_LIFETIME = MIGRATION_WINDOW_ONLY
POST_MIGRATION_IAM_CLEANUP_REQUIRED = yes
```

After the separately approved Class operation reaches a terminal result, remove the
writer data-role binding and exact Token Creator binding in a separate cleanup gate;
optionally disable the writer SA. Do not grant delete permission and do not delete
Class data as IAM cleanup.

## Prepared W1C approval wording

The next gate may authorize only a fresh prestate recheck followed by the four exact
IAM mutations above, with the locked identities, GA role, exact permissions, additive
etag-preserving policy updates, no keys, no project-wide Token Creator, no audit-SA
widening, no Firebase Admin reuse, and zero retry. Any drift, collision, ambiguous
outcome, or policy concurrency failure must stop without further mutation.

W1C must not authorize a writer token, Firestore read/write, Class creation, manifest
persistence, Rules/Indexes, deploy, commit, or push. Even a successful W1C leaves
`REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED`.

## Safety counters

```text
REAL_GCLOUD_COMMANDS = 0
LIVE_ACTIVE_CALLER_DISCOVERY_CALLS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
SERVICE_ACCOUNT_CREATION = 0
SERVICE_ACCOUNT_UPDATE = 0
SERVICE_ACCOUNT_DELETE = 0
CUSTOM_ROLE_CREATION = 0
CUSTOM_ROLE_UPDATE = 0
CUSTOM_ROLE_DELETE = 0
PROJECT_IAM_POLICY_MUTATIONS = 0
SERVICE_ACCOUNT_IAM_POLICY_MUTATIONS = 0
IAM_BINDING_ADDITIONS = 0
IAM_BINDING_REMOVALS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

```text
W1C_LIVE_IAM_MUTATION_APPROVAL = NOT_GRANTED
SERVICE_ACCOUNT_CREATE_APPROVAL = NOT_GRANTED
CUSTOM_ROLE_CREATE_APPROVAL = NOT_GRANTED
WRITER_TOKEN_CREATOR_BINDING_APPROVAL = NOT_GRANTED
WRITER_DATA_ROLE_BINDING_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
RECOMMENDED_NEXT_ACTION = WAIT_FOR_EXPLICIT_P1.5-C2H2E3D-W1C_IAM_MUTATION_APPROVAL
```
