# P1.5-C2H2C2B Corrected Token-Generation Single-Retry Approval

## Verdict

`P1_5_C2H2C2B_CORRECTED_SINGLE_RETRY_APPROVAL_GATE_PASS`

This is an approval design and final local preflight only. It does not issue a
token, impersonate, contact Google Cloud, read Firestore, or authorize an
execution.

## Baseline and corrected-adapter lock

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT = 147
STAGING = 0

WINDOWS_ADAPTER_SHA256 = 512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
POWERSHELL_RUNNER_SHA256 = 4df22c3c9a7d2ff73d7ff6d85f1181a6db0d2384ee0db56c0e427deae1577b50
ADAPTER_TEST_SHA256 = 72cded08eded6e59bf8aea0fa55251a8de51e90ca314a08bd567ad0312a9bbc2

CORRECTED_ADAPTER_LOCAL_VALIDATION = PASS
LOCAL_PROCESS_DEFECT_SUFFICIENT_TO_EXPLAIN_ORIGINAL_FAILURE = yes
LIVE_DIAGNOSTIC_REQUIRED_BEFORE_RETRY = no
```

The three hashes lock only the local execution adapter, its fixed PowerShell
runner, and its focused test. A future execution must recompute and compare all
three before issuing a token. Any mismatch is `EXECUTION_ADAPTER_DRIFT = yes`
and must abort before credential generation.

The corrected path is fixed as follows:

```text
Node.js -> powershell.exe -NoProfile -NonInteractive -File
        -> fixed local argument forwarder
        -> resolved gcloud.cmd + restored argument array
```

It must not use `cmd.exe /c`, `shell: true`, direct `.cmd` spawning, or a
manually concatenated whole-command string. Focused local checks passed for the
SDK version/help commands, a path containing spaces, arguments containing
`@`, `:`, and `=`, in-memory stdout/stderr capture, non-zero exit handling, and
timeout handling.

## Immutable target contract

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
DATABASE_ID = (default)
WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
CALLER_FINGERPRINT = sha256/12:5e6692dda08c
AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
```

The future run has no candidate fallback, no dynamic workspace selection, no
alternate service account, and no Firebase Admin SDK service account or JSON
key. It must first require exactly one active local caller and an exact
fingerprint match. Raw caller email must not be retained.

Existing B5 evidence is carried forward without another IAM read: the audit SA
has only the required Stage-1 custom-role binding, the exact caller has the
resource-scoped Token Creator grant, and project-wide Token Creator grants for
the caller and Firebase Admin SDK remain absent. This document makes no new
claim about current cloud-side health.

## One corrected retry contract

Only a later explicitly approved C2H2C2C execution may do the following,
strictly in order:

1. Recompute the three adapter hashes and abort on drift.
2. Validate the active local caller and exact fingerprint.
3. Generate one short-lived token for the exact audit SA using the locked
   corrected adapter.
4. If and only if that succeeds, use that same in-memory token immediately for
   one exact Firestore v1 `ListCollectionIds` request.
5. Retain only minimized local result fields, discard the token, and stop.

```text
MAX_ACCESS_TOKEN_LOGICAL_GENERATIONS = 1
MAX_LIST_COLLECTION_IDS_LOGICAL_CALLS = 1
PAGE_SIZE = 25
MAX_PAGES = 1
HTTP_TIMEOUT_SECONDS = 10
MANUAL_RETRY = 0
AUTO_PAGINATION = disabled
DOCUMENT_PAYLOAD_LIMIT = 0
```

Token stdout must remain in parent-process memory. It must never be inherited,
printed, persisted, logged, or included in error/debug output. Failure handling
may retain only exit code, signal, timeout state, spawn-error category, a
stderr-present boolean, and a sanitized non-secret category.

If token generation fails, stop with a single failed logical generation. Do not
call Firestore, retry, repair IAM, read IAM, or change an API. A later separate
diagnostic approval would then be necessary.

