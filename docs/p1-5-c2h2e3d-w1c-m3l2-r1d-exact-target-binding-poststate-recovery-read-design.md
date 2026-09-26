# P1.5-C2H2E3D-W1C-M3L2-R1D Exact Target-Binding Poststate Recovery Read Design

## Scope

This document defines a minimum, bounded, fail-closed future recovery read for
the historical M3L2 OP-E attempt. It is a local design only. It does not run
gcloud, read IAM, perform IAM mutation, run M3/M4, request a token, or access
Firestore. The historical M3L2 result document is preserved unchanged.

Historical runtime output remains `CONFIRMED_FAILURE`; the safety override is
newer and governs all future decisions:

`M3L2_EFFECTIVE_OUTCOME_FOR_SAFETY = INDETERMINATE`

## Evidence locks

- F1 verdict:
  `P1_5_C2H2E3D_W1C_M3L2_F1_OUTCOME_CLASSIFIER_UNSAFE_RECLASSIFY_INDETERMINATE_NEEDS_STATE_RECOVERY_DESIGN`
- F1 evidence hash:
  `77effbddd0a047eb99b887289de28cb3c415ee6f73811e54120add992a8d5ee8`
- M3L2 result evidence hash:
  `4ec4415863f1432a72f2e1e9b7d682da92b947c69a0fda315551b5f72247cdb4`
- RG2C composite hash:
  `b608dfd3d6af799d1c203fdce1e02bf33aafbca5d5a01e1c63d71fa17503a0e1`

These are historical evidence only. None is treated as current IAM state.

```text
F1_EVIDENCE_MATCH = yes
M3L2_RESULT_EVIDENCE_MATCH = yes
RG2C_FINAL_COMPOSITE_MATCH = yes
```

## Current state and identity continuity

```text
CURRENT_TARGET_BINDING_STATE = INDETERMINATE
CURRENT_M3_EFFECTIVE_STATE_CONFIDENCE = INDETERMINATE
M3L2_PRESTATE_USED_AS_CURRENT_STATE = no
F4R1_POLICY_USED_AS_CURRENT_STATE = no
RG2C_STATE_USED_AS_CURRENT_STATE = no
```

The M3L2 run retained a privacy-safe caller fingerprint, not the raw caller
principal. The implementation in `tools/authority-audit/m3RuntimeCommandGraph.mjs`
computes it as:

`sha256(trim(lowercase(principal)), utf8).slice(0, 12)`

```text
M3L2_TARGET_CALLER_FINGERPRINT_AVAILABLE = yes
M3L2_TARGET_CALLER_FINGERPRINT_SCHEME = sha256(trim(lowercase(principal)), utf8).slice(0,12)
FRESH_CALLER_REDISCOVERY_REQUIRED = yes
```

The same historical target cannot be reconstructed from the stored evidence
without the raw principal. A future read must freshly discover the active
caller, compute the same bounded fingerprint, and compare it to the retained
historical fingerprint. Equality is required. A mismatch or ambiguous
discovery stops the recovery and skips the policy read; it must not be treated
as absence.

```text
TARGET_IDENTITY_CONTINUITY_CONTRACT = exact fingerprint equality; mismatch or ambiguity => stop and skip policy read
```

## Exact recovery question

The future operation answers only whether the exact historical target member is
present in the exact target role binding on the exact dedicated writer service
account. It does not inspect project-wide policy and does not infer any other
authority.

```text
RECOVERY_TARGET_BINDING_PREDICATE =
strict policy shape; exact target role plus exact transient member; any malformed or unsupported structure is AMBIGUOUS; valid conditional bindings follow the current M3 role/member predicate
```

The current M3 predicate in `m3RuntimeCommandGraph.mjs` requires an array of
bindings, an exact role, an array of members, and exact member inclusion. It
does not compare condition contents. Therefore a valid conditional binding
with the exact role and member follows the existing predicate and is counted as
present. A strict recovery parser must still return `AMBIGUOUS` for malformed
policy, malformed bindings or members, unsupported condition shape, missing
target identity, and parser uncertainty.

The bounded result is only:

- `PRESENT`: exact role/member predicate safely true
- `ABSENT`: valid, sufficiently complete policy safely proves it false
- `AMBIGUOUS`: identity mismatch, malformed/unsupported policy, or any parser
  uncertainty

These defaults are locked:

```text
UNKNOWN_POLICY_SHAPE_DEFAULTS_TO_ABSENT = no
MALFORMED_BINDING_DEFAULTS_TO_ABSENT = no
IDENTITY_MISMATCH_DEFAULTS_TO_ABSENT = no
```

An empty or incomplete policy response is not enough to claim absence unless
the exact API response contract proves that shape complete. No such live proof
is made in R1D, so the design treats incomplete shape as `AMBIGUOUS`.

## Reusable parser boundary

`tools/authority-audit/f4WriterPolicyStructureDiagnostic.mjs` is suitable for
strict structural validation and bounded metadata. Its privacy contract must
remain unchanged: no member arrays, policy, etag, conditions, stdout or raw
response may be returned or persisted.

If implementation is approved later, the exact-member comparison should be a
separate pure diagnostic function receiving the policy and expected member only
transiently and returning the bounded enum. It must not weaken or modify the
F4P1 parser contract. Synthetic fixtures should cover present, absent, no role,
malformed bindings, malformed members, multiple role bindings, conditional
bindings, unrelated roles, identity mismatch, and empty/incomplete policy.

