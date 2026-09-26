# P1.5-C2H2E3D-W1 Minimal Class Migration Writer IAM Approval Gate

## Verdict

`P1_5_C2H2E3D_W1_MINIMAL_WRITER_IAM_APPROVAL_GATE_PASS`

This is a local IAM design and future prestate-inventory preparation only.
It grants no IAM authority and does not authorize the Class write.

## Safety and baseline

- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD at review start: `84b2c16`
- Previous E3D verdict: `P1_5_C2H2E3D_WRITER_IDENTITY_IAM_GATE_REQUIRED`
- Functions test status carried forward: `ENVIRONMENT_BLOCKED_BY_SPAWN_EPERM`
- Assertion failure observed: `no`

No gcloud command, live IAM read, token, Firestore read/write, service-account
mutation, role mutation, Rules/Indexes change, staging, commit, push, or deploy was
performed.

## Actual create call graph

Evidence:

- `functions/src/repositories/trustedTransaction.ts:16,65-89`
- `functions/src/registries/registryMutationRepository.ts:6-19`
- `functions/src/migrations/migrationRehearsalApplyAdapter.ts:223-243,263-281`

The repository primitive is a trusted backend `runTransaction` wrapper. Its adapter
maps `transaction.create()` to Firestore `transaction.create(firestore.doc(path), data)`.
The exact future one-Class writer must bind this primitive without a pre-read. The
broader Emulator rehearsal adapter performs a transaction read for idempotency and
existing-document classification before its create; that is rehearsal evidence, not
the proposed production writer graph.

```text
TRANSACTION_BEGIN_USED = yes
TRANSACTION_DOCUMENT_READ_USED = no in the proposed narrow writer
TRANSACTION_CREATE_USED = yes
TRANSACTION_COMMIT_USED = yes (runTransaction commit)
QUERY_OR_LIST_USED = no
WRITE_PATH_PRE_READ_COUNT = 0
```

The server create operation itself does not need `transaction.get()` to enforce
create-only semantics. It must not be implemented as `get-if-missing-then-set`, an
upsert, merge, or unconditional set.

## Minimum proposed data permission surface

The external candidate is accepted only as a design candidate because no live IAM
read was approved in W1. For the actual narrow transaction path:

```text
MINIMUM_WRITER_DATA_PERMISSIONS = [
  "datastore.databases.get",
  "datastore.entities.create"
]
DOCUMENT_READ_PERMISSION_REQUIRED = no
DOCUMENT_LIST_PERMISSION_REQUIRED = no
QUERY_PERMISSION_REQUIRED = no
UPDATE_PERMISSION_REQUIRED = no
DELETE_PERMISSION_REQUIRED = no
```

`datastore.databases.get` is a transaction-control/database metadata candidate for
begin/commit, not Class document access. It is not interchangeable with
`datastore.entities.get`. The exact Cloud API permission mapping must be confirmed in
the bounded W1A inventory before any IAM mutation. No extra data permission is
proposed.

```text
ATOMIC_CREATE_ONLY = PASS
CONCURRENT_CREATE_OVERWRITE_PREVENTED = yes
```

If the target exists at commit, create fails and the existing document remains
unchanged. The future runtime must classify that result as `ALREADY_EXISTS` or
`PRECONDITION_FAILED`, stop, and require separately approved exact-read review. It
must never overwrite or retry.

## Dedicated writer design

The audit reader remains unchanged and read-only:

```text
AUDIT_SA_USED_AS_WRITER = no
AUDIT_SA_ROLE_CHANGES_PROPOSED = 0
AUDIT_SA_DATA_PERMISSIONS_UNCHANGED = yes
FIREBASE_ADMIN_SA_USED_AS_WRITER = no
FIREBASE_ADMIN_TRANSITIVE_WRITER_IMPERSONATION = absent
```

Proposed identity, not created or verified live:

```text
PROPOSED_WRITER_SERVICE_ACCOUNT = myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com
PROPOSED_CUSTOM_ROLE_ID = mywebClassMigrationCreateOnly
```

Purpose is limited to one separately approved canonical Class create. It is not a
general application/runtime identity. The custom role candidate contains only:

```text
PROPOSED_CUSTOM_ROLE_PERMISSIONS = [
  "datastore.databases.get",
  "datastore.entities.create"
]
PROPOSED_CUSTOM_ROLE_EXTRA_PERMISSIONS = []
BROAD_DATA_ROLE_REQUIRED = no
```

Existing reader roles such as `mywebStage1CollectionIdReader` and
`mywebCanonicalStateReader` are not changed. Built-in Owner, Editor, Firebase Admin,
Datastore Owner, Datastore Editor, and Datastore User roles are rejected by default.

## Scope and exact-target guard

IAM custom-role binding cannot be assumed to restrict authority to one Firestore
document. The lowest supported binding scope for the proposed data role is unresolved
until W1A confirms the project/API behavior; document-level IAM restriction must not
be claimed. The application-level guard is therefore mandatory:

```text
LOWEST_SUPPORTED_WRITER_ROLE_BINDING_SCOPE = project-level role binding candidate; live support unresolved
RUNTIME_EXACT_TARGET_GUARD_REQUIRED = yes
```

