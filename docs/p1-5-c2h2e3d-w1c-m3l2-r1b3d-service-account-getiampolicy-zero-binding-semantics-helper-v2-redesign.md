# P1.5-C2H2E3D-W1C-M3L2-R1B3D Service-Account Zero-Binding Semantics

## Scope and retained state

This is a local-only semantic reconciliation. It does not execute gcloud or
read IAM. It does not change helper V1, R1C1, the M3 runtime, or F4P1.

The R1B2-R2 document named in the request has a shortened filename, but the
only repository result document matching the supplied SHA-256 is
`docs/p1-5-c2h2e3d-w1c-m3l2-r1b2-r2-r1c1-composite-locked-single-writer-sa-identity-independent-target-role-absence-read.md`.

```text
R1B2_R2_RESULT_DOCUMENT_HASH_MATCH = yes
R1B2_R2_NAMED_REPRODUCIBLE_EVIDENCE_HASH = absent
R1B2_R2_READ_COUNT = 1
R1B2_R2_RETRY_COUNT = 0
R1B2_R2_EXIT_CODE = 0
R1B2_R2_TIMED_OUT = no
R1B2_R2_STRICT_PARSE = PARSED
R1B2_R2_HELPER_RESULT = AMBIGUOUS
R1B2_R2_AMBIGUITY_REASON = NOT_RECOVERABLE_FROM_RETAINED_EVIDENCE
R1B2_R2_RETROACTIVE_RECLASSIFICATION = forbidden
CURRENT_M3_EFFECTIVE_STATE = INDETERMINATE
```

No conclusion is made that the R1B2-R2 response was etag-only, malformed, or
contained the target role. Its raw policy and branch reason were intentionally
not retained.

## Verified current authority

```text
R1C1_COMPOSITE_MATCH = yes
HELPER_V1_HASH_MATCH = yes
LEGACY_R1B1_ATTESTATION_STATUS = HISTORICAL_UNREPRODUCIBLE_REFERENCE
LEGACY_R1B1_USED_AS_CURRENT_EXECUTION_AUTHORITY = no
```

The legacy R1B1 hash is not reconstructed or used as current authority.

## Exact OP-C surface

The current builder emits the locked service-account policy read with JSON
output and no custom projection. The local PowerShell host invokes the
executable with its exact argument array and forwards child output without
field-level transformation.

```text
OP_C_SERVICE_ACCOUNT_GET_IAM_POLICY_SURFACE = EXACT_MATCH
OP_C_STRUCTURED_POLICY_OUTPUT = yes
OP_C_OUTPUT_FIELD_SUPPRESSION = none
LOCAL_OUTPUT_CAN_DROP_NONEMPTY_BINDINGS = PROVEN_NO
F4R2G_POLICY_VERSION_SEMANTICS_STILL_APPLICABLE = yes
CONDITIONAL_TARGET_ROLE_HIDDEN_BY_VERSION1_TRANSFORMATION = PROVEN_IMPOSSIBLE
```

The last conclusion is limited to the current exact gcloud surface and the
supplied official policy-version semantics: gcloud selects the applicable
allow-policy version automatically. It is not a claim about the R1B2-R2 policy
contents.

## Etag-only semantics

The supplied official service-account `getIamPolicy` evidence documents an
etag-only successful response when no roles have been granted on that service
account. Combined with the exact OP-C surface and the no-suppression result,
the future contract may treat a valid `{ "etag": string }` response as a
complete zero-binding policy representation.

```text
SERVICE_ACCOUNT_ETAG_ONLY_POLICY_SEMANTIC = ZERO_ROLE_BINDINGS
EMPTY_OBJECT_EQUIVALENT_TO_ETAG_ONLY = no
ETAG_STRUCTURAL_VALIDITY_PREDICATE = own etag property; string; non-empty
MISSING_VERSION_ON_ETAG_ONLY_ZERO_BINDING_POLICY = SAFE
VERSION1_EXPLICIT_EMPTY_BINDINGS = ABSENT_SAFE
VERSION3_EXPLICIT_EMPTY_BINDINGS = ABSENT_SAFE
ETAG_ONLY_POLICY = ABSENT_SAFE
BINDINGS_MISSING_AND_ETAG_MISSING = AMBIGUOUS
```

The etag predicate is intentionally structural only. It does not persist,
decode, compare, or otherwise inspect the etag value.

## Helper V2 design

V2 remains an asymmetric two-state classifier:

```text
HELPER_V2_RESULT_DOMAIN = ABSENT_PROVEN / AMBIGUOUS
HELPER_V2_CAN_RETURN_PRESENT_PROVEN = no
HELPER_V2_IAM_MEMBER_VALUE_INSPECTION_REQUIRED = no
```

`ABSENT_PROVEN` allowlist, after strict JSON and complete-shape validation:

1. Exact etag-only object: `etag` is a non-empty string and is the sole
   supported policy field.
2. Explicit binding set: `version` is `1` or `3`, `etag` is a non-empty
   string, `bindings` is an empty array, and no unsupported policy field is
   present.
3. Complete non-empty binding set: `version` is `1` or `3`, `etag` is a
   non-empty string, every binding has a string role and string-array members,
   no exact target role appears, and any conditional binding is represented
   only with version `3` and an object-shaped condition.

All other shapes return `AMBIGUOUS`, including `{}`, missing etag, unsupported
versions, malformed bindings, malformed conditions, an exact target-role
binding, and any version/condition representation uncertainty. The V2 parser
must not silently turn absent `bindings` into an empty array except for the
exact etag-only allowlist form.

The exact role comparison remains strict equality with
`roles/iam.serviceAccountTokenCreator`. A target-role binding always yields
`AMBIGUOUS`, even with empty members; no member identity is inspected.

## Future bounded reason IDs

V2 may persist one allowlisted, non-sensitive reason ID:

```text
COMPLETE_ETAG_ONLY_ZERO_BINDINGS
COMPLETE_EXPLICIT_EMPTY_BINDINGS
COMPLETE_NO_TARGET_ROLE
TARGET_ROLE_EXISTS
INCOMPLETE_POLICY
MALFORMED_POLICY
VERSION_SEMANTICS_UNSAFE
```

No reason ID may contain a member, caller, fingerprint, etag, condition text,
raw policy, stream content, or credential.

## Next boundary

The next permitted implementation work is local-only
`P1.5-C2H2E3D-W1C-M3L2-R1B3H`: implement and attest helper V2 with this
allowlist and its privacy test matrix. R1B3D grants no new live read. A future
R1B4 read would require a separate new approval bound to that V2 attestation.

```text
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
