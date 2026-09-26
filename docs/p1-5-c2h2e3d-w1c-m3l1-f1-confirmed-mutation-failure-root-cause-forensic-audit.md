# P1.5-C2H2E3D-W1C-M3L1-F1 Confirmed Mutation Failure Root-Cause Forensic Audit

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_F1_ROOT_CAUSE_NOT_PROVEN_NEEDS_BOUNDED_F2`

This is a local evidence and static Cloud SDK audit only. The consumed M3L1
approval was not reused and OP-E was not invoked again.

## Incident and budget disposition

```text
PREVIOUS_VERDICT = P1_5_C2H2E3D_W1C_M3L1_MUTATION_FAILURE
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
M3L1_MUTATION_RETRY_ALLOWED = no
RAW_STDERR_RECOVERY_ATTEMPTED = no
```

No shell history, temporary file, console scrollback, OS log, or credential
source was inspected to recover the intentionally unpersisted stderr.

## Baseline

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
PRODUCTION_RUNTIME_CODE_CHANGED = 0
```

## Safe failure evidence actually available

The M3L1 runtime returned only `M3_MUTATION_FAILURE` and counters. It did not
persist the raw process result or a structured provider error.

```text
OP_E_PROCESS_STARTED = yes
OP_E_EXIT_CODE = nonzero, exact value unavailable
OP_E_STDOUT_CLASS = unavailable
OP_E_STDERR_CLASS = unavailable
OP_E_TIMEOUT = no
OP_E_FAILURE_CATEGORY_RECORDED_BY_RUNTIME = M3_MUTATION_FAILURE
OP_E_SAFE_ERROR_IDENTIFIER = M3_MUTATION_FAILURE
OP_E_MUTATION_ATTEMPT_COUNT = 1
```

The `M3_MUTATION_FAILURE` branch is reached only after a process result is
returned with `timedOut=false`, `exitCode` non-null and nonzero. Because the
runtime discards the exact exit code and stderr, this evidence distinguishes a
confirmed nonzero command result from timeout, but not the provider cause.

## Pre-mutation state confirmation

The result document records that the final gate passed immediately before
OP-E. This confirms the gate was reached; it is not a fresh poststate read.

```text
PRE_MUTATION_STATE_CONFIRMED = yes
CURRENT_COMPOSITE_MANIFEST_MATCH = yes
ALL_G1_RUNTIME_LOCKS_MATCH = yes
ALL_G1_TEST_LOCKS_MATCH = yes
E1_MANIFEST_MATCH = yes
E3R1_MANIFEST_MATCH = yes
CURRENT_EXTERNAL_CAPABILITY_TOTAL = 15
GRAPH_NODE_COVERED = 9/9
UNBOUND_GRAPH_NODE_COUNT = 0
STAGE1_ROLE_STATE = EXISTS_EXACT
CANONICAL_ROLE_STATE = EXISTS_EXACT
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
EXACT_CALLER_PRINCIPAL_RESOLVED = yes
EXACT_CALLER_PRINCIPAL_PERSISTED = no
WRITER_SA_STATE = EXISTS_ENABLED
M3_BINDING_PRESTATE = ABSENT
M4_BINDING_PRESTATE = ABSENT
CALLER_PROJECT_WIDE_TOKEN_CREATOR_PRESTATE = ABSENT
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR_PRESTATE = ABSENT
FRESH_AUDIT_BASELINE = SAFE
IAM_CONCURRENCY_CAPABILITY_COMPLETE = yes
WRITER_SA_IAM_CONCURRENCY_GUARD = PASS
```

## Exact OP-E command reconstruction

The command is reconstructed from the locked pure builder only; it was not
executed during F1.

```text
OP_E_COMMAND_SURFACE = iam service-accounts add-iam-policy-binding
OP_E_ARGV_TEMPLATE = [
  "iam",
  "service-accounts",
  "add-iam-policy-binding",
  "<EXACT_WRITER_SERVICE_ACCOUNT>",
  "--member=<TRANSIENT_VERIFIED_CALLER>",
  "--role=roles/iam.serviceAccountTokenCreator",
  "--condition=None",
  "--quiet",
  "--verbosity=error"
]
OP_E_RESOURCE_SCOPE = exact-writer-service-account
OP_E_ROLE = roles/iam.serviceAccountTokenCreator
OP_E_ARGV_CONTRACT = PASS
```

The builder uses a string argument array, exact writer resource, exact member
position, one role, explicit condition handling, quiet mode, and error-level
verbosity. It does not concatenate a shell command, target the project IAM
resource, include the M4 role, or duplicate conflicting flags.

## Static Cloud SDK path and concurrency trace

The locked E3R1 path remains matched by the local file hashes:

```text
OP_E_EXTERNAL_CAPABILITY_LOCK_MATCH = yes
IAM_CONCURRENCY_HELPER_LOCK = MATCH
```

The installed SDK source at the previously locked SDK root shows:

1. `add_iam_policy_binding.yaml` declares the service-account collection and
   the add-binding surface.
2. `yaml_command_translator.py` `AddIamPolicyBindingCommandGenerator` calls
   `_GetIamPolicy`, applies `iam_util.AddBindingToIamPolicy` or its condition
   variant, then sends the resulting policy through the common set-policy
   request path.
3. `iam_util.py` preserves an existing binding or appends one binding; it does
   not create a second conflicting binding for the same member and role.
4. `get_iam_policy.py` calls the service-account `GetIamPolicy` method and
   documents the returned etag as the concurrency version.

