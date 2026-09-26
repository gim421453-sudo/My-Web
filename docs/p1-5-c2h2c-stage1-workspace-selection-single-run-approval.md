# MY WEB - P1.5-C2H2C Stage-1 Workspace Selection / Single-Run Approval Gate

## Scope and hard boundary

This package recovers the previously evidenced workspace candidates and
prepares a future one-shot approval contract. It does not access production
Firestore, IAM, tokens, or an impersonation endpoint.

```text
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
LIVE_GOOGLE_CLOUD_READS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
DEPLOY = 0
```

## Git baseline

| Item | Value |
| --- | --- |
| Branch | `checkpoint/notice-auth-recovery-20260723` |
| HEAD | `84b2c16` |
| Dirty entries before this document | `142` |
| Staging | `0` |
| `git diff --check` | pass; pre-existing CRLF warnings only |

## Candidate recovery

The exact set below is copied from the existing local C2H2B1 evidence table
only. No workspace was rediscovered or ranked. Workspace display names are not
established by the local evidence.

| Number | Workspace ID | Confirmed name/local label | Evidence |
| ---: | --- | --- | --- |
| 1 | `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1` | `NOT_ESTABLISHED` | `docs/p1-5-c2h2b1-stage1-workspace-principal-iam-closure.md:71`; prior local artifacts `output/workspace-integrity-audit.json` and `docs/auth-final-architecture.md` |
| 2 | `ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2` | `NOT_ESTABLISHED` | `docs/p1-5-c2h2b1-stage1-workspace-principal-iam-closure.md:72`; prior local artifacts `output/auth-data-audit.json` and `docs/dangling-current-workspace-audit.md` |
| 3 | `ws_RAOf0oP1TegBjP1xV8wqwr04Vax1` | `NOT_ESTABLISHED` | `docs/p1-5-c2h2b1-stage1-workspace-principal-iam-closure.md:73`; prior local artifacts `output/workspace-integrity-audit.json` and `docs/ws-secondary-workspace-review.md` |

```text
WORKSPACE_CANDIDATE_COUNT = 3
WORKSPACE_CANDIDATE_RESOLUTION = RESOLVED
WORKSPACE_CANDIDATE_1_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
WORKSPACE_CANDIDATE_1_LABEL = NOT_ESTABLISHED
WORKSPACE_CANDIDATE_2_ID = ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2
WORKSPACE_CANDIDATE_2_LABEL = NOT_ESTABLISHED
WORKSPACE_CANDIDATE_3_ID = ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
WORKSPACE_CANDIDATE_3_LABEL = NOT_ESTABLISHED
APPROVED_WORKSPACE_ID = NOT_SELECTED
USER_WORKSPACE_SELECTION = REQUIRED
```

The user must select exactly one candidate by its number or exact ID. Selection
does not authorize a credential, impersonation, a Firestore request, or a
second-stage document read.

## Future Stage-1 contract after a separate selection and execution approval

The existing C2H2B/C2H2B1 design fixes the following future operation. It is
not executed or approved here.

```text
PROJECT = my-management-app-8a933
DATABASE = (default)
PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/{SELECTED_WORKSPACE_ID}
AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
CALLER_FINGERPRINT = sha256/12:5e6692dda08c
CLIENT = Node.js 22 built-in fetch + Firestore v1 REST
ACTION = one ListCollectionIds
PAGE_SIZE = 25
MAX_PAGES = 1
MAX_LOGICAL_CALLS = 1
HTTP_TIMEOUT_SECONDS = 10
REDIRECT_POLICY = error
AUTO_PAGINATION = disabled
AUTO_RETRY = disabled
MANUAL_RETRY = forbidden
DOCUMENT_PAYLOAD = 0
```

The only future credential path is one short-lived in-memory token for the
exact audit service account, using the existing resource-only Token Creator
binding for the fingerprint-verified caller. It may be generated only in a
separate explicitly approved execution package. No JSON key, refresh token,
Firebase Admin SDK service account, runtime service account, or alternate audit
identity is allowed.

The single REST request may return only `collectionIds`, whether
`nextPageToken` is present, and the collection-ID count. If `nextPageToken` is
present, the caller records only its presence and stops. It must not follow the
token, list documents, fetch a document, query a collection, or write data.

```text
STAGE1_HTTP_TIMEOUT_SECONDS = 10
STAGE1_PAGE_SIZE = 25
STAGE1_MAX_PAGES = 1
STAGE1_LIST_COLLECTION_IDS_LOGICAL_CALL_LIMIT = 1
STAGE1_DOCUMENT_PAYLOAD_LIMIT = 0
STAGE1_AUTO_PAGINATION = disabled
STAGE1_RETRY = disabled
```

## Source-resolution boundary

```text
STUDENT = VERIFIED_LOCAL_SOURCE
SUBJECT = VERIFIED_LOCAL_SOURCE
CLASS = NO_LOCAL_SOURCE_FOUND
RELATIONSHIP_ENROLLMENT = NO_LOCAL_SOURCE_FOUND
STAGE2_APPROVAL = NOT_GRANTED
```

Stage 1 can identify immediate child collection IDs below the one selected
workspace only. It cannot inspect their documents or establish an enrollment
source. Any later document inspection requires a separately approved Stage-2
package.

## Exact future execution-approval text template

> Approve exactly one minimum production operation for project
> `my-management-app-8a933`, database `(default)`, workspace
> `{SELECTED_WORKSPACE_ID}`, using only
> `myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com`
> and caller fingerprint `sha256/12:5e6692dda08c`: generate one short-lived,
> in-memory credential solely as required for one Firestore v1
> `ListCollectionIds` request against that workspace parent. The request uses
> `pageSize=25`, one page, one logical call, a 10-second timeout, redirect
> policy `error`, disabled pagination and retry, and reads zero document payloads.
> A present `nextPageToken` stops the run. This approval does not authorize a
> second Firestore call, document read, Stage 2, IAM mutation, API change, or
> deployment.

This text remains a template until the user selects one candidate and later
provides a separate explicit execution approval.

## Approval state and next action

```text
WORKSPACE_SELECTION_APPROVAL = NOT_GRANTED
STAGE1_IMPERSONATION_EXECUTION_APPROVAL = NOT_GRANTED
STAGE1_ACCESS_TOKEN_GENERATION_APPROVAL = NOT_GRANTED
STAGE1_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

The next package may be created only after the user selects exactly one of the
three candidates. It must lock that exact workspace ID and seek an additional,
one-time execution approval before any token generation or Firestore access.

## Validation

The document contains no human caller email, access token, refresh token,
private key, JSON service-account credential, unrelated UID/email, or Firestore
document payload. The audit service-account identifier is included because it
is the explicit approved target of the future contract.

**Verdict: `P1_5_C2H2C_WORKSPACE_SELECTION_GATE_PASS`**
