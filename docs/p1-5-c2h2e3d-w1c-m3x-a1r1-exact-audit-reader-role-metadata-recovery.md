# P1.5-C2H2E3D-W1C-M3X-A1R1 Exact Audit Reader Role Metadata Recovery

## Verdict

`P1_5_C2H2E3D_W1C_M3X_A1R1_AUDIT_ROLE_METADATA_RECOVERY_PASS`

This was a new, bounded, read-only live IAM approval. Exactly two custom-role metadata
reads were performed. No project policy read, caller discovery, retry, IAM mutation,
token operation, impersonation, Firestore access, Class write, or manifest persistence
was performed.

## Gate composition

```text
A1R0_VERDICT = P1_5_C2H2E3D_W1C_M3X_A1R0_NEW_ROLE_READ_PATH_APPROVAL_GATE_PASS
A1_OLD_STAGE1_READ_BUDGET = EXHAUSTED
A1_OLD_CANONICAL_READ_BUDGET = EXHAUSTED
A1_APPROVAL_REUSED = no
```

The corrected exact-role path used role ID plus project scope, structured JSON output,
and bounded field extraction. It did not use role listing or search.

## Stage-1 role read

```text
STAGE1_ROLE_METADATA_READS = 1
STAGE1_ROLE_STATE = EXISTS_EXACT
STAGE1_ROLE_RESOURCE_MATCH = yes
STAGE1_ROLE_INCLUDED_PERMISSIONS = [datastore.entities.list]
STAGE1_ROLE_EXTRA_PERMISSION_COUNT = 0
STAGE1_ROLE_MISSING_PERMISSION_COUNT = 0
STAGE1_ROLE_STAGE = GA
STAGE1_ROLE_DELETED = no
```

Expected resource matched exactly:

```text
projects/my-management-app-8a933/roles/mywebStage1CollectionIdReader
```

## Canonical reader role read

```text
CANONICAL_ROLE_METADATA_READS = 1
CANONICAL_READER_ROLE_STATE = EXISTS_EXACT
CANONICAL_ROLE_RESOURCE_MATCH = yes
CANONICAL_READER_INCLUDED_PERMISSIONS = [datastore.entities.get]
CANONICAL_READER_EXTRA_PERMISSION_COUNT = 0
CANONICAL_READER_MISSING_PERMISSION_COUNT = 0
CANONICAL_READER_ROLE_STAGE = GA
CANONICAL_READER_ROLE_DELETED = no
```

Expected resource matched exactly:

```text
projects/my-management-app-8a933/roles/mywebCanonicalStateReader
```

## Baseline composition

The following are explicitly labeled as prior A1 project-policy evidence and were not
re-read in A1R1:

```text
A1_HISTORICAL_AUDIT_STAGE1_BINDING = PRESENT
A1_HISTORICAL_AUDIT_CANONICAL_BINDING = PRESENT
A1_HISTORICAL_AUDIT_CLASS_CREATE_ROLE = ABSENT
A1_HISTORICAL_WRITER_M4_BINDING = ABSENT
```

Combining the fresh exact role metadata with that bounded A1 binding evidence:

```text
ACTUAL_AUDIT_BASELINE = SAFE
A1_ROLE_READ_FORMAT_ROOT_CAUSE_CONFIRMED = yes
NEW_ROLE_READ_PATH_REAL_LIVE_VALIDATED = yes
```

The prior M3X abort was caused by the old malformed role-resource invocation and the
transient predicate defect; it was not evidence of role deletion or permission drift.

## M3 remains closed

```text
ABORTED_M3X_APPROVAL_REUSED = no
M3_LIVE_MUTATION_APPROVAL = NOT_GRANTED
M3_BINDING = ABSENT
M4_BINDING = ABSENT
WRITER_DATA_CREATE_AUTHORITY = no
```

The next step is a new A2 final relock and new one-mutation M3 approval gate. A1R1 does
not authorize the writer-SA Token Creator mutation.

## Safety counters

```text
NEW_STAGE1_ROLE_METADATA_READ_MAX = 1
NEW_CANONICAL_ROLE_METADATA_READ_MAX = 1
NEW_TOTAL_ROLE_METADATA_READ_MAX = 2
NEW_ROLE_METADATA_RETRY_MAX = 0
STAGE1_ROLE_METADATA_READS = 1
CANONICAL_ROLE_METADATA_READS = 1
TOTAL_ROLE_METADATA_READS = 2
ROLE_METADATA_RETRIES = 0
ROLE_LIST_CALLS = 0
ROLE_SEARCH_CALLS = 0
PROJECT_IAM_POLICY_READS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
```

## Repository and privacy

No full IAM policy, human caller principal, credential, token, private key, or personal
path is stored in this report. No staging, commit, push, or deploy was performed.
