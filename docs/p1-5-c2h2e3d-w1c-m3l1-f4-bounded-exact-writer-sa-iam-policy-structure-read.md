# P1.5-C2H2E3D-W1C-M3L1-F4 Bounded Exact Writer-SA IAM Policy Structure Read

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_F4_BOUNDED_POLICY_STRUCTURE_READ_UNRESOLVED`

The explicitly approved single read was attempted once through the locked
OP-C_PRE command builder and existing Windows process adapter. The process
returned exit code `0`, but no safely parseable structured policy object was
available to the diagnostic projection. Per the approval gate, no retry,
fallback command, project-policy read, or second read was performed.

## Baseline and hard gates

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0

G2R1_VERDICT = P1_5_C2H2E3D_W1C_M3L1_G2R1_RUNTIME_EXTERNAL_CAPABILITY_REATTESTATION_PASS_F4_NEXT
G2R1_REATTESTATION_EXPECTED = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba
G2R1_REATTESTATION_RECOMPUTED = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba
G2R1_REATTESTATION_MATCH = yes
ALL_G2_RUNTIME_LOCKS_MATCH = yes
ALL_G2_TEST_LOCKS_MATCH = yes
OP_C_PRE_ARGV_CHANGED = no
OP_E_ARGV_CHANGED = no
EXTERNAL_COMMAND_SURFACES_CHANGED = no
```

The F4 helper was diagnostic-only and inline for this run; it was not added to
the application or migration runtime.

```text
F4_HELPER_PRODUCTION_RUNTIME_DEPENDENCY = no
ACCIDENTAL_F4_LIVE_ENTRYPOINT = no
PRODUCTION_RUNTIME_CODE_CHANGED = 0
G2_RUNTIME_CODE_CHANGED = 0
```

## F4 allowlist and bounded result

F3 defines the minimum next diagnostic fields. No additional structure was
persisted:

```text
F4_OUTPUT_FIELDS = [
  policyVersion,
  etagPresent,
  conditionalBindingCount,
  targetRoleBindingCount,
  targetMemberPresent
]
```

The exact logical target was the locked writer service account in project
`my-management-app-8a933`. Member identities, policy contents, etag, and
condition expressions were never returned or persisted.

```text
F4_DIAGNOSTIC_RESULT = UNRESOLVED
POLICY_VERSION = unresolved
ETAG_PRESENT = unresolved
TOTAL_BINDING_COUNT = unresolved
CONDITIONAL_BINDING_COUNT = unresolved
UNCONDITIONAL_BINDING_COUNT = unresolved
TARGET_ROLE_BINDING_COUNT = unresolved
TARGET_ROLE_CONDITIONAL_BINDING_COUNT = unresolved
TARGET_ROLE_UNCONDITIONAL_BINDING_COUNT = unresolved
TARGET_MEMBER_PRESENT = unresolved
OTHER_F3_APPROVED_STRUCTURE_FIELDS = []
OP_E_POLICY_STRUCTURE_COMPATIBILITY = UNRESOLVED
POLICY_STRUCTURE_ROOT_CAUSE = UNRESOLVED
ROOT_CAUSE = ROOT_CAUSE_STILL_NOT_PROVEN
ROOT_CAUSE_CONFIDENCE = INSUFFICIENT
HISTORICAL_M3L1_ROOT_CAUSE = still_not_proven
HISTORICAL_ERROR_RECOVERY_ATTEMPTED = no
```

`targetMemberPresent` remains unresolved because active caller discovery was
forbidden and no member identity may be persisted. The unresolved structured
read also prevents a safe policy-version or binding-shape conclusion. This is
not evidence of incompatibility and does not reconstruct the historical M3L1
failure.

## Live counters

```text
REAL_GCLOUD_EXECUTIONS = 1
WRITER_SA_IAM_POLICY_READS = 1
WRITER_SA_IAM_POLICY_READ_RETRIES = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
ROLE_METADATA_READS = 0
PROJECT_IAM_POLICY_READS = 0
TEST_IAM_PERMISSIONS_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
SERVICE_ACCOUNT_KEY_CALLS = 0
```

The full policy response, raw stdout, raw stderr, etag, members, conditions,
caller, token, and credentials were not persisted, logged, or written to a
temporary file.

```text
FULL_POLICY_PERSISTED = no
FULL_POLICY_LOGGED = no
FULL_POLICY_WRITTEN_TO_TEMP_FILE = no
IAM_MEMBER_IDENTITIES_PERSISTED = 0
IAM_MEMBER_IDENTITIES_LOGGED = 0
ETAG_VALUE_PERSISTED = no
CONDITION_EXPRESSIONS_PERSISTED = no
```

## Deterministic evidence

The canonical bounded payload contains only the schema, project identifier,
logical writer target, G2R1 hash, one-read/zero-retry counters, the five F3
allowlisted fields, and the unresolved compatibility classification. It has no
timestamp, policy JSON, etag, members, conditions, raw process output, or
personal absolute path.

```text
M3_F4_BOUNDED_POLICY_STRUCTURE_EVIDENCE_SHA256 = 15477e03ae33798c7f8588d2fa4db529b1e97c31c7c3a8f16241f0d86c7b1904
SECOND_F4_EVIDENCE_SHA256 = 15477e03ae33798c7f8588d2fa4db529b1e97c31c7c3a8f16241f0d86c7b1904
F4_EVIDENCE_REPRODUCIBLE = yes
```

## Status and next action

```text
G2R1_RUNTIME_ATTESTATION_STILL_VALID = yes
F4_IS_FINAL_M3_LIVE_COMPOSITE = no
MUTATION_AS_DIAGNOSTIC = forbidden
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
M3L1_RETRY_ALLOWED = no
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
W1D_STATUS = BLOCKED_PENDING_M3_SUCCESS
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

Recommended next action:
`P1.5-C2H2E3D-W1C-M3L1-RG1_POST-F4_NEW-M3_RETRY_READINESS_AND_FINAL_COMPOSITE_RELOCK`.

RG1 must remain zero-cloud-operation and decide whether a completely new,
explicitly approved M3 attempt is operationally justified. F4 itself does not
authorize a retry or mutation.

## Local verification and security

```text
F4_LOCAL_ALLOWLIST_PARSER_TESTS = PASS
F4_PRIVACY_TESTS = PASS
G2R1_REATTESTATION_GATE = PASS
GIT_DIFF_CHECK = PASS with pre-existing CRLF warnings only
```

No Rules, Indexes, application/runtime code, Firebase data, or external
capability was changed. Staging, commit, push, and deploy remain zero.
