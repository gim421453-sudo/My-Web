# P1.5-C2H2E3D-W1C-M3L1-G2 Minimal Safe OP-E Failure Observability Fix

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_G2_SAFE_OBSERVABILITY_FIX_PASS_F4_STILL_REQUIRED`

G2 changes only the safe diagnostic projection of future OP-E process
failures. It performs no cloud operation and does not change OP-E command,
IAM semantics, concurrency behavior, mutation count, retry count, success
acceptance, M4 reachability, token reachability, or Firestore reachability.

## Baseline and safety

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
F3_VERDICT = P1_5_C2H2E3D_W1C_M3L1_F3_OBSERVABILITY_DEFECT_PROVEN_NEEDS_G2
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
```

```text
REAL_GCLOUD_EXECUTIONS = 0
CHILD_PROCESS_GCLOUD_SPAWNS = 0
LIVE_IAM_READS = 0
TEST_IAM_PERMISSIONS_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_KEY_ACCESS = 0
```

## Narrow defect boundary

```text
OBSERVABILITY_DATA_AVAILABLE_AT_PROCESS_LAYER = [
  processStarted,
  exitCode,
  signal,
  timedOut,
  stdout (transient),
  stderr (transient),
  spawnError metadata
]
OBSERVABILITY_DATA_LOST_AT_LAYER = runM3Dormant OP-E result projection
OBSERVABILITY_LOSS_REASON = nonzero mutation results were collapsed to M3_MUTATION_FAILURE without a bounded diagnostic object
```

`windowsGcloudProcessAdapter.mjs` was not changed. The existing adapter already
keeps child output in memory. G2 changes only
`tools/authority-audit/m3RuntimeCommandGraph.mjs` by adding the explicit
`projectSafeMutationDiagnostic` projection at the OP-E failure/indeterminate
return boundary.

## Safe diagnostic contract

```text
SAFE_OP_E_DIAGNOSTIC_FIELDS = [
  processStarted,
  exitCode,
  timedOut,
  failureClass,
  safeErrorIdentifier,
  stderrLineCount,
  stderrByteCount,
  mutationOutcome
]
```

The projection uses only explicit fields. It never spreads the process result
or serializes an Error object. The failure class is bounded to `TIMEOUT`,
`UNRESOLVED`, `UNKNOWN_NONZERO`, or `NONE`; no provider error is inferred from
arbitrary message substrings. The safe identifier is derived only from the
existing allowlisted stderr rule IDs. Unknown text produces
`NO_KNOWN_STDERR_RULE`; raw text is discarded.

```text
EXISTING_SAFE_ERROR_ANALYZER_REUSED = yes
RAW_STDERR_PERSISTED = no
RAW_STDERR_RETURNED = no
RAW_STDERR_DOCUMENTED = no
RAW_STDERR_LOGGED_BY_NEW_G2_CODE = no
RAW_CALLER_PRINCIPAL_PERSISTED = no
RAW_CALLER_PRINCIPAL_IN_FAILURE_DIAGNOSTIC = no
CALLER_FINGERPRINT_ONLY_IF_ALREADY_ALLOWED = yes
EXIT_CODE_PERSISTED_AS_INTEGER_ONLY = yes
WHOLE_PROCESS_RESULT_SERIALIZED = no
RAW_ERROR_OBJECT_SERIALIZED = no
```

The existing `gcloudStderrDiagnosticAnalyzer.mjs` is reused only to produce
allowlisted rule identifiers. It does not return normalized lines, fingerprints,
emails, paths, tokens, or stderr excerpts through the G2 diagnostic.

## Behavioral invariants

```text
MUTATION_OUTCOME_CLASSIFIER_CHANGED = no
NEW_SUCCESS_ACCEPTANCE_PATHS = 0
M3_MUTATION_MAX = 1
M3_RETRY_MAX = 0
SECOND_MUTATION_PATH = unreachable
```

Existing top-level `M3_MUTATION_FAILURE` and
`M3_MUTATION_INDETERMINATE` results remain unchanged. G2 only adds a nested
bounded `diagnostic` field to those paths. A known stderr rule can never turn a
nonzero exit into success.

## Graph, argv, and external semantics

```text
GRAPH_NODE_COUNT_BEFORE = 9
GRAPH_NODE_COUNT_AFTER = 9
GRAPH_NODE_IDENTITIES_CHANGED = no
GRAPH_EDGES_CHANGED = no
ROLE_STAGE1_ARGV_CHANGED = no
ROLE_CANONICAL_ARGV_CHANGED = no
OP_A_ARGV_CHANGED = no
OP_B_ARGV_CHANGED = no
OP_C_ARGV_CHANGED = no
OP_D_ARGV_CHANGED = no
OP_E_ARGV_CHANGED = no
EXTERNAL_COMMAND_SURFACES_CHANGED = no
OP_E_CLOUD_SDK_SURFACE_CHANGED = no
MUTATION_TRANSPORT_CHANGED = no
GCLOUD_TO_DIRECT_API_MIGRATION = no
IAM_CONCURRENCY_IMPLEMENTATION_CHANGED = no
OP_E_IAM_CONCURRENCY_SEMANTICS_BEFORE = PROVEN_SAFE
OP_E_IAM_CONCURRENCY_SEMANTICS_AFTER = PROVEN_SAFE
```

