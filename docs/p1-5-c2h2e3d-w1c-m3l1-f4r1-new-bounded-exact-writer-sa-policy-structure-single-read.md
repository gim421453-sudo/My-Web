# P1.5-C2H2E3D-W1C-M3L1-F4R1 Bounded Writer-SA Policy Structure Single Read

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_F4R1_POLICY_STRUCTURE_AMBIGUOUS_STOP`

This was one newly approved, read-only diagnostic. No M3 retry, IAM mutation,
Firestore operation, class write, or automatic follow-up read was performed.

## Pre-live integrity gate

```text
F4P1_VERDICT = P1_5_C2H2E3D_W1C_M3L1_F4P1_SAFE_POLICY_READ_PARSER_REDESIGN_PASS_M3_RUNTIME_UNCHANGED
G2R1_REATTESTATION_EXPECTED = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba
G2R1_REATTESTATION_RECOMPUTED = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba
G2R1_REATTESTATION_MATCH = yes
F4P1_ATTESTATION_EXPECTED = e1dbafe495560eaf9e7f774505ec472759bbcdef3fd0fd24fb267d96784a3027
F4P1_ATTESTATION_RECOMPUTED = e1dbafe495560eaf9e7f774505ec472759bbcdef3fd0fd24fb267d96784a3027
F4P1_ATTESTATION_MATCH = yes
ALL_G2_RUNTIME_LOCKS_MATCH = yes
ALL_G2_TEST_LOCKS_MATCH = yes
ALL_F4P1_DIAGNOSTIC_RUNTIME_LOCKS_MATCH = yes
ALL_F4P1_DIAGNOSTIC_TEST_LOCKS_MATCH = yes
F4R1_PRE_LIVE_GATE = PASS
F4R1_READ_COMMAND_SURFACE_MATCH = yes
F4R1_READ_ARGV_MATCH = yes
```

The six G2R1 lock hashes and the F4P1 helper/test hashes matched their locked
values. The 11 local authority-audit test modules passed before the live read.

## Single-read result

```text
REAL_GCLOUD_EXECUTIONS = 1/1
WRITER_SA_IAM_POLICY_READS = 1/1
WRITER_SA_IAM_POLICY_READ_RETRIES = 0
PROJECT_IAM_POLICY_READS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
ROLE_METADATA_READS = 0
TEST_IAM_PERMISSIONS_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
SERVICE_ACCOUNT_KEY_CALLS = 0

F4R1_PROCESS_STARTED = yes
F4R1_EXIT_CODE = 0
F4R1_TIMED_OUT = no
F4R1_PARSE_STATUS = PASS
F4R1_DIAGNOSTIC_RESULT = AMBIGUOUS
```

The exact existing OP-C command builder and Windows process adapter were used.
The adapter completed with exit code `0`; it does not expose a separate
started boolean, so that field is not inferred from an unavailable property.

## Bounded diagnostics

Only the F4P1-approved metadata and projection were retained:

```json
{
  "stdoutByteCount": 24,
  "stdoutCharCount": 24,
  "stdoutLineCount": 4,
  "stdoutEmpty": false,
  "utf8BomPresent": false,
  "leadingWhitespacePresent": false,
  "trailingWhitespacePresent": true,
  "topLevelFirstTokenClass": "OBJECT_START"
}
```

```json
{
  "policyVersion": "UNRESOLVED",
  "etagPresent": true,
  "conditionalBindingCount": 0,
  "targetRoleBindingCount": 0,
  "targetMemberPresent": "UNRESOLVED"
}
```

```text
OP_E_POLICY_STRUCTURE_COMPATIBILITY = AMBIGUOUS
POLICY_STRUCTURE_ROOT_CAUSE = UNRESOLVED
ROOT_CAUSE = ROOT_CAUSE_STILL_NOT_PROVEN
ROOT_CAUSE_CONFIDENCE = INSUFFICIENT
```

The parser succeeded, but F4R1 does not perform active caller discovery or
member identity evaluation. The unresolved policy version and target-member
field therefore cannot support a compatible/incompatible conclusion.

## Privacy and evidence

```text
FULL_POLICY_PERSISTED = no
RAW_STDOUT_PERSISTED = no
RAW_STDERR_PERSISTED = no
IAM_MEMBER_IDENTITIES_PERSISTED = 0
ETAG_VALUE_PERSISTED = no
CONDITION_EXPRESSIONS_PERSISTED = no
MUTATION_AS_DIAGNOSTIC = forbidden
```

The deterministic bounded evidence payload contains only the project label,
logical writer identity, locked attestation hashes, safe process fields,
parser metadata, bounded structure, and classification. It contains no raw
policy, stream content, member identity, etag value, condition expression,
token, credential, or personal absolute path.

```text
M3_F4R1_BOUNDED_POLICY_STRUCTURE_EVIDENCE_SHA256 = b330191e4f2f6c77ec0775660d3670e6e355a4bd48587367ad80014a49437186
SECOND_F4R1_EVIDENCE_SHA256 = b330191e4f2f6c77ec0775660d3670e6e355a4bd48587367ad80014a49437186
F4R1_EVIDENCE_REPRODUCIBLE = yes
```

## Carry-forward status

```text
F4R1_IS_FINAL_M3_LIVE_COMPOSITE = no
FINAL_M3_LIVE_COMPOSITE_CREATED = no
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M3L1_MUTATION_BUDGET = EXHAUSTED
M3L1_APPROVAL_REUSABLE = no
OLD_M3_RETRY_ALLOWED = no
M4_APPROVAL = NOT_GRANTED
W1D_STATUS = BLOCKED_PENDING_M3_SUCCESS
FUNCTIONS_TEST_EXECUTION_STATUS = ENVIRONMENT_BLOCKED_BY_SPAWN_EPERM
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

Recommended next action is local-only RG2 retry-readiness and a new final
composite relock. No automatic F4R2 read is authorized.

## Validation

```text
F4P1_LOCAL_TEST = PASS
G2R1_RELATED_TESTS = PASS
AUTHORITY_AUDIT_TEST_MODULES = 11 passed, 0 failed
GIT_DIFF_CHECK = PASS with pre-existing CRLF warnings only
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

No existing files were modified by F4R1; this result document is the only new
file for this execution.
