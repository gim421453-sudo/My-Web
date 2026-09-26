# P1.5-C2H2E3C1A5F Enriched Stderr Line Diagnostic Local Forensic

## Verdict

`P1_5_C2H2E3C1A5F_CURRENT_DIAGNOSTICS_INSUFFICIENT`

This is a local forensic investigation only. No active-caller discovery,
gcloud command, token generation, impersonation, Firestore request, IAM read,
or production access was performed.

## Historical Evidence

- C1A5 historical verdict: `P1_5_C2H2E3C1A5_TOKEN_PIPELINE_REJECTED`
- C1A5 budget: `EXHAUSTED`
- C1A5 active-caller discoveries in this step: `0`
- C1A5 token calls in this step: `0`
- C1A5 Firestore calls in this step: `0`
- New live approval: `NOT_GRANTED`

The analysis used only the safe diagnostics already recorded in
`docs/p1-5-c2h2e3c1a5-enriched-stderr-real-class-production-state-single-read.md`.

## C1A5 Safe Stderr Table

| Line index | Character count | Blank | Prefix category | Semantic category |
|---:|---:|---|---|---|
| 0 | 175 | no | `WARNING` | `IMPERSONATION_NOTICE` |
| 1 | 108 | no | `WARNING` | `UNKNOWN` |
| 2 | 0 | yes | `EMPTY` | `UNKNOWN` |

- Nonblank lines: `2`
- Known benign semantic lines: `1`
- Unknown semantic lines: `1`
- Error-like prefix lines: `0`
- `OTHER` prefix lines: `0`

The table contains no free-form stderr text.

## Classifier and Fixture Comparison

The current classifier uses an anchored whole-buffer strategy. For the
impersonated-token operation, it evaluates operation, timeout, exit code,
token output shape, stderr classification, and then returns the provider
result. The accepted stderr contract is the exact existing impersonation
warning composition or empty stderr; a warning prefix alone is never accepted.

The existing benign fixture has this safe shape:

```text
[
  { lineCount: 3, charCounts: [61, 61, 0], categories: [
    ["WARNING", "IMPERSONATION_NOTICE"],
    ["OTHER", "IMPERSONATION_NOTICE"],
    ["EMPTY", "UNKNOWN"]
  ] }
]
```

This is diagnostic metadata only; fixture warning text is intentionally not
reproduced here.

- Exact safe-shape match: `no`
- Partial safe-shape match: `yes` (three-line structure with terminal blank)
- Matched category: `existing benign impersonation-warning fixture shape`
- Warning prefix alone treated as benign: `no`

The C1A5 first line is semantically recognized, while the second nonblank line
is not. The differing character counts and the unknown second line prevent an
exact fixture identity claim.

## Narrowest Supported Finding

`ONE_UNKNOWN_WARNING_LINE_PREVENTS_WHOLE_BUFFER_MATCH`

The current evidence proves why the whole-buffer classifier rejected the
result: one nonblank line remains outside the known-benign composition. It does
not prove what that line actually says or whether it is benign. Therefore:

- Actual non-benign stderr evidence: `no`
- Root cause confirmed: `no`
- Root cause: `unknown warning component; semantic identity unresolved`
- Semantic categories specific enough for root cause: `no`
- Secondary stdout shape issue: `absent` based on the recorded one-token-line
  plus terminal `CRLF` structure
- Current safe observability sufficient for policy decision: `no`

The `WARNING` prefix and exit code `0` are insufficient evidence for an
allowlist expansion.

## Synthetic Local Reproduction

A local synthetic process result containing one known impersonation-warning
component plus one unknown warning component reproduces `UNKNOWN_STDERR` under
the current classifier. This confirms the rejection mechanism, not the
identity or benignness of the production stderr line.

- Failure synthetically reproduced: `yes` (mechanism only)
- Negative fail-closed matrix: `PASS`
- Token privacy: `PASS`

The local matrix retained rejection for unknown stderr, nonzero exit, timeout,
empty or malformed token output, multiline contamination, benign plus unknown,
benign plus error, and benign plus unexpected content.

## Decision

- Classifier fix required: `no`
- Classifier fix implemented: `no`
- Token acceptance behavior changed: `no`
- Safe observability enhancement required: `yes`
- Safe observability enhancement implemented: `no`
- C1A4G runtime lock status: `unchanged`

The smallest useful next diagnostic is a diagnostic-only per-line
`matchedKnownRuleIds` or deterministic template ID, without changing the
whole-buffer acceptance contract. A privacy-normalized fingerprint is not
required yet because the immediate unresolved question is rule/template
membership, not recurrence tracking.

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

- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Staging: `0`
- Classifier local validation: passed
- Caller/provider local validation: passed
- Exact executor regression: passed
- Windows synthetic process validation: passed
- Runtime files changed: `[]`
- Rules/Indexes changed: `0`
- Firebase/production access: `0`

No raw token, stdout, stderr, caller identity, Authorization header, private
key, or service-account JSON is present in this report.

## Recommended Next Action

`P1.5-C2H2E3C1A5G — STDERR DIAGNOSTIC FINAL RELOCK + NEW LIVE APPROVAL GATE`

Do not retry C1A5, change the classifier, add an allowlist entry, or create the
Class. Any future runtime change invalidates the C1A4G lock and requires a new
relock before any separately approved live operation.
