# P1.5-C2H2E3D-W1C-M3L1-F3 Non-Mutating OP-E Failure Diagnostic Strategy

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_F3_OBSERVABILITY_DEFECT_PROVEN_NEEDS_G2`

This is a local forensic and static Cloud SDK audit. No gcloud process,
IAM read, `testIamPermissions` call, IAM mutation, token operation,
impersonation, or Firestore operation was performed.

## Verified chain and stop state

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
F2_VERDICT = P1_5_C2H2E3D_W1C_M3L1_F2_TESTED_PERMISSIONS_PRESENT_AUTH_GAP_DISPROVEN
F2_GET_IAM_POLICY_PERMISSION = PRESENT
F2_SET_IAM_POLICY_PERMISSION = PRESENT
TESTED_PERMISSION_GAP_REMAINS = no
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
M3L1_RETRY_ALLOWED = no
```

The F2 result is limited to the tested effective permissions on the exact
writer service-account resource. It does not prove the cause of the earlier
nonzero OP-E result and does not revive the M3L1 approval.

## OP-E reconstruction and contract

Source: `tools/authority-audit/m3RuntimeCommandGraph.mjs:132-146,231-247`.

```text
OP_E_COMMAND_SURFACE = iam service-accounts add-iam-policy-binding
OP_E_ARGV_TEMPLATE = [
  "iam",
  "service-accounts",
  "add-iam-policy-binding",
  "<EXACT_WRITER_SA>",
  "--member=<TRANSIENT_VERIFIED_CALLER>",
  "--role=roles/iam.serviceAccountTokenCreator",
  "--condition=None",
  "--quiet",
  "--verbosity=error"
]
OP_E_TARGET_RESOURCE = exact-writer-service-account
OP_E_ROLE = roles/iam.serviceAccountTokenCreator
OP_E_COMMAND_CONTRACT_CURRENT = PASS
```

The builder validates the transient caller as one email-shaped value and
constructs an argument array. It does not concatenate a shell command, target
project IAM, include the M4 role, or include a second mutation flag. The graph
limits OP-E to one call and zero retries.

## Cloud SDK implementation trace

The local E3R1 capability lock and current SDK source identify the following
path; no command was executed:

```text
OP_E_SDK_SURFACE_MODULE = lib/surface/iam/service_accounts/add_iam_policy_binding.yaml
OP_E_PRIMARY_IAM_HELPER = googlecloudsdk.command_lib.util.apis.yaml_command_translator.AddIamPolicyBindingCommandGenerator
OP_E_SECONDARY_IAM_HELPER = googlecloudsdk.command_lib.iam.iam_util.AddBindingToIamPolicy[WithCondition]
OP_E_API_METHOD = iam.projects.serviceAccounts.getIamPolicy -> iam.projects.serviceAccounts.setIamPolicy
OP_E_API_RESOURCE_FORM = projects/{project}/serviceAccounts/{email}
```

Evidence:

- `add_iam_policy_binding.yaml` declares collection
  `iam.projects.serviceAccounts`, enables conditions, requests policy version
  3, and maps the requested policy version to
  `options_requestedPolicyVersion`.
- `yaml_command_translator.py:1370-1389` obtains the current policy.
- `yaml_command_translator.py:1395-1495` modifies the policy and sends it
  through the common request path with `setIamPolicyRequest.policy`.
- `iam_util.py:352-389` preserves an existing same-role binding, appends a
  member to an existing role binding, or creates one binding.
- The generated IAM v1 client exposes the service-account get/set methods for
  the declared collection.

```text
OP_E_POLICY_MUTATION_MODEL = GET_IAM_POLICY -> local binding mutation -> SET_IAM_POLICY
READ_REQUIRED_PERMISSION = iam.serviceAccounts.getIamPolicy
WRITE_REQUIRED_PERMISSION = iam.serviceAccounts.setIamPolicy
F2_GET_PERMISSION_PRESENT = yes
F2_SET_PERMISSION_PRESENT = yes
TESTED_PERMISSION_GAP_REMAINS = no
```

## Version, condition, and concurrency trace

```text
OP_E_ETAG_SOURCE = etag returned in the policy read and retained in the policy sent to setIamPolicy
OP_E_POLICY_VERSION_HANDLING = service-account command schema requests policy version 3 and applies configured version to the policy
OP_E_CONDITION_HANDLING = conditions are enabled; explicit --condition=None requests an unconditioned binding; existing conditional-policy rules are enforced by the SDK helper
OP_E_EXISTING_BINDING_HANDLING = same role/member is a no-op; same role appends member; otherwise a new binding is created
IAM_CONCURRENCY_RESPONSIBILITY = SDK_ONLY
IAM_CONCURRENCY_STATIC_CONTRACT = PASS
```

The repository supplies the exact target, precondition gates, one-attempt
budget, and no-retry rule. The actual read-modify-set concurrency behavior is
implemented by the Cloud SDK/API path, not by the repository runtime.
Static PASS does not prove that no live concurrent conflict occurred during
M3L1.

## Bounded static failure table

