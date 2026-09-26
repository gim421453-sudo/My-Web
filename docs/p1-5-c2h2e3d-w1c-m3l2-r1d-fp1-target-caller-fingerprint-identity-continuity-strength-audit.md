# P1.5-C2H2E3D-W1C-M3L2-R1D-FP1 Target Caller Fingerprint Identity-Continuity Strength Audit

## Scope and verdict basis

This is a local-only audit of the identity continuity assumption in R1D. No
caller was rediscovered, no IAM read or mutation was performed, and no token,
M3, M4, or Firestore operation was run. The R1D design document and its
historical evidence are preserved.

```text
R1D_DESIGN_EXPECTED = 84e57352064aae1c90b8e817d14e1acd823f2fab8bf7908cc458f0ccdd3afd9a
R1D_DESIGN_MATCH = yes
```

## Historical implementation proof

The M3L2 fingerprint implementation is:

`tools/authority-audit/m3RuntimeCommandGraph.mjs:fingerprint`

The implementation first validates the principal as an exact email-shaped
value, then applies `trim()`, lowercases the value, encodes it as UTF-8, hashes
with SHA-256, and keeps the first 12 hexadecimal characters. The same
normalization and truncation semantics are used by the active-caller discovery
gate in `tools/authority-audit/c1a3ExactClassStateReadCaller.mjs`.

```text
HISTORICAL_CALLER_FINGERPRINT_IMPLEMENTATION = tools/authority-audit/m3RuntimeCommandGraph.mjs:fingerprint
HISTORICAL_CALLER_FINGERPRINT_SCHEME = sha256(trim(lowercase(principal)), utf8).slice(0,12)
FINGERPRINT_HEX_LENGTH = 12
FINGERPRINT_BIT_LENGTH = 48
```

The persisted comparison value is therefore a 48-bit truncated digest, not a
256-bit identity proof.

## Original security role

The fingerprint was used as a privacy-safe reference and bounded execution
gate: the local flow required exactly one active account and a matching
fingerprint before the historical operation proceeded, while retaining no raw
principal in the result document. The repository does not establish that the
12-character value was designed as an authorization-grade identity binding.

```text
HISTORICAL_FINGERPRINT_ORIGINAL_SECURITY_ROLE = PRIVACY_SAFE_REFERENCE_AND_BOUNDED_EXECUTION_GATE_NOT_AUTHORIZATION_GRADE
```

It must not be silently promoted to exact historical-principal equality.

## Collision model

No collision search was performed. The relevant conceptual risks are:

- Accidental collision: for independently random principals, the birthday
  scale is approximately the square root of the 48-bit space, about 2^24
  observations for a substantial collision probability. This is unlikely in a
  small account population but is not zero.
- Adversarial chosen-principal collision: when the target fingerprint is known,
  finding another principal with the same truncated output has a generic
  roughly 2^48 trial scale. The truncation removes the security margin of the
  underlying SHA-256 digest.
- Known-target preimage relevance: the recovery decision compares against a
  known historical value, so the relevant question is not full-digest
  collision resistance but whether a different principal can share the
  retained prefix.

```text
COLLISION_SEARCH_PERFORMED = no
```

## False-match consequence

If a fresh principal differs from the historical M3L2 principal but has the
same 48-bit fingerprint, R1D would otherwise permit the exact writer policy
read and compare the fresh principal's transient member. A resulting
`PRESENT` or `ABSENT` state could then be mistaken for the historical target
and could influence a later M3 completion or M4 readiness decision. R1R itself
is read-only, but that downstream consequence makes the identity error
security-relevant.

```text
FALSE_FINGERPRINT_MATCH_SECURITY_IMPACT = HIGH
```

The safe bounded label is `MATCH_48BIT`, never `EXACT_IDENTITY_MATCH`.

## Existing bounded identity evidence

The local evidence and implementation provide these additional properties:

```text
ADDITIONAL_EXISTING_IDENTITY_BINDERS = [
  OP-A exactly one active account,
  status:ACTIVE account filter,
  account-only command output,
  same normalization and caller-type derivation
]
```

OP-A therefore prevents zero-account and multiple-account ambiguity and binds
the fresh process to the same selection contract. It does not remove the
possibility that two different principals share the retained 48-bit value.
No longer digest, independent digest, immutable target token, raw identity, or
other historical principal binder was found in the M3L2, RG2C, F1, or R1D
evidence.

```text
HISTORICAL_LONGER_FINGERPRINT_RECONSTRUCTIBLE = no
RAW_HISTORICAL_CALLER_RECOVERY_ATTEMPTED = no
```

No attempt was made to recover the raw principal from shell history, logs,
temporary files, operating-system artifacts, editor history, or Git history.

## Continuity sufficiency decision

The OP-A properties and a 48-bit match form a useful bounded correlation
contract, but they do not prove exact historical identity for a result that may
later affect M3 completion or M4 readiness.

