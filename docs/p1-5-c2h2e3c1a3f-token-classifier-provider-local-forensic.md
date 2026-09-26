# P1.5-C2H2E3C1A3F Token Classifier / Provider Local Forensic

## Verdict

`P1_5_C2H2E3C1A3F_EVIDENCE_INSUFFICIENT`

This investigation was local and synthetic only. No real gcloud command,
active-caller discovery, token generation, impersonation, Firestore request,
IAM operation, or production access was performed.

## Historical Evidence

The retained C1A3 result establishes:

- Historical verdict: `P1_5_C2H2E3C1A3_STATE_READ_INCONCLUSIVE`
- Active caller discovery calls: `1`
- Active caller count: `1`
- Active caller fingerprint: `sha256/12:5e6692dda08c`
- Access-token calls: `1`
- Token accepted for HTTP use: `0`
- GetDocument requests: `0`
- Retry count: `0`
- Firestore reads/writes: `0/0`
- IAM mutations: `0`

The result document does not retain the process exit code, timeout state,
stdout/stderr presence or lengths, line counts, whitespace shape, stderr
classification reason, or provider process metadata. Therefore the precise
historical rejection reason cannot be reconstructed without guessing.

Safe historical metadata:

```text
PROCESS_EXIT_CODE = unknown
PROCESS_TIMED_OUT = unknown
STDOUT_PRESENT = unknown
STDOUT_CHAR_COUNT = unknown
STDOUT_LINE_COUNT = unknown
STDOUT_LEADING_TRAILING_WHITESPACE_PRESENT = unknown
STDERR_PRESENT = unknown
STDERR_LINE_COUNT = unknown
STDERR_CLASSIFICATION = unknown
TOKEN_CLASSIFIER_RESULT = unknown
TOKEN_PROVIDER_RESULT = rejected-before-HTTP
```

## Code-Path Finding

The path is:

`c1a3ExactClassStateReadCaller`
 -> `createImpersonatedAccessTokenProvider`
 -> `classifyImpersonatedTokenProcessResult`
 -> `runExactClassStateReadOnce`
 -> HTTPS transport.

The provider passes process fields to the classifier and returns either a
safe error object or the classifier token. It has no additional token-content
validation after a classifier success. The exact executor subsequently
accepts only a string token with no whitespace; a provider error object is
rejected before HTTP as `token-provider-rejected`.

## Acceptance Contract

`gcloudTokenOutputClassifier.mjs` requires:

- operation exactly `impersonated-access-token`
- `timedOut === false`
- `exitCode === 0`
- stdout is a single trimmed non-empty line
- token matches `[A-Za-z0-9._~+/=-]{20,}`
- stderr is empty, or exactly the narrowly recognized benign impersonation
  warning format
- unknown stderr, nonzero exit, timeout, malformed/empty/multiline output,
  and extra output fail closed

No generic warning prefix, substring extraction, or nonzero/timeout
acceptance is present.

## Process Normalization Finding

`windowsGcloudProcessAdapter.mjs` captures stdout/stderr in memory as UTF-8
strings and preserves exit status, timeout, signal, and safe spawn metadata.
`invokeWindowsExecutable.ps1` separates native stderr from stdout and keeps
the native exit code. The local code and synthetic tests do not establish
which of these shapes occurred in the historical live attempt because those
metadata values were not retained.

## Classifier / Provider Distinction

```text
FAILURE_STAGE = TOKEN_PROVIDER_REJECTED_BEFORE_HTTP
CLASSIFIER_ACCEPTED = unknown
PROVIDER_ACCEPTED = no
POST_CLASSIFIER_VALIDATION_PRESENT = no (provider); yes (executor string guard)
FORENSIC_EVIDENCE_SUFFICIENT = no
HISTORICAL_FAILURE_SYNTHETICALLY_REPRODUCED = no
ROOT_CAUSE_CONFIRMED = no
ROOT_CAUSE = unknown
NARROW_FIX_REQUIRED = no
NARROW_FIX_IMPLEMENTED = no
OBSERVABILITY_CHANGE_REQUIRED = yes
```

The stage is known only to the boundary before HTTP. The retained evidence
cannot distinguish classifier rejection from a provider-level safe error
without revealing or recreating the real process result.

## Synthetic Validation

The following local tests passed:

- `gcloudTokenOutputClassifier.test.mjs`
- `c1a3ExactClassStateReadCaller.test.mjs`
- `exactClassStateRead.test.mjs`
- `windowsProcessSynthetic.test.mjs` (outside sandbox; sandbox-only run was
  affected by PowerShell process restrictions)

Positive synthetic token flow and negative cases were exercised. Unknown
stderr, nonzero exit, timeout, empty stdout, internal multiline output,
malformed output, and extra output remain fail-closed. The synthetic secret
does not appear in this document or serialized results.

The historical failure was not synthetically reproduced because its safe
structural shape is unavailable.

## Safety and Change Status

- Runtime code changes: `0`
- Caller/executor/target/field-mask changes: `0`
- Real gcloud commands: `0`
- Live active-caller discovery: `0`
- Live token calls: `0`
- Firestore API calls: `0`
- Firestore reads/writes: `0/0`
- IAM mutations: `0`
- Service-account key use/creation: `0/0`
- Manifest persistence: `0`
- Rules/index changes: `0/0`
- Staging/commit/push/deploy: `0/0/0/0`
- C1A3 new retry approval: `NOT_GRANTED`

No acceptance behavior was weakened. A future attempt requires a new
independent approval and should first add only safe structural observability:
exit code, timeout, stdout/stderr presence and lengths, line counts, and
classifier/provider enum reasons. Raw token, raw stdout, authorization
header, caller identity, and process output must remain excluded.