Therefore the local source does not support an OP-E command-contract defect.
It proves the read-modify-set shape, not that the live caller was authorized
to perform the set.

## Required mutation permissions

The selected API path conceptually requires these distinct permissions:

```text
OP_E_REQUIRED_MUTATION_PERMISSIONS = [
  iam.serviceAccounts.getIamPolicy,
  iam.serviceAccounts.setIamPolicy
]
TOKEN_CREATOR_ROLE_EQUALS_POLICY_ADMIN_AUTHORITY = no
```

`roles/iam.serviceAccountTokenCreator` is the target permission being granted
on the writer service-account resource. It is not permission for the current
caller to change that resource's IAM policy.

The local Cloud SDK generated client also exposes
`iam.projects.serviceAccounts.testIamPermissions` for the exact service-account
resource. This is a possible bounded diagnostic surface, not an operation run
by F1.

## Root-cause hypothesis classification

```text
CALLER_WRITER_SA_POLICY_MUTATION_AUTHORITY_EVIDENCE = NOT_PREVIOUSLY_PROVEN
W1C_AND_M3L1_FAILURE_SIGNATURE_COMPARABLE = yes
W1C_AND_M3L1_FAILURE_SIGNATURE_MATCH = not_comparable
CONCURRENCY_FAILURE_EVIDENCE = INSUFFICIENT
COMMAND_CONTRACT_FAILURE_EVIDENCE = NOT_SUPPORTED
GENERAL_AUTH_SESSION_FAILURE_EVIDENCE = INSUFFICIENT
WRITER_SA_POLICY_MUTATION_AUTHORIZATION_FAILURE_EVIDENCE = STRONGLY_SUPPORTED_BUT_NOT_PROVEN
WRITER_RESOURCE_FAILURE_EVIDENCE = NOT_SUPPORTED
POLICY_CONSTRAINT_FAILURE_EVIDENCE = INSUFFICIENT
ROOT_CAUSE = ROOT_CAUSE_NOT_PROVEN
ROOT_CAUSE_CONFIDENCE = INSUFFICIENT
```

The prechecks show that the account could authenticate and read the required
metadata/policies, but they do not prove `iam.serviceAccounts.setIamPolicy` on
the exact writer resource. That makes an authorization gap plausible, not
proven. No evidence identifies an etag conflict, resource disappearance,
organization constraint, SDK defect, or transport failure.

The earlier W1C record also had a nonzero M3 result with intentionally omitted
stderr, but classified the outcome as indeterminate. That coarse overlap is
not enough to establish an identical provider failure signature.

## Minimum next evidence

```text
MINIMUM_NEXT_LIVE_DIAGNOSTIC = one separately approved, non-mutating IAM TestIamPermissions call
DIAGNOSTIC_SURFACE = iam.projects.serviceAccounts.testIamPermissions
TARGET = exact writer service-account resource only
REQUESTED_PERMISSIONS = iam.serviceAccounts.getIamPolicy,iam.serviceAccounts.setIamPolicy
MAX_CALLS = 1
EXPECTED_OUTPUT = bounded permissions[] membership only
RAW_CALLER_PERSISTENCE = forbidden
IAM_MUTATION = 0
```

The local generated SDK client proves this exact method and resource path. F1
does not execute it. A future result still must be interpreted carefully:
permission membership can distinguish an authorization gap, while a negative
or unavailable test result may remain insufficient without the provider error
class.

## Effective state and stop status

```text
M3_EXPECTED_EFFECTIVE_STATE = ABSENT
M3_FRESH_POSTSTATE_VERIFIED = no
M3_POSTSTATE_RECOVERY_READS = 0
M4_APPROVAL = NOT_GRANTED
W1D_STATUS = BLOCKED_PENDING_M3_SUCCESS
```

`ABSENT` is the conservative expected state after a confirmed rejection, not a
fresh post-M3 policy read. No postcheck was automatically performed because the
approval explicitly prohibited it after confirmed failure.

## F1 safety counters

```text
REAL_GCLOUD_EXECUTIONS = 0
CHILD_PROCESS_GCLOUD_SPAWNS = 0
GCLOUD_NETWORK_CALLS = 0
LIVE_IAM_READS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_KEY_ACCESS = 0
```

## Local validation and privacy

```text
FOCUSED_TEST_RESULT = PASS
NODE_SYNTAX_CHECK = PASS
G1_SYNTHETIC_TEST = PASS
GIT_DIFF_CHECK = PASS_WITH_PREEXISTING_CRLF_WARNINGS_ONLY
RAW_CALLER_PERSISTED = no
RAW_FULL_STDERR_PERSISTED = no
TOKEN_PERSISTED = no
AUTHORIZATION_PERSISTED = no
CREDENTIAL_JSON_PERSISTED = no
PRIVATE_KEY_PERSISTED = no
FULL_IAM_POLICY_PERSISTED = no
PERSONAL_ABSOLUTE_PATH_PERSISTED = no
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

The bounded scan found zero raw caller, credential, token, key, or personal
path values in the M3L1/F1 result documents or G1 runtime. The pre-existing G1
synthetic test contains the literal fixture `operator@example.com` twice for
pure command-builder assertions; it is not a live identity, was not obtained
from the M3L1 run, and is not persisted in a runtime diagnostic.

## Recommended next action

`P1.5-C2H2E3D-W1C-M3L1-F2 BOUNDED NON-MUTATING FAILURE DISAMBIGUATION`

F2 requires separate explicit approval. No M3 retry, IAM escalation, M4, token,
Firestore, Class write, or automatic rollback is authorized by this audit.