| Stage | Locally supported failure class | M3L1 compatibility | Reason |
| --- | --- | --- | --- |
| resource parse | `RESOURCE_PARSE` | possible, not supported as primary | SDK parses the exact service-account resource before the API call; prechecks do not expose this command's parse result |
| active auth | `ACTIVE_AUTH` | unlikely, not fully observable | prechecks succeeded and F2 tested permissions are present, but the gcloud process boundary did not preserve provider details |
| get policy | `GET_IAM_POLICY` | possible | OP-E performs a fresh policy read after the earlier precheck |
| policy deserialization/local mutation | `POLICY_DESERIALIZATION`, `LOCAL_POLICY_MUTATION` | possible | SDK must decode and modify the policy, including condition handling |
| version/condition | `POLICY_VERSION_OR_CONDITION` | possible | schema explicitly uses version 3 and condition-aware binding logic |
| etag/precondition | `ETAG_OR_PRECONDITION` | possible | setIamPolicy uses the read policy's concurrency state |
| set authorization | `SET_IAM_POLICY_AUTHORIZATION` | ordinary missing permission eliminated | F2 returned both tested permissions PRESENT; another permission is not proven by source |
| policy constraint/invalid argument | `SET_IAM_POLICY_POLICY_CONSTRAINT`, `SET_IAM_POLICY_INVALID_ARGUMENT` | possible | provider/API can reject the final policy or request shape |
| resource not found | `RESOURCE_NOT_FOUND` | low plausibility, not eliminated | metadata precheck passed, but no OP-E provider result was retained |
| API/transport | `API_TRANSIENT`, `TRANSPORT` | possible | only a nonzero process result was retained |
| SDK internal | `SDK_INTERNAL` | possible | process boundary did not retain a structured exception |

The table contains only classes supported by the traced command/API path. It
does not claim any one class caused M3L1.

```text
ELIMINATED_FAILURE_CLASSES = [
  TIMEOUT_AS_REPORTED_CAUSE,
  ORDINARY_MISSING_IAM_SERVICE_ACCOUNTS_SET_IAM_POLICY,
  OP_E_ARGUMENT_CONTRACT_DEFECT,
  PROJECT_LEVEL_IAM_MUTATION,
  M4_ROLE_OR_TOKEN_PATH
]
REMAINING_PLAUSIBLE_FAILURE_CLASSES = [
  GET_IAM_POLICY,
  POLICY_DESERIALIZATION,
  LOCAL_POLICY_MUTATION,
  POLICY_VERSION_OR_CONDITION,
  ETAG_OR_PRECONDITION,
  SET_IAM_POLICY_POLICY_CONSTRAINT,
  SET_IAM_POLICY_INVALID_ARGUMENT,
  API_TRANSIENT,
  TRANSPORT,
  SDK_INTERNAL,
  RESOURCE_PARSE
]
```

`testIamPermissions = PRESENT` does not exclude policy-shape, organization
constraint, precondition, or request-specific enforcement failures. It tests
effective permission presence, not successful application of one particular
policy payload.

## Observability audit

Source: `tools/authority-audit/windowsGcloudProcessAdapter.mjs:87-145`.

```text
OP_E_EXIT_CODE_CAPTURED_AT_RUNTIME = yes
OP_E_EXIT_CODE_PERSISTED_SAFELY = no
OP_E_EXIT_CODE_LOSS_REASON = runM3Dormant only retained exitCode !== 0 as M3_MUTATION_FAILURE
OP_E_STDERR_CAPTURED_IN_MEMORY = yes
OP_E_STDERR_SAFE_CLASSIFIER_EXISTS = no (no generic OP-E mutation classifier)
OP_E_STDERR_SAFE_CLASSIFIER_COVERAGE = token-specific classifier exists, but it is not an OP-E result classifier
OP_E_RAW_STDERR_PERSISTED = no
```

The adapter returns `exitCode`, `signal`, `timedOut`, `stdout`, `stderr`, and
spawn-error metadata in memory. `runM3Dormant` passes the mutation result
through the timeout/null check and then returns only `M3_MUTATION_FAILURE` for
any nonzero exit (`m3RuntimeCommandGraph.mjs:463-471`). Thus the precise exit
code, signal, stdout shape, stderr shape, and provider error class were
available transiently but discarded before the safe result was serialized.

The existing `gcloudTokenOutputClassifier.mjs` is scoped to impersonated-token
output and must not be treated as an OP-E mutation classifier. It does prove
that bounded structural stderr metadata and allowlisted line classification
are locally feasible without persisting raw text.

```text
SAFE_STABLE_ERROR_IDENTIFIERS_AVAILABLE = yes, after bounded classification
SAFE_IDENTIFIER_TYPES = [
  numeric exit code,
  signal/timeout state,
  command-surface identifier,
  allowlisted failure class,
  bounded stderr structural metadata or fingerprint
]
OP_E_OBSERVABILITY_GAP = PROVEN
OP_E_OBSERVABILITY_IS_RUNTIME_DEFECT = yes
```