## Conditional Firestore request

The Firestore call is allowed only after the successful token generation above:

```text
POST https://firestore.googleapis.com/v1/projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1:listCollectionIds
BODY = { "pageSize": 25 }
```

The response may retain only collection IDs, their count, a boolean for next
page token presence, and safe HTTP metadata. It must not retain raw headers,
the authorization value, document payloads, or a next-page token value.

If a next-page token appears, stop; do not follow it. After the one logical
request, do not retry for any HTTP status, timeout, parse failure, empty or
unexpected response. The execution must not call document get/list, batchGet,
runQuery, listen, commit, or any write endpoint. Stage 2 remains forbidden.

The token and bounded Firestore request remain coupled because a token is not a
synthetic probe: generating one only to discard it would add a privileged
credential issuance without advancing the approved Stage-1 goal.

## Local-only classification after a successful request

The single response may be classified locally only as:

```text
KNOWN_STUDENT_SOURCE
KNOWN_SUBJECT_SOURCE
POTENTIAL_CLASS_SOURCE
POTENTIAL_RELATIONSHIP_OR_ENROLLMENT_SOURCE
UNRELATED_OPERATIONAL_COLLECTION
UNKNOWN
```

The carried source baseline is Student `VERIFIED_LOCAL_SOURCE`, Subject
`VERIFIED_LOCAL_SOURCE`, Class `NO_LOCAL_SOURCE_FOUND`, and
Relationship/Enrollment `NO_LOCAL_SOURCE_FOUND`. Stage 1 can identify a
candidate path but cannot verify a document schema.

## Approval checklist

The following are intentionally not approved in this package:

```text
[ ] Use corrected locked Windows process adapter
[ ] Validate exact caller fingerprint
[ ] Generate one short-lived token for exact audit SA
[ ] If token succeeds, use same token for one ListCollectionIds call
[ ] pageSize=25 / maxPages=1 / timeout=10 seconds
[ ] no retry / no pagination / document payload=0
[ ] discard token immediately afterward

[ ] second token generation
[ ] second Firestore call
[ ] Stage 2
[ ] IAM mutation
[ ] API mutation
[ ] deploy
```

## Exact user approval text for C2H2C2C

> 프로젝트 `my-management-app-8a933`에서 검증된 Windows gcloud process
> adapter를 사용해, fingerprint `sha256/12:5e6692dda08c`와 일치하는 정확히 한
> 명의 caller가 audit SA
> `myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com`
> 를 대상으로 short-lived access token을 정확히 한 번 생성하는 재시도를
> 승인합니다. 토큰 생성이 성공한 경우에만 그 동일한 토큰을 메모리에서 즉시
> 사용하여 `(default)` Firestore의
> `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1` workspace에 `ListCollectionIds`를
> 정확히 한 번 호출하는 것도 승인합니다. `pageSize=25`, `maxPages=1`,
> timeout=10초, retry=0, auto-pagination 비활성, document payload=0입니다.
> `nextPageToken`이 있어도 추가 페이지를 조회하지 않습니다. 토큰 재생성,
> 두 번째 Firestore 호출, 다른 workspace, 문서 읽기, Stage 2, IAM/API 변경,
> signing, deploy는 승인하지 않습니다.

## Current approval and safety state

```text
CORRECTED_TOKEN_RETRY_APPROVAL = NOT_GRANTED
CORRECTED_IMPERSONATION_EXECUTION_APPROVAL = NOT_GRANTED
CORRECTED_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED
SECOND_TOKEN_APPROVAL = NOT_GRANTED
SECOND_FIRESTORE_CALL_APPROVAL = NOT_GRANTED
STAGE2_APPROVAL = NOT_GRANTED
STAGE1_CORRECTED_RETRY_AUTHORIZED = no

LIVE_GOOGLE_CLOUD_READS = 0
LIVE_IAM_READS = 0
SERVICE_USAGE_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
