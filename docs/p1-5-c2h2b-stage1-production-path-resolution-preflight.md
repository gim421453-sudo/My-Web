# MY WEB - P1.5-C2H2B Stage-1 Production Path-Resolution Preflight

## 1. Scope and absolute boundary

This is a documentation-only preflight. It specifies one future request but
does not authenticate, connect, list collections, fetch documents, or approve
execution.

> **No Stage-1 request is authorized. `ListCollectionIds` calls executed: 0.**

| Safety item | Result |
| --- | --- |
| Production Firebase access/read/write | `0 / 0 / 0` |
| `ListCollectionIds` calls | `0` |
| IAM/API mutations | `0 / 0` |
| Rules/index/runtime/client changes | `0 / 0 / 0 / 0` |
| Staging/commit/push/deploy | `0 / 0 / 0 / 0` |

## 2. Git baseline

| Item | Value |
| --- | --- |
| Branch | `checkpoint/notice-auth-recovery-20260723` |
| HEAD | `84b2c16` |
| Dirty entries before this document | `124` |
| Previous reported dirty entries | `123` |
| Staging | `0` |
| Initial `git diff --check` | pass; pre-existing CRLF warnings only |

## 3. Unchanged source state

| Entity | Status | Primary path |
| --- | --- | --- |
| Student | `VERIFIED_LOCAL_SOURCE` | `workspaces/{workspaceId}/students` |
| Subject | `VERIFIED_LOCAL_SOURCE` | `workspaces/{workspaceId}/subjects` |
| Class | `NO_LOCAL_SOURCE_FOUND` | none |
| Relationship / enrollment | `NO_LOCAL_SOURCE_FOUND` | none |

```text
FULL_RELATIONSHIP_INVENTORY_READY = no
CURRENT_READINESS_LEVEL = LEVEL_0
LOCAL_CONTRACT_MISMATCH_COUNT = 3
```

Stage 1 is only a candidate-path metadata operation. It cannot change these
statuses or establish a migration source.

## 4. Production identity preflight

Local configuration and repository documentation provide consistent evidence:

- `.firebaserc:3` selects project `my-management-app-8a933`.
- the approved project contract supplies project number `607154464656`.
- `firebase.json:25` explicitly configures Firestore database `(default)`.
- prior local audit documents also identify `(default)`; no production query was
  used to establish it here.

```text
EXPECTED_PROJECT_ID = my-management-app-8a933
EXPECTED_PROJECT_NUMBER = 607154464656
EXPECTED_FIRESTORE_DATABASE_ID = (default)
TARGET_ENVIRONMENT = production
APPROVED_WORKSPACE_ID = NOT_APPROVED
APPROVED_PRINCIPAL = NOT_APPROVED
```

Database evidence is locally sufficient for this preflight, but all five
runtime values must still be hard-checked against the signed approval before a
future first read. A mismatch aborts with zero Firestore requests.

## 5. Exact parent resource contract

No workspace is selected or inferred. C2H2C must receive one exact workspace ID
from the user and substitute it into this template only after approval review:

```text
projects/my-management-app-8a933/databases/(default)/documents/
workspaces/{EXACT_APPROVED_WORKSPACE_ID}
```

The future helper must construct the parent from independent approved fields,
then compare the resulting full string byte-for-byte with the approved
`parentResource`. It must not use the first workspace, current localStorage
workspace, default workspace, or workspace discovery.

## 6. Verified `ListCollectionIds` contract

### 6.1 Local authoritative implementation evidence

Installed `@google-cloud/firestore` version `8.7.1` and `google-gax` version
`5.0.8` locally establish the protocol/client shape:

- `functions/node_modules/@google-cloud/firestore/types/v1/firestore_client.d.ts`
  documents `listCollectionIds` request fields `parent`, `pageSize`,
  `pageToken`, and optional `readTime`.
- `firestore_v1_proto_api.d.ts` defines the response as only
  `collectionIds: string[]` and `nextPageToken: string`.
- `firestore_client.d.ts` states that the generated client auto-paginates by
  default.
- `google-gax` `PagedApiCaller` calls once when `autoPaginate` is false and
  warns that `pageSize` alone still returns all pages when auto-pagination is
  enabled.
- Firestore's generated call configuration enables retries for
  `ListCollectionIds` by default and uses a 60-second default timeout.
- `google-gax` `CallOptions` supports `retry: null`; local merge logic confirms
  that null disables configured retries.

The exact operation is Firestore v1
`google.firestore.v1.Firestore/ListCollectionIds`, exposed over REST as:

