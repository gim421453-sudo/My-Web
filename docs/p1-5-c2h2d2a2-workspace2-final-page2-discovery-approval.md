# P1.5-C2H2D2A2 Workspace-2 Final Bounded Page-2 Discovery Approval

## Verdict

`P1_5_C2H2D2A2_FINAL_PAGE2_DISCOVERY_APPROVAL_GATE_PASS`

This is a local approval design only. It does not authorize execution and made
no production, credential, Firestore, IAM, or API request.

## Locked target and prior evidence

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
DATABASE_ID = (default)
WORKSPACE_ID = ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2
WORKSPACE_CLASSIFICATION = historical/orphan
TARGET_PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2

PREVIOUS_PAGE1_COLLECTION_SET_SHA256 = 571babddba1b1ec07d4c1ecf3fb49db04830aabf0637d3740b9de0fc79afbc9c
PRIOR_NEXT_PAGE_TOKEN_REUSABLE = no
PAGE1_REPLAY_REQUIRED = yes
PAGE1_REPLAY_MATCH_REQUIRED = yes
```

The first page was complete only for its observed 25 IDs; its continuation
marker proves that the workspace inventory was incomplete. The old
continuation value was not retained, so a future session must replay page 1
before it can inspect page 2.

## Future execution contract

Only an explicit later approval for **P1.5-C2H2D2A3 Workspace-2 Final Bounded
Page-2 Live Discovery** may execute this sequence:

1. Validate all three locked adapter SHA-256 values and the single caller
   fingerprint `sha256/12:5e6692dda08c`.
2. Generate one short-lived credential for the exact audit service identity
   `myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com`.
3. Call `ListCollectionIds` page 1 for the locked parent with `pageSize = 25`
   and no page token.
4. Sort and newline-join the returned IDs, then compute SHA-256.
5. Proceed only when the result equals
   `571babddba1b1ec07d4c1ecf3fb49db04830aabf0637d3740b9de0fc79afbc9c`
   and an in-memory continuation value exists.
6. Use that same credential and in-memory continuation value for exactly one
   page-2 `ListCollectionIds` request.
7. Classify page-2 IDs locally, discard both in-memory values, and stop.

```text
MAX_ACCESS_TOKEN_LOGICAL_GENERATIONS = 1
MAX_LIST_COLLECTION_IDS_LOGICAL_CALLS = 2
PAGE_SIZE = 25
FINAL_PAGE_LIMIT = 2
PAGE3_ALLOWED = no
HTTP_TIMEOUT_SECONDS_PER_CALL = 10
MANUAL_RETRY = 0
AUTO_PAGINATION = disabled
DOCUMENT_PAYLOAD_LIMIT = 0
```

## Fail-closed gates

```text
ADAPTER_HASH_MISMATCH -> stop before credential generation
CALLER_FINGERPRINT_MISMATCH -> stop before credential generation
CREDENTIAL_FAILURE -> Firestore calls = 0
PAGE1_HTTP_OR_NETWORK_OR_PARSE_FAILURE -> stop before page 2
PAGE1_COLLECTION_COUNT_NOT_25 -> STATE_DRIFT_DETECTED = yes; stop before page 2
PAGE1_SET_FINGERPRINT_MISMATCH -> STATE_DRIFT_DETECTED = yes; stop before page 2
PAGE1_CONTINUATION_ABSENT -> PAGE1_CONTINUATION_DRIFT = yes; stop before page 2
PAGE2_FAILURE -> stop; no retry and no page 3
PAGE2_CONTINUATION_PRESENT -> record boolean only; stop
```

The page-1 replay is only continuation acquisition and drift validation. Its
already-recorded IDs are not new migration evidence. A changed page-1 set must
not be reconciled live.

## Scope and authority limits

Page 2 may retain only its IDs, count, continuation-marker boolean, and safe
HTTP result. It must not read parent or child documents, use a Firestore SDK,
inspect another workspace, alter IAM/API state, or make any write.

Any class, enrollment, student, subject, or similarly named ID found on page 2
can reach only `HISTORICAL_RECOVERY_CANDIDATE`. It cannot become a current or
approved migration source without a separate local mapping and Stage-2
document-read decision. `members`, invitations, invite codes, and teacher
assignments remain authority context, not academic enrollment. `people`, if
present, remains a blocked legacy fallback.

```text
WORKSPACE_2_PAGE2_DISCOVERY_APPROVAL = NOT_GRANTED
STAGE2_DOCUMENT_READ_APPROVAL = NOT_GRANTED
CANONICAL_WRITE_APPROVAL = NOT_GRANTED
EXECUTION_AUTHORIZED = no
```

## Exact approval text for a later execution

> 프로젝트 `my-management-app-8a933`, database `(default)`, historical/orphan
> workspace `ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2`에 대해 최종 bounded page-2
> collection-ID discovery 세션을 승인합니다. 잠긴 Windows adapter 해시 3개와
> caller fingerprint `sha256/12:5e6692dda08c`를 먼저 검증하고, exact audit
> service identity로 short-lived credential을 정확히 1회 생성합니다. 같은
> credential으로 page 1을 1회 재현하여 25개 ID 집합 SHA-256이
> `571babddba1b1ec07d4c1ecf3fb49db04830aabf0637d3740b9de0fc79afbc9c`와
> 일치하고 continuation이 있을 때만, 메모리 내 continuation으로 page 2를
> 정확히 1회 조회합니다. `pageSize=25`, 호출별 timeout=10초, 전체 Firestore
> logical call 최대 2회, retry=0, 자동 pagination 비활성화, document payload=0
> 입니다. page-1 불일치 또는 continuation 부재 시 page 2 전에 중단하며,
> page 2 뒤에는 continuation이 있어도 page 3을 조회하지 않습니다. 문서 읽기,
> workspace 3, Stage-2, canonical write, IAM/API 변경, 추가 credential 생성,
> signing, deploy는 승인하지 않습니다.

## A2 safety accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_DOCUMENT_PAYLOADS = 0
FIRESTORE_WRITES = 0
IAM_READS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
