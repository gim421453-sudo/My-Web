# P1.5-C2H2E3D-W1C-M3L2-R1B3H Helper V2 Implementation Attestation

This is a local-only implementation and reproducibility record. It performed
no external command, IAM, Cloud Logging, Firestore, or mutation operation.

```text
R1B3D_VERDICT = R1B3D_SEMANTICS_RESOLVED
R1B3D_NAMED_ATTESTATION_AVAILABLE = no
R1B3D_SOURCE_DOCUMENT_SHA256 = f8836f36cf408ff10361aaaf10abb1a52a4415ab1fee2d063fdf1f3c940af2b6
R1C1_COMPOSITE_MATCH = yes
R1B2_R2_RESULT_DOCUMENT_HASH_MATCH = yes
V1_HELPER_HASH_MATCH = yes
V1_TEST_HASH_MATCH = yes
V1_HELPER_CHANGED = no
V1_TEST_CHANGED = no
```

R1B3D is bound by its exact source-document byte hash because it did not
contain a named reproducible attestation. The historical R1B2-R2 result is
not reclassified; its result remains `AMBIGUOUS` and its previous approval is
not reusable.

## V2 implementation

```text
R1B3H_HELPER_V2_PATH = tools/authority-audit/writerPolicyTargetRoleAbsenceDiagnosticV2.mjs
R1B3H_HELPER_V2_SHA256 = a610d60d3d6db32950bd82b51b887f819a0e3b363e2378640deb410424669096
R1B3H_HELPER_V2_TEST_PATH = tools/authority-audit-tests/writerPolicyTargetRoleAbsenceDiagnosticV2.test.mjs
R1B3H_HELPER_V2_TEST_SHA256 = 8f31bf8a07dc7543b72e882ae215cbf4e08ca19b6ef8fefcb177e42fa6551d15
HELPER_V2_PURITY = PASS
HELPER_V2_PRODUCTION_M3_DEPENDENCY = no
HELPER_V2_RESULT_DOMAIN = ABSENT_PROVEN / AMBIGUOUS
HELPER_V2_CAN_RETURN_PRESENT_PROVEN = no
FAIL_CLOSED_DEFAULT = AMBIGUOUS
EMPTY_OBJECT_RESULT = AMBIGUOUS
ETAG_ONLY_POLICY_RESULT = ABSENT_PROVEN
ETAG_STRUCTURAL_VALIDITY_PREDICATE = own etag property; string; non-empty
VERSION1_EXPLICIT_EMPTY_BINDINGS_RESULT = ABSENT_PROVEN
VERSION3_EXPLICIT_EMPTY_BINDINGS_RESULT = ABSENT_PROVEN
BINDINGS_MISSING_AND_ETAG_MISSING_RESULT = AMBIGUOUS
TARGET_ROLE = roles/iam.serviceAccountTokenCreator
TARGET_ROLE_MATCH_MODE = EXACT_STRING
TARGET_ROLE_PRESENT_RESULT = AMBIGUOUS
CONDITIONAL_TARGET_ROLE_RESULT = AMBIGUOUS
HELPER_V2_IAM_MEMBER_VALUE_INSPECTION_REQUIRED = no
HELPER_V2_FINGERPRINT_MATCHING_USED = no
HELPER_V2_ABSENT_REASON_ALLOWLIST = COMPLETE_ETAG_ONLY_ZERO_BINDINGS, COMPLETE_EXPLICIT_EMPTY_BINDINGS, COMPLETE_NO_TARGET_ROLE
HELPER_V2_SAFE_REASON_IDS = COMPLETE_ETAG_ONLY_ZERO_BINDINGS, COMPLETE_EXPLICIT_EMPTY_BINDINGS, COMPLETE_NO_TARGET_ROLE, TARGET_ROLE_EXISTS, INCOMPLETE_POLICY, MALFORMED_POLICY, VERSION_SEMANTICS_UNSAFE
```

