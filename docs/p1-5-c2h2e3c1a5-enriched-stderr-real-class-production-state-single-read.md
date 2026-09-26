# P1.5-C2H2E3C1A5 Enriched-Stderr Exact Real Class Production State Single Read

## Verdict

`P1_5_C2H2E3C1A5_TOKEN_PIPELINE_REJECTED`

The explicitly approved bounded attempt completed fail-closed. The token
classifier rejected the process result because the stderr buffer remained
`UNKNOWN_STDERR`. No Firestore request was issued after that rejection.

## Locked Target

- Project: `my-management-app-8a933`
- Project number: `607154464656`
- Database: `(default)`
- Workspace: `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`
- Class: `class_2026_g2_c5`
- Field mask: `schemaVersion`, `version`, `workspaceId`, `classId`, `status`,
  `source`, `createdAt`, `updatedAt`, `createdBy`, `displayName`, `schoolYear`,
  `grade`

## Preflight

- C1A4G closure verdict: `P1_5_C2H2E3C1A4G_FINAL_RELOCK_LIVE_APPROVAL_GATE_PASS`
- Final runtime locks: `yes`
- Static identity: `pass`
- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- Staging before/after: `0`

Final runtime SHA-256 locks matched for the caller, classifier, Windows
process adapter, PowerShell runner, and exact executor.

## Bounded Execution

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

The caller and token process completed with exit code `0` and without timeout.
The token provider did not accept the result, so the exact document read was
correctly not attempted.

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

Per-line stderr metadata only:

| Index | Characters | Blank | Prefix | Semantic |
|---:|---:|---|---|---|
| 0 | 175 | no | `WARNING` | `IMPERSONATION_NOTICE` |
| 1 | 108 | no | `WARNING` | `UNKNOWN` |
| 2 | 0 | yes | `EMPTY` | `UNKNOWN` |

Raw stdout, raw stderr, token, Authorization header, caller account, and
credentials were not recorded.

## Safety Outcome

- HTTP status: not applicable
- Target state: `STATE_READ_INCONCLUSIVE`
- CAS state: `UNRESOLVED`
- Create prerequisite: not confirmed
- Token returned/logged/persisted: `no` / `no` / `no`
- Authorization returned/logged: `no` / `no`
- Rules changes: `0`
- Index changes: `0`

Historical budgets remain separate: Original C1A token `1`, C1A3 caller `1`
and token `1`, C1A4 caller `1` and token `1`; each had zero GetDocument
requests and was exhausted independently.

## Next Recommendation

Do not retry, alter the classifier, add an allowlist entry, or create the
Class. Proceed only with an offline diagnosis/design gate for the remaining
unknown stderr source. A future exact-state read requires a new explicit
approval and a newly locked runtime.

## Post-Execution Check

- Sensitive scan of this document: token `0`, Authorization `0`, raw stderr
  `0`, raw stdout `0`, raw caller `0`, private credential `0`
- Firebase/Firestore writes: `0`
- Commit/staging/push/deploy: `0`
