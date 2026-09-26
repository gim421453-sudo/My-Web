# P1.5-C2H2E3D-W1C-M3L1-RG1 Post-F4 Retry Readiness and Final Composite Gate

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_RG1_NOT_READY_F4_DIAGNOSTIC_REDESIGN_REQUIRED`

RG1 is a local readiness gate only. It performed zero cloud operations and did
not create a live-ready composite or grant a new M3 approval.

## Baseline and safety

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0

REAL_GCLOUD_EXECUTIONS = 0
GCLOUD_NETWORK_CALLS = 0
LIVE_IAM_READS = 0
TEST_IAM_PERMISSIONS_CALLS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_KEY_ACCESS = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## G2R1 and F4 evidence gates

```text
G2R1_VERDICT = P1_5_C2H2E3D_W1C_M3L1_G2R1_RUNTIME_EXTERNAL_CAPABILITY_REATTESTATION_PASS_F4_NEXT
G2R1_REATTESTATION_MATCH = yes
G2R1_REATTESTATION_SHA256 = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba

F4_VERDICT = P1_5_C2H2E3D_W1C_M3L1_F4_BOUNDED_POLICY_STRUCTURE_READ_UNRESOLVED
F4_EVIDENCE_EXPECTED = 15477e03ae33798c7f8588d2fa4db529b1e97c31c7c3a8f16241f0d86c7b1904
F4_EVIDENCE_RECOMPUTED = 15477e03ae33798c7f8588d2fa4db529b1e97c31c7c3a8f16241f0d86c7b1904
F4_EVIDENCE_HASH_MATCH = yes
F4_READ_BUDGET = EXHAUSTED
F4_APPROVAL_REUSABLE = no
F4_READ_RETRY_ALLOWED = no
```

F4 evidence integrity does not imply policy compatibility. The persisted F4
result correctly remains `UNRESOLVED`.

## F4 read-path reconstruction

The approved read used the existing `buildWriterPolicyReadCommand()` OP-C_PRE
surface and `runWindowsProcess()` adapter. No second command was executed.

```text
F4_PROCESS_EXIT = 0
F4_OUTPUT_AVAILABLE_AT_PROCESS_LAYER = yes
F4_JSON_PARSE_ATTEMPTED = yes
F4_JSON_PARSE_FAILURE_LAYER = diagnostic-only bounded projection after process adapter
F4_PARSE_FAILURE_CLASS = SAFE_STRUCTURED_POLICY_UNAVAILABLE
HISTORICAL_F4_RAW_OUTPUT_RECOVERY_ATTEMPTED = no
```

The raw process streams were intentionally discarded. RG1 does not recover them
from shell history, terminal output, temporary files, OS logs, or dumps.

## Static command/output contract audit

The path-bound Cloud SDK source remains unchanged. The service-account
`get-iam-policy` command documents JSON output as an editable IAM policy object
including an etag. The same source path requests the supported IAM policy
version; the add-binding schema enables conditions and declares policy version
3. The bounded parser used by F4 expected the raw policy object shape.

```text
F4_EXPECTED_OUTPUT_FORMAT = JSON via --format=json
F4_EXPECTED_TOP_LEVEL_SHAPE = IAM Policy object
F4_EXPECTED_POLICY_FIELDS = [version, etag, bindings, optional binding.condition]
F4_PARSER_EXPECTED_SHAPE = raw IAM Policy object
F4_PARSER_CONTRACT_CORRECT = yes
F4_COMMAND_OUTPUT_CONTRACT = MATCH
F4_STRUCTURED_OUTPUT_FLAG_PRESENT = yes
F4_STRUCTURED_OUTPUT_FLAG_VALUE = --format=json
F4_LOCAL_PARSER_DEFECT = NOT_PROVEN
F4_READ_COMMAND_DIAGNOSTIC_DEFECT = NOT_PROVEN
F4_HELPER_USED = yes
F4_HELPER_PRODUCTION_RUNTIME_DEPENDENCY = no
F4_HELPER_PARSE_CONTRACT_DEFECT = NOT_PROVEN
```

The static contract match does not explain why the one process result was not
available as parseable JSON. Because raw output was not retained by policy, the
remaining cause is intentionally unresolved rather than reconstructed.

## Retry-readiness decision

F3 states that policy shape may materially affect OP-E and defines the bounded
policy-structure read as the minimum next diagnostic. G2 and the previous F4
gate therefore require this material precondition to be resolved before a new
M3 approval. F4 did not resolve it.

```text
POLICY_STRUCTURE_STATUS_FOR_RETRY = REQUIRED
OP_E_POLICY_STRUCTURE_COMPATIBILITY = UNRESOLVED
HISTORICAL_M3L1_ROOT_CAUSE = still_not_proven
MUTATION_AS_DIAGNOSTIC = forbidden
NEW_M3_RETRY_READINESS = NOT_READY
```

No final live composite was created.

## Current safety invariants

```text
GRAPH_NODE_COVERED = 9/9
UNBOUND_GRAPH_NODE_COUNT = 0
OP_E_ARGV_CHANGED = no
EXTERNAL_COMMAND_SURFACES_CHANGED = no
IAM_CONCURRENCY_CAPABILITY_COMPLETE = yes
IAM_CONCURRENCY_SEMANTICS = PROVEN_SAFE
M3_MUTATION_MAX = 1
M3_RETRY_MAX = 0
M4_RUNTIME_PATH_REACHABLE = no
PROJECT_IAM_MUTATION_GRAPH_NODE = absent
TOKEN_GENERATION_GRAPH_NODE = absent
FIRESTORE_GRAPH_NODE = absent
SERVICE_ACCOUNT_KEY_GRAPH_NODE = absent
G2_FAILURE_OBSERVABILITY_READY = yes
```

F2 authorization evidence remains unchanged: the tested
`getIamPolicy` and `setIamPolicy` permissions were present. This does not prove
that a particular future policy application will succeed.

## Deterministic RG1 evidence

The canonical payload binds the G2R1 hash, F4 evidence hash and literal
verdicts, bounded parse-failure class, retry materiality, safety invariants,
`NOT_READY` decision, and the local F4P1 recommendation. It contains no raw
policy, output stream, member, etag, condition, caller, token, credential, or
personal absolute path.

```text
M3_RG1_RETRY_READINESS_EVIDENCE_SHA256 = b5e8982297dbb87d5fb239ca303c5d83c78ec47e3f92e717ac25c295edd7486c
RG1_EVIDENCE_REPRODUCIBLE = yes
```

## Required next action

```text
FINAL_M3_LIVE_COMPOSITE_CREATED = no
M3_RG1_FINAL_COMPOSITE_EXECUTION_INTEGRITY_MANIFEST_SHA256 = NOT_CREATED
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
OLD_M3L1_RETRY = forbidden
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
W1D_STATUS = BLOCKED_PENDING_M3_SUCCESS
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
PRODUCTION_RUNTIME_CODE_CHANGED = 0
```

Recommended next action:
`P1.5-C2H2E3D-W1C-M3L1-F4P1_LOCAL_BOUNDED_POLICY_STRUCTURE_READ_CONTRACT_FIX`.

F4P1 may modify only a diagnostic-only parser/output contract or its local
fixture. It must not modify the M3 graph, OP-E argv, mutation semantics,
concurrency behavior, or G2 observability runtime. After F4P1, a completely new
F4R1 single-read approval would be required; the exhausted F4 approval cannot
be reused.

## Local verification and security

```text
RG1_LOCAL_CONTRACT_FIXTURES = PASS
G2R1_HASH_REPRODUCTION = PASS
F4_EVIDENCE_HASH_REPRODUCTION = PASS
F4_OUTPUT_CONTRACT_AUDIT = PASS
FINAL_COMPOSITE_NOT_CREATED_WHEN_REQUIRED_EVIDENCE_UNRESOLVED = PASS
GIT_DIFF_CHECK = PASS with pre-existing CRLF warnings only
SENSITIVE_SCAN = PASS; no raw caller, policy, stdout, stderr, member, etag, condition, token, credential, private key, or personal absolute path persisted
```

Only this RG1 result document was added. No application code, Rules, Indexes,
Firebase data, IAM state, or external capability was changed.
