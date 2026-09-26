# P1.5-C2H2E3C1A4 Safe-Observability Real Class State Single Read

## Verdict

`P1_5_C2H2E3C1A4_TOKEN_PIPELINE_REJECTED`

The explicitly approved bounded live attempt stopped before Firestore because
the token classifier rejected unknown stderr. No retry or fallback occurred.

## Required Values

```text
C1A3G_CLOSURE_VERDICT = P1_5_C2H2E3C1A3G_FINAL_RELOCK_LIVE_APPROVAL_GATE_PASS
ALL_C1A4_FINAL_RUNTIME_LOCKS_MATCH = yes
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
TARGET_WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_CLASS_ID = class_2026_g2_c5
ACTIVE_CALLER_DISCOVERY_CALLS = 1
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
ACCESS_TOKEN_CALLS = 1
ACCESS_TOKENS_GENERATED = 0 (accepted/used = 0)
EXACT_GETDOCUMENT_REQUESTS = 0
HTTP_STATUS = not_applicable
RETURNED_RESOURCE_MATCH = not_applicable
TARGET_STATE = STATE_READ_INCONCLUSIVE
CURRENT_CAS_STATE = UNRESOLVED
CREATE_STATE_PREREQUISITE_CONFIRMED = no
TOKEN_RETURNED = no
TOKEN_LOGGED = no
TOKEN_PERSISTED = no
AUTHORIZATION_RETURNED = no
RETRY_COUNT = 0
IAM_MUTATIONS = 0
FIRESTORE_WRITES = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
```

## Safe Token Pipeline Diagnostic

Only bounded structural values and enums are recorded:

```text
TOKEN_PROCESS_STARTED = true
TOKEN_PROCESS_EXIT_CODE = 0
TOKEN_PROCESS_TIMED_OUT = false
TOKEN_STDOUT_PRESENT = true
TOKEN_STDOUT_CHAR_COUNT = 1026
TOKEN_STDOUT_LINE_COUNT = 2
TOKEN_STDOUT_TERMINAL_NEWLINE_KIND = CRLF
TOKEN_STDERR_PRESENT = true
TOKEN_STDERR_CHAR_COUNT = 287
TOKEN_STDERR_LINE_COUNT = 3
TOKEN_STDERR_CLASSIFICATION = UNKNOWN
TOKEN_CLASSIFIER_ACCEPTED = no
TOKEN_CLASSIFIER_REASON = UNKNOWN_STDERR
TOKEN_PROVIDER_ACCEPTED = no
TOKEN_PROVIDER_REASON = CLASSIFIER_REJECTED
```

Raw stdout, raw stderr, token contents, token prefix/suffix/hash,
Authorization header, caller identity, private key, and service-account JSON
were not returned, logged, or persisted.

## Execution and Safety

- Active caller discovery passed the exact count and fingerprint gate.
- One token process call was made through the locked Windows adapter and
  classifier path.
- Because provider acceptance was `no`, exact Firestore GetDocument was not
  called.
- Retry: `0`.
- Query, batch-get, list, collection-list, and other document reads: `0`.
- Firestore reads/writes: `0/0`.
- IAM mutations: `0`.
- Canonical writes and manifest persistence: `0/0`.
- Rules/index changes: `0/0`.
- Staging/commit/push/deploy: `0/0/0/0`.

This result does not establish whether the unknown stderr was an expected
environment warning or an actual process error. The safe diagnostic is now
available for a separate local classifier review. Do not retry this C1A4
budget or generate another token without new explicit approval.

## Historical Budgets

```text
ORIGINAL_C1A_TOKEN_CALLS = 1
ORIGINAL_C1A_GETDOCUMENT_CALLS = 0
ORIGINAL_C1A_BUDGET = EXHAUSTED
HISTORICAL_C1A3_TOKEN_CALLS = 1
HISTORICAL_C1A3_GETDOCUMENT_CALLS = 0
HISTORICAL_C1A3_BUDGET = EXHAUSTED
```

## Recommended Next Action

Perform a local-only narrow review of the retained safe `UNKNOWN` stderr
classification and synthetic warning fixtures. No second live token, retry,
manual HTTP request, or Firestore operation is authorized by this result.

