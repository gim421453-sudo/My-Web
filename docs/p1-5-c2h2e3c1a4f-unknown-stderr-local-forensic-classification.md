# P1.5-C2H2E3C1A4F Unknown Stderr Local Forensic

## Verdict

`P1_5_C2H2E3C1A4F_SAFE_STDERR_OBSERVABILITY_ENRICHMENT_PASS`

Local and synthetic investigation only. No real gcloud command, active
caller discovery, token, impersonation, Firestore, IAM, or production access
was performed in this step.

## Historical C1A4 Evidence

```text
C1A4_HISTORICAL_VERDICT = P1_5_C2H2E3C1A4_TOKEN_PIPELINE_REJECTED
C1A4_HISTORICAL_BUDGET = EXHAUSTED
C1A4_PROCESS_EXIT_CODE = 0
C1A4_PROCESS_TIMED_OUT = false
C1A4_STDOUT_CHAR_COUNT = 1026
C1A4_STDOUT_LINE_COUNT = 2
C1A4_STDOUT_NEWLINE_KIND = CRLF
C1A4_STDERR_CHAR_COUNT = 287
C1A4_STDERR_LINE_COUNT = 3
C1A4_STDERR_CLASSIFICATION = UNKNOWN
```

The original stderr text was not retained in the C1A4 result. Existing local
gcloud logs were inventoried in memory only, but no file could be uniquely
correlated to the C1A4 execution because its timestamp and command log
identity were not persisted. Some unrelated local logs contain token-like
material; none of it was copied, printed, fingerprinted, or persisted.

```text
MATCHING_EXISTING_GCLOUD_LOG_FOUND = no
MATCH_CONFIDENCE = NONE
HISTORICAL_STDERR_TEXT_RECOVERED = no
HISTORICAL_STDERR_SAFE_TO_SANITIZE = no
FORENSIC_EVIDENCE_SUFFICIENT = no
```

## Current Classifier Findings

The current matcher is a whole-buffer anchored regular expression, not a
line-by-line allowlist. It accepts the exact two semantic-line warning shape
with surrounding whitespace. A three-line structural value can still be
accepted when the third line is only terminal blank framing, because the
allowlist permits trailing whitespace. A third nonblank or variant line is
`UNKNOWN_STDERR`.

```text
STDERR_CLASSIFIER_MATCH_STRATEGY = whole-buffer anchored regex
KNOWN_BENIGN_WARNING_VARIANTS = one explicit impersonation-warning pattern
CURRENT_CLASSIFIER_CAN_ACCEPT_3_LINE_BENIGN_STDERR = yes (terminal blank line only)
```

The observed stdout shape is independently acceptable when it is one valid
token followed by one terminal CRLF: `trim()` removes the framing before the
single-token check. It is not acceptable when the second line contains extra
content.

```text
CURRENT_TOKEN_PARSER_ACCEPTS_OBSERVED_STDOUT_STRUCTURE = yes (token + terminal CRLF)
SECONDARY_STDOUT_SHAPE_ISSUE = absent for terminal-only CRLF; unresolved for unknown content
```

Classifier evaluation order is:

```text
operation check
timeout check
exit-code check
stdout trim and token-shape validation
stderr whole-buffer classification
success/rejection result
```

The current C1A4 rejection therefore proves only that stderr did not match
the allowlist after earlier checks passed. It does not prove whether the
stderr was benign, variant, or an actual error.

## Synthetic Reproduction

A fake token with the observed 1026-character, two-line CRLF structure and a
three-line non-allowlisted stderr shape reproduced:

```text
classifierAccepted = no
classifierReason = UNKNOWN_STDERR
providerAccepted = no
HTTP calls = 0
```

A fake token plus the exact allowlisted two-line warning and terminal CRLF
produced `KNOWN_BENIGN_IMPERSONATION_WARNING` and classifier acceptance. This
demonstrates the structural branch but does not uniquely identify the
historical stderr semantics.

```text
HISTORICAL_C1A4_REJECTION_SYNTHETICALLY_REPRODUCED = yes (structural only)
ROOT_CAUSE_CONFIRMED = no
ROOT_CAUSE = historical stderr semantic is not recoverable
```

## Safe Enrichment Implemented

The classifier now adds only per-line safe metadata:

```text
stderrLines[]:
  index
  charCount
  isBlank
  prefixCategory = EMPTY | WARNING | ERROR | INFO | OTHER
  semanticCategory = IMPERSONATION_NOTICE | CREDENTIAL_NOTICE |
                     SDK_CONFIGURATION_NOTICE | UNKNOWN
```

No line text, token-derived value, authorization data, caller identity, or
one-way fingerprint was added. Acceptance behavior remains unchanged.

```text
CLASSIFIER_FIX_REQUIRED = no
CLASSIFIER_FIX_IMPLEMENTED = no
SAFE_STDERR_OBSERVABILITY_ENRICHMENT_REQUIRED = yes
SAFE_STDERR_OBSERVABILITY_ENRICHMENT_IMPLEMENTED = yes
SAFE_STDERR_NORMALIZED_FINGERPRINTING_REQUIRED = no
TOKEN_ACCEPTANCE_BEHAVIOR_CHANGED = no
NEGATIVE_FAIL_CLOSED_MATRIX = PASS
TOKEN_PRIVACY = PASS
```

## Tests and Lock Consequence

Passed locally:

- token classifier tests, including benign/unknown/nonzero/timeout/empty/
  malformed/multiline/LF/CRLF cases
- caller/provider regression tests
- exact executor regression tests
- Windows process synthetic stderr separation test

Changed runtime file:

```text
tools/authority-audit/gcloudTokenOutputClassifier.mjs
```

The C1A3G final runtime lock is now invalidated by this observability change:

`PREVIOUS_C1A3G_RUNTIME_LOCK_STATUS = INVALIDATED_BY_C1A4F`

New live approval remains closed:

```text
LIVE_ACCESS_TOKEN_CALLS = 0
LIVE_FIRESTORE_CALLS = 0
IAM_MUTATIONS = 0
NEW_LIVE_APPROVAL = NOT_GRANTED
```

Next action: perform a fresh final relock for the enriched stderr
observability, then prepare a new live approval gate. Do not broaden the
allowlist or spend another token in this step.