The helper accepts only the R1B3D-complete shapes. It rejects empty objects,
unsupported versions, malformed bindings or conditions, and version 1
conditional bindings. It never returns a positive-presence state, does not
match member identities, and does not return policy, member, condition, or
etag content.

## Reproducible attestation

```text
CANONICAL_PAYLOAD_SCHEMA = myweb.m3l2.r1b3h.helper-v2-attestation.v1
CANONICAL_PAYLOAD_PATH = docs/evidence/p1-5-c2h2e3d-w1c-m3l2-r1b3h-helper-v2-attestation-v1.json
CANONICALIZER_VERIFIER = tools/authority-audit/r1b3hHelperV2Attestation.mjs
M3_M3L2_R1B3H_HELPER_V2_ATTESTATION_SHA256 = b657f755c832a0c4f25a447e68bdc73c0c494543e6bce7cc464c18fecf03f34a
SECOND_R1B3H_HELPER_V2_ATTESTATION_SHA256 = b657f755c832a0c4f25a447e68bdc73c0c494543e6bce7cc464c18fecf03f34a
R1B3H_ATTESTATION_REPRODUCIBLE = yes
```

The canonical payload contains only stable hashes, semantic labels, bounded
budgets, relative repository paths, and privacy booleans. It contains no raw
policy, principals, member values, etag values, condition expressions, or
runtime output. The result-document byte hash is intentionally reported
outside this document to avoid self-reference.

## Verification

```text
V2_HELPER_TEST_COUNT = 26 assertions
V2_HELPER_TEST_RESULT = PASS
V1_HELPER_TEST_RESULT = PASS
R1C1_ATTESTATION_TEST_RESULT = PASS
AUTHORITY_AUDIT_REGRESSION_COUNT = 15 test files
AUTHORITY_AUDIT_REGRESSION_RESULT = PASS (local V2 tests plus existing suite)
TYPECHECK = PASS
NEW_WHITESPACE_ERRORS = 0
```

The V2 tests cover etag-only, explicit empty bindings, supported and
unsupported versions, unrelated bindings, target and conditional target
roles, version-unsafe conditions, malformed shapes, collapsed projections,
privacy, and attestation tamper/replay properties.

## Safety and next boundary

```text
PRODUCTION_M3_RUNTIME_CHANGED = 0
F4P1_RUNTIME_CHANGED = 0
R1C1_RUNTIME_OR_PAYLOAD_CHANGED = 0
R1B4_EXTERNAL_CAPABILITY_IMPACT = NONE
R1B4_FUTURE_LIVE_BUDGET = writerSaIamPolicyReadsMax=1; retriesMax=0; all other external, mutation, token, and Firestore calls max=0
CURRENT_M3_EFFECTIVE_STATE = INDETERMINATE
CURRENT_M3_OUTCOME_CLASSIFIER_SAFETY = DEFECT_PROVEN
R1B2_R2_APPROVAL_REUSABLE = no
M3L2_APPROVAL_REUSABLE = no
M3L2_MUTATION_BUDGET = EXHAUSTED
M3L2_RETRY_ALLOWED = no
M4_READINESS = BLOCKED
M4_APPROVAL = NOT_GRANTED
R1B4_LIVE_APPROVAL = NOT_GRANTED
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
CLOUD_LOGGING_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

```text
FINAL_VERDICT = P1_5_C2H2E3D_W1C_M3L2_R1B3H_HELPER_V2_IMPLEMENTATION_ATTESTATION_PASS_NEW_R1B4_APPROVAL_ELIGIBLE
R1B3H_RESULT_DOCUMENT_SHA256 = EXTERNAL_FINAL_REPORT_ONLY
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3D-W1C-M3L2-R1B4_NEW_HELPER_V2_LOCKED_SINGLE_WRITER_SA_ABSENCE_READ
```

This pass does not approve or execute R1B4. A future R1B4 operation requires
a new explicit read-only approval bound to the canonical payload and helper
V2 hashes above.