The dormant runtime must lock project/database, the target workspace, `classRegistry`,
`class_2026_g2_c5`, operation `CREATE_ONLY`, the already approved plan ID, and the
already approved source fingerprint. Any drift must fail before token generation or
write. Payload validation must use the existing Class schema allowlist; no provenance
or privilege field may be inserted into the Class document.

## Token delegation and caller

Future authentication is short-lived impersonation only: exact writer service account,
quiet `--verbosity=error`, empty stderr on success, memory-only token, no JSON key, and
retry zero. No token is generated here.

```text
PROPOSED_TOKEN_CREATOR_RESOURCE_SCOPE = exact writer service-account resource
EXACT_CALLER_PRINCIPAL_LOCALLY_RESOLVED = no
SERVICE_ACCOUNT_JSON_KEY_ALLOWED = no
USER_MANAGED_KEY_CREATION = 0
```

The caller principal must be resolved from approved evidence, not inferred from a
workspace fingerprint. Until then, the Token Creator binding remains unresolved. A
project-wide Token Creator grant and any transitive Firebase Admin SDK impersonation
path are prohibited.

## Planned IAM mutations, not executed

If W1A proves the proposed identities are absent and the exact permission surface is
confirmed, the conceptual mutation set is:

1. Create the dedicated writer service account.
2. Create the custom role with exactly the two candidate permissions.
3. Bind the custom data role to the writer at the lowest supported scope.
4. Bind the approved caller's Token Creator permission on the exact writer service-account resource.

```text
PLANNED_IAM_MUTATIONS = [
  "service-account creation: 1",
  "custom-role creation: 1",
  "project/data-role policy binding: 1",
  "writer-service-account Token Creator policy binding: 1"
]
PLANNED_IAM_MUTATION_MAX = 4
```

This is a plan only. Existing identity or role collisions require
`STOP_AND_REVIEW`; no blind create/update is allowed.

## Required bounded W1A prestate inventory

The next separately approved stage may read only:

- exact project metadata needed to lock project identity;
- exact proposed writer service-account metadata and enabled state;
- exact proposed custom-role metadata and permission set;
- project IAM policy;
- exact writer service-account IAM policy;
- the minimum approved caller identity evidence;
- comparison evidence that project-wide Token Creator is absent, Firebase Admin is not
  transitively used, and the audit reader remains unchanged.

W1A must not read Firestore data, generate a writer or Firestore token, access service
account keys, or mutate IAM. Its approval is not granted by this document:

```text
WRITER_PRESTATE_IAM_READ_APPROVAL = NOT_GRANTED
```

After W1A, IAM mutation needs a separate explicit `P1.5-C2H2E3D-W1B` approval. After
that, the one-Class create needs its own runtime relock and write approval.

## Lifecycle and cleanup

```text
WRITER_PRIVILEGE_LIFETIME = migration-window-only
POST_MIGRATION_IAM_CLEANUP_REQUIRED = yes
```

After the separately approved operation reaches a terminal result, cleanup should
remove the writer data-role binding and exact Token Creator binding, and may disable
the writer service account. Service-account deletion is not automatic. IAM cleanup is
separately approved and does not include deleting Class data. No `datastore.entities.delete`
permission is granted.

## Future write and safety locks

```text
RUNTIME_REQUESTED_PERMISSION_SURFACE = [
  "datastore.databases.get",
  "datastore.entities.create"
]
CLASS_CREATE_MAX = 1
CLASS_UPDATE_MAX = 0
CLASS_DELETE_MAX = 0
OTHER_CANONICAL_WRITE_MAX = 0
MANIFEST_WRITE_MAX = 0
AUTOMATIC_CREATE_RETRY = 0
```

Timeout or network ambiguity is `WRITE_OUTCOME_INDETERMINATE`: stop and wait for a
separately approved exact read. No second create and no automatic rollback delete.
Confirmed success must validate the exact response document name and canonical Class
schema. A success cannot authorize Student, Subject, Enrollment, relationship,
manifest, Rules, or Index writes.

## Carried test limitation and counters

The Functions build passed during the preceding local validation. The Functions test
runner was blocked by sandbox worker `spawn EPERM`; no assertion failure was observed.
This remains an environment blocker and is not reported as a test pass.

```text
FUNCTIONS_TEST_EXECUTION_STATUS = ENVIRONMENT_BLOCKED_BY_SPAWN_EPERM
ASSERTION_FAILURE_OBSERVED = no
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
SERVICE_ACCOUNT_CREATION = 0
CUSTOM_ROLE_CREATION = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
```

## Approval status

```text
WRITER_SERVICE_ACCOUNT_CREATE_APPROVAL = NOT_GRANTED
WRITER_CUSTOM_ROLE_CREATE_APPROVAL = NOT_GRANTED
WRITER_ROLE_BINDING_APPROVAL = NOT_GRANTED
WRITER_TOKEN_CREATOR_BINDING_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1A MINIMAL CLASS MIGRATION WRITER IAM PRESTATE INVENTORY
```

The audit reader remains a reader, no IAM mutation occurred, and no production Class
creation is approved.
