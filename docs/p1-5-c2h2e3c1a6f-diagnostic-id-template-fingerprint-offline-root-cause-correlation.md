# P1.5-C2H2E3C1A6F Offline Root-Cause Correlation

## Verdict

`P1_5_C2H2E3C1A6F_EVIDENCE_INSUFFICIENT_PAUSE_LIVE_RETRY`

This batch is local forensic and synthetic only. No gcloud command, active
caller discovery, token, impersonation, Firestore, IAM, or production access
was performed.

## Historical C1A6 Evidence

- Historical verdict: `P1_5_C2H2E3C1A6_TOKEN_PIPELINE_REJECTED`
- Historical budget: `EXHAUSTED`
- C1A6 nonblank stderr lines: `2`
- Known impersonation semantic lines: `1`
- Unknown semantic lines: `1`
- Error-like lines: `0`
- Other-prefix lines: `0`
- Unknown line indexes: `[1]`

Safe C1A6 line table:

| Index | Characters | Blank | Prefix | Semantic | Rule IDs | Template | Fingerprint |
|---:|---:|---|---|---|---|---|---|
| 0 | 175 | no | `WARNING` | `IMPERSONATION_NOTICE` | `GCLOUD_IMPERSONATION_NOTICE_V1`, `WARNING_PREFIX_V1` | `UNKNOWN_TEMPLATE` | `sha256:82c4a13928f8c97156430cfec22cebb037268bfcdbe1cc40934cadb75876797f` |
| 1 | 108 | no | `WARNING` | `UNKNOWN` | `WARNING_PREFIX_V1` | `UNKNOWN_TEMPLATE` | `sha256:be248b9641988216f99b92a53f7e8ebee3afb29d586436087567eeafcd8b842e` |
| 2 | 0 | yes | `EMPTY` | `UNKNOWN` | `TERMINAL_BLANK_V1` | `UNKNOWN_TEMPLATE` | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The C1A5 result predates fingerprint recording, so the C1A5-to-C1A6 unknown
fingerprint comparison is `not_comparable`. Repeated fingerprint is not
treated as benign.

## Repository Correlation

- Repository template exact match for unknown line: `no`
- Repository template matches: `[]`
- Repository rule matches: `[WARNING_PREFIX_V1]`
- Unknown template ID: `UNKNOWN_TEMPLATE`
- Unknown matched rule IDs: `[WARNING_PREFIX_V1]`
- Rule classification: `PREFIX_ONLY`
- Security allowlist component match: `partial` for the warning prefix only

The repository's actual security authority remains the exact whole-buffer
impersonation warning matcher. The diagnostic prefix rule is not an
allowlist component and cannot accept the token.

## Local SDK Correlation

The installed local Cloud SDK was inspected by filesystem reads only. The
focused access-token source candidates were the existing three local modules;
the source was not executed or dynamically loaded by runtime code.

- Local SDK fingerprint exact match for C1A6 unknown line: `no`
- Matched local SDK template IDs: `[]`
- Diagnostic impersonation candidate lines in focused source scan: `1`
- Target unknown fingerprint matches: `0`
- Local SDK template catalog used for security acceptance: `no`

No raw SDK warning text is included in this report. The available local source
does not uniquely bind the unknown fingerprint to a reachable approved warning
template.

## Root-Cause Decision

- Unknown line proven to be impersonation continuation: `no`
- Unknown line proven to be distinct warning: `no`
- Unknown line proven error/failure: `no`
- Root cause confirmed: `no`
- Root cause category: `UNKNOWN_FINGERPRINT_NO_CATALOG_MATCH`
- Additional offline evidence available: `yes`, limited to local wrapper/source
  correlation and future synthetic catalog work

Line position, warning prefix, and exit code `0` are insufficient to prove
benignness. The unknown line cannot be safely accepted or classified as an
error from the retained evidence.

## Synthetic Reproduction and Policy

A synthetic stderr composition with one known impersonation component plus one
unknown component reproduces:

```text
classifierAccepted = no
classifierReason = UNKNOWN_STDERR
providerAccepted = no
HTTP = 0
```

- C1A6 rejection synthetically reproduced: `yes`
- Classifier fix required: `no`
- Classifier fix implemented: `no`
- Token acceptance behavior changed: `no`
- Security acceptance based on fingerprint: `no`
- Negative fail-closed matrix: `PASS`
- Token privacy: `PASS`
- Stderr privacy: `PASS`

No narrow classifier fix is justified because the unknown component is not
positively proven benign, reachable, and exactly reproducible.

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
```

## Validation

- Diagnostic analyzer tests: passed
- Classifier tests: passed
- Caller/provider tests: passed
- Exact executor regression: passed
- Windows synthetic process tests: passed
- Runtime files changed: `[]`
- C1A5G-R runtime lock status: `unchanged`
- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Staging: `0`
- `git diff --check`: passed with pre-existing CRLF warnings only

No raw token, stdout, stderr, caller identity, Authorization, private key, or
service-account JSON is present in this document.

## Recommendation

`PAUSE_LIVE_RETRY_AND_REVIEW_DIAGNOSTIC_STRATEGY`

Do not automatically schedule another live token attempt. A future live
attempt requires a new explicit approval and must remain fail-closed on
UNKNOWN stderr.