```text
POST https://firestore.googleapis.com/v1/{parent}:listCollectionIds
```

Request body for the approved design:

```json
{
  "pageSize": 25
}
```

`pageToken` and `readTime` are omitted. The response contract contains only
collection IDs and an optional next-page token; it contains no Firestore
document payload.

```text
LIST_COLLECTION_IDS_CONTRACT = VERIFIED
DOCUMENT_PAYLOAD_ALLOWED = no
DOCUMENT_PAYLOAD_READ_COUNT = 0
```

### 6.2 Selected future client mechanism

```text
PROPOSED_STAGE1_CLIENT = Node.js 22 built-in fetch + Firestore v1 REST ListCollectionIds
```

Reason:

- one explicit `fetch` call is easier to audit than a generated paging client;
- there is no SDK auto-pagination layer;
- there is no SDK method-level retry layer;
- request URL, POST body, timeout, redirect policy, and response fields are
  visible at one call site;
- Node 22 is already the trusted-backend runtime contract;
- a future dedicated helper can exclude every mutation repository by
  construction.

The existing production audit scripts are not approved for reuse: they support
pagination, wider inventory, and credential behavior beyond this one-request
contract. No helper is implemented in C2H2B.

## 7. Pagination, retry, and timeout guards

### 7.1 Pagination

```text
AUTO_PAGINATION_DISABLED_DESIGN = yes
MAX_LOGICAL_REQUESTS = 1
MAX_PAGES = 1
PAGE_SIZE = 25
REQUEST_PAGE_TOKEN = omitted
```

Only the first response is parsed. The helper must not contain a loop,
iterator, stream, recursive call, or page-token request branch.

```text
NEXT_PAGE_TOKEN_POLICY = ABORT_AND_REQUIRE_NEW_APPROVAL
```

If `nextPageToken` is non-empty, record only
`AT_LEAST_26_OR_MORE_POSSIBLE`, set abort reason
`NEXT_PAGE_TOKEN_PRESENT`, and stop. Do not infer a total, request page 2,
increase page size, switch clients, or broaden scope.

### 7.2 Retry

The installed generated client retries selected transient failures by default,
so it is rejected as the direct execution mechanism unless a later helper test
proves `retry:null`. The selected native `fetch` design has no application or
SDK retry loop.

```text
LOGICAL_REQUEST_LIMIT = 1
APPLICATION_RETRY_COUNT = 0
SDK_RETRY_COUNT = 0
```

HTTP 401, 403, 408, 429, 5xx, network failure, token failure, timeout, or
unexpected redirect all abort. There is no automatic token refresh and replay
inside the Stage 1 operation. Lower-level TCP packet retransmission is transport
behavior, not another logical HTTP API request; the artifact must distinguish
logical invocation count from any observable transport attempt count.

Credential acquisition and IAM evidence must be completed before Stage 1 and
accounted separately. They are not silently bundled into the one Firestore
metadata request.

### 7.3 Timeout

```text
STAGE1_TIMEOUT = 10 seconds
REDIRECT_POLICY = error
```

The future helper should use one abort signal and no timeout retry. A timeout
produces `REQUEST_TIMEOUT`; a second attempt requires a new explicit retry
decision or approval.

## 8. Read and request accounting

The future artifact must keep these counters separate:

| Counter | Successful first-page value | Meaning |
| --- | ---: | --- |
| `apiRequestCount` | `1` | logical Firestore REST calls issued |
| `metadataOperationCount` | `1` | completed `ListCollectionIds` operations |
| `pageCount` | `1` | responses parsed |
| `firestoreDocumentReadCount` | `0` | document payload reads |
| `documentPayloadReadCount` | `0` | documents returned/parsed |
| `productionWriteCount` | `0` | writes attempted |

No document payload does **not** mean no production access. A future approved
Stage 1 call is production API access and one metadata operation even though
Firestore document reads remain zero.

## 9. Principal and IAM status

Local authority-audit evidence shows:

- intended credential mode: short-lived service-account impersonation;
- candidate input slot: `MYWEB_AUDIT_IMPERSONATE_SERVICE_ACCOUNT`;
- an approved impersonated identity is currently missing;
- no service-account JSON key was used;
- the local audit tool expects read capabilities and rejects create, update,
  and delete capabilities.

```text
CANDIDATE_PRINCIPAL = short-lived impersonated audit service account; exact identity unresolved
PRINCIPAL_STATUS = UNKNOWN
STAGE1_IAM_STATUS = UNRESOLVED
```

