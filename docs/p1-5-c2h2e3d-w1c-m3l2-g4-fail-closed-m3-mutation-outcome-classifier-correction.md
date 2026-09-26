# P1.5-C2H2E3D-W1C-M3L2-G4 Fail-Closed Classifier Correction

Local-only runtime correction. No gcloud, IAM, Firestore, token, M3, M4, or
Cloud Logging operation was executed during G4.

## R1B4 carry-forward

```text
R1B4_VERDICT = P1_5_C2H2E3D_W1C_M3L2_R1B4_TARGET_ROLE_ABSENCE_PROVEN
R1B4_RESULT_DOCUMENT_EXPECTED = 85453bf6d4c0aa3e8241cdbd1c390fac0b40bcdc40b9874a22034860f52bf9c4
R1B4_RESULT_DOCUMENT_RECOMPUTED = 85453bf6d4c0aa3e8241cdbd1c390fac0b40bcdc40b9874a22034860f52bf9c4
R1B4_RESULT_DOCUMENT_HASH_MATCH = yes
R1B4_EVIDENCE_EXPECTED = 4ea429535604ab20b7130280c7209b693ec9a655eb9e9e21094b531bf6027966
R1B4_EVIDENCE_RECOMPUTED = 4ea429535604ab20b7130280c7209b693ec9a655eb9e9e21094b531bf6027966
R1B4_EVIDENCE_MATCH = yes
R1B4_EVIDENCE_REPRODUCIBLE = yes
R1B4_VERDICT_MATCH = yes
CURRENT_M3_EFFECTIVE_STATE = ABSENT_PROVEN
R1B4_RETROACTIVE_M3L2_REWRITE = forbidden
```

## Defect and call path

```text
CURRENT_CLASSIFIER_MODULE = tools/authority-audit/m3RuntimeCommandGraph.mjs
CURRENT_CLASSIFIER_SYMBOL = projectSafeMutationDiagnostic
PRE_G4_UNKNOWN_NONZERO_MAPPING = UNKNOWN_NONZERO + caller-supplied CONFIRMED_FAILURE -> CONFIRMED_FAILURE
POST_G4_UNKNOWN_NONZERO_MAPPING = INDETERMINATE
ERROR_PREFIX_V1_PROVES_REMOTE_NON_APPLICATION = no
```

The OP-E path is `runM3Dormant` -> `runProcess` -> mutation result handling ->
`projectSafeMutationDiagnostic` -> `safeStderrMetadata` ->
`analyzeStderrLines`. Before G4, the nonzero branch returned
`M3_MUTATION_FAILURE` and passed `CONFIRMED_FAILURE` through the diagnostic.
G4 now routes that branch to `M3_MUTATION_INDETERMINATE` and the classifier
ignores an unproven caller-supplied failure label after command start.

## Fail-closed contract

```text
UNKNOWN_NONZERO_CLASSIFICATION = INDETERMINATE
TIMEOUT_AFTER_MUTATION_START = INDETERMINATE
UNKNOWN_MUTATION_RESULT_DEFAULT = INDETERMINATE
CONFIRMED_FAILURE_STANDARD = REMOTE_NON_APPLICATION_PROVEN_BY_CLOSED_RULE
OP_E_CONFIRMED_FAILURE_RULES = []
MUTATION_OUTCOME_DOMAIN = NOT_ATTEMPTED / CONFIRMED_SUCCESS / CONFIRMED_FAILURE / INDETERMINATE
```

`CONFIRMED_FAILURE` has no active rules. A started command with nonzero exit,
timeout, process termination, generic stderr, `ERROR_PREFIX_V1`, malformed
observability, or post-response local failure is `INDETERMINATE`. A command
that never starts is `NOT_ATTEMPTED`. Existing normal success semantics remain
available only when exit 0, no timeout, and normal response completion are
explicitly confirmed.

## Runtime and test locks

