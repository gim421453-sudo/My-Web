# P1.5-C2H2E3C1A6 Diagnostic-Enriched Exact Real Class State Single Read

## Verdict

`P1_5_C2H2E3C1A6_TOKEN_PIPELINE_REJECTED`

The explicitly approved bounded attempt stopped at the unchanged security
classifier. The token process returned an unknown stderr composition, so the
provider rejected it and the exact Firestore GetDocument was not issued.

## Preflight

- C1A5G-R verdict: `P1_5_C2H2E3C1A5G_R_FINAL_RELOCK_C1A6_APPROVAL_GATE_PASS`
- Final runtime locks: matched
- Static identity: matched
- Field mask: matched exactly
- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Staging: `0`

The target remained the locked project, default database, workspace, class,
plan, source fingerprint, and 12-field Class field mask. No alternate target,
query, list, batch read, or fallback was used.

## Bounded Counters

| Counter | Result |
|---|---:|
| Active caller discovery | `1/1` |
| Active caller count | `1` |
| Active caller fingerprint | `sha256/12:5e6692dda08c` |
| Access-token calls | `1/1` |
| Tokens generated | `1/1` |
| Exact GetDocument requests | `0/1` |
| Firestore reads | `0/1` |
| Retries | `0` |
| Firestore writes | `0` |
| IAM mutations | `0` |
| Canonical writes | `0` |
| Manifest persistence calls | `0` |

## Safe Token Diagnostics

- Process started: `true`
- Exit code: `0`
- Timed out: `false`
- Stdout present: `true`
- Stdout character count: `1026`
- Stdout line count: `2`
- Stdout terminal newline: `CRLF`
- Stderr present: `true`
- Stderr character count: `287`
- Stderr line count: `3`
- Stderr classification: `UNKNOWN`
- Classifier accepted: `no`
- Classifier reason: `UNKNOWN_STDERR`
- Provider accepted: `no`
- Provider reason: `CLASSIFIER_REJECTED`

Per-line bounded diagnostics:

| Index | Characters | Blank | Prefix | Semantic | Rule IDs | Template | Fingerprint |
|---:|---:|---|---|---|---|---|---|
| 0 | 175 | no | `WARNING` | `IMPERSONATION_NOTICE` | `GCLOUD_IMPERSONATION_NOTICE_V1`, `WARNING_PREFIX_V1` | `UNKNOWN_TEMPLATE` | `sha256:82c4a13928f8c97156430cfec22cebb037268bfcdbe1cc40934cadb75876797f` |
| 1 | 108 | no | `WARNING` | `UNKNOWN` | `WARNING_PREFIX_V1` | `UNKNOWN_TEMPLATE` | `sha256:be248b9641988216f99b92a53f7e8ebee3afb29d586436087567eeafcd8b842e` |
| 2 | 0 | yes | `EMPTY` | `UNKNOWN` | `TERMINAL_BLANK_V1` | `UNKNOWN_TEMPLATE` | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

The fingerprints are privacy-normalized stderr diagnostics only. Raw stdout,
stderr, token, Authorization header, caller identity, private key, and
service-account JSON were not recorded.

## Safety Outcome

- HTTP status: not applicable
- Target state: `STATE_READ_INCONCLUSIVE`
- CAS state: `UNRESOLVED`
- Create prerequisite confirmed: `no`
- Token returned: `no`
- Token logged: `no`
- Token persisted: `no`
- Authorization returned/logged: `no` / `no`
- Firebase/Firestore writes: `0`
- Rules/Indexes changes: `0`
- Retry: `0`

Because the security classifier rejected the stderr composition, diagnostic
rule IDs and fingerprints did not influence acceptance and no Firestore read
was attempted.

## Historical Budget Ledger

The earlier budgets remain immutable and separate:

```text
Original C1A: caller 0, token 1, GetDocument 0, exhausted
C1A3: caller 1, token 1, GetDocument 0, exhausted
C1A4: caller 1, token 1, GetDocument 0, exhausted
C1A5: caller 1, token 1, GetDocument 0, exhausted
C1A6: caller 1, token 1, GetDocument 0, exhausted
```

## Next Action

Do not retry, generate another token, broaden the classifier, create the Class,
or infer the production document state. The exact Class state remains
unresolved. Continue with offline stderr investigation or a separately
approved narrow policy change review.
