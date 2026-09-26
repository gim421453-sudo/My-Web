# P1.5-C2H2E3D-W1A Minimal Class Migration Writer IAM Prestate Inventory

## Verdict

`P1_5_C2H2E3D_W1A_IAM_PRESTATE_INVENTORY_PASS`

This inventory used the explicitly approved bounded live IAM read scope only. It did
not create a token, access Firestore, change IAM, or access production data.

## Locked scope and privacy

- Project: `my-management-app-8a933` / number `607154464656`
- Proposed writer: `myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com`
- Proposed role: `projects/my-management-app-8a933/roles/mywebClassMigrationCreateOnly`
- Active caller fingerprint: `sha256/12:5e6692dda08c`
- Raw caller principal was used transiently for policy predicates only and was not
  returned, logged, persisted, or written to this document.

The active caller discovery matched exactly one active account and the approved
fingerprint. No second active-caller discovery was performed after the initial command
adapter failure; the remaining reads used the already verified local active config
value transiently.

## Exact prestate result

```text
ACTIVE_CALLER_DISCOVERY_CALLS = 1
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
EXACT_CALLER_PRINCIPAL_RESOLVED = yes
EXACT_CALLER_PRINCIPAL_PERSISTED = no
RAW_CALLER_RETURNED = no
RAW_CALLER_LOGGED = no

WRITER_SA_PRESTATE = ABSENT
CUSTOM_ROLE_PRESTATE = ABSENT
CUSTOM_ROLE_EXACT_PERMISSIONS = []
CUSTOM_ROLE_EXTRA_PERMISSION_COUNT = 0
CUSTOM_ROLE_MISSING_PERMISSION_COUNT = 2
WRITER_CUSTOM_ROLE_BINDING = ABSENT

CALLER_PROJECT_WIDE_TOKEN_CREATOR = absent
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR = absent

AUDIT_SA_STAGE1_READER_BINDING = present
AUDIT_SA_CANONICAL_STATE_READER_BINDING = present
AUDIT_SA_HAS_CLASS_CREATE_ROLE = no
CALLER_TOKEN_CREATOR_ON_EXACT_AUDIT_SA = present
CALLER_TOKEN_CREATOR_ON_EXACT_WRITER_SA = NOT_APPLICABLE_BECAUSE_WRITER_ABSENT
WRITER_SA_UNEXPECTED_DELEGATION_PRESENT = not_applicable
```

The proposed writer and role returned not-found prestate, not a conflicting identity or
role. The project policy contains the established audit reader bindings and no
project-wide Token Creator binding for the approved caller or Firebase Admin service
account. The exact audit service-account policy retains the established caller
Token Creator baseline. Raw policy members and unrelated bindings are intentionally not
published.

## Bounded read counts

```text
WRITER_SA_METADATA_READS = 1
CUSTOM_ROLE_METADATA_READS = 1
PROJECT_IAM_POLICY_READS = 1
WRITER_SA_IAM_POLICY_READS = 0
AUDIT_SA_IAM_POLICY_READS = 1
LIVE_IAM_READS = 4
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
```

The writer service-account policy was not read because the writer service account is
absent. No service-account key endpoint was called.

## Prestate matrix

| Item | State | Consequence |
| --- | --- | --- |
| Dedicated writer service account | ABSENT | Creation remains a future mutation |
| Custom role | ABSENT | Exact two-permission role creation remains a future mutation |
| Writer custom-role binding | ABSENT | Binding remains a future mutation after writer/role exist |
| Writer exact Token Creator binding | NOT_APPLICABLE_BECAUSE_WRITER_ABSENT | Bind only after the exact writer resource exists |
| Caller project-wide Token Creator | ABSENT | No regression; do not add one |
| Firebase Admin project-wide Token Creator | ABSENT | No transitive writer path |
| Audit reader Stage-1 role | PRESENT | Preserve unchanged |
| Audit reader canonical-state role | PRESENT | Preserve unchanged |
| Audit reader Class-create capability | NO | Reader remains read-only |
| Caller Token Creator on exact audit SA | PRESENT | Comparison baseline; preserve unchanged |

## Prestate-aware future mutation set

The minimum future set is now exact and dependency ordered. Nothing below was executed:

1. `CREATE_WRITER_SERVICE_ACCOUNT` for the proposed dedicated identity.
2. `CREATE_CUSTOM_ROLE` with exactly `datastore.databases.get` and
   `datastore.entities.create`.
3. `ADD_WRITER_CUSTOM_ROLE_BINDING` at the lowest separately verified supported IAM
   scope, currently a project-level candidate.
4. `ADD_EXACT_WRITER_SA_TOKEN_CREATOR` for the approved caller on the exact writer
   service-account resource, after item 1 creates that resource.

```text
IAM_MUTATION_PLAN_IS_PRESTATE_AWARE = yes
PENDING_IAM_MUTATIONS = [
  CREATE_WRITER_SERVICE_ACCOUNT,
  CREATE_CUSTOM_ROLE,
  ADD_WRITER_CUSTOM_ROLE_BINDING,
  ADD_EXACT_WRITER_SA_TOKEN_CREATOR_AFTER_WRITER_CREATION
]
PENDING_IAM_MUTATION_COUNT = 4
EXISTING_IDENTITY_COLLISION_POLICY = STOP_AND_REVIEW
```

No create-or-update, blind policy replacement, role overwrite, or automatic enablement
is permitted. The proposed role remains limited to the W1 candidate permissions:

```text
CUSTOM_ROLE_PERMISSIONS = [
  datastore.databases.get,
  datastore.entities.create
]
DOCUMENT_READ_PERMISSION_REQUIRED = no
DOCUMENT_LIST_PERMISSION_REQUIRED = no
QUERY_PERMISSION_REQUIRED = no
UPDATE_PERMISSION_REQUIRED = no
DELETE_PERMISSION_REQUIRED = no
```

IAM does not establish document-level restriction to the single Class. The future
runtime must independently lock project, database, workspace, `classRegistry`, the
approved Class ID, exact payload/provenance, and `CREATE_ONLY` before any token or
write.

## Safety counters and carried blockers

```text
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
IAM_MUTATIONS = 0
SERVICE_ACCOUNT_CREATION = 0
CUSTOM_ROLE_CREATION = 0
IAM_BINDING_ADDITIONS = 0
IAM_BINDING_REMOVALS = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
RETRY = 0
```

The Functions test status remains:

```text
FUNCTIONS_TEST_EXECUTION_STATUS = ENVIRONMENT_BLOCKED_BY_SPAWN_EPERM
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
ASSERTION_FAILURE_OBSERVED = no
```

The test-runner blocker must be resolved before final Class-create approval. W1A does
not attempt unrelated Functions fixes.

## Approval status and next gate

```text
WRITER_PRESTATE_IAM_READ_APPROVAL = CONSUMED_FOR_THIS_BOUNDED_READ
WRITER_IAM_MUTATION_APPROVAL = NOT_GRANTED
WRITER_SERVICE_ACCOUNT_CREATE_APPROVAL = NOT_GRANTED
WRITER_CUSTOM_ROLE_CREATE_APPROVAL = NOT_GRANTED
WRITER_ROLE_BINDING_APPROVAL = NOT_GRANTED
WRITER_TOKEN_CREATOR_BINDING_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1B MINIMAL CLASS MIGRATION WRITER IAM MUTATION APPROVAL GATE
```

W1A is read-only and complete. Stop here until a separate W1B approval authorizes
review of the exact mutation plan. No IAM mutation or Class creation is authorized.