## Future live graph and surfaces

The minimum future graph is conditional:

```text
R1R_FUTURE_LIVE_GRAPH = [
  OP-A active-caller discovery (1 maximum),
  exact fingerprint comparison,
  OP-C writer-service-account policy read (1 maximum only on MATCH),
  bounded PRESENT/ABSENT/AMBIGUOUS classification
]
```

```text
RECOVERY_CALLER_SURFACE = EXISTING_LOCKED_OP_A_SURFACE
RECOVERY_POLICY_READ_SURFACE = EXISTING_LOCKED_OP_C_SURFACE
R1R_EXTERNAL_CAPABILITY_IMPACT = NONE
NEW_CAPABILITY_RECONCILIATION_REQUIRED = no
```

If identity continuity is `MISMATCH` or `AMBIGUOUS`, the policy read is
skipped. If it is `MATCH`, the policy is read transiently and only the bounded
state is retained. No project IAM policy read or permission probe is part of
this recovery question.

## Future budget

```text
R1R_FUTURE_LIVE_BUDGET = {
  activeCallerDiscoveryMax: 1,
  writerSaIamPolicyReadMax: 1,
  projectIamPolicyReadMax: 0,
  retriesMax: 0,
  testIamPermissionsMax: 0,
  iamMutationsMax: 0,
  m3MutationsMax: 0,
  m4MutationsMax: 0,
  accessTokenCallsMax: 0,
  writerImpersonationCallsMax: 0,
  firestoreCallsMax: 0
}
```

The existing locked OP-A and OP-C surfaces are reused; no new external
capability reconciliation is needed. This is design eligibility only, not live
approval.

## Result branches and sequencing

`PRESENT` means the exact required binding is currently present. It does not
activate M4. A separate local state-adoption and M3 completion gate is required
before any later transition consideration.

`ABSENT` means the required binding is not present. M3 remains exhausted and
must not be retried automatically. Local classifier remediation is required
first.

`AMBIGUOUS` means stop. No second automatic read, M3, or M4 is allowed.

The outcome classifier defect remains open:

```text
CURRENT_M3_OUTCOME_CLASSIFIER_SAFETY = DEFECT_PROVEN
M4_APPROVAL = NOT_GRANTED
M4_READINESS = BLOCKED
M4_BLOCKER = M3_EFFECTIVE_STATE_INDETERMINATE
```

Preferred sequence:

`R1D design -> separately approved R1R read -> PRESENT/ABSENT/AMBIGUOUS -> G4 local classifier correction -> later IAM transition review`

The G4 rule is not implemented here. `UNKNOWN_NONZERO` without proof of remote
non-application must remain `INDETERMINATE`.

## Privacy and retained evidence

The future evidence payload may contain only schema/version, the three locked
historical evidence hashes, privacy-safe caller fingerprint, fingerprint match
status, bounded call counts, parser status, the bounded recovery state, and
zero-operation counters. It must not contain raw caller/member identities,
policy, etag, conditions, stdout, stderr, tokens, authorization data,
credentials, private keys, or timestamps in canonical content.

Only `TARGET_BINDING_RECOVERY_STATE` may be retained as the recovery result.
Transient comparison values must be discarded after classification.

## R1D deterministic design attestation

Canonicalization: UTF-8 JSON with recursively sorted object keys, no timestamp,
and the bounded fields described by this design. The canonical payload was
hashed twice with identical output.

```text
M3_M3L2_R1D_POSTSTATE_RECOVERY_DESIGN_SHA256 = 84e57352064aae1c90b8e817d14e1acd823f2fab8bf7908cc458f0ccdd3afd9a
SECOND_R1D_DESIGN_SHA256 = 84e57352064aae1c90b8e817d14e1acd823f2fab8bf7908cc458f0ccdd3afd9a
R1D_DESIGN_REPRODUCIBLE = yes
```

The canonical payload contains no raw identity, policy, etag, condition,
stderr, credential, or absolute local path.

## Safety counters and final values

```text
PROJECT_IAM_POLICY_READ_MAX = 0
TEST_IAM_PERMISSIONS_MAX = 0
IAM_MUTATION_MAX = 0
M3_MUTATION_MAX = 0
M4_MUTATION_MAX = 0
ACCESS_TOKEN_CALLS_MAX = 0
FIRESTORE_CALLS_MAX = 0

PRODUCTION_M3_RUNTIME_CHANGED = 0
M3_RUNTIME_REATTESTATION_REQUIRED = no

REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0

FUTURE_R1R_LIVE_APPROVAL = NOT_GRANTED
```

## Local validation

R1D adds no helper, runtime, or test file. Existing local-only regression
coverage was used for the locked parser, caller fingerprint contract, M3 graph,
and stderr safety analyzer. A future implementation gate must add the synthetic
target-binding matrix and privacy assertions before any R1R approval.

No cloud or production test was run.

## Verdict

`P1_5_C2H2E3D_W1C_M3L2_R1D_EXACT_POSTSTATE_RECOVERY_DESIGN_PASS_R1R_APPROVAL_ELIGIBLE`

This means the local design is bounded and uses existing locked surfaces. It
does not grant R1R live execution approval, does not authorize mutation, and
does not change the M3 runtime classifier.

