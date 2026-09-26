# P1.5-C2H2E3D-W1C-M3L2-R1B1 Identity-Independent Target-Role Absence Recovery Design

## Scope

This is a local-only design. It does not execute the existing writer-service-
account policy read, Cloud Logging, IAM, M3/M4, token, or Firestore operations.
It does not modify the M3 runtime or the F4P1 parser.

## Evidence chain

```text
R1A1_VERDICT = P1_5_C2H2E3D_W1C_M3L2_R1A1_AUDIT_EVENT_TIME_ANCHOR_INSUFFICIENT
R1A1_ATTESTATION_EXPECTED = 745c4aaa9f18ee3a9f799a31695af194551b108ef7813a8fac496838ec6e1e40
R1A1_ATTESTATION_MATCH = yes
FP1_EVIDENCE_MATCH = yes
F1_EVIDENCE_MATCH = yes
CURRENT_M3_EFFECTIVE_STATE = INDETERMINATE
```

Historical prestate, audit evidence, and the truncated caller fingerprint are
not reused as current state.

## Logical absence proof

For one exact writer service-account resource, IAM policy bindings define which
principals have a role on that resource. If a valid, complete current policy
contains zero bindings whose `role` is exactly
`roles/iam.serviceAccountTokenCreator`, then no principal can currently hold
that resource-level role through a binding on that resource. This includes the
unknown historical M3L2 target.

```text
ZERO_TARGET_ROLE_BINDINGS_IMPLIES_HISTORICAL_TARGET_ABSENT = yes
NONZERO_TARGET_ROLE_BINDINGS_IMPLIES_HISTORICAL_TARGET_PRESENT = no
```

The converse is intentionally rejected. One or more target-role bindings do
not identify which member was targeted by M3L2, so the result remains
`AMBIGUOUS`.

```text
IDENTITY_INDEPENDENT_RECOVERY_STATE_DOMAIN = ABSENT_PROVEN / AMBIGUOUS
R1B2_CAN_RETURN_PRESENT_PROVEN = no
```

## Structural predicate

The target role match is exact string equality only:

```text
TARGET_ROLE_MATCH = EXACT_STRING
IAM_MEMBER_VALUE_INSPECTION_REQUIRED = no
```

The identity-independent classifier counts structurally valid bindings with
the exact target role and does not enumerate, compare, or persist member values.

- zero exact target-role bindings in a complete valid policy -> `ABSENT_PROVEN`
- one or more exact target-role bindings -> `AMBIGUOUS`
- conditional exact target-role binding -> `AMBIGUOUS`; condition expression is
  not evaluated or persisted
- multiple exact target-role bindings -> `AMBIGUOUS`
- exact role with an empty members array -> `AMBIGUOUS`, because this design
  does not inspect member semantics
- malformed, incomplete, or unknown policy shape -> `AMBIGUOUS`

```text
MALFORMED_POLICY_DEFAULTS_TO_ABSENT = no
UNKNOWN_BINDING_SHAPE_DEFAULTS_TO_ABSENT = no
```

## F4P1 assessment

`tools/authority-audit/f4WriterPolicyStructureDiagnostic.mjs` already performs
exact role equality, validates binding shape, avoids member output, and projects
`targetRoleBindingCount`. Its privacy contract remains unchanged.

The projection alone is not sufficient for R1B2. The parser accepts an empty
object as a parsed shape and projects a count of zero while also marking policy
version unresolved. A consumer using only the count could turn an incomplete
response into `ABSENT_PROVEN`. Therefore R1B2 needs a separate pure helper or
consumer gate that requires a complete supported policy shape before accepting
zero as proof.

```text
F4P1_EXISTING_TARGET_ROLE_BINDING_COUNT_USABLE = no
F4P1_MEMBER_PRIVACY_CONTRACT_CHANGED = no
```

The future helper may return only `ABSENT_PROVEN`, `AMBIGUOUS`, and bounded
parser status. It must not return `PRESENT`, members, bindings, policy, etag,
conditions, stdout, or stderr.

## Recovery surface and capability status

```text
RECOVERY_READ_SURFACE = EXISTING_LOCKED_OP_C_SURFACE
R1B_EXTERNAL_CAPABILITY_IMPACT = NONE
NEW_CAPABILITY_RECONCILIATION_REQUIRED = no
```

The future read is the already path-bound exact writer-service-account policy
surface covered by the existing E1/E3R1/G2R1/RG2C evidence. No project policy
read, caller discovery, Cloud Logging, or alternative command is introduced.

## Future R1B2 graph

