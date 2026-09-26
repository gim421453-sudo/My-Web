# P1.5-C2H2E3D-W1C-M3L1-F4P1 Bounded Writer-SA IAM Policy Read Contract and Safe Parser

## Verdict

`P1_5_C2H2E3D_W1C_M3L1_F4P1_SAFE_POLICY_READ_PARSER_REDESIGN_PASS_M3_RUNTIME_UNCHANGED`

F4P1 is a local diagnostic-only redesign. It performed zero gcloud, IAM,
Firestore, token, mutation, staging, commit, push, or deploy operations.

## Baseline and chain gates

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0

RG1_VERDICT = P1_5_C2H2E3D_W1C_M3L1_RG1_NOT_READY_F4_DIAGNOSTIC_REDESIGN_REQUIRED
RG1_EVIDENCE_EXPECTED = b5e8982297dbb87d5fb239ca303c5d83c78ec47e3f92e717ac25c295edd7486c
G2R1_REATTESTATION_EXPECTED = 112fa8c65d69707cad24107c0c181baf44d62ad6a1760c014b9e460ea62909ba
F4_EVIDENCE_EXPECTED = 15477e03ae33798c7f8588d2fa4db529b1e97c31c7c3a8f16241f0d86c7b1904
```

The RG1 and G2R1 gates remained unchanged. The historical F4 raw output was
not recovered.

## Diagnostic path and runtime separation

```text
F4_DIAGNOSTIC_PATH = [
  buildF4R1WriterPolicyReadRequest,
  existing buildWriterPolicyReadCommand,
  existing runWindowsProcess adapter,
  stdout-only strict parser,
  bounded F3 structure projection,
  separate compatibility classifier
]
F4_DIAGNOSTIC_HELPER_PRODUCTION_M3_DEPENDENCY = no
PRODUCTION_M3_RUNTIME_CHANGED = 0
G2R1_M3_RUNTIME_ATTESTATION_IMPACT = NONE
E1_E3R1_EXTERNAL_CAPABILITY_IMPACT = NONE
```

The new helper imports the existing command builder but the M3 runtime does not
import the helper. `m3RuntimeCommandGraph.mjs`, OP-C_PRE/POST, OP-E, graph
semantics, and concurrency behavior were not modified.

```text
OP_C_PRE_ARGV_CHANGED = no
OP_C_POST_ARGV_CHANGED = no
OP_E_ARGV_CHANGED = no
M3_GRAPH_CHANGED = no
M3_MUTATION_SEMANTICS_CHANGED = no
IAM_CONCURRENCY_IMPLEMENTATION_CHANGED = no
M3_MUTATION_MAX = 1
M3_RETRY_MAX = 0
```

## Proven output contract

The path-bound Cloud SDK source documents `--format=json` as an editable IAM
Policy JSON object. The policy object may contain `version`, `etag`, and
`bindings`; a binding has a role, members, and an optional condition. Empty
repeated fields may be omitted, so missing `bindings` is treated as an empty
set. Missing `version` remains unresolved; no default is invented.

```text
F4_COMMAND_OUTPUT_CONTRACT = MATCH
SDK_EXPECTED_STDOUT_ENCODING = UTF-8 decoded string from existing adapter
SDK_EXPECTED_JSON_TOP_LEVEL_TYPE = OBJECT
SDK_EXPECTED_POLICY_FIELD_SET = [version, etag, bindings]
SDK_OPTIONAL_POLICY_FIELDS = [version, etag, bindings, binding.condition]
SDK_OUTPUT_WRAPPER = no
SDK_OUTPUT_WRAPPER_SHAPE = none
PROCESS_STDOUT_TYPE = string
PROCESS_STDOUT_ENCODING = UTF-8 via adapter spawnSync encoding
PROCESS_STDOUT_NORMALIZATION_CURRENT = adapter preserves text; parser applies only explicit allowlist
STDOUT_STDERR_MERGED = no
```

## Strict parser contract

Implemented in [f4WriterPolicyStructureDiagnostic.mjs](../tools/authority-audit/f4WriterPolicyStructureDiagnostic.mjs).

```text
F4R1_ALLOWED_PRE_PARSE_NORMALIZATIONS = [
  UTF8_BOM_REMOVAL,
  OUTER_UNICODE_WHITESPACE_TRIM
]
```

CRLF/LF is left unchanged because JSON parsing already treats those characters
as whitespace. Arbitrary prefix/suffix extraction, warning stripping,
malformed JSON repair, and first/last-brace scraping are rejected.

The parser validates input type, rejects empty/whitespace-only output, calls
`JSON.parse` once, rejects arrays and other top-level shapes, validates only
needed policy/binding field types, and returns no source object or exception
message.

```text
F4R1_SAFE_PREPARSE_DIAGNOSTIC_FIELDS = [
  stdoutByteCount,
  stdoutCharCount,
  stdoutLineCount,
  stdoutEmpty,
  utf8BomPresent,
  leadingWhitespacePresent,
  trailingWhitespacePresent,
  topLevelFirstTokenClass
]

