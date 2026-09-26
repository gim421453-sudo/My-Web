# P1.5-C2H2E3C1A3G Safe Observability Final Execution Relock

## Verdict

`P1_5_C2H2E3C1A3G_FINAL_RELOCK_LIVE_APPROVAL_GATE_PASS`

This is a local final relock and approval-gate preparation only. No C1A4
live execution is approved or performed.

## Required Values

```text
C1A3F1_VERDICT = P1_5_C2H2E3C1A3F1_SAFE_TOKEN_OBSERVABILITY_PASS
PREVIOUS_C1A2G_R_LOCK_STATUS = INVALIDATED_BY_C1A3F1
FUTURE_LIVE_ENTRYPOINT = tools/authority-audit/c1a3ExactClassStateReadCaller.mjs
SAFE_OBSERVABILITY_IN_GRAPH = yes
CLASSIFIER_PROVIDER_AMBIGUITY_RESOLVED = yes
TOKEN_ACCEPTANCE_BEHAVIOR_CHANGED = no
PREVIOUSLY_ACCEPTED_FIXTURES_STILL_ACCEPTED = yes
PREVIOUSLY_REJECTED_FIXTURES_STILL_REJECTED = yes
EXACT_EXECUTOR_C1A3F1_CHANGE_CLASSIFICATION = SAFE_RESULT_PROPAGATION
WRITE_CAPABILITY = none
QUERY_CAPABILITY = none
LIST_CAPABILITY = none
TARGET_RESOURCE_GUARD = PASS
FIELD_MASK_GUARD = PASS
TOKEN_CALL_MAX_ENFORCED = yes
TOKEN_FAILURE_PREVENTS_HTTP = yes
HTTP_CALL_MAX_ENFORCED = yes
RETRY_ZERO_ENFORCED = yes
AUTO_REDIRECT_DISABLED = yes
MAX_RESPONSE_BYTES = 65536
HTTP_TIMEOUT_MS = 10000
TOKEN_RETURNED = no (public result)
TOKEN_LOGGED = no
TOKEN_PERSISTED = no
RAW_STDOUT_EXPOSED = no
RAW_STDERR_EXPOSED = no
RAW_CALLER_EXPOSED = no
ABSENT_CLASSIFICATION = PASS
PRESENT_EQUIVALENT_CLASSIFICATION = PASS
PRESENT_CONFLICT_CLASSIFICATION = PASS
PRESENT_SCHEMA_REVIEW_CLASSIFICATION = PASS
HTTP_ERROR_MATRIX = PASS
```

## Runtime Graph

```text
c1a3ExactClassStateReadCaller.mjs
  -> static contract validation / active caller gate
  -> windowsGcloudProcessAdapter.mjs
       -> invokeWindowsExecutable.ps1
       -> local gcloud.cmd (future external executable)
  -> gcloudTokenOutputClassifier.mjs
  -> safe token pipeline diagnostic
  -> exactClassStateRead.mjs
       -> node:https
```

Required graph links are all present:

```text
ACTIVE_CALLER_GATE_IN_GRAPH = yes
TOKEN_GENERATOR_IN_GRAPH = yes
WINDOWS_ADAPTER_IN_GRAPH = yes
POWERSHELL_RUNNER_IN_GRAPH = yes
TOKEN_CLASSIFIER_IN_GRAPH = yes
SAFE_OBSERVABILITY_IN_GRAPH = yes
EXACT_STATE_EXECUTOR_IN_GRAPH = yes
HTTPS_TRANSPORT_IN_GRAPH = yes
```

Runtime-loaded local dependencies:

```text
tools/authority-audit/c1a3ExactClassStateReadCaller.mjs
tools/authority-audit/gcloudTokenOutputClassifier.mjs
tools/authority-audit/windowsGcloudProcessAdapter.mjs
tools/authority-audit/invokeWindowsExecutable.ps1
tools/authority-audit/exactClassStateRead.mjs
```

Node built-ins and the external gcloud executable are not repository hash
inputs. No local schema helper is imported by this ESM runtime.

## Safe Diagnostic and Contract Recheck

Diagnostic schema:

```text
processStarted, exitCode, timedOut
stdoutPresent, stdoutCharCount, stdoutLineCount
stdoutLeadingWhitespace, stdoutTrailingWhitespace, stdoutTerminalNewlineKind
stderrPresent, stderrCharCount, stderrLineCount, stderrClassification
classifierAccepted, classifierReason
providerAccepted, providerReason
```

No `token`, `accessToken`, `authorization`, `authorizationHeader`,
`rawStdout`, `rawStderr`, or `rawCallerIdentity` field exists in the safe
diagnostic. Structural counts and bounded enums are used only.

The exact executor remains one-document `GET` only with no write, query, list,
batch-get, collection-list, fallback, or retry capability. C1A3F1 changes to
it are `SAFE_RESULT_PROPAGATION` only. Target path, field mask, response
classification, redirects, timeout, response bound, and write behavior are
unchanged.

```text
HTTP_METHOD = GET
GETDOCUMENT_MAX = 1
QUERY = 0
BATCHGET = 0
LIST = 0
OTHER_DOCUMENT_READ = 0
RETRY_MAX = 0
MAX_RESPONSE_BYTES = 65536
HTTP_TIMEOUT_MS = 10000
```

## Identity and Future Order

