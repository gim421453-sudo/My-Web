# P1.5-C2H2E3D-W1C-M3R Exact Writer-SA Token Creator New Mutation Approval Gate

## Verdict

`P1_5_C2H2E3D_W1C_M3R_NEW_MUTATION_APPROVAL_GATE_PASS`

This is a new, standalone approval package for one future exact writer-service-account
Token Creator binding. It is not a retry of the exhausted W1C M3 budget and performs no
mutation.

## Recovered state

The W1C-R recovery result is:

```text
RECOVERY_VERDICT = P1_5_C2H2E3D_W1C_R_RECOVERY_PASS_M3_ABSENT
OLD_W1C_M3_BUDGET = EXHAUSTED
OLD_M3_BUDGET_REUSED = no
NEW_M3_MUTATION_REQUIRES_NEW_APPROVAL = yes
WRITER_SA_CURRENT = EXISTS_ENABLED
CUSTOM_ROLE_CURRENT = EXISTS_EXACT
CURRENT_M3_BINDING = ABSENT
CURRENT_M4_BINDING = ABSENT
CURRENT_WRITER_DATA_CREATE_AUTHORITY = no
```

The existing role remains `GA` with exactly `datastore.databases.get` and
`datastore.entities.create`. No audit reader, Firebase Admin, project-wide Token
Creator, or data-role binding is changed by this gate.

## Locked future mutation

```text
M3_ROLE = roles/iam.serviceAccountTokenCreator
M3_RESOURCE_SCOPE = exact-writer-service-account
WRITER_SERVICE_ACCOUNT = myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com
PROJECT_WIDE_TOKEN_CREATOR_ALLOWED = no
FUTURE_M3_MUTATION_MAX = 1
FUTURE_M3_RETRY_MAX = 0
FUTURE_M4_MAX = 0
```

The only permitted future change is adding the fingerprint-verified active caller as a
member of `roles/iam.serviceAccountTokenCreator` on the exact writer service-account
resource. No other member, role, service account, project policy, custom role, or
metadata may be changed.

## Future execution gate

The separately approved live M3 execution must, immediately before mutation:

1. Lock the project and exact writer identity.
2. Discover active caller at most once.
3. Require exactly one active caller and fingerprint `sha256/12:5e6692dda08c`.
4. Resolve the caller only transiently in memory.
5. Confirm writer SA is enabled and exact.
6. Read the exact writer-SA policy and confirm the caller binding is absent.
7. Read project policy and confirm caller and Firebase Admin project-wide Token Creator
   are absent, the M4 binding is absent, and the audit reader baseline is safe.
8. Perform one additive exact-resource policy mutation.
9. Read the exact writer-SA policy once and require `PRESENT_EXACT`.
10. Stop. M4 is never part of M3R/M3X.

```text
EXPECTED_ACTIVE_CALLER_COUNT = 1
EXPECTED_ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
EXACT_CALLER_PRINCIPAL_PERSISTED = no
RAW_CALLER_LOGGED = no
RAW_CALLER_RETURNED = no
```

If the binding is already present, stop for separate state review; do not treat it as
automatic success or add a duplicate. If the writer is absent/disabled, project-wide
Token Creator appears, audit baseline regresses, or M4 appears, stop before mutation.

## IAM policy concurrency

The future mechanism must read the exact service-account IAM policy, preserve unrelated
bindings, and submit an additive policy update with the returned etag/version or the
platform-equivalent concurrency precondition. A blind full-policy replacement is not
allowed.

```text
WRITER_SA_IAM_CONCURRENCY_GUARD = REQUIRED_AND_MUST_BE_PROVEN_IN_M3X
UNRELATED_WRITER_SA_BINDINGS_PRESERVED = yes
PROJECT_IAM_POLICY_MUTATIONS = 0
CUSTOM_ROLE_MUTATIONS = 0
WRITER_SA_METADATA_MUTATIONS = 0
```

The caller member is the only permitted new member. Firebase Admin SA, audit SA,
another human, group/domain, `allAuthenticatedUsers`, and `allUsers` are forbidden.

## Failure and ambiguity policy

Authentication failure, permission denial, conflict, etag/precondition failure, non-zero
exit, timeout, unexpected response, or network ambiguity means immediate stop. Retry is
zero. An ambiguous result requires a new bounded read-only exact writer-SA recovery
inventory; it does not permit repeating the mutation.

```text
M3_MUTATION_RETRY = 0
AUTOMATIC_IAM_ROLLBACK = no
WRITER_CUSTOM_ROLE_BINDING_MUTATION = 0
M4_ATTEMPTS = 0
```

No writer SA deletion, role removal, Token Creator removal, or project policy change is
automatic. Cleanup is a separate approval.

## Expected successful poststate

Only this future poststate is acceptable:

```text
WRITER_SA = EXISTS_ENABLED
CUSTOM_ROLE = EXISTS_EXACT
M3 = PRESENT_EXACT
M4 = ABSENT
WRITER_DATA_CREATE_AUTHORITY = no
CALLER_PROJECT_WIDE_TOKEN_CREATOR = absent
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR = absent
AUDIT_READER_BASELINE = unchanged
```

Token Creator provides only the capability to impersonate the writer; it does not grant
Firestore create authority by itself. M4 remains a separate future W1D approval gate.

## Safety and approval status

```text
REAL_GCLOUD_COMMANDS = 0
LIVE_ACTIVE_CALLER_DISCOVERY_CALLS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
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
```

```text
NEW_M3_LIVE_MUTATION_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
RECOMMENDED_NEXT_ACTION = WAIT_FOR_EXPLICIT_P1.5-C2H2E3D-W1C-M3X_LIVE_MUTATION_APPROVAL
```

M3R grants nothing and stops after preparing the standalone M3X approval package.