The graph still has no M4, project IAM mutation, token generation, Firestore,
or service-account-key node:

```text
M4_RUNTIME_PATH_REACHABLE = no
PROJECT_IAM_MUTATION_GRAPH_NODE = absent
TOKEN_GENERATION_GRAPH_NODE = absent
FIRESTORE_GRAPH_NODE = absent
SERVICE_ACCOUNT_KEY_GRAPH_NODE = absent
DEFAULT_LIVE_EXECUTION_ENABLED = false
IMPORT_TIME_EXTERNAL_EXECUTION = 0
COMMAND_GRAPH_BUILD_EXTERNAL_EXECUTION = 0
ACCIDENTAL_LIVE_ENTRYPOINT = no
```

## F4 status

F3 established that the service-account command schema uses policy version 3
and condition-aware binding logic, while OP-C_PRE retained only bounded
predicates and `etagPresent`. Therefore policy structure remains a meaningful
unresolved hypothesis.

```text
PRODUCTION_POLICY_SHAPE_MAY_MATERIALLY_AFFECT_OP_E = yes
F4_POLICY_STRUCTURE_DIAGNOSTIC_STILL_POTENTIALLY_USEFUL = yes
```

F4 remains a separate, read-only approval. It must not run in G2 and must not
be replaced by a mutation retry.

## Runtime and test locks

The old G1 runtime locks are no longer current authority after this runtime
change. Current G2 dependencies and lowercase SHA-256 locks are:

```text
G2_M3_RUNTIME_DEPENDENCIES = [
  tools/authority-audit/m3RuntimeCommandGraph.mjs,
  tools/authority-audit/windowsGcloudProcessAdapter.mjs,
  tools/authority-audit/invokeWindowsExecutable.ps1,
  tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs
]

G2_M3_RUNTIME_LOCKS = [
  53f948c4e2e993cf394ae22439ed8aed83ed3442c231964d08e5667498504751,
  512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f,
  2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5,
  660734f2c7d42bf2e23ed2f3a92081456621c3a0469eed7a1c3787a31358d656
]

G2_M3_TEST_LOCKS = [
  b436f7ef37df8aefdc42ec7b259f09d6e6d4cd937188a89edf1ce2455489b6f3,
  dbf1c53e919f8af26c6ac1249711d753f3a72d6bf514b04c2b481f408b6caf04
]
```

## Capability impact and next stage

```text
EXTERNAL_CAPABILITY_IMPACT = REPOSITORY_RUNTIME_BINDING_ONLY
E4_COMPOSITE_VALID_FOR_FUTURE_LIVE = no
```

The command surface and SDK path are unchanged, but E3R1 was bound to the old
G1 runtime identity. The next stage is local-only:

`P1.5-C2H2E3D-W1C-M3L1-G2R1 OBSERVABILITY-FIX RUNTIME + EXTERNAL CAPABILITY IMPACT REATTESTATION`

G2R1 must recompute runtime/test locks, verify all argv and E1/E3R1 SDK locks,
rebind capability coverage, and create a new composite input package. No live
cloud operation is authorized by G2.

## Focused validation

```text
FOCUSED_TEST_COUNT = 10 authority-audit test modules
FOCUSED_TEST_RESULT = PASS
TYPECHECK = PASS
BUILD = PASS (sandbox EPERM; approved external Vite build passed)
```

The focused tests cover graph/argv guards, safe failure projection, unknown
nonzero, timeout/unresolved, stderr analyzer reuse, privacy, adapter behavior,
caller/transport synthetic paths, mutation max/retry, and prohibited operation
reachability. No real gcloud process was spawned.

## Security and repository state

```text
PRODUCTION_RUNTIME_CODE_CHANGED = [
  tools/authority-audit/m3RuntimeCommandGraph.mjs
]
TEST_FILES_CHANGED = [
  tools/authority-audit-tests/m3RuntimeCommandGraph.test.mjs
]
RESULT_DOCUMENT = docs/p1-5-c2h2e3d-w1c-m3l1-g2-minimal-safe-op-e-failure-observability-instrumentation-fix.md
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
```

Sensitive-pattern review found no raw caller principal, raw stderr, token,
authorization value, credential JSON, private key, full IAM policy, or
personal absolute path in the G2 result or changed runtime/test projection.

Historical M3L1 remains unresolved:

```text
HISTORICAL_M3L1_ROOT_CAUSE_AFTER_G2 = still_not_proven
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
MUTATION_AS_DIAGNOSTIC = forbidden
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

