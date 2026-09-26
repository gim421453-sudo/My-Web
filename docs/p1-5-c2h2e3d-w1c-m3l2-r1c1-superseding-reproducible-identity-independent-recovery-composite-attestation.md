# P1.5-C2H2E3D-W1C-M3L2-R1C1 Superseding Recovery Composite Attestation

## Verdict

```text
R1C1_FINAL_VERDICT = P1_5_C2H2E3D_W1C_M3L2_R1C1_SUPERSEDING_RECOVERY_COMPOSITE_PASS_NEW_R1B2_APPROVAL_REQUIRED
R1C1_R1B2_ELIGIBILITY = yes
R1B2_LIVE_APPROVAL = NOT_GRANTED
```

This local-only artifact replaces the historical R1B1 attestation as future
R1B2 execution authority. It does not approve or execute an IAM policy read.
A new separately issued R1B2 approval must bind this payload and its composite
hash.

## Legacy status

```text
LEGACY_R1B1_ATTESTATION_STATUS = HISTORICAL_UNREPRODUCIBLE_REFERENCE
LEGACY_R1B1_HASH_RECOMPUTED = no
LEGACY_R1B1_HASH_FITTING_ATTEMPTED = no
LEGACY_R1B1_USED_AS_CURRENT_EXECUTION_AUTHORITY = no
```

The old R1B1 document supplied a hash but not its canonical payload or a
reusable builder, so it is retained only as a historical source lock.

## Source locks

| Path | SHA-256 | Role |
|---|---|---|
| `docs/p1-5-c2h2e3d-w1c-m3l2-r1b1-identity-independent-target-role-absence-recovery-design.md` | `4f901ce53bd00b6ba15bd2ce839a32b48265959d6d5ff85532abf1a0d13f04a1` | historical semantics |
| `docs/p1-5-c2h2e3d-w1c-m3l2-r1b1h-identity-independent-target-role-absence-pure-helper-implementation.md` | `837d3a3ed1034f1aa9134cf60040e6e58bb099791bf797ede4da403ddf5a4f0f` | helper implementation attestation |
| `docs/p1-5-c2h2e3d-w1c-m3l1-g2r1-post-g2-runtime-external-capability-local-reattestation.md` | `068c9aec32d4fe82c92705736e52dd8c2eb41f36a5875206151ca9f537255313` | OP-C capability lock |

```text
R1C1_HELPER_SHA256 = 72656d4091e058a2c937d52ecaad905285e3f77494a772be0f119c48937a4a69
R1C1_HELPER_TEST_SHA256 = f8995d73d011104062ef291a17682f0f2970c5d9905305f854dfce7450227ee6
OP_C_COMMAND_BUILDER_SHA256 = 53f948c4e2e993cf394ae22439ed8aed83ed3442c231964d08e5667498504751
OP_C_PROCESS_ADAPTER_SHA256 = 512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
```

## Canonical payload

The authoritative non-self-referential payload is
`docs/evidence/p1-5-c2h2e3d-w1c-m3l2-r1c1-recovery-composite-v1.json`.

```text
CANONICAL_PAYLOAD_SCHEMA = myweb.m3l2.r1c1.recovery-composite.v1
CANONICALIZER = tools/authority-audit/r1c1RecoveryCompositeAttestation.mjs:canonicalizeR1C1RecoveryComposite
CANONICALIZATION = recursively sort object keys lexicographically; preserve array order and scalar values; JSON without insignificant whitespace; UTF-8 without BOM; SHA-256 lowercase hex
M3_M3L2_R1C1_SUPERSEDING_RECOVERY_COMPOSITE_SHA256 = 0f99042cdc8a8ba0c26fe517519bf2488cb529381570a260288df3a64d09c756
SECOND_R1C1_COMPOSITE_SHA256 = 0f99042cdc8a8ba0c26fe517519bf2488cb529381570a260288df3a64d09c756
R1C1_COMPOSITE_REPRODUCIBLE = yes
```

The builder validates the schema before hashing and rejects unknown fields,
timestamps, absolute paths, raw-principal fields, and a legacy R1B1 status
other than `HISTORICAL_UNREPRODUCIBLE_REFERENCE`.

## Bound semantics and future boundary

```text
HELPER_RESULT_DOMAIN = ABSENT_PROVEN / AMBIGUOUS
HELPER_CAN_RETURN_PRESENT_PROVEN = no
FAIL_CLOSED_DEFAULT = AMBIGUOUS
EMPTY_OBJECT_RESULT = AMBIGUOUS
MISSING_BINDINGS_RESULT = AMBIGUOUS
COMPLETE_EMPTY_BINDINGS_RESULT = ABSENT_PROVEN
TARGET_ROLE_MATCH_MODE = EXACT_STRING
TARGET_ROLE_PRESENT_RESULT = AMBIGUOUS
IAM_MEMBER_VALUE_INSPECTION_REQUIRED = no
FINGERPRINT_MATCHING_USED = no
COLLAPSED_PROJECTION_CAN_PROVE_ABSENCE = no
MALFORMED_POLICY_DEFAULTS_TO_ABSENT = no
ZERO_TARGET_ROLE_BINDINGS_IMPLIES_TARGET_ABSENT = yes
NONZERO_TARGET_ROLE_BINDINGS_IMPLIES_TARGET_PRESENT = no
```

Future R1B2 remains limited to the existing locked OP-C writer-SA IAM policy
read surface. It may make at most one read with zero retries; Cloud Logging,
caller discovery, project IAM, `testIamPermissions`, token operations,
Firestore, IAM mutation, M3, and M4 remain zero. The raw response is transient
only; raw policy, members, streams, etag values, and condition expressions are
not persisted.

```text
RECOVERY_READ_SURFACE = EXISTING_LOCKED_OP_C_SURFACE
R1C1_EXTERNAL_CAPABILITY_IMPACT = NONE
NEW_EXTERNAL_CAPABILITY_RECONCILIATION_REQUIRED = no
CURRENT_M3_EFFECTIVE_STATE = INDETERMINATE
CURRENT_M3_OUTCOME_CLASSIFIER_SAFETY = DEFECT_PROVEN
M3L2_MUTATION_BUDGET = EXHAUSTED
M3L2_RETRY = FORBIDDEN
M4_READINESS = BLOCKED
M4_APPROVAL = NOT_GRANTED
```

## Local validation

```text
R1C1_BUILDER_TEST = PASS
AUTHORITY_AUDIT_REGRESSION_COUNT = 13
AUTHORITY_AUDIT_REGRESSION_RESULT = PASS
TYPECHECK = PASS
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
CLOUD_LOGGING_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
