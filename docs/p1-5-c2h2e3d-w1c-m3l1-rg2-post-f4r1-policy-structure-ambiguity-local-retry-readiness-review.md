# P1.5-C2H2E3D-W1C-M3L1-RG2 Policy-Structure Ambiguity Local Review

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_RG2_NOT_READY_POLICY_VERSION_MATERIAL_UNRESOLVED`

RG2 was local-only. It performed no gcloud execution, live IAM read,
testIamPermissions call, IAM mutation, M3/M4 action, token operation, or
Firestore operation.

## Baseline and F4R1 integrity

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT = 230
STAGING = 0

F4R1_VERDICT = P1_5_C2H2E3D_W1C_M3L1_F4R1_POLICY_STRUCTURE_AMBIGUOUS_STOP
F4R1_EVIDENCE_EXPECTED = b330191e4f2f6c77ec0775660d3670e6e355a4bd48587367ad80014a49437186
F4R1_EVIDENCE_RECOMPUTED = b330191e4f2f6c77ec0775660d3670e6e355a4bd48587367ad80014a49437186
F4R1_EVIDENCE_MATCH = yes
G2R1_REATTESTATION_MATCH = yes
F4P1_ATTESTATION_MATCH = yes
F4R1_PARSE_STATUS = PASS
F4R1_READ_BUDGET = EXHAUSTED
F4R1_APPROVAL_REUSABLE = no
F4R1_RETRY_ALLOWED = no
```

G2R1 runtime/test locks and F4P1 diagnostic locks matched. The exact OP-E
argv and command surface were unchanged; no M3 runtime or IAM concurrency
implementation file was modified.

## Persisted F4R1 structure

```json
{
  "policyVersion": "UNRESOLVED",
  "etagPresent": true,
  "conditionalBindingCount": 0,
  "targetRoleBindingCount": 0,
  "targetMemberPresent": "UNRESOLVED"
}
```

Classifier predicates:

```text
policyVersion === 3 = UNKNOWN
etagPresent === true = TRUE
targetMemberPresent !== UNRESOLVED = FALSE
compatibility = AMBIGUOUS
```

The F4R1 historical verdict remains unchanged.

## Ambiguity inventory

| Ambiguity | Current state | Security role | Static compatibility | Fresh M3 prestate | Local resolution | Another live read |
|---|---|---|---|---|---|---|
| `POLICY_VERSION` | `UNRESOLVED` | Version-3, condition-aware get/set policy preservation | Required | No | No deterministic missing-response meaning found in local SDK trace | Not automatically authorized |
| `TARGET_MEMBER` | `UNRESOLVED` | Exact writer-SA binding must be absent before OP-E | Not required for static shape | Required | Yes, by the locked future caller-bound precheck | No |

### Policy version

The required information is the policy's numeric version needed by the
condition-aware OP-E read-modify-set path. Local F3 evidence identifies the
path as `getIamPolicy -> local binding mutation -> setIamPolicy`; the command
schema requests policy version 3 and carries it into the set request. This
makes policy version material to condition preservation and request safety.

F4P1 deliberately maps an absent or non-integer `version` to `UNRESOLVED`.
The local SDK/API trace documents the requested version-3 behavior, but does
not define that an omitted version in this bounded response means a specific
numeric version. Therefore:

```text
POLICY_VERSION_AMBIGUITY_SOURCE = omitted/unavailable version in bounded projection; local SDK trace does not define missing-response semantics
MISSING_POLICY_VERSION_SEMANTICS = UNRESOLVED
POLICY_VERSION_STATIC_COMPATIBILITY_MATERIAL = yes
POLICY_VERSION_STATUS = MATERIAL_UNRESOLVED
```

### Target member

The exact predicate is not “any member exists.” It is the specific active
caller member under `roles/iam.serviceAccountTokenCreator` on the exact
writer service account. F4P1 does not discover or persist that identity, so
the bounded field remains unresolved.

The current G2 graph already has the required fresh precheck: `OP_C_PRE`
reads the writer policy and rejects `m3Binding` before OP-E. The historical
M3 result is not reused as current production state.

```text
TARGET_MEMBER_SEMANTIC = exact verified caller member under roles/iam.serviceAccountTokenCreator on the writer service account
TARGET_ROLE_STRUCTURE_KNOWN = no
SPECIFIC_TARGET_MEMBER_STATE_KNOWN = no
TARGET_MEMBER_SECURITY_ROLE = FRESH_M3_PRESTATE
FUTURE_M3_FRESH_M3_ABSENCE_PRECHECK_EXISTS = yes
TARGET_MEMBER_REQUIREMENT_CLASS = FUTURE_FRESH_PRESTATE_REQUIREMENT
TARGET_MEMBER_STATUS = DEFERRED_TO_LOCKED_FRESH_PRESTATE
```

Deferral does not mean present or absent now. It remains mandatory immediately
before any separately approved future OP-E attempt.

## Readiness decision

```text
RG2_STATIC_POLICY_COMPATIBILITY = STILL_AMBIGUOUS
G2_FAILURE_OBSERVABILITY_READY = yes
GRAPH_NODE_COVERED = 9/9
UNBOUND_GRAPH_NODE_COUNT = 0
IAM_CONCURRENCY_CAPABILITY_COMPLETE = yes
M3_MUTATION_MAX = 1
M3_RETRY_MAX = 0
M4_RUNTIME_PATH_REACHABLE = no
MUTATION_AS_DIAGNOSTIC = forbidden
HISTORICAL_M3L1_ROOT_CAUSE = still_not_proven
NEW_M3_RETRY_READINESS = NOT_READY
```

Target-member ambiguity is safely deferred to the fresh prestate. Policy
version ambiguity is still material and cannot be closed from current local
evidence. No final M3 composite is created and no new M3 approval is granted.

## Bounded evidence

The deterministic payload contains only the three prior evidence hashes,
bounded ambiguity records, static result, readiness state, and safety
invariants. It contains no policy, stdout/stderr, caller/member identity,
etag value, condition expression, token, credential, or personal path.

```text
M3_RG2_POLICY_AMBIGUITY_READINESS_EVIDENCE_SHA256 = 4ef6053d5435418ec147a0843302673a22f5491374038fb92c1b1de2bd6ea7c9
RG2_EVIDENCE_REPRODUCIBLE = yes
```

## Local validation

```text
F4P1 parser tests = PASS
M3 command graph tests = PASS
Synthetic missing-version/explicit-version/target-role matrix = PASS
Privacy assertions = PASS
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
```

## Carry-forward and next action

```text
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
F4R1_READ_BUDGET = EXHAUSTED
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
FINAL_M3_LIVE_COMPOSITE_CREATED = no
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
PRODUCTION_M3_RUNTIME_CHANGED = 0
```

Recommended next action:
`P1.5-C2H2E3D-W1C-M3L1-F4R2D MINIMUM REMAINING POLICY-SEMANTIC READ DIAGNOSTIC DESIGN`

F4R2D must remain local and decide whether a separately approved bounded
semantic read is necessary. RG2 authorizes no live read and no mutation.