```text
COMPOSITE_IDENTITY_CONTINUITY_AVAILABLE = no
R1R_TARGET_IDENTITY_CONTINUITY_STRENGTH = INSUFFICIENT
R1R_IDENTITY_CONTINUITY_ACCEPTANCE_CONTRACT = OP-A contract pass AND MATCH_48BIT may be recorded as bounded correlation only; it must not authorize exact target policy interpretation
```

The absence of a stronger persisted binder means R1R must not proceed to the
writer policy read under the current evidence contract. A matching truncated
fingerprint must be treated as unresolved identity for the security decision.

```text
INSUFFICIENT_CONTINUITY_FAIL_CLOSED_BEHAVIOR =
perform no exact writer policy read and return AMBIGUOUS when only OP-A plus MATCH_48BIT is available
```

This also prevents a false `ABSENT` result from being attributed to the actual
M3L2 target.

## R1R graph and budget re-evaluation

R1D's policy-read graph is no longer live-approval eligible. The revised local
graph stops before OP-C:

```text
R1R_FUTURE_LIVE_GRAPH = [
  OP-A active-caller discovery (bounded, 1 maximum),
  fingerprint comparison classified as MATCH_48BIT / MISMATCH / AMBIGUOUS,
  stop with AMBIGUOUS on MATCH_48BIT because exact continuity is insufficient,
  no writer-SA policy read
]
```

```text
R1R_FUTURE_LIVE_BUDGET = {
  activeCallerDiscoveryMax: 1,
  writerPolicyReadMax: 0,
  projectPolicyReadMax: 0,
  retriesMax: 0,
  iamMutationsMax: 0,
  m3MutationsMax: 0,
  m4MutationsMax: 0,
  accessTokenCallsMax: 0,
  firestoreCallsMax: 0
}
```

```text
R1R_EXTERNAL_CAPABILITY_IMPACT = NONE
NEW_CAPABILITY_RECONCILIATION_REQUIRED = no
R1R_LIVE_APPROVAL_ELIGIBLE = no
```

Only the local acceptance design changed; the existing OP-A and OP-C runtime
surfaces were not changed or approved for execution.

## M3/M4 carry-forward locks

```text
CURRENT_M3_EFFECTIVE_STATE = INDETERMINATE
CURRENT_M3_OUTCOME_CLASSIFIER_SAFETY = DEFECT_PROVEN
M3L2_APPROVAL_REUSABLE = no
M3L2_MUTATION_BUDGET = EXHAUSTED
M3L2_RETRY_ALLOWED = no
M4_READINESS = BLOCKED
M4_APPROVAL = NOT_GRANTED
PRODUCTION_M3_RUNTIME_CHANGED = 0
```

`UNKNOWN_NONZERO` remains unsafe to interpret as confirmed remote
non-application. The G4 classifier correction remains a separate local stage
after identity recovery is resolved.

## Synthetic test design

No live identities or collision search were used. The required local matrix for
a future implementation is:

- same normalized synthetic principal -> same fingerprint
- case and outer whitespace variation -> same fingerprint
- different synthetic principals -> normally different fingerprints
- forced equal mocked fingerprint for different principals -> equality alone
  cannot distinguish them
- OP-A continuity failure -> fail closed
- fingerprint mismatch -> skip policy read
- `MATCH_48BIT` with no stronger binder -> `AMBIGUOUS`
- unresolved continuity -> no exact `PRESENT` or `ABSENT`

The privacy assertion must verify that raw synthetic values do not appear in
returned results, logs, snapshots, evidence payloads, or this result document.
No helper or test file was added in FP1; implementation and test expansion
remain a separate gate.

## Deterministic FP1 evidence

Canonicalization is UTF-8 JSON with sorted object keys, no timestamp, and only
bounded scheme, collision, continuity, graph, budget, and status fields. The
payload was hashed twice with identical output.

```text
M3_M3L2_R1D_FP1_IDENTITY_CONTINUITY_AUDIT_SHA256 = 482af60aa21660e02427640ae0bc7ed0d259c1f9c35ed0ca21468384aa409784
SECOND_FP1_EVIDENCE_SHA256 = 482af60aa21660e02427640ae0bc7ed0d259c1f9c35ed0ca21468384aa409784
FP1_EVIDENCE_REPRODUCIBLE = yes
```

## Safety counters

```text
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
RAW_HISTORICAL_CALLER_RECOVERY_ATTEMPTED = no
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Final verdict

`P1_5_C2H2E3D_W1C_M3L2_R1D_FP1_TRUNCATED_FINGERPRINT_INSUFFICIENT_R1R_BLOCKED`

The 12-hex fingerprint is suitable for privacy-safe bounded correlation, but
not sufficient as exact identity continuity for the proposed security-relevant
R1R result. A stronger already-persisted binder is absent. Do not perform the
live writer policy read until the identity contract is strengthened or an
explicit policy accepts `AMBIGUOUS` without using the result for M3/M4.

