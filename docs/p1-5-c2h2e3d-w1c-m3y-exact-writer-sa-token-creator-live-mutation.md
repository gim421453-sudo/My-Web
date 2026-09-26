# P1.5-C2H2E3D-W1C-M3Y Exact Writer-SA Token Creator Mutation

## Verdict

`P1_5_C2H2E3D_W1C_M3Y_EXTERNAL_CAPABILITY_DRIFT_ABORT`

The run stopped at the mandatory pre-live capability-lock gate. No gcloud command or
live IAM operation was started. This was a fail-closed integrity abort, not a failed
IAM mutation and not evidence of production IAM drift.

## Required recovery chain

```text
A1 = P1_5_C2H2E3D_W1C_M3X_A1_IAM_EVIDENCE_INCOMPLETE
A1R0 = P1_5_C2H2E3D_W1C_M3X_A1R0_NEW_ROLE_READ_PATH_APPROVAL_GATE_PASS
A1R1 = P1_5_C2H2E3D_W1C_M3X_A1R1_AUDIT_ROLE_METADATA_RECOVERY_PASS
A2 = P1_5_C2H2E3D_W1C_M3X_A2_FINAL_RELOCK_NEW_M3_APPROVAL_GATE_PASS
OLD_M3_APPROVAL_REUSED = no
```

## Integrity gate

```text
ALL_M3_FINAL_RUNTIME_LOCKS_MATCH = yes
ALL_ROLE_READ_EXTERNAL_CAPABILITY_LOCKS_MATCH = not_proven
```

A2 stored the external capability locks as logical filenames and hashes, but did not
store canonical absolute paths. The pre-live resolver found more than one local
`flags.py`, so it could not prove that the intended exact SDK file was the locked file.
Because the M3Y gate requires an unambiguous capability lock, execution stopped before
role reads, caller discovery, or IAM access. No automatic relock or retry was made.

```text
M3Y_ABORT_REASON = EXTERNAL_CAPABILITY_LOCK_PATH_AMBIGUITY
LIVE_IAM_READS = 0
```

## Mutation state

```text
STAGE1_ROLE_METADATA_READS = 0
CANONICAL_ROLE_METADATA_READS = 0
ROLE_METADATA_RETRIES = 0
ROLE_LIST_CALLS = 0
ROLE_SEARCH_CALLS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
WRITER_SA_METADATA_READS = 0
WRITER_SA_IAM_POLICY_PRECHECK_READS = 0
PROJECT_IAM_POLICY_PRECHECK_READS = 0
M3_MUTATION_ATTEMPTED = no
M3_MUTATION_ATTEMPT_COUNT = 0
IAM_MUTATION_RETRY_COUNT = 0
WRITER_SA_IAM_POLICY_POSTCHECK_READS = 0
PROJECT_IAM_POLICY_POSTCHECK_READS = 0
M3_POSTSTATE = not_reached
M4_EFFECTIVE_POSTSTATE = unknown
M4_ATTEMPTS = 0
```

No caller principal was resolved, logged, returned, or persisted. No policy was read,
changed, replaced, or rolled back.

## Prohibited operations confirmed zero

```text
IAM_MUTATIONS = 0
CUSTOM_ROLE_MUTATIONS = 0
AUDIT_SA_MUTATIONS = 0
FIREBASE_ADMIN_SA_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
CANONICAL_CLASS_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
M4_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

## Next action

Do not rerun M3Y under this approval. First create a new local capability-lock
reconciliation package that binds each external hash to one canonical SDK path and
proves the path-to-hash mapping without executing gcloud. A new M3Y approval is then
required; this approval is not reusable.

## Repository and privacy

This report contains no raw caller principal, full IAM policy, credential, token,
private key, or personal path. No staging, commit, push, or deploy was performed.
