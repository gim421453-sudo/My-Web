# P1.5-C2H2E3D-W1C-M3L2-G4R1 Post-G4 Runtime and External Capability Re-attestation

## Verdict

`P1_5_C2H2E3D_W1C_M3L2_G4R1_POST_G4_RUNTIME_CAPABILITY_REATTESTATION_PASS_G4R2_REQUIRED`

This is a local-only re-attestation. No production, cloud, IAM, token,
Firestore, Cloud Logging, M3 live, mutation, staging, commit, push, or deploy
operation was performed.

## Baseline and carry-forward locks

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0

G4_VERDICT = P1_5_C2H2E3D_W1C_M3L2_G4_FAIL_CLOSED_OUTCOME_CLASSIFIER_CORRECTION_PASS_G4R1_REQUIRED
G4_RESULT_DOCUMENT_EXPECTED = a8326a3a67f9e08d4648ec705d8652ab4f5aee45b3c4f2317e3be934db68caa4
G4_RESULT_DOCUMENT_RECOMPUTED = a8326a3a67f9e08d4648ec705d8652ab4f5aee45b3c4f2317e3be934db68caa4
G4_RESULT_DOCUMENT_HASH_MATCH = yes
G4_ATTESTATION_EXPECTED = 4519f493a65d91d066cea9847fff9b69dcdb7340c9f391b3b363a75233e6e6b3
G4_ATTESTATION_RECOMPUTED = 4519f493a65d91d066cea9847fff9b69dcdb7340c9f391b3b363a75233e6e6b3
SECOND_G4_ATTESTATION_SHA256 = 4519f493a65d91d066cea9847fff9b69dcdb7340c9f391b3b363a75233e6e6b3
G4_ATTESTATION_MATCH = yes
G4_ATTESTATION_REPRODUCIBLE = yes
R1B4_EVIDENCE_EXPECTED = 4ea429535604ab20b7130280c7209b693ec9a655eb9e9e21094b531bf6027966
R1B4_EVIDENCE_RECOMPUTED = 4ea429535604ab20b7130280c7209b693ec9a655eb9e9e21094b531bf6027966
R1B4_EVIDENCE_MATCH = yes
R1B4_RESULT_DOCUMENT_EXPECTED = 85453bf6d4c0aa3e8241cdbd1c390fac0b40bcdc40b9874a22034860f52bf9c4
R1B4_RESULT_DOCUMENT_RECOMPUTED = 85453bf6d4c0aa3e8241cdbd1c390fac0b40bcdc40b9874a22034860f52bf9c4
R1B4_RESULT_DOCUMENT_HASH_MATCH = yes
```

G4 and R1B4 artifacts were re-read and verified without changing either
historical document or evidence payload.

## Current runtime entry and graph

The current entry is `runM3Dormant` in
`tools/authority-audit/m3RuntimeCommandGraph.mjs`. Its OP-E path reaches the
local Windows process adapter, then the fail-closed classifier through
`projectSafeMutationDiagnostic`; no stale pre-G4 outcome path remains.

```text
POST_G4_M3_RUNTIME_ENTRY = tools/authority-audit/m3RuntimeCommandGraph.mjs:runM3Dormant
POST_G4_GRAPH_NODE_COUNT = 9
POST_G4_GRAPH_EDGE_COUNT = 10
POST_G4_GRAPH_NODES = ROLE_STAGE1,ROLE_CANONICAL,OP_A,OP_B,OP_C_PRE,OP_D_PRE,OP_E,OP_C_POST,OP_D_POST
POST_G4_GRAPH_IDENTITY_DIGEST = 130d98d84838da0a45b49f96bfed0d5b709bee8db9c4e3e8205795cdda165d8e
POST_G4_GRAPH_UNBOUND_EXTERNAL_NODES = 0
GRAPH_STRUCTURAL_CHANGE_FROM_PRE_G4 = EXPECTED_CLASSIFIER_ONLY
POST_G4_CLASSIFIER_CONNECTED_TO_OP_E = yes
```

The graph was reconstructed from current source. OP-A through OP-E and the
post-check nodes retain their current command surfaces and predecessor
conditions. The only post-G4 semantic change is outcome classification.

## External capability reconciliation

```text
POST_G4_EXTERNAL_CAPABILITY_COUNT = 15
POST_G4_EXTERNAL_CAPABILITY_MATCHED = 15
POST_G4_EXTERNAL_CAPABILITY_UNBOUND = 0
SDK_PATH_CONTAINMENT = PASS
SDK_IDENTITY_MATCH = yes
SERVICE_ACCOUNT_JSON_KEY_PATH = ABSENT
CREDENTIAL_BOUNDARY_CHANGED = no
```

The 15 E1/E3R1 capability records were checked against the locally installed
Cloud SDK using their existing SDK-relative paths and hashes. No SDK command
was launched. The graph coverage is:

```text
ROLE_STAGE1,ROLE_CANONICAL = E1 role-read capability set
OP_A = E3R1 auth-list and credential-store capability set
OP_B = E3R1 service-account describe plus IAM utility capability set
OP_C_PRE,OP_C_POST = E3R1 service-account policy-read plus IAM utility capability set
OP_D_PRE,OP_D_POST = E3R1 project-policy capability set
OP_E = E3R1 binding schema, YAML translator, IAM utility, and resource capability set
```

## OP-E safety contract

```text
OP_E_MUTATION_TARGET = exact locked writer service account
OP_E_TARGET_ROLE = roles/iam.serviceAccountTokenCreator
OP_E_MUTATIONS_MAX = 1
OP_E_AUTOMATIC_RETRIES = 0
OP_E_AUTOMATIC_ROLLBACKS = 0
OP_E_ARGV_CHANGED_FROM_PRE_G4 = no
OP_C_ARGV_CHANGED_FROM_PRE_G4 = no
OP_E_CONCURRENCY_CHANGED_FROM_PRE_G4 = no
M3_EXTERNAL_COMMAND_SURFACE_CHANGED_FROM_PRE_G4 = no
FUTURE_M3_FRESH_PRESTATE_REQUIRED = yes
```

The classifier contract remains:

```text
POST_G4_UNKNOWN_NONZERO_MAPPING = INDETERMINATE
ERROR_PREFIX_V1_PROVES_REMOTE_NON_APPLICATION = no
TIMEOUT_AFTER_MUTATION_START = INDETERMINATE
UNKNOWN_MUTATION_RESULT_DEFAULT = INDETERMINATE
OP_E_CONFIRMED_FAILURE_RULES = []
```

`CONFIRMED_FAILURE` has no active rule. A started command is therefore not
treated as remotely failed from local exit/stderr evidence alone.

## Forbidden reachability and privacy

```text
M4_REACHABLE_FROM_M3_RUNTIME = no
FIRESTORE_REACHABLE_FROM_M3_RUNTIME = no
ACCESS_TOKEN_GENERATION_REACHABLE = no
WRITER_IMPERSONATION_REACHABLE = no
SERVICE_ACCOUNT_KEY_ACCESS_REACHABLE = no
CLOUD_LOGGING_REACHABLE_FROM_M3_RUNTIME = no
```

No raw identity, policy, token, process output, absolute path, credential, or
cloud response is persisted in this attestation. The payload contains only
bounded labels, relative paths, hashes, graph identities, and safety booleans.

## Reproducible G4R1 attestation

```text
CANONICAL_PAYLOAD_SCHEMA = myweb.m3l2.g4r1.post-g4-runtime-capability-attestation.v1
CANONICAL_PAYLOAD_PATH = docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r1-post-g4-runtime-capability-attestation-v1.json
CANONICALIZER_VERIFIER = tools/authority-audit/g4r1PostG4RuntimeCapabilityAttestation.mjs
M3_M3L2_G4R1_POST_G4_RUNTIME_CAPABILITY_ATTESTATION_SHA256 = 5ac0ad87de153ec0e43289a224d1a91ff5407cc66c3ec3bfcb5596a9b108843e
SECOND_G4R1_ATTESTATION_SHA256 = 5ac0ad87de153ec0e43289a224d1a91ff5407cc66c3ec3bfcb5596a9b108843e
G4R1_ATTESTATION_REPRODUCIBLE = yes
```

Canonicalization is recursive lexicographic object-key sorting, preserved
array order, compact UTF-8 JSON, and lowercase SHA-256. The verifier rejects
timestamps, absolute paths, raw identity fields, forbidden reachability, and
changed mutation safety values.

## Verification

```text
FOCUSED_CLASSIFIER_TEST_RESULT = PASS
M3_GRAPH_TEST_RESULT = PASS
G4_ATTESTATION_TEST_RESULT = PASS
R1B4_EVIDENCE_TEST_RESULT = PASS
G4R1_ATTESTATION_TEST_RESULT = PASS
AUTHORITY_AUDIT_REGRESSION_RESULT = PASS
NEW_WHITESPACE_ERRORS = 0
```

```text
CURRENT_M3_EFFECTIVE_STATE = ABSENT_PROVEN
CURRENT_M3_OUTCOME_CLASSIFIER_SAFETY = CORRECTED_AND_POST_G4_RUNTIME_REATTESTED
FUTURE_M3_MUTATION_READY = no
RG2C_STATUS_FOR_FUTURE_MUTATION = HISTORICAL_ONLY_FOR_PRE_G4_RUNTIME
G2R1_STATUS_FOR_FUTURE_MUTATION = HISTORICAL_ONLY_FOR_PRE_G4_RUNTIME
OLD_M3_APPROVAL_REUSABLE = no
M3L3_LIVE_APPROVAL = NOT_GRANTED
M4_READINESS = BLOCKED_M3_REQUIRED_BINDING_ABSENT
M4_APPROVAL = NOT_GRANTED
```

```text
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_LIVE_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Required next stage

G4R1 does not authorize M3L3. A future M3L3 requires a new post-G4 final
execution composite, fresh target-binding prestate, mutation maximum one,
automatic retry zero, the fail-closed classifier, no M4/token/Firestore path,
and a separate explicit live approval. Recommended next action:

`P1.5-C2H2E3D-W1C-M3L2-G4R2_POST_G4_FINAL_M3_EXECUTION_COMPOSITE_RELOCK`

## G4R1 result hash

```text
G4R1_RESULT_DOCUMENT_SHA256 = EXTERNAL_FINAL_REPORT_ONLY
```