```text
PRE_G4_RUNTIME_LOCKS =
tools/authority-audit/m3RuntimeCommandGraph.mjs: 53f948c4e2e993cf394ae22439ed8aed83ed3442c231964d08e5667498504751
tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs: 660734f2c7d42bf2e23ed2f3a92081456621c3a0469eed7a1c3787a31358d656
tools/authority-audit/windowsGcloudProcessAdapter.mjs: 512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
POST_G4_RUNTIME_LOCKS =
tools/authority-audit/m3RuntimeCommandGraph.mjs: 619eb27635f3a8896b46362c231099b2b90ce3c792cac85e05008b2df44d078a
tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs: 660734f2c7d42bf2e23ed2f3a92081456621c3a0469eed7a1c3787a31358d656
tools/authority-audit/windowsGcloudProcessAdapter.mjs: 512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
G4_TEST_LOCKS =
tools/authority-audit-tests/m3RuntimeCommandGraph.test.mjs: a85ca4c7755eff64f5d0f13fca3e6e8ffd100b6d1ebd3138c82392a19a1898d4
tools/authority-audit-tests/m3MutationOutcomeClassifierG4.test.mjs: 683b461b5dcebdb05ec1d546bf73c3f6218249ecad043283491a3d8ffc3dbf21
tools/authority-audit-tests/g4FailClosedOutcomeClassifierAttestation.test.mjs: 898ff2bd9050ea3eb5303997048a44356d36926b4e59f68464f2b6b498110dfe
```

OP-E and OP-C argv are unchanged. The external capability impact is `NONE`,
but fresh post-G4 runtime re-attestation remains mandatory because runtime
bytes changed.

## Reproducible attestation

```text
CANONICAL_PAYLOAD_SCHEMA = myweb.m3l2.g4.fail-closed-outcome-classifier.v1
CANONICAL_PAYLOAD_PATH = docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4-fail-closed-outcome-classifier-v1.json
CANONICALIZER_VERIFIER = tools/authority-audit/g4FailClosedOutcomeClassifierAttestation.mjs
M3_M3L2_G4_FAIL_CLOSED_OUTCOME_CLASSIFIER_ATTESTATION_SHA256 = 4519f493a65d91d066cea9847fff9b69dcdb7340c9f391b3b363a75233e6e6b3
SECOND_G4_ATTESTATION_SHA256 = 4519f493a65d91d066cea9847fff9b69dcdb7340c9f391b3b363a75233e6e6b3
G4_ATTESTATION_REPRODUCIBLE = yes
```

The payload contains only hashes, bounded semantic labels, relative paths,
and boolean safety invariants. It contains no cloud response, principal,
member, policy, stderr, stdout, token, or personal path.

## Verification

```text
FOCUSED_CLASSIFIER_TEST_COUNT = 14 assertions
FOCUSED_CLASSIFIER_TEST_RESULT = PASS
M3_GRAPH_TEST_RESULT = PASS
AUTHORITY_AUDIT_REGRESSION_COUNT = 18 test files
AUTHORITY_AUDIT_REGRESSION_RESULT = PASS
TYPECHECK = PASS
BUILD = PASS
NEW_WHITESPACE_ERRORS = 0
```

```text
HISTORICAL_M3L2_RUNTIME_RESULT = unchanged
HISTORICAL_M3L2_FORENSIC_OVERRIDE = INDETERMINATE
M3_AUTOMATIC_MUTATION_RETRY_ADDED = no
AUTOMATIC_IAM_ROLLBACK_ADDED = no
M3_EXTERNAL_COMMAND_SURFACE_CHANGED = no
OP_E_ARGV_CHANGED = no
OP_C_ARGV_CHANGED = no
G4_EXTERNAL_CAPABILITY_IMPACT = NONE
CURRENT_M3_OUTCOME_CLASSIFIER_SAFETY = CORRECTED_LOCAL_NOT_LIVE_REATTESTED
RG2C_STATUS_FOR_FUTURE_MUTATION = HISTORICAL_ONLY_FOR_PRE_G4_RUNTIME
G2R1_STATUS_FOR_FUTURE_MUTATION = HISTORICAL_ONLY_FOR_PRE_G4_RUNTIME
FUTURE_M3_MUTATION_REATTESTATION_REQUIRED = yes
FUTURE_M3_MUTATION_READY = no
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
FINAL_VERDICT = P1_5_C2H2E3D_W1C_M3L2_G4_FAIL_CLOSED_OUTCOME_CLASSIFIER_CORRECTION_PASS_G4R1_REQUIRED
G4_RESULT_DOCUMENT_SHA256 = EXTERNAL_FINAL_REPORT_ONLY
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1C-M3L2-G4R1_POST_G4_RUNTIME_EXTERNAL_CAPABILITY_REATTESTATION
```

G4 does not authorize M3L3 and does not perform a new live read. The next
stage is local post-G4 runtime and external-capability re-attestation.
