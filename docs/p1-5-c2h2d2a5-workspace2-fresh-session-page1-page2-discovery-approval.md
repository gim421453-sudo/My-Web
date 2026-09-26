# P1.5-C2H2D2A5 Workspace-2 Fresh-Session Page-1 to Page-2 Discovery Approval

## Verdict

`P1_5_C2H2D2A5_FRESH_SESSION_DISCOVERY_APPROVAL_GATE_PASS`

This is a design and approval gate only. No production, credential,
Firestore, IAM, or API action was performed.

## Canonical V1 Integrity Lock

```text
FINGERPRINT_VERSION = MYWEB_COLLECTION_ID_SET_V1
COLLECTION_ID_FINGERPRINT_HELPER_SHA256 = eeeb7c04b4523a4d0872a9ebe01de30afe2317d443f337be960cd2815e232872
COLLECTION_ID_FINGERPRINT_TEST_SHA256 = 32cd0998f02fa36df6d82da056528a4225907c5387c0f8390dbcdc49600c8a79
WORKSPACE2_PAGE1_FIXTURE_SHA256 = dbe14adb8b00bd91b67d17b65c2b34ea0a75e4d32fd8b91db08e1defeed094d0
FINGERPRINT_V1_LOCAL_VALIDATION = PASS
CANONICAL_HISTORICAL_PAGE1_V1_SHA256 = 71ed87d59b7b9f5183e49daecf0cb9bad18be8d138025dd036fbcb4a896ce80b
```

The helper is the only canonical implementation. Its V1 payload uses exact
UTF-8 bytes, byte-lexicographic ordering, domain separation, and length
prefixes. It is evidence and integrity metadata, not an authorization gate.

```text
CROSS_SESSION_PAGE1_SHA_EQUALITY_REQUIRED = no
OLD_POWERSHELL_SHA_HARD_GATE = retired
OLD_NODE_SHA_HARD_GATE = retired
CANONICAL_V1_HISTORICAL_SHA_HARD_GATE = no
```

## Locked Future Target

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
DATABASE_ID = (default)
WORKSPACE_ID = ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2
WORKSPACE_CLASSIFICATION = historical/orphan
TARGET_PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2
CALLER_FINGERPRINT = sha256/12:5e6692dda08c
AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
```

The existing three Windows adapter hashes must be checked again before any
future credential generation. The V1 helper hash and version above must also
match. Any identity, adapter, or helper integrity mismatch aborts before live
work.

## Fresh-Session Continuation Contract

Only an explicit later approval for **P1.5-C2H2D2A6 Workspace-2 Fresh-Session
Final Page-1 to Page-2 Live Discovery** may execute this bounded flow:

1. Verify all locked adapter and helper hashes, helper V1 version, exact target,
   one active caller, and caller fingerprint.
2. Generate one short-lived credential for the locked audit service identity.
3. Call fresh `ListCollectionIds` page 1 once with `pageSize = 25`.
4. Record only the page-1 count, safe status, V1 observation hash, and whether
   a continuation exists. Historical hash equality is not a blocker.
5. If and only if page 1 succeeds and returns a continuation, retain it only
   in process memory and call page 2 once using that same-session value.
6. Classify page-2 collection IDs locally, discard in-memory values, and stop.

```text
MAX_ACCESS_TOKEN_LOGICAL_GENERATIONS = 1
MAX_LIST_COLLECTION_IDS_LOGICAL_CALLS = 2
PAGE_SIZE = 25
MAX_PAGE_NUMBER = 2
PAGE3_ALLOWED = no
HTTP_TIMEOUT_SECONDS_PER_CALL = 10
MANUAL_RETRY = 0
AUTO_PAGINATION = disabled
DOCUMENT_PAYLOAD_LIMIT = 0
```

If page 1 has no continuation, page 2 is not available in that fresh session
and no second request is made. If page 2 has another continuation, record only
its presence and stop. No document reads, Workspace-3 fallback, Stage-2, IAM or
API mutation, canonical write, second credential, retry, or deploy is included.

## Exact User Approval Text for A6

> 프로젝트 `my-management-app-8a933`, database `(default)`, historical/orphan
> workspace `ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2`에 대해 fresh-session 최종
> page-1/page-2 collection-ID discovery를 승인합니다. 실행 전 잠긴 Windows
> adapter 3개와 `MYWEB_COLLECTION_ID_SET_V1` helper의 SHA-256/version, exact
> caller fingerprint `sha256/12:5e6692dda08c`를 검증합니다. exact audit
> service identity로 short-lived credential을 정확히 1회 생성합니다. 같은
> credential으로 fresh page 1을 `pageSize=25`, timeout=10초, retry=0으로
> 정확히 1회 호출합니다. current-session V1 fingerprint는 audit observation만
> 위해 계산하며 historical hash와의 equality는 page-2 차단 조건으로 사용하지
> 않습니다. page 1이 성공하고 non-empty continuation이 있을 때만 그 값을
> 메모리에서 즉시 사용해 page 2를 정확히 1회 호출합니다. 전체
> ListCollectionIds logical call은 최대 2회이며 page 3은 호출하지 않습니다.
> document payload=0, Firestore document read=0입니다. 두 번째 credential,
> 세 번째 Firestore 호출, workspace 3, Stage-2, canonical write, IAM/API 변경,
> signing, deploy는 승인하지 않습니다.

## Approval State

```text
FRESH_SESSION_DISCOVERY_APPROVAL = NOT_GRANTED
ACCESS_TOKEN_APPROVAL = NOT_GRANTED
PAGE1_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED
PAGE2_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED
PAGE3_APPROVAL = NOT_GRANTED
STAGE2_DOCUMENT_READ_APPROVAL = NOT_GRANTED
WORKSPACE_3_INSPECTION_APPROVAL = NOT_GRANTED
CANONICAL_WRITE_APPROVAL = NOT_GRANTED
EXECUTION_AUTHORIZED = no
```

## A5 Safety Accounting

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
API_READS = 0
API_MUTATIONS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