The local audit tool names `datastore.entities.get` and
`datastore.entities.list`, but it is repository code rather than authoritative
API/IAM documentation. It does not prove the exact permission required by
`ListCollectionIds`.

```text
REQUIRED_PERMISSION = VERIFY_BEFORE_EXECUTION
```

C2H2C may proceed to an approval presentation only after authoritative,
non-data-access evidence confirms the exact permission and an approved
principal is shown to have that read permission while lacking create, update,
delete, Owner, Editor, Firebase Admin, broad Datastore/Firestore write, token
creation, and key-creation capabilities.

Permission review must not test write access by issuing a write. If online IAM
inspection is required, it needs its own explicit scope/approval and must finish
before the Stage 1 Firestore request.

## 10. Credential delivery contract

The future design requires a short-lived impersonated token held only in
memory. It forbids:

- downloaded service-account JSON keys;
- `GOOGLE_APPLICATION_CREDENTIALS` pointing to a key file;
- repository or committed `.env` credentials;
- tokens in command lines, artifacts, logs, screenshots, or reports;
- automatic fallback to a developer/user credential;
- token refresh during the one-request Stage 1 operation.

The exact principal, source identity, impersonation permission, token lifetime,
and approval evidence remain unresolved. C2H2B performs no authentication.

## 11. One-shot execution guard contract

A later helper must fail closed before networking unless all assertions pass:

```text
EXPECTED_PROJECT_ID exact
EXPECTED_PROJECT_NUMBER exact
EXPECTED_DATABASE exact
EXACT_WORKSPACE_ID nonempty and explicitly approved
EXACT_PARENT_RESOURCE byte-for-byte exact
APPROVED_PRINCIPAL fingerprint exact
REQUIRED_PERMISSION evidence current
REQUEST_METHOD = POST
REQUEST_COUNT = 0 before call
PAGE_SIZE = 25
PAGE_TOKEN omitted
AUTO_PAGINATION absent/disabled
APPLICATION_RETRY = disabled
MAX_LOGICAL_REQUESTS = 1
MAX_PAGES = 1
NO_DOCUMENT_GET
NO_QUERY
NO_COLLECTION_GROUP
NO_WRITE CLIENT/SERVICE INSTANTIATION
```

After invoking `fetch`, increment `apiRequestCount` once before awaiting the
response. Regardless of outcome, the helper must make entering the network call
a one-way state transition so no second invocation can occur.

## 12. Zero-write architectural boundary

The future helper must be a separate read-only entrypoint and must not import or
instantiate:

- `RegistryMutationService` or enrollment mutation services;
- migration apply/rehearsal/rollback adapters;
- persistent migration manifest or journal writers;
- audit-log or idempotency writers;
- client application mutation code;
- Firebase Admin Firestore mutation repositories.

Artifact output is a local file only after safe redaction and hashing. Failure
to write the local artifact does not retry the production request.

## 13. Expected Stage-1 artifact

`Stage1ProductionPathResolutionArtifact` contains:

```text
artifactVersion
stage = 1
projectFingerprint
databaseId = (default)
workspaceFingerprint
principalFingerprint
parentResourceFingerprint
clientMethod
pageSize = 25
collectionIds
collectionIdCount
nextPageTokenPresent
possibleAdditionalCollectionIds
apiRequestCount
metadataOperationCount
pageCount
documentPayloadReadCount = 0
productionWriteCount = 0
abortReason
redactionStatus
generatedAt
artifactHash
```

The artifact contains no raw workspace ID, raw principal, access token,
document name/value, student/subject payload, free text, or PII. Collection IDs
are metadata candidates and may be retained exactly because their review is the
purpose of Stage 1.

## 14. Candidate lifecycle and exclusions

```text
DISCOVERED_COLLECTION_ID
  -> REVIEWED_CANDIDATE
  -> SEPARATE_STAGE2_APPROVAL
  -> VERIFIED | REJECTED
```

No returned name automatically becomes a class or relationship source.
`teacherAssignments`, `members`, `workspace_members`, `workspaceMembers`,
`adminApplications`, `invites`, and `invitations` remain excluded from student
academic enrollment inference.

Subject remains `VERIFIED_LOCAL_SOURCE` at
`workspaces/{workspaceId}/subjects`; Stage 1 does not re-prove or inspect it.
Embedded relationships in students cannot be resolved by collection-ID
metadata. A separate Stage 2 bounded student projection remains necessary.

If the complete first page contains no relevant candidate, report
`NO_CANDIDATE_CHILD_COLLECTION_FOUND`. Do not report
`NO_OPERATIONAL_RELATIONSHIP_SOURCE`: relationships may be embedded,
distributed, absent, or stored in another already-known exact path.

