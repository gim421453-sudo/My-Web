# P1.5-C2H2E3D-W1C Minimal Class Migration Writer IAM Mutation

## Verdict

`P1_5_C2H2E3D_W1C_IAM_MUTATION_OUTCOME_INDETERMINATE`

W1C was explicitly approved for only the four IAM setup mutations. Execution stopped
after M3 returned non-zero. Because the mutation error was intentionally not emitted,
the M3 server outcome is not treated as definitively absent or present. No retry,
M4, token, Firestore, Class, manifest, or rollback operation was performed.

## Pre-mutation gate

```text
PRE_MUTATION_DRIFT_RECHECK = PASS
ACTIVE_CALLER_DISCOVERY_CALLS = 1
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
EXACT_CALLER_PRINCIPAL_RESOLVED = yes
EXACT_CALLER_PRINCIPAL_PERSISTED = no
WRITER_SA_PRESTATE_AT_W1C = ABSENT
CUSTOM_ROLE_PRESTATE_AT_W1C = ABSENT
CALLER_PROJECT_WIDE_TOKEN_CREATOR_PRESTATE = absent
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR_PRESTATE = absent
```

The audit reader baseline was present and safe at the pre-mutation check. No raw caller
principal, credential, token, or unfiltered IAM policy was stored.

## Mutation results

| Mutation | Attempted | Confirmed | Result |
| --- | --- | --- | --- |
| M1 create dedicated writer SA | yes | yes | poststate passed: exact enabled identity |
| M2 create exact custom role | yes | yes | poststate passed: GA, exactly two permissions |
| M3 exact writer-SA Token Creator | yes | no | non-zero command result; outcome indeterminate |
| M4 final project data-role binding | no | no | not executed after M3 stop |

```text
M1_ATTEMPTED = yes
M1_CONFIRMED = yes
M1_POSTSTATE = PASS
M2_ATTEMPTED = yes
M2_CONFIRMED = yes
M2_POSTSTATE = PASS
M3_ATTEMPTED = yes
M3_CONFIRMED = no
M3_POSTSTATE = NOT_RUN_AFTER_NONZERO_RESULT
M4_ATTEMPTED = no
M4_CONFIRMED = no
M4_POSTSTATE = NOT_RUN
TOTAL_IAM_MUTATIONS_ATTEMPTED = 3
TOTAL_IAM_MUTATIONS_CONFIRMED = 2
IAM_MUTATION_RETRY_COUNT = 0
```

M3 was the exact service-account resource Token Creator binding only. Its non-zero
result was not retried and its stderr was not persisted. Since no bounded poststate
read was part of the failed M3 execution, the exact binding state is unknown until a
separately approved recovery inventory.

## Current authority state

M4 never ran, so the project data-create role was not activated by this execution:

```text
AFTER_M1_WRITER_DATA_CREATE_AUTHORITY = no
AFTER_M2_WRITER_DATA_CREATE_AUTHORITY = no
AFTER_M3_WRITER_DATA_CREATE_AUTHORITY = no
AFTER_M4_WRITER_DATA_CREATE_AUTHORITY = not_applicable
CURRENT_WRITER_DATA_CREATE_AUTHORITY = no (M4 was not attempted)
LAST_CONFIRMED_MUTATION = M2
MUTATIONS_CONFIRMED_APPLIED = [M1, M2]
```

The M3 Token Creator state must not be inferred from the command exit alone. It is not
data-create authority and no project-wide Token Creator was granted by the approved
M3 command. A future recovery read must verify exact writer-SA policy before any
decision about continuation.

## Concurrency, rollback, and stop policy

M4 was not reached, so its project IAM etag/concurrency guard and unrelated-binding
preservation were not executed:

```text
PROJECT_IAM_CONCURRENCY_GUARD = NOT_RUN_AFTER_M3_STOP
UNRELATED_PROJECT_IAM_BINDINGS_PRESERVED = NOT_VERIFIED
AUTOMATIC_IAM_ROLLBACK = no
```

M1 and M2 are intentionally not automatically deleted. Removing them would be new IAM
mutations requiring fresh state evidence and separate approval. No M4 retry is allowed.
Any ambiguous M3 result requires:

```text
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1C-R BOUNDED IAM POSTSTATE RECOVERY INVENTORY
```

That recovery stage must read only the exact writer SA metadata/policy, project policy
predicates, and audit baseline needed to determine whether M3 applied. It must not
generate a token, touch Firestore, mutate IAM, or proceed automatically to M4.

## Safety counters

```text
REAL_GCLOUD_COMMANDS = 11 (including one local config read, one caller discovery, six bounded IAM reads, and three mutation attempts)
LIVE_ACTIVE_CALLER_DISCOVERY_CALLS = 1
LIVE_IAM_READS = 6 bounded pre/post reads executed before the M3 stop
IAM_MUTATIONS = 2 confirmed, 1 attempted with indeterminate outcome
SERVICE_ACCOUNT_CREATION = 1
CUSTOM_ROLE_CREATION = 1
PROJECT_IAM_POLICY_MUTATIONS = 0
SERVICE_ACCOUNT_IAM_POLICY_MUTATIONS = 1 attempted, outcome indeterminate
IAM_BINDING_ADDITIONS = 1 attempted, outcome indeterminate
IAM_BINDING_REMOVALS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
CANONICAL_CLASS_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
IAM_MUTATION_RETRY_COUNT = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

The live-IAM read count includes the bounded prechecks and M1/M2 poststate reads; no
unrelated policy enumeration was performed. No raw response or error text is included
in this result.

## Remaining gates

```text
WRITER_SA_FINAL = EXISTS_ENABLED
CUSTOM_ROLE_FINAL = EXISTS_EXACT
WRITER_CUSTOM_ROLE_BINDING_FINAL = NOT_REACHED
CALLER_TOKEN_CREATOR_ON_EXACT_WRITER_SA_FINAL = UNKNOWN_PENDING_RECOVERY_READ
CALLER_PROJECT_WIDE_TOKEN_CREATOR_FINAL = absent at precheck; post-M3 not verified
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR_FINAL = absent at precheck; post-M3 not verified
AUDIT_SA_STAGE1_READER_BINDING_FINAL = present at precheck
AUDIT_SA_CANONICAL_STATE_READER_BINDING_FINAL = present at precheck
AUDIT_SA_CLASS_CREATE_ROLE_FINAL = no at precheck
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_EXECUTION_STATUS = ENVIRONMENT_BLOCKED_BY_SPAWN_EPERM
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

No Class write is authorized even if IAM recovery later confirms M3. The Functions
spawn blocker, writer runtime relock, transaction.create matrix, final hashes, and
separate Class approval remain mandatory.
