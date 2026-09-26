# P1.5-C2H2E3D-W1C-R Bounded IAM Poststate Recovery Inventory

## Verdict

`P1_5_C2H2E3D_W1C_R_RECOVERY_PASS_M3_ABSENT`

This recovery inventory was read-only. It resolved the ambiguous M3 outcome without
retrying M3 and confirmed that M4 was not effective. No IAM mutation, token, Firestore,
Class, manifest, or rollback operation was performed.

## Recovery gate and privacy

```text
W1C_VERDICT = P1_5_C2H2E3D_W1C_IAM_MUTATION_OUTCOME_INDETERMINATE
W1C_LAST_CONFIRMED_MUTATION = M2
W1C_M3_ATTEMPTED = yes
W1C_M3_ORIGINAL_BUDGET = EXHAUSTED
W1C_M4_ATTEMPTED = no
ACTIVE_CALLER_DISCOVERY_CALLS = 1
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
EXACT_CALLER_PRINCIPAL_RESOLVED = yes
EXACT_CALLER_PRINCIPAL_PERSISTED = no
```

The raw caller principal was used transiently for the exact writer-SA policy predicate
only. It was not logged, returned, or persisted.

## Exact poststate

```text
WRITER_SA_POSTSTATE = EXISTS_ENABLED
CUSTOM_ROLE_POSTSTATE = EXISTS_EXACT
CUSTOM_ROLE_STAGE = GA
CUSTOM_ROLE_PERMISSIONS = [
  datastore.databases.get,
  datastore.entities.create
]
CUSTOM_ROLE_EXTRA_PERMISSION_COUNT = 0

M3_EFFECTIVE_POSTSTATE = ABSENT
CALLER_TOKEN_CREATOR_ON_EXACT_WRITER_SA = absent
M4_EFFECTIVE_POSTSTATE = ABSENT
WRITER_CUSTOM_ROLE_BINDING = absent

WRITER_DATA_CREATE_AUTHORITY_VIA_MIGRATION_ROLE = no
PARTIAL_STATE_DATA_CREATE_AUTHORITY = no
```

The exact writer service-account policy contained no approved caller Token Creator
binding. The project policy contained no writer custom-role binding. This means M3 did
not remain effective after the non-zero command result, and M4 definitely did not run.

## Safety predicates

```text
CALLER_PROJECT_WIDE_TOKEN_CREATOR = absent
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR = absent
AUDIT_SA_STAGE1_READER_BINDING = present
AUDIT_SA_CANONICAL_STATE_READER_BINDING = present
AUDIT_SA_CLASS_CREATE_ROLE = no
WRITER_SA_UNEXPECTED_DELEGATION_PRESENT = no
```

M3 being absent does not authorize a retry. Token delegation is not data authority, and
M4 remains the only planned migration-role data-create activation edge.

## Bounded read budget

```text
WRITER_SA_METADATA_READS = 1
CUSTOM_ROLE_METADATA_READS = 1
WRITER_SA_IAM_POLICY_READS = 1
PROJECT_IAM_POLICY_READS = 1
LIVE_IAM_READS = 4
ACTIVE_CALLER_DISCOVERY_CALLS = 1
```

No other live inventory was performed. No full IAM policy was emitted.

## Mutation and data safety counters

```text
M3_RETRY_ATTEMPTS = 0
M4_ATTEMPTS = 0
IAM_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
WRITER_CAPABILITY_LIVE_PROBE = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
AUTOMATIC_IAM_ROLLBACK = no
RULES_CHANGES = 0
INDEX_CHANGES = 0
```

M1 and M2 remain confirmed from W1C. They were not removed automatically. The original
M3 mutation budget is exhausted; an absent M3 requires a new explicit approval, not a
retry under W1C.

## Next gate

```text
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_EXECUTION_STATUS = ENVIRONMENT_BLOCKED_BY_SPAWN_EPERM
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1C-M3R EXACT WRITER-SA TOKEN CREATOR NEW MUTATION APPROVAL GATE
```

M3R may authorize at most one new exact writer-service-account Token Creator binding,
with retry zero, M4 zero, token generation zero, and Firestore zero. After any future
M3R success, a separate W1D gate is required before M4. No Class creation is authorized
by this recovery inventory.
