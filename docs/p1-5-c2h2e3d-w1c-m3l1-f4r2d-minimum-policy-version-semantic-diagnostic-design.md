# P1.5-C2H2E3D-W1C-M3L1-F4R2D Policy-Version Semantic Diagnostic Design

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_F4R2D_POLICY_VERSION_SEMANTICS_STILL_UNRESOLVED`

This is a local static design only. No gcloud, API, IAM, M3, M4, token, or
Firestore operation was performed.

## Baseline and chain integrity

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
RG2_VERDICT = P1_5_C2H2E3D_W1C_M3L1_RG2_NOT_READY_POLICY_VERSION_MATERIAL_UNRESOLVED
G2R1_REATTESTATION_MATCH = yes
F4P1_ATTESTATION_MATCH = yes
F4R1_EVIDENCE_MATCH = yes
F4_READ_BUDGET = EXHAUSTED
F4R1_READ_BUDGET = EXHAUSTED
F4_APPROVAL_REUSABLE = no
F4R1_APPROVAL_REUSABLE = no
```

The locked local parser and command-graph tests passed. Existing G2/F4P1
runtime files were not changed.

## OP-E policy-version requirement

The local F3 trace identifies OP-E as:

```text
GET_IAM_POLICY -> local binding mutation -> SET_IAM_POLICY
```

The policy version is material to condition-aware policy preservation, the
setIamPolicy request schema, serialization of conditional bindings, and
avoiding downgrade/loss of condition semantics. The exact required predicate
is therefore not merely “the response contains a version field”:

```text
OP_E_POLICY_VERSION_SECURITY_ROLE = [condition preservation, setIamPolicy request schema, downgrade/loss avoidance]
OP_E_POLICY_VERSION_REQUIRED_PREDICATE = preserve and apply the policy version required by the condition-aware get/set read-modify-set path; the exact value/semantics must be proven
CONDITIONAL_BINDING_SAFETY_REQUIRES_POLICY_VERSION = yes
POLICY_VERSION_DOWNGRADE_RISK = UNRESOLVED
```

## Local SDK/API and gcloud surface findings

The repository does not contain the canonical Cloud SDK YAML, generated IAM
client, or discovery assets referenced by the historical F3 trace. The local
`node_modules` tree also does not provide a usable IAM generated client for
this method. Historical documents are evidence of the prior trace, not a
replacement for the absent source assets.

```text
GET_IAM_POLICY_VERSION_REQUEST_OPTION_SUPPORTED = unresolved
GET_IAM_POLICY_VERSION_REQUEST_OPTION_NAME = unresolved
GET_IAM_POLICY_VERSION_OPTION_SEMANTICS = unresolved
REQUESTED_VERSION_OMITTED_SEMANTICS = current OP-C sends no explicit version request; exact resulting semantics are unresolved
RESPONSE_VERSION_FIELD_OMITTED_SEMANTICS = unresolved
CURRENT_OP_C_SURFACE_SUPPORTS_VERSION_REQUEST = unresolved
SUPPORTED_VERSION_FLAG_OR_ARGUMENT = unresolved
CURRENT_OP_C_VERSION_REQUEST_BEHAVIOR = no explicit version option in the locked argv; format=json and verbosity=error only
CURRENT_OP_C_CAN_PRODUCE_VERSION_AMBIGUITY = yes
```

No guessed `--policy-version`, `--requested-policy-version`, or `--version`
flag was constructed.

## Future diagnostic design, not approval

Local evidence cannot close the ambiguity. A future separate approval may
evaluate one diagnostic-only read, but F4R2D does not authorize it.

```text
POLICY_VERSION_LOCAL_RESOLUTION = STILL_UNRESOLVED
POLICY_VERSION_STATUS_AFTER_F4R2D = MATERIAL_UNRESOLVED
POLICY_VERSION_COMPATIBILITY = UNRESOLVED
STRUCTURED_API_DIAGNOSTIC_AVAILABLE = unresolved
F4R2_DIAGNOSTIC_TRANSPORT = same gcloud surface if explicit-version support is proven; otherwise a separately path-bound structured API
F4R2_NEW_EXTERNAL_CAPABILITY_LOCK_REQUIRED = yes
F4R2_POLICY_VERSION_OUTPUT_FIELDS = [policyVersion, versionExplicitlyRequested, versionSemanticsResolved]
F4R2_POLICY_VERSION_READ_MAX = 1
F4R2_RETRY_MAX = 0
```

The minimum future question is only which bounded policy-version semantic is
needed for OP-E static compatibility. The future output must not include the
full policy, members, etag, conditions, stdout, or stderr.

If a future read is approved, it must use a diagnostic-only helper isolated
from `m3RuntimeCommandGraph.mjs`; M3 argv and mutation logic remain unchanged.
The next local gate is:
`P1_5_C2H2E3D_W1C_M3L1_F4R2G EXPLICIT POLICY-VERSION READ DIAGNOSTIC RELOCK GATE`.

## Target-member carry-forward

```text
TARGET_MEMBER_REQUIREMENT_CLASS = FUTURE_FRESH_PRESTATE_REQUIREMENT
TARGET_MEMBER_REOPENED_FOR_F4R2 = no
CURRENT_TARGET_MEMBER_STATE_ASSERTED = no
```

The future M3 precheck must freshly prove the exact binding is absent before
OP-E. No current member state is asserted here.

## Safety and approval status

```text
FULL_POLICY_PERSISTED = no
IAM_MEMBER_IDENTITIES_PERSISTED = 0
ETAG_VALUE_PERSISTED = no
CONDITION_EXPRESSIONS_PERSISTED = no
RAW_STDOUT_PERSISTED = no
M3_MUTATION_MAX = 0
M4_MUTATION_MAX = 0
M3L1_MUTATION_BUDGET = EXHAUSTED
FINAL_M3_LIVE_COMPOSITE_CREATED = no
F4R2_LIVE_APPROVAL = NOT_GRANTED
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
PRODUCTION_M3_RUNTIME_CHANGED = 0
G2R1_M3_RUNTIME_ATTESTATION_IMPACT = NONE
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

## Local synthetic checks

The existing F4P1 parser was exercised locally with missing version,
explicit version 3, target-role binding, and malformed version fixtures. The
results confirmed that missing version is preserved as `UNRESOLVED`, explicit
integer version is retained, and malformed version is rejected. No cloud
operation was used.

```text
LOCAL_SYNTHETIC_POLICY_VERSION_MATRIX = PASS
PRIVACY_CHECKS = PASS
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
```

## Deterministic evidence

```text
M3_F4R2D_POLICY_VERSION_SEMANTIC_DESIGN_SHA256 = 78284e198c0ac453123a2a933eeb4f8920b7c7a2a1cc24d7142ad4f760e56b4d
F4R2D_EVIDENCE_REPRODUCIBLE = yes
RECOMMENDED_NEXT_ACTION = P1_5_C2H2E3D_W1C_M3L1_F4R2G explicit policy-version read diagnostic relock gate
```

No final composite, M3 approval, or live read is created by this document.