## 15. Abort matrix

| Code | Trigger | Request count when detected |
| --- | --- | ---: |
| `PROJECT_ID_MISMATCH` | project differs | `0` |
| `PROJECT_NUMBER_MISMATCH` | number differs | `0` |
| `DATABASE_MISMATCH` | database differs | `0` |
| `WORKSPACE_NOT_EXPLICITLY_APPROVED` | exact workspace absent | `0` |
| `PRINCIPAL_NOT_APPROVED` | exact principal absent | `0` |
| `PRINCIPAL_NOT_READ_ONLY` | capability evidence fails | `0` |
| `REQUEST_CONTRACT_UNVERIFIED` | method/response contract not pinned | `0` |
| `AUTO_PAGINATION_NOT_DISABLED` | paging layer present | `0` |
| `PAGE_SIZE_NOT_25` | body differs | `0` |
| `REQUEST_COUNT_WOULD_EXCEED_1` | second invocation attempted | `1` maximum |
| `WRITE_CAPABLE_COMPONENT_DETECTED` | forbidden import/capability | `0` |
| `UNEXPECTED_PARENT_RESOURCE` | parent differs | `0` |
| `UNEXPECTED_DOCUMENT_PAYLOAD` | response shape contains document data | `1` |
| `NEXT_PAGE_TOKEN_PRESENT` | response has token | `1` |
| `UNEXPECTED_API_RESPONSE` | method/status/schema differs | `1` |
| `REQUEST_TIMEOUT` | 10-second deadline reached | `1` logical attempt |
| `OTHER_FAIL_CLOSED` | unclassified safety failure | `0` or `1`, recorded exactly |

No code path retries automatically.

## 16. Approval artifact contract

`Stage1ProductionPathResolutionApproval` must be immutable and hash-bound:

```text
approvalVersion
projectId
projectNumber
databaseId
workspaceId
parentResource
principal
principalFingerprint
requiredPermissionEvidence
client = node22-native-fetch
method = firestore-v1-listCollectionIds
pageSize = 25
maxLogicalRequests = 1
maxPages = 1
autoPaginate = false
allowDocumentPayload = false
nextPageTokenPolicy = ABORT
timeoutSeconds = 10
approvalTimestamp
approvalId
approvalHash
approvedByUser = false
```

Any modification invalidates the hash and returns the state to
`NOT_APPROVED`.

## 17. Exact future user approval text template

The placeholders must be replaced with exact reviewed values before this text
is presented. This template is not an approval:

> I approve one production read-only Firestore Stage-1 path-resolution request
> against project `my-management-app-8a933` (project number `607154464656`),
> database `(default)`, workspace `<EXACT_WORKSPACE_ID>` (fingerprint
> `<WORKSPACE_FINGERPRINT>`), using approved read-only principal
> `<EXACT_PRINCIPAL>` (fingerprint `<PRINCIPAL_FINGERPRINT>`). The only
> Firestore operation is one v1 `ListCollectionIds` POST against the exact
> `workspaces/<EXACT_WORKSPACE_ID>` parent, with `pageSize=25`, no page token,
> no automatic pagination, no application/SDK retry, a 10-second timeout, no
> document payload read, and no write. Its sole purpose is to identify immediate
> child collection-ID candidates for unresolved Class and Relationship sources.
> If `nextPageToken` is returned or any guard fails, stop without another
> request. This approval does not authorize Stage 2, document inspection,
> migration classification, another workspace, another page, retry, or write.

Until every placeholder is replaced and the user separately sends this
approval, `STAGE1_USER_APPROVAL = NOT_GRANTED`.

## 18. Pre-execution checklist

All approval-dependent boxes remain unchecked:

```text
[ ] Project ID exact
[ ] Project number exact
[ ] Database ID exact
[ ] Workspace ID explicitly approved
[ ] Parent resource exact
[ ] Principal explicitly approved
[ ] Exact ListCollectionIds IAM permission authoritatively verified
[ ] Principal has required read permission
[ ] Principal lacks write/admin/key-creation capability
[ ] No service-account JSON key
[ ] Short-lived in-memory credential delivery approved
[ ] Method and response contract pinned
[ ] pageSize = 25
[ ] pageToken omitted
[ ] auto pagination disabled
[ ] max logical request = 1
[ ] application/SDK retries disabled
[ ] timeout = 10 seconds
[ ] no document payload
[ ] next-page policy = abort
[ ] no write-capable migration services instantiated
[ ] redacted local artifact path ready
[ ] explicit user approval recorded
```

