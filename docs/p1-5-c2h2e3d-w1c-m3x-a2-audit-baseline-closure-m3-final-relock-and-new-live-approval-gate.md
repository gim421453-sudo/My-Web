# P1.5-C2H2E3D-W1C-M3X-A2 Audit Baseline Closure and M3 Final Relock

## Verdict

`P1_5_C2H2E3D_W1C_M3X_A2_FINAL_RELOCK_NEW_M3_APPROVAL_GATE_PASS`

This A2 package performed local integrity, repository, SDK-source, and synthetic
validation only. It performed zero live cloud operations.

## Recovery closure

```text
A1R1_VERDICT = P1_5_C2H2E3D_W1C_M3X_A1R1_AUDIT_ROLE_METADATA_RECOVERY_PASS
AUDIT_BASELINE_RECOVERY_CLOSED = yes
ACTUAL_AUDIT_BASELINE = SAFE
M3X_ABORT_ROOT_CAUSE = CUSTOM_ROLE_READ_INVOCATION_CONTRACT_DEFECT
ACTUAL_IAM_REGRESSION_CAUSED_M3X_ABORT = no
```

Fresh A1R1 evidence proved both exact custom roles, while the prior A1 project-policy
evidence supplied the binding predicates:

```text
Stage-1 role = EXISTS_EXACT; permission = datastore.entities.list; stage = GA; deleted = no
Canonical reader role = EXISTS_EXACT; permission = datastore.entities.get; stage = GA; deleted = no
A1 historical Stage-1 binding = PRESENT
A1 historical canonical binding = PRESENT
A1 historical audit Class-create role = ABSENT
A1 historical writer M4 binding = ABSENT
```

## Runtime and approval lock status

A1R0 changed no repository runtime or helper code. It added only its result document.
The future M3 executor is still a transient, approval-controlled command path; no
production M3 runtime exists in the repository.

```text
A1R0_RUNTIME_OR_HELPER_CODE_CHANGED = no
A1R0_CHANGE_PART_OF_FUTURE_M3_PRECHECK = no
M3R_APPROVAL_LOCK_STATUS = historical_only_not_reused
ABORTED_M3X_APPROVAL_STATUS = NOT_REUSABLE
OLD_M3_APPROVAL_REUSED = no
RUNTIME_CODE_FILES_CHANGED = 0
```

## Future M3 freshness policy

Fresh audit-role metadata reads are required immediately before a future mutation. No
freshness window was defined that would make A1R1 evidence sufficient by itself for a
new IAM mutation. The future M3Y approval must therefore reserve two exact role reads:
one for each approved role, with no retry or fallback. It must also freshly check the
writer and project IAM safety predicates immediately before mutation.

```text
FUTURE_M3_FRESH_AUDIT_ROLE_METADATA_READS_REQUIRED = yes
FUTURE_M3_AUDIT_ROLE_METADATA_READ_MAX = 2
```

## New M3 contract

```text
EXPECTED_ACTIVE_CALLER_COUNT = 1
EXPECTED_ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
M3_RESOURCE_SCOPE = exact-writer-service-account
PROJECT_WIDE_TOKEN_CREATOR_ALLOWED = no
M3_MUTATION_MAX = 1
M3_RETRY_MAX = 0
M4_MUTATION_MAX = 0
CUSTOM_ROLE_MUTATIONS = 0
AUDIT_SA_MUTATIONS = 0
FIREBASE_ADMIN_SA_MUTATIONS = 0
ACCESS_TOKEN_MAX = 0
FIRESTORE_MAX = 0
```

The one permitted future mutation is an additive
`roles/iam.serviceAccountTokenCreator` binding for the fingerprint-verified transient
caller on the exact writer service-account resource. Project policy, custom role,
audit SA, Firebase Admin SA, metadata, keys, M4, and data authority are excluded.

The concurrency contract is: read the exact writer-SA policy, retain its etag/version
or platform equivalent, add only the approved member to the approved role, and submit
an additive guarded update while preserving unrelated bindings.

```text
WRITER_SA_IAM_CONCURRENCY_GUARD = PASS
UNRELATED_WRITER_SA_BINDINGS_PRESERVED = yes
ROLE_MEMBER_SET_REPLACED_BLINDLY = no
FULL_POLICY_UNGUARDED_OVERWRITE = no
```

This is a contract relock, not a live mutation proof. M3Y must stop on duplicate M3,
M4, project-wide Token Creator, Firebase Admin Token Creator, audit baseline drift,
timeout, conflict, or ambiguous result. It must never retry or automatically roll back.

## Future M3 runtime graph

```text
FUTURE_M3_RUNTIME_GRAPH = [
  approval/relock guard,
  exact project and writer identity guard,
  exact two-role metadata validator,
  active caller discovery and fingerprint gate,
  exact writer-SA metadata read,
  exact writer-SA IAM policy precheck,
  project IAM safety precheck,
  additive etag/concurrency-guarded writer-SA policy mutation,
  exact writer-SA policy postcheck,
  project IAM safety postcheck,
  bounded privacy-safe result serializer
]
TEST_ONLY_HELPER_RUNTIME_DEPENDENCY = no
```

No repository runtime files implement this graph today; the graph is the next approved
execution contract. The local Cloud SDK is external capability evidence only.

## Hash locks

```text
M3_FINAL_RUNTIME_DEPENDENCIES = []
M3_FINAL_RUNTIME_LOCKS = []
M3_FINAL_TEST_LOCKS = []
M3_ROLE_READ_EXTERNAL_CAPABILITY_LOCKS = [
  { logical_file = iam-roles-describe-command, sha256 = cd591253cbe70fcf12f3145cca2667203fa606b9842afa344de24c6c2eac3739 },
  { logical_file = iam-role-name-normalization, sha256 = eea6f9241e9ba05260e9ea1c7d62ef1b26e4f854179e9348945f0088c91ab30c },
  { logical_file = iam-role-argument-contract, sha256 = 49a3552d38e32245cb5b5c26cc3df6e1096f91e3d49acbf11eda2014ae536ee2 }
]
```

The three external locks correspond to the locally inspected SDK sources for command
dispatch, role-name normalization, and role argument contract. No personal local path
is stored here.

## Synthetic focused validation

```text
FOCUSED_TEST_COUNT = 19
FOCUSED_TEST_RESULT = PASS
```

The matrix covered M3/M4 duplicate gates, project-wide Token Creator gates, both role
regressions, both audit binding regressions, wrong role/resource/project inputs,
permission drift, deleted roles, forbidden list fallback, and ambiguous mutation
handling. All negative cases stop before mutation; retry remains zero.

## Final approval state

```text
NEW_M3Y_LIVE_MUTATION_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
RECOMMENDED_NEXT_ACTION = WAIT_FOR_EXPLICIT_P1.5-C2H2E3D-W1C-M3Y_LIVE_MUTATION_APPROVAL
```

## Safety accounting

```text
REAL_GCLOUD_COMMANDS = 0
LIVE_IAM_READS = 0
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
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

No raw caller principal, credential, token, private key, or full IAM policy is stored.