A one-shot destructive operation that can fail while retaining only “nonzero”
does not satisfy the fail-closed operational diagnostic requirement when the
next safe action depends on the failure class.

## Minimal safe G2 design, not implemented here

```text
MINIMAL_SAFE_DIAGNOSTIC_FIELDS = [
  processStarted,
  exitCode,
  signal,
  timedOut,
  failureClass,
  safeErrorIdentifier,
  stderrLineCount,
  stderrByteCount,
  mutationOutcome
]
```

The future classifier must be deterministic, allowlist-based, fail-closed,
privacy-preserving, and unable to turn an unknown nonzero result into success.
Raw stderr remains forbidden. Negative fixtures must cover permission denied,
invalid argument, precondition/conflict, not found, authentication,
transport, unknown nonzero, empty stderr, multiline unexpected stderr,
malformed output, and secret-looking text. Every unknown case must resolve to
`UNRESOLVED` or `UNKNOWN_FAILURE`.

G2 is local-only. Any G2 change invalidates the G1 runtime locks and requires
new capability reconciliation, a new composite relock, and a completely new
live M3 approval. F3 does not implement G2.

## Policy-shape diagnostic decision

```text
PRODUCTION_POLICY_SHAPE_MAY_MATERIALLY_AFFECT_OP_E = yes
OP_C_PRE_POLICY_VERSION_CAPTURED = no
OP_C_PRE_ETAG_PRESENCE_CAPTURED = yes
OP_C_PRE_CONDITIONAL_BINDING_COUNT_CAPTURED = no
OP_C_PRE_OTHER_RELEVANT_STRUCTURE_CAPTURED = [
  m3Binding predicate,
  unexpected Token Creator delegation predicate,
  etagPresent boolean
]
```

The command schema's version-3 and condition-aware behavior makes policy shape
relevant. The precheck intentionally did not retain policy version,
conditional-binding count, target-role binding count, or target-member
presence as structural facts. A future bounded read may therefore be useful,
but it should follow G2 rather than substitute for missing safe runtime
failure evidence.

```text
MINIMUM_NEXT_LIVE_DIAGNOSTIC_TYPE = BOUNDED_WRITER_SA_IAM_POLICY_STRUCTURE_READ
TARGET = exact writer service account
MAX_READS = 1
RETRY = 0
MINIMUM_NEXT_LIVE_DIAGNOSTIC_FIELDS = [
  policyVersion,
  etagPresent,
  conditionalBindingCount,
  targetRoleBindingCount,
  targetMemberPresent
]
```

This is a proposal only. F4 requires separate explicit live read approval and
must not be executed in F3.

## Strategy comparison

| Strategy | Runtime change | Live read | Mutation | Distinguishes |
| --- | --- | --- | --- | --- |
| A: G2 instrumentation | yes, local only | no | no | exact process/provider failure evidence on a future approved run |
| B: F4 policy structure read | no | one bounded read | no | version/condition/etag/binding-shape hypotheses, not lost M3 stderr |
| C: G2 then F4 if needed | yes, then optional read | optional one | no | both runtime failure class and remaining policy-shape uncertainty |
| D: direct structured IAM client | new transport | no initially | no | potentially better typed request/error evidence, but invalidates current locks |

```text
DIRECT_API_ALTERNATIVE = POTENTIALLY_BETTER
```

A direct structured client could expose typed HTTP/API errors and tighter
request control, but changing transport would invalidate the runtime graph,
external capability manifest, and composite lock. No transport replacement is
recommended without a proven reliability/security advantage.

## Root-cause re-evaluation

```text
ROOT_CAUSE = OP_E_RUNTIME_OBSERVABILITY_DEFECT_ONLY
ROOT_CAUSE_CONFIDENCE = PROVEN
MUTATION_AS_DIAGNOSTIC = forbidden
```

This is a proven defect in the diagnostic runtime, not proof of the original
provider failure. The underlying M3 cause remains unknown among the bounded
remaining classes above.

```text
M3_EXPECTED_EFFECTIVE_STATE = ABSENT
M3_FRESH_POSTSTATE_VERIFIED = no
M4_APPROVAL = NOT_GRANTED
W1D_STATUS = BLOCKED_PENDING_M3_SUCCESS
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1C-M3L1-G2 local safe OP-E failure observability instrumentation
```

## Focused local validation

```text
FOCUSED_TEST_COUNT = 3 existing local test modules plus static source audit
FOCUSED_TEST_RESULT = PASS
TEST_MODULES = [
  m3RuntimeCommandGraph.test.mjs,
  gcloudTokenOutputClassifier.test.mjs,
  gcloudStderrDiagnosticAnalyzer.test.mjs
]
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
TEST_IAM_PERMISSIONS_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
```

The tests covered OP-E argv construction, exact resource/role guards, one-call
zero-retry behavior, confirmed nonzero classification, bounded stderr
structure, unknown classification, and privacy-preserving synthetic output.

## Security and repository state

```text
PRODUCTION_RUNTIME_CODE_CHANGED = 0
RAW_CALLER_PERSISTED = no
RAW_STDERR_PERSISTED = no
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