```text
R1B2_FUTURE_LIVE_GRAPH = [
  one exact writer-SA IAM policy read,
  strict complete-shape validation,
  exact target-role binding count without member inspection,
  zero count -> ABSENT_PROVEN,
  nonzero or any uncertainty -> AMBIGUOUS,
  discard raw policy and persist only the bounded result
]
```

```text
R1B2_FUTURE_LIVE_BUDGET = {
  writerSaIamPolicyReadsMax: 1,
  cloudLoggingReadsMax: 0,
  activeCallerDiscoveryMax: 0,
  projectIamReadsMax: 0,
  testIamPermissionsMax: 0,
  iamMutationsMax: 0,
  m3MutationsMax: 0,
  m4MutationsMax: 0,
  accessTokenCallsMax: 0,
  firestoreCallsMax: 0,
  retriesMax: 0
}
```

Any nonzero exit, timeout, parse failure, schema uncertainty, or unsupported
policy shape produces `AMBIGUOUS` and stops. No automatic second read is
allowed.

## Privacy contract

The future policy response may exist transiently in process memory only.

```text
RAW_POLICY_PERSISTED = no
RAW_STDOUT_PERSISTED = no
RAW_STDERR_PERSISTED = no
IAM_MEMBER_IDENTITIES_PERSISTED = 0
ETAG_VALUE_PERSISTED = no
CONDITION_EXPRESSIONS_PERSISTED = no
```

The classifier must never compare the 48-bit historical fingerprint against
current IAM members. This path deliberately cannot produce a historical-target
`PRESENT` result.

## Branch handling

If the future read proves zero exact target-role bindings, the current effective
state may be recorded as `ABSENT_PROVEN`. This does not authorize a new M3
mutation; the outcome-classifier defect must first be corrected locally.

If the count is nonzero or the policy is uncertain, the effective state remains
`INDETERMINATE`. No automatic additional read, M3 retry, or M4 action follows.

```text
CURRENT_M3_OUTCOME_CLASSIFIER_SAFETY = DEFECT_PROVEN
M3L2_APPROVAL_CONSUMED = yes
M3L2_APPROVAL_REUSABLE = no
M3L2_MUTATION_BUDGET = EXHAUSTED
M3L2_RETRY_ALLOWED = no
M4_READINESS = BLOCKED
M4_APPROVAL = NOT_GRANTED
LOGGING_IAM_GRANTS = 0
PRODUCTION_M3_RUNTIME_CHANGED = 0
```

R1A1 remains recorded as `AUDIT_LOG_STRATEGY = BLOCKED_BY_TIME_ANCHOR`; no
Logging permission or read is needed for this narrower absence design.

## Synthetic matrix

The future helper test matrix uses synthetic policies only:

- no bindings or unrelated roles -> `ABSENT_PROVEN`
- one or multiple exact target-role bindings -> `AMBIGUOUS`
- conditional target-role binding -> `AMBIGUOUS`
- malformed binding, wrong binding type, malformed JSON -> `AMBIGUOUS`
- role prefix/suffix variation -> not an exact role match
- secret-like fake member values -> no values in output
- attempted `PRESENT_PROVEN` -> rejected
- member with matching historical 48-bit fingerprint -> still not present proof
- malformed policy forced to absent -> rejected

No helper or test file was added in R1B1; this document defines the separate
implementation/test gate required before R1B2 approval.

## Deterministic design attestation

Canonicalization is UTF-8 JSON with recursively sorted object keys, no
timestamp, no production state, and no raw identity or policy content. The
payload was hashed twice with identical output.

```text
M3_M3L2_R1B1_IDENTITY_INDEPENDENT_ABSENCE_RECOVERY_DESIGN_SHA256 = 18c2b24485cf50588f690c13cd4ca058eed95d70006413f67e3255e87bc770cf
SECOND_R1B1_DESIGN_SHA256 = 18c2b24485cf50588f690c13cd4ca058eed95d70006413f67e3255e87bc770cf
R1B1_DESIGN_REPRODUCIBLE = yes
```

## Safety counters

```text
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
CLOUD_LOGGING_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
FIRESTORE_API_CALLS = 0
R1B2_LIVE_APPROVAL = NOT_GRANTED
```

## Final verdict

`P1_5_C2H2E3D_W1C_M3L2_R1B1_EXISTING_OP_C_PROJECTION_INSUFFICIENT_NEEDS_LOCAL_HELPER`

The identity-independent absence proof is valid, but the existing F4P1
projection must not be consumed alone because incomplete policy shape can appear
as count zero. Add a bounded pure helper and its synthetic privacy matrix in a
separate local implementation gate before any R1B2 live read approval.

