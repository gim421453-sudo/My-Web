# P1.5-C2H2E3D-W1C-M3X Exact Writer-SA Token Creator Live Mutation

## Verdict

`P1_5_C2H2E3D_W1C_M3X_AUDIT_BASELINE_REGRESSION_ABORT`

The newly approved M3X run stopped before mutation because the bounded project IAM
precheck did not prove the required audit-reader baseline. This is a fail-closed
abort, not a retry and not proof that the baseline was intentionally changed.

## Locked scope

The approved scope was one additive `roles/iam.serviceAccountTokenCreator` binding on
the exact writer service-account resource. Project-wide Token Creator, M4, custom-role,
metadata, token, Firestore, Class, manifest, Rules, and Index operations were outside
this run.

## M3R and recovery gates

```text
M3R_VERDICT = P1_5_C2H2E3D_W1C_M3R_NEW_MUTATION_APPROVAL_GATE_PASS
OLD_W1C_M3_BUDGET = EXHAUSTED
NEW_M3X_BUDGET = 1
RECOVERY_VERDICT = P1_5_C2H2E3D_W1C_R_RECOVERY_PASS_M3_ABSENT
```

## Bounded preflight result

```text
ACTIVE_CALLER_DISCOVERY_CALLS = 1
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
EXACT_CALLER_PRINCIPAL_RESOLVED = yes
EXACT_CALLER_PRINCIPAL_PERSISTED = no
RAW_CALLER_LOGGED = no
RAW_CALLER_RETURNED = no

WRITER_SA_METADATA_PRECHECK_READS = 1
WRITER_SA_PRESTATE = EXISTS_ENABLED
WRITER_SA_IAM_POLICY_PRECHECK_READS = 1
M3_BINDING_PRESTATE = ABSENT
M4_BINDING_PRESTATE = ABSENT
PROJECT_IAM_POLICY_PRECHECK_READS = 1
CALLER_PROJECT_WIDE_TOKEN_CREATOR_PRESTATE = absent
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR_PRESTATE = absent
AUDIT_READER_BASELINE_PRESTATE = NOT_PROVEN
PRE_MUTATION_DRIFT_RECHECK = FAIL
```

The bounded project-policy predicate for the required audit-reader baseline failed.
No full IAM policy was emitted or stored. Because the baseline gate failed, the run
did not attempt to infer a safe mutation from partial evidence.

## Mutation and poststate

```text
M3_MUTATION_ATTEMPTED = no
M3_MUTATION_ATTEMPT_COUNT = 0
TOTAL_IAM_MUTATIONS_ATTEMPTED = 0
M3_MUTATION_CONFIRMED = no
IAM_MUTATION_RETRY_COUNT = 0
M3_POSTSTATE = not_reached
M4_EFFECTIVE_POSTSTATE = unknown
M4_ATTEMPTS = 0
M4_APPROVAL = NOT_GRANTED
```

The exact writer-SA Token Creator binding was not added by this run. No automatic
rollback is applicable. A later recovery inventory must be separately bounded and
approved before any new mutation decision.

## Safety accounting

```text
WRITER_DATA_CREATE_AUTHORITY_FINAL = unknown
PROJECT_IAM_POLICY_MUTATIONS = 0
CUSTOM_ROLE_MUTATIONS = 0
WRITER_SA_METADATA_MUTATIONS = 0
AUDIT_SA_MUTATIONS = 0
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
RULES_CHANGES = 0
INDEX_CHANGES = 0
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
```

## Next action

Do not retry M3X. Perform a new, read-only bounded IAM recovery inventory to determine
why the audit-reader baseline predicate was not proven, then require a new explicit
approval before considering another mutation.

## Repository accounting

This result document contains no raw caller principal, credentials, tokens, full IAM
policy, private key, or local personal path. No staging, commit, push, or deploy was
performed.
