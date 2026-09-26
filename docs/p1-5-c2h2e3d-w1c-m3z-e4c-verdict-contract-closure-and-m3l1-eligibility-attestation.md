# P1.5-C2H2E3D-W1C-M3Z-E4C Verdict Contract Closure and M3L1 Eligibility Attestation

## Verdict

`P1_5_C2H2E3D_W1C_M3Z_E4C_M3L1_APPROVAL_ELIGIBILITY_PASS`

This is a fresh local document/lock consistency attestation. It does not
execute, authorize, schedule, or grant M3L1.

## E4 contract closure

```text
E4_DOCUMENT_LITERAL_VERDICT = P1_5_C2H2E3D_W1C_M3Z_E4_COMPLETE_EXTERNAL_CAPABILITY_FINAL_COMPOSITE_RELOCK_PASS
E4_EXPECTED_APPROVAL_GATE_IDENTIFIER = P1_5_C2H2E3D_W1C_M3Z_E4_COMPLETE_COMPOSITE_RELOCK_NEW_M3_APPROVAL_GATE_PASS
E4_VERDICT_CONTRACT = SEMANTIC_PASS_IDENTIFIER_MISMATCH_CLOSED_BY_E4C
E4_HISTORY_MODIFIED = no
```

The E4 document contains the shorter external-capability composite relock
identifier rather than the longer approval-gate identifier. E4C closes that
reporting-contract discrepancy only after independently reconfirming every
substantive predicate. It does not rewrite or reinterpret the E4 document.

## Baseline and current composite authority

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
CURRENT_M3_EXECUTION_AUTHORITY_MANIFEST_SHA256 = 0dd40fee22afccc2ba5d37ab0fc567e9cb0b48af139a2201368861b210ecd769
E4_COMPOSITE_EXPECTED = 0dd40fee22afccc2ba5d37ab0fc567e9cb0b48af139a2201368861b210ecd769
E4_COMPOSITE_RECOMPUTED = 0dd40fee22afccc2ba5d37ab0fc567e9cb0b48af139a2201368861b210ecd769
E4_COMPOSITE_MATCH = yes
PRODUCTION_RUNTIME_CODE_CHANGED_BETWEEN_E4_AND_E4C = 0
```

The composite hash was recomputed from the exact newline-delimited canonical
payload in the E4 document. No auto-relock or hash replacement was performed.

## Authority component checks

```text
G1_RUNTIME_LOCKS_MATCH = yes
G1_TEST_LOCKS_MATCH = yes
G1_RUNTIME_GRAPH = 867199eba535c3f1f94241873cc487cd9e7bd0acfd8713273fe960a5222c3ea9
G1_WINDOWS_ADAPTER = 512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
G1_WINDOWS_HOST_SCRIPT = 2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5
G1_TEST = 9139ebab01158cf886a9525129153514e9a22f939d3291a8ca7eb4db94ba7692
E1_MANIFEST_MATCH = yes
E1_MANIFEST_SHA256 = 081c2885e18cbea82b6230f12b70383436d87c73e9a8ea3072fa8d19fa5df099
E3R1_MANIFEST_MATCH = yes
E3R1_MANIFEST_SHA256 = 11109881cc315fe8c636a397f962f888a516fe11f47c8e356100406eeeff8c0d
CURRENT_EXTERNAL_CAPABILITY_TOTAL = 15
GRAPH_NODE_COVERED = 9/9
UNBOUND_GRAPH_NODE_COUNT = 0
OP_A_EXTERNAL_CAPABILITY_COMPLETE = yes
OP_B_EXTERNAL_CAPABILITY_COMPLETE = yes
OP_C_EXTERNAL_CAPABILITY_COMPLETE = yes
OP_D_EXTERNAL_CAPABILITY_COMPLETE = yes
OP_E_EXTERNAL_CAPABILITY_COMPLETE = yes
IAM_CONCURRENCY_CAPABILITY_COMPLETE = yes
```

## Forbidden-path and budget checks

```text
M4_COMMAND_BUILDER_PRESENT = absent
M4_RUNTIME_PATH_REACHABLE = no
PROJECT_IAM_MUTATION_GRAPH_NODE = absent
TOKEN_GENERATION_GRAPH_NODE = absent
FIRESTORE_GRAPH_NODE = absent
SERVICE_ACCOUNT_KEY_GRAPH_NODE = absent

STAGE1_ROLE_READ_MAX = 1
CANONICAL_ROLE_READ_MAX = 1
ACTIVE_CALLER_DISCOVERY_MAX = 1
WRITER_SA_METADATA_READ_MAX = 1
WRITER_SA_IAM_PRECHECK_MAX = 1
PROJECT_IAM_PRECHECK_MAX = 1
M3_MUTATION_MAX = 1
WRITER_SA_IAM_POSTCHECK_MAX = 1
PROJECT_IAM_POSTCHECK_MAX = 1
ALL_RETRY_MAX = 0
M4_MUTATION_MAX = 0
TOKEN_MAX = 0
FIRESTORE_MAX = 0
```

## Static identity checks

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
WRITER_SERVICE_ACCOUNT = myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com
M3_ROLE = roles/iam.serviceAccountTokenCreator
EXPECTED_ACTIVE_CALLER_COUNT = 1
EXPECTED_ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
```

Only the pre-existing caller fingerprint is retained. No raw caller principal,
token, authorization value, or policy payload is stored.

## Approval disposition

```text
W1C_M3_REUSED = no
M3X_REUSED = no
M3Y_REUSED = no
M3Z_REUSED = no
M3L1_LIVE_APPROVAL_ELIGIBILITY = ELIGIBLE_FOR_SEPARATE_EXPLICIT_APPROVAL
M3L1_LIVE_APPROVAL = NOT_GRANTED
```

Eligibility means that a future, separately approved M3L1 run may be reviewed
against this current authority manifest. It is not permission to run the
mutation. The future run must repeat its bounded preflight and stop on any
drift, ambiguity, timeout, nonzero exit, or failed postcondition.

## Safety counters

```text
REAL_GCLOUD_EXECUTIONS = 0
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
SERVICE_ACCOUNT_KEY_ACCESS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
```

## Functions blocker and next action

```text
FUNCTIONS_TEST_EXECUTION_STATUS = ENVIRONMENT_BLOCKED_BY_SPAWN_EPERM
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
RECOMMENDED_NEXT_ACTION = WAIT_FOR_EXPLICIT_P1.5-C2H2E3D-W1C-M3L1_LIVE_APPROVAL
```

The Functions environment blocker remains unchanged and does not itself grant
M3L1 eligibility. No production runtime code was changed between E4 and E4C.

## Local validation

```text
NODE_SYNTAX_CHECK = PASS
M3_RUNTIME_SYNTHETIC_TEST = PASS
GIT_DIFF_CHECK = PASS_WITH_PREEXISTING_CRLF_WARNINGS_ONLY
SENSITIVE_SCAN_RAW_CALLER = 0
SENSITIVE_SCAN_TOKEN = 0
SENSITIVE_SCAN_AUTHORIZATION = 0
SENSITIVE_SCAN_CREDENTIAL_JSON = 0
SENSITIVE_SCAN_PRIVATE_KEY = 0
SENSITIVE_SCAN_PERSONAL_ABSOLUTE_PATH = 0
```

No gcloud, IAM, Firebase, Firestore, token, M3, M4, staging, commit, push, or
deploy operation was performed.