## 19. Local contract mismatches

All three C2H2 mismatches remain open:

| ID | Stage 1 result | Reason |
| --- | --- | --- |
| `LCM-1` operational students labeled canonical | `CANNOT_CLARIFY` | collection IDs do not reveal producer/schema semantics; Stage 2 or later inventory required |
| `LCM-2` operational subjects labeled canonical | `CANNOT_CLARIFY` | subject status is not in Stage 1 scope; provenance audit required |
| `LCM-3` default/local subject bootstrap provenance | `CANNOT_CLARIFY` | metadata cannot identify row provenance; dedicated subject audit required |

`LOCAL_CONTRACT_MISMATCH_COUNT = 3`; no repair occurs.

## 20. Security second pass

| Question | Result |
| --- | --- |
| Could Stage 1 enumerate more than one workspace? | no by design; exact parent is hash-bound and one workspace only |
| Could pagination happen automatically? | no with native fetch; no loop/token branch is permitted |
| Could retry cause multiple API requests? | no application/SDK retry; timeout/error aborts; helper must be one-shot |
| Could the selected principal write? | unresolved; execution blocked until least-privilege evidence is approved |
| Could a document fetch occur implicitly? | response contract contains IDs/token only; document APIs/imports are forbidden |
| Could collection IDs expose payload? | no document payload; IDs are metadata and retained only for candidate review |
| Could a token trigger page 2? | no; token presence is terminal abort |
| Could Stage 1 be mistaken for Stage 2 approval? | explicit artifact state and approval text deny Stage 2 |

## 21. Preflight readiness

```text
STAGE1_REQUEST_CONTRACT_STATUS = READY
STAGE1_IAM_STATUS = UNRESOLVED
STAGE1_DATABASE_STATUS = READY
STAGE1_WORKSPACE_STATUS = NOT_APPROVED
STAGE1_USER_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
STAGE1_PREFLIGHT_READY = no
CURRENT_READINESS_LEVEL = LEVEL_0
```

The request shape is ready, but execution presentation is blocked by the exact
workspace, exact principal, and authoritative IAM permission evidence. This is
a safe preflight result, not a production-access failure.

## 22. Required final values

```text
EXPECTED_PROJECT_ID = my-management-app-8a933
EXPECTED_PROJECT_NUMBER = 607154464656
EXPECTED_FIRESTORE_DATABASE_ID = (default)
APPROVED_WORKSPACE_ID = NOT_APPROVED

PROPOSED_STAGE1_CLIENT = Node.js 22 built-in fetch + Firestore v1 REST ListCollectionIds
LIST_COLLECTION_IDS_CONTRACT = VERIFIED
AUTO_PAGINATION_DISABLED_DESIGN = yes
MAX_LOGICAL_REQUESTS = 1
MAX_PAGES = 1
PAGE_SIZE = 25
DOCUMENT_PAYLOAD_ALLOWED = no
NEXT_PAGE_TOKEN_POLICY = ABORT_AND_REQUIRE_NEW_APPROVAL

CANDIDATE_PRINCIPAL = short-lived impersonated audit service account; exact identity unresolved
STAGE1_IAM_STATUS = UNRESOLVED
STAGE1_DATABASE_STATUS = READY
STAGE1_WORKSPACE_STATUS = NOT_APPROVED
STAGE1_USER_APPROVAL = NOT_GRANTED
STAGE1_PREFLIGHT_READY = no
STAGE1_EXECUTION_AUTHORIZED = no
CURRENT_READINESS_LEVEL = LEVEL_0

PRODUCTION_FIREBASE_ACCESS = 0
PRODUCTION_READS = 0
PRODUCTION_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
RUNTIME_CODE_CHANGES = 0
CLIENT_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## 23. Verdict and next package

**Verdict: `P1_5_C2H2B_STAGE1_PATH_RESOLUTION_PREFLIGHT_PASS`**

This PASS means the one-request operation is deterministically specified and
its unresolved gates are explicit. It does not authorize production access.

Because `STAGE1_PREFLIGHT_READY = no`, do not proceed directly to execution or
present a completed approval. The next package must narrowly resolve:

1. the exact workspace selected by the user;
2. the exact short-lived impersonated principal;
3. authoritative `ListCollectionIds` IAM permission evidence and read-only
   capability review.

Only after those blockers are resolved may a C2H2C approval gate present the
fully populated one-run request. Production reads remain zero until a separate
explicit approval is granted.
