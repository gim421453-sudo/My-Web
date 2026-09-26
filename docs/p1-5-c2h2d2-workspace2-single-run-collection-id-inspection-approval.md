# P1.5-C2H2D2 Workspace-2 Single-Run Collection-ID Inspection Approval

## Verdict

`P1_5_C2H2D2_WORKSPACE2_APPROVAL_GATE_PASS`

This is a design and approval gate only. It does not generate a token,
impersonate, access Firestore, or authorize an execution.

## Locked target and adapter

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
DATABASE_ID = (default)
WORKSPACE_ID = ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2
TARGET_PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2

WINDOWS_ADAPTER_SHA256 = 512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
POWERSHELL_RUNNER_SHA256 = 4df22c3c9a7d2ff73d7ff6d85f1181a6db0d2384ee0db56c0e427deae1577b50
ADAPTER_TEST_SHA256 = 72cded08eded6e59bf8aea0fa55251a8de51e90ca314a08bd567ad0312a9bbc2

AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
CALLER_FINGERPRINT = sha256/12:5e6692dda08c
```

The adapter hashes must match before any future credential operation. The only
permitted path is Node -> `powershell.exe -NoProfile -NonInteractive -File` ->
fixed runner -> resolved executable plus restored argument array. It must not
use `cmd.exe /c`, `shell: true`, direct `.cmd` spawn, or manually concatenated
whole-command text.

### Fingerprint conflict resolution

The D2 input contained a trailing caller fingerprint that conflicts with the
existing B/C execution contract and is not in the `sha256/12` form. This gate
uses only the value actually verified during C2H2C2C and recorded in its result
document: `sha256/12:5e6692dda08c`. A future execution must abort on any other
fingerprint; the conflicting value is not an alternate caller authorization.

## Historical-discovery policy

Workspace 2 is an `orphan-deleted-workspace` with historical academic density
and historical parent-absence risk. Any returned collection ID is initially
only `HISTORICAL_WORKSPACE_DISCOVERY`. It is never a
`VERIFIED_AUTHORITATIVE_SOURCE` solely because its name resembles a Class or
Enrollment collection.

The future operation must not read the workspace parent, list workspaces, or
read any child document. A missing parent does not justify adding a parent
document read to a collection-ID inspection.

## Proposed one-run contract

Only a later explicitly approved execution may perform these steps in order:

1. Recompute the three adapter hashes and abort on drift.
2. Validate exactly one active local caller and the locked fingerprint.
3. Generate one short-lived access token for the exact audit SA.
4. If and only if generation succeeds, use that same in-memory token for one
   Firestore v1 `ListCollectionIds` request against the locked parent.
5. Retain only collection IDs, count, next-page boolean, and safe HTTP result.
6. Dispose of the token and stop.

```text
REQUEST = POST https://firestore.googleapis.com/v1/projects/my-management-app-8a933/databases/(default)/documents/workspaces/ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2:listCollectionIds
BODY = { "pageSize": 25 }

MAX_ACCESS_TOKEN_LOGICAL_GENERATIONS = 1
MAX_LIST_COLLECTION_IDS_LOGICAL_CALLS = 1
PAGE_SIZE = 25
MAX_PAGES = 1
HTTP_TIMEOUT_SECONDS = 10
MANUAL_RETRY = 0
AUTO_PAGINATION = disabled
NEXT_PAGE_TOKEN_POLICY = STOP
DOCUMENT_PAYLOAD_LIMIT = 0
```

Token output and the authorization header must stay only in process memory. No
token, header, raw process output, document payload, next-page token value, or
raw API error payload may be stored or displayed.

If token generation fails, stop before Firestore. If the one metadata request
fails, times out, returns an unexpected result, or includes `nextPageToken`, do
not retry or page. No IAM read/mutation, API change, document read, Stage-2
inspection, canonical write, deploy, or workspace fallback is bundled.

## Future response classification

Returned IDs may be classified locally only as:

```text
POTENTIAL_CLASS_SOURCE
POTENTIAL_RELATIONSHIP_OR_ENROLLMENT_SOURCE
KNOWN_LEGACY_OPERATIONAL
AUTHORITY_ONLY
UNRELATED_OPERATIONAL
UNKNOWN
```

Names such as `classes`, `classRegistry`, `enrollments`, or
`studentEnrollments` would only yield
`HISTORICAL_SOURCE_CANDIDATE_IDENTIFIED` and require a separate policy/schema
confirmation. `people` remains `BLOCKED_LEGACY_FALLBACK`; authority collections
including `members`, `teacherAssignments`, `inviteCodes`, `invitations`, and
`invites` cannot be reinterpreted as academic enrollment sources.

If no credible Class or Relationship candidate appears, stop additional
workspace probing by default and use `DEFER_AND_CREATE_AUTHORITATIVE_SOURCE_LATER`.
Workspace 3 remains unapproved because its value is low. If a credible
historical candidate appears, document reads still require a separate bounded
Stage-2 approval and the candidate remains a historical recovery candidate.

## Exact approval text for a future execution

> 프로젝트 `my-management-app-8a933`, database `(default)`, workspace
> `ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2`에 대해 corrected Windows gcloud adapter를
> 사용한 단 한 번의 metadata inspection을 승인합니다. adapter hash 세 값과
> fingerprint `sha256/12:5e6692dda08c`가 일치하고 활성 caller가 정확히 한 명인
> 경우에만 audit SA
> `myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com`
> 로 short-lived token을 한 번 생성합니다. 성공한 경우에만 그 동일 token으로
> `ListCollectionIds`를 한 번 호출합니다. `pageSize=25`, `maxPages=1`,
> timeout=10초, retry=0, auto-pagination 비활성, document payload=0입니다.
> token 재생성, 두 번째 Firestore 호출, parent/child document read, 다른
> workspace, IAM/API 변경, Stage-2, canonical write, signing, deploy는 승인하지
> 않습니다.

## Current approval state and counters

```text
WORKSPACE_2_INSPECTION_APPROVAL = NOT_GRANTED
WORKSPACE_3_INSPECTION_APPROVAL = NOT_GRANTED
STAGE2_DOCUMENT_READ_APPROVAL = NOT_GRANTED
CANONICAL_REGISTRY_WRITE_APPROVAL = NOT_GRANTED
CANONICAL_ENROLLMENT_WRITE_APPROVAL = NOT_GRANTED
PRODUCTION_MIGRATION_EXECUTION_APPROVAL = NOT_GRANTED
ADDITIONAL_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED

LIVE_GOOGLE_CLOUD_READS = 0
LIVE_IAM_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_DOCUMENT_PAYLOADS = 0
FIRESTORE_WRITES = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