- Project: `my-management-app-8a933`
- Project number: `607154464656`
- Database: `(default)`
- Workspace: `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`
- Class: `class_2026_g2_c5`
- Plan: `2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1`
- Source fingerprint: `sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da`
- Active caller fingerprint: `sha256/12:5e6692dda08c`
- Field mask: exactly the approved 12 fields

Future C1A4 order is locked as: final hash verification, static identity and
field mask, active caller gate, token generation, safe diagnostic, then one
exact GetDocument only after provider acceptance. Static drift and caller
mismatch stop before token; token rejection stops before HTTP.

## Synthetic Verification

Passed:

- caller/provider, classifier, exact executor, and Windows process synthetic tests
- valid empty-stderr and benign-warning acceptance
- unknown stderr, nonzero, timeout, empty, malformed, and multiline rejection
- LF/CRLF structural observation without acceptance changes
- token-to-HTTP success and 404 flows with one token/one HTTP/retry zero
- rejection flows with HTTP zero
- absent, equivalent, conflict, schema-review, HTTP error, redirect, and timeout matrices
- raw token sentinel and caller privacy checks

```text
PREVIOUSLY_ACCEPTED_FIXTURES_STILL_ACCEPTED = yes
PREVIOUSLY_REJECTED_FIXTURES_STILL_REJECTED = yes
TOKEN_FAILURE_PREVENTS_HTTP = yes
FOCUSED_TEST_COUNT = 4 executed + 1 prior host evidence
FOCUSED_TEST_RESULT = PASS
REGRESSION_RESULT = PASS
```

The adapter host test was not rerun in C1A3G because its `gcloud --version`
invocation is prohibited by the no-real-gcloud gate. C1A1R host evidence,
unchanged adapter hash, and Windows stderr synthetic validation remain valid.

## Final Runtime Locks

```text
tools/authority-audit/gcloudTokenOutputClassifier.mjs df5f750c7016be31a1b37bc5443fd446743938c4df4d2ce4c95d4bcc011faaf7
tools/authority-audit/windowsGcloudProcessAdapter.mjs 512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
tools/authority-audit/exactClassStateRead.mjs 7d41db4a70fde42cdb90b849c9adb556fb8c3ceafb9a80e8020b109de5530776
tools/authority-audit/c1a3ExactClassStateReadCaller.mjs 4b24f8a10df98db85958f9e134e907ccea14b9758c1b288b98c2f7a026903a80
tools/authority-audit/invokeWindowsExecutable.ps1 2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5
```

```text
C1A3F1_PROVISIONAL_VS_C1A3G_FINAL_MATCH = yes
PREVIOUS_C1A2G_R_RUNTIME_LOCK_STATUS = INVALIDATED_BY_C1A3F1
```

Test locks:

```text
gcloudTokenOutputClassifier.test.mjs d00664c73c3c8bf49c54b0b947f60a8d6fce6136f2ad91e0e568a53d001c5eac
c1a3ExactClassStateReadCaller.test.mjs 7e3be887f4b5b657e71f7808cdd5ef3e4740d0258bad6e75d59a2188fa5c55ae
exactClassStateRead.test.mjs 91eafa746e9a2f9c7e5ce62a29e4c6f706c2e469e2bc5c3444fa704349b8d54c
windowsProcessSynthetic.test.mjs d2f4419bc7438f03c220c0b8e00cc835c1a3f2fa74f7a973990eb2211dc4b21a
windowsGcloudProcessAdapter.test.mjs 966d2dad7e8375fa9dac3fec0656bc2a9422dc066afd1ad10631ec72174c2be5
```

## Safety and New Approval Gate

```text
REAL_GCLOUD_COMMANDS = 0
LIVE_ACTIVE_CALLER_DISCOVERY_CALLS = 0
LIVE_GCLOUD_AUTH_CALLS = 0
LIVE_IMPERSONATION_CALLS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
IAM_MUTATIONS = 0
SERVICE_ACCOUNT_KEY_USE = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
ORIGINAL_C1A_BUDGET = EXHAUSTED
C1A3_BUDGET = EXHAUSTED
NEW_C1A4_ACTIVE_CALLER_DISCOVERY_MAX = 1
NEW_C1A4_ACCESS_TOKEN_MAX = 1
NEW_C1A4_GETDOCUMENT_MAX = 1
NEW_C1A4_RETRY_MAX = 0
NEW_C1A4_WRITE_MAX = 0
C1A4_LIVE_APPROVAL = NOT_GRANTED
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
```

Prepared wording, not approval:

```text
P1.5-C2H2E3C1A4 Safe-Observability Exact Real Class Production State Single Read 실행을 승인합니다.

새 C1A4 범위는 active caller discovery 최대 1회, caller count 1과
fingerprint sha256/12:5e6692dda08c 확인, 새 short-lived token 최대 1회,
정확한 GetDocument 최대 1회, retry/query/list/다른 문서 read 0회,
Firestore/IAM/canonical/manifest write 0회로 제한합니다.

대상 workspace는 owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1, class는
class_2026_g2_c5이며 승인된 field mask만 사용합니다. token, raw
stdout/stderr, Authorization header, caller 원문은 저장·로그하지 않습니다.
결과는 bounded safe result로만 보고하고 즉시 중단합니다.
```

`C1A4_LIVE_APPROVAL = NOT_GRANTED`.

