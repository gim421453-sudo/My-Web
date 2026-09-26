# P1.5-C2H2E3C1A3F1 Token Pipeline Safe Observability

## Verdicts

Historical incident verdict:

`P1_5_C2H2E3C1A3F_EVIDENCE_INSUFFICIENT`

Implementation verdict:

`P1_5_C2H2E3C1A3F1_SAFE_TOKEN_OBSERVABILITY_PASS`

This is local implementation and synthetic validation only. No real token,
live caller discovery, impersonation, Firestore, IAM, or production access
was performed.

## Observability Boundary

Before this change, process metadata existed at the Windows process adapter
and reached `createImpersonatedAccessTokenProvider`, but the provider reduced
classifier failure to `{ ok: false, code }`. The exact executor then retained
only `token-provider-rejected`, so exit code, timeout, stdout/stderr shape,
classifier reason, and provider reason were lost.

```text
PROCESS_RESULT_METADATA_AVAILABLE_AT_SOURCE =
windowsGcloudProcessAdapter -> token provider -> classifier

PROCESS_RESULT_METADATA_LOST_BEFORE_RESULT =
provider safe error -> exactClassStateRead bounded result
```

The narrow implementation now carries only bounded structural metadata and
enum reasons through the classifier/provider/executor boundary. Raw stdout,
stderr, token, authorization header, and caller identity are never included.

## Acceptance Contract

`TOKEN_ACCEPTANCE_BEHAVIOR_CHANGED = no`.

Existing behavior remains unchanged:

- exit code must be `0`
- timeout fails
- stdout must remain one trimmed token-shaped line
- token regex remains `[A-Za-z0-9._~+/=-]{20,}`
- stderr must be empty or the exact existing benign impersonation warning
- unknown stderr, nonzero exit, timeout, empty/malformed/multiline output fail

No warning broadening, fallback parsing, substring extraction, or token
normalization was added.

## Safe Diagnostic Schema

```text
processStarted
exitCode
timedOut
stdoutPresent
stdoutCharCount
stdoutLineCount
stdoutLeadingWhitespace
stdoutTrailingWhitespace
stdoutTerminalNewlineKind
stderrPresent
stderrCharCount
stderrLineCount
stderrClassification
classifierAccepted
classifierReason
providerAccepted
providerReason
```

`stderrClassification` is limited to safe enum values such as `EMPTY`,
`KNOWN_BENIGN_IMPERSONATION_WARNING`, and `UNKNOWN`. Classifier reasons are
bounded values including `ACCEPTED`, `KNOWN_WARNING_ACCEPTED`,
`NONZERO_EXIT`, `TIMED_OUT`, `EMPTY_STDOUT`, `MULTILINE_STDOUT`,
`MALFORMED_TOKEN`, and `UNKNOWN_STDERR`. Provider reasons distinguish
`ACCEPTED` from `CLASSIFIER_REJECTED`.

```text
PROCESS_EXIT_CODE_OBSERVABLE = yes
PROCESS_TIMEOUT_OBSERVABLE = yes
STDOUT_PRESENT_OBSERVABLE = yes
STDOUT_CHAR_COUNT_OBSERVABLE = yes
STDOUT_LINE_COUNT_OBSERVABLE = yes
STDOUT_TERMINAL_NEWLINE_KIND_OBSERVABLE = yes
STDERR_PRESENT_OBSERVABLE = yes
STDERR_CHAR_COUNT_OBSERVABLE = yes
STDERR_LINE_COUNT_OBSERVABLE = yes
STDERR_CLASSIFICATION_OBSERVABLE = yes
CLASSIFIER_ACCEPTED_OBSERVABLE = yes
CLASSIFIER_REASON_OBSERVABLE = yes
PROVIDER_ACCEPTED_OBSERVABLE = yes
PROVIDER_REASON_OBSERVABLE = yes
```

The exact executor remains read-only and exposes no query, list, or write
capability. It now forwards the safe diagnostic only; it does not forward
the token itself.

## Synthetic Coverage

Passed locally:

- exit `0`, empty stderr, valid fake token: classifier/provider accepted
- known benign warning: accepted with enum classification
- unknown stderr: rejected, HTTP `0`
- nonzero exit: rejected, HTTP `0`
- timeout: rejected, HTTP `0`
- empty stdout: rejected with `EMPTY_STDOUT`
- malformed token: rejected with `MALFORMED_TOKEN`
- multiline output: rejected with `MULTILINE_STDOUT`
- LF and CRLF terminal framing: observed without normalization changes
- synthetic token-to-HTTP path: token call `1`, HTTP call `1`, retry `0`
- all rejection fixtures: HTTP call `0`
- raw token sentinel absent from diagnostic/result serialization
- caller privacy regression: PASS
- Windows process stderr separation: PASS

```text
PREVIOUSLY_ACCEPTED_FIXTURES_STILL_ACCEPTED = yes
PREVIOUSLY_REJECTED_FIXTURES_STILL_REJECTED = yes
NEGATIVE_FAIL_CLOSED_MATRIX = PASS
TOKEN_PRIVACY = PASS
```

There is no provider post-classifier rejection branch in the current provider.
The executor has only the existing safe string/whitespace guard for the
internal token value.

## Runtime Changes and Locks

Changed runtime files:

```text
tools/authority-audit/gcloudTokenOutputClassifier.mjs
tools/authority-audit/c1a3ExactClassStateReadCaller.mjs
tools/authority-audit/exactClassStateRead.mjs
```

Unchanged graph files:

```text
tools/authority-audit/windowsGcloudProcessAdapter.mjs
tools/authority-audit/invokeWindowsExecutable.ps1
```

New provisional runtime locks:

```text
df5f750c7016be31a1b37bc5443fd446743938c4df4d2ce4c95d4bcc011faaf7  tools/authority-audit/gcloudTokenOutputClassifier.mjs
512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f  tools/authority-audit/windowsGcloudProcessAdapter.mjs
7d41db4a70fde42cdb90b849c9adb556fb8c3ceafb9a80e8020b109de5530776  tools/authority-audit/exactClassStateRead.mjs
4b24f8a10df98db85958f9e134e907ccea14b9758c1b288b98c2f7a026903a80  tools/authority-audit/c1a3ExactClassStateReadCaller.mjs
2a7d2e0c9847005e31b2806e11a0a2bde5663f81754c924b79524c42dd006ad5  tools/authority-audit/invokeWindowsExecutable.ps1
```

The C1A2G-R runtime lock status is:

`PREVIOUS_C1A2G_R_RUNTIME_LOCK_STATUS = INVALIDATED_BY_C1A3F1`

These are provisional only. A new final re-lock and independent live approval
are required before any future real attempt.

## Safety Counters

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
IAM_LIVE_READS = 0
IAM_MUTATIONS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
C1A3_NEW_RETRY_APPROVAL = NOT_GRANTED
```

Historical root cause remains unconfirmed:

`HISTORICAL_ROOT_CAUSE_CONFIRMED = no`

Recommended next action:

`P1.5-C2H2E3C1A3G SAFE-OBSERVABILITY CORRECTED FINAL EXECUTION RELOCK + NEW LIVE ATTEMPT APPROVAL GATE`
