# P1.5-C2H2E3D-W1C-M3L1-F2 Bounded `testIamPermissions` Disambiguation

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_F2_TESTED_PERMISSIONS_PRESENT_AUTH_GAP_DISPROVEN`

This record documents one separately approved, non-mutating IAM diagnostic.
It does not authorize or perform an M3 retry, an IAM policy change, a token
operation, impersonation, or a Firestore operation.

## Baseline and prerequisite

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
F1_VERDICT = P1_5_C2H2E3D_W1C_M3L1_F1_ROOT_CAUSE_NOT_PROVEN_NEEDS_BOUNDED_F2
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
M3_RETRY_ALLOWED = no
```

F1 established that the prior M3 command returned a confirmed nonzero failure,
but did not preserve a provider error class. F1 also established the existing
caller continuity fingerprint `sha256/12:5e6692dda08c`; the raw caller was not
persisted or logged. That same approved local/runtime evidence was used here.

## Exact method contract

The installed Cloud SDK generated IAM v1 client was inspected locally before
the live call:

```text
TEST_IAM_PERMISSIONS_METHOD = iam.projects.serviceAccounts.testIamPermissions
TEST_IAM_PERMISSIONS_RESOURCE = projects/my-management-app-8a933/serviceAccounts/myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com
TEST_RESOURCE_SCOPE = EXACT_WRITER_SERVICE_ACCOUNT
TEST_IAM_PERMISSIONS_TRANSPORT = local Cloud SDK generated IAM v1 apitools client; HTTP POST v1/{+resource}:testIamPermissions
```

The generated client defines `TestIamPermissions` for
`IamProjectsServiceAccountsTestIamPermissionsRequest`, with the exact
`resource` field and nested `TestIamPermissionsRequest.permissions` field.
The local SDK example constructs the same nested request and invokes
`client.projects_serviceAccounts.TestIamPermissions(request)`.

The request contained exactly these two unique permissions and no wildcard or
additional exploratory permission:

```json
[
  "iam.serviceAccounts.getIamPolicy",
  "iam.serviceAccounts.setIamPolicy"
]
```

## Bounded execution

```text
F2_CALLER_CONTEXT_CONTINUITY = PROVEN
RAW_CALLER_PERSISTED = no
RAW_CALLER_LOGGED = no
TEST_IAM_PERMISSIONS_CALLS = 1/1
TEST_IAM_PERMISSIONS_RETRIES = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
```

The single request returned only the normalized allowed permission names:

```text
RETURNED_ALLOWED_PERMISSIONS = [
  iam.serviceAccounts.getIamPolicy,
  iam.serviceAccounts.setIamPolicy
]
```

No raw response, policy, credential, token, authorization header, or provider
diagnostic body was persisted.

## Interpretation

```text
F2_DIAGNOSTIC_RESULT = RESOLVED
GET_IAM_POLICY_PERMISSION = PRESENT
SET_IAM_POLICY_PERMISSION = PRESENT
AUTHORIZATION_GAP_PROVEN = no
CALLER_MISSING_WRITER_SA_POLICY_MUTATION_AUTHORITY = DISPROVEN_FOR_TESTED_PERMISSIONS
F2_EVIDENCE_CONSISTENCY = CONSISTENT
ROOT_CAUSE = ROOT_CAUSE_NOT_PROVEN
ROOT_CAUSE_CONFIDENCE = INSUFFICIENT
```

The result disproves the tested caller-permission gap for this exact resource
and permission set. It does **not** prove that the prior M3 failure is solved;
possible remaining causes require a new local/non-mutating diagnostic design.
`iam.serviceAccounts.testIamPermissions` checks effective permission presence;
it does not mutate policy. The Token Creator role is not equivalent to
`setIamPolicy` authority.

## Required stop state

```text
M3_EXPECTED_EFFECTIVE_STATE = ABSENT
M3_FRESH_POSTSTATE_VERIFIED = no
M3_POSTSTATE_READS = 0
M4_APPROVAL = NOT_GRANTED
W1D_STATUS = BLOCKED_PENDING_M3_SUCCESS
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1C-M3L1-F3 local non-mutating OP-E failure diagnostic redesign
```

F3 must begin locally. No M3 approval is revived by this diagnostic, and no
permission should be granted.

## Safety counters

```text
IAM_POLICY_READS = 0
PROJECT_IAM_POLICY_READS = 0
WRITER_SA_IAM_POLICY_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
SERVICE_ACCOUNT_KEY_CALLS = 0
```

The one operation was the approved non-mutating permission test itself. No
additional cloud diagnostic was run.

## Local validation and privacy

Local validation covered exact two-permission request construction, exact
writer-resource guarding, deterministic unique response normalization, both
permissions present, get-present/set-absent, both absent, set-present/get
absent, unexpected permission rejection, unresolved result handling, retry
zero, and privacy constraints. The production runtime remains unchanged
(`PRODUCTION_RUNTIME_CODE_CHANGED = 0`); no F2 helper was added to runtime.

The F1/F2 result records contain no raw caller principal, access token,
Authorization value, credential JSON, private key, full IAM policy, or personal
absolute path. The only identity continuity evidence retained is the approved
short fingerprint above.

## Final disposition

```text
PRODUCTION_RUNTIME_CODE_CHANGED = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
RULES_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