F4R1_POLICY_STRUCTURE_OUTPUT_FIELDS = [
  policyVersion,
  etagPresent,
  conditionalBindingCount,
  targetRoleBindingCount,
  targetMemberPresent
]
```

`targetMemberPresent` is intentionally `UNRESOLVED` in the parser because
caller discovery and member identity output are outside F4R1. The compatibility
classifier is separate from parsing and returns `AMBIGUOUS` when that required
bounded predicate remains unresolved.

## Privacy and failure behavior

```text
RAW_STDOUT_HASH_PERSISTED = no
RAW_STDOUT_PREFIX_PERSISTED = no
RAW_STDOUT_SUFFIX_PERSISTED = no
RAW_JSON_PARSE_ERROR_MESSAGE_PERSISTED = no
WHOLE_POLICY_OBJECT_SERIALIZED = no
WHOLE_BINDING_OBJECT_SERIALIZED = no
MEMBER_ARRAY_SERIALIZED = no
CONDITION_OBJECT_SERIALIZED = no
PARSER_AND_COMPATIBILITY_CLASSIFIER_SEPARATE = yes
```

Rejected input returns only a bounded parse status and safe metadata:
`INVALID_INPUT`, `EMPTY_STDOUT`, `JSON_SYNTAX_FAILURE`,
`UNEXPECTED_TOP_LEVEL_SHAPE`, or `MALFORMED_POLICY_FIELDS`. Unknown prefixes,
suffix garbage, malformed bindings, and secret-bearing fixtures fail closed.

## F4R1 one-shot design, not approval

```text
WRITER_SA_IAM_POLICY_READ_MAX = 1
REAL_GCLOUD_EXECUTIONS_MAX = 1
RETRY_MAX = 0
PROJECT_IAM_READ_MAX = 0
ACTIVE_CALLER_DISCOVERY_MAX = 0
TEST_IAM_PERMISSIONS_MAX = 0
IAM_MUTATION_MAX = 0
M3_MUTATION_MAX = 0
M4_MUTATION_MAX = 0
TOKEN_MAX = 0
FIRESTORE_MAX = 0
```

Future F4R1 must revalidate G2R1, F4P1 locks, exact OP-C argv, and the unused
one-read budget before executing exactly one read. It must parse stdout
immediately, project the bounded structure, discard source content, classify,
and stop. F4R1 approval is not granted here.

## F4P1 locks and deterministic attestation

```text
F4P1_DIAGNOSTIC_RUNTIME_LOCKS = [
  tools/authority-audit/f4WriterPolicyStructureDiagnostic.mjs:
  acb29ef25c078abf90e7302cd1389082aa23a6f4410c915d95c7c55333fe2f01
]
F4P1_DIAGNOSTIC_TEST_LOCKS = [
  tools/authority-audit-tests/f4WriterPolicyStructureDiagnostic.test.mjs:
  90d6d8b26c877344cd0526fa17684e7bf7826af3b36a22dbfd700a9c7df7d705
]
```

The canonical local payload binds RG1, G2R1, and F4 evidence hashes, the two
F4P1 locks, the exact read command contract, parser normalization/output
fields, privacy invariants, and F4R1 budgets. It has no timestamp, production
policy data, raw output, member, etag, condition, caller, token, credential, or
personal absolute path.

```text
M3_F4P1_DIAGNOSTIC_READ_CONTRACT_ATTESTATION_SHA256 = e1dbafe495560eaf9e7f774505ec472759bbcdef3fd0fd24fb267d96784a3027
F4P1_ATTESTATION_REPRODUCIBLE = yes
```

## Verification

```text
FOCUSED_TEST_COUNT = 11 authority-audit test modules
FOCUSED_TEST_RESULT = PASS
F4P1_LOCAL_PARSER_TEST = PASS
NODE_CHECK = PASS
TYPECHECK = PASS
NPM_BUILD = BLOCKED_BY_EXISTING_SANDBOX_SPAWN_EPERM
EXTERNAL_VITE_BUILD = PASS
GIT_DIFF_CHECK = PASS with pre-existing CRLF warnings only
F4P1_REAL_GCLOUD_EXECUTIONS = 0
F4P1_LIVE_IAM_READS = 0
```

The tests cover strict JSON parsing, BOM/whitespace handling, CRLF, empty and
non-JSON output, arrays, malformed bindings, optional fields, version/etag/
condition/target-role structure, prefix/suffix rejection, privacy, safe error
metadata, exact command reuse, and zero mutation budget.

## Final status

```text
F4P1_IS_FINAL_M3_LIVE_COMPOSITE = no
FINAL_M3_LIVE_COMPOSITE_CREATED = no
F4R1_LIVE_READ_APPROVAL = NOT_GRANTED
M3L1_MUTATION_BUDGET = EXHAUSTED
NEW_M3_LIVE_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

Recommended next action:
`P1.5-C2H2E3D-W1C-M3L1-F4R1_NEW_BOUNDED_EXACT_WRITER_SA_IAM_POLICY_STRUCTURE_SINGLE_READ`.

This document does not authorize that read. No application code, Rules,
Indexes, Firebase data, IAM state, or M3 mutation runtime was changed.
