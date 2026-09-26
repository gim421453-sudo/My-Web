# MY WEB - P1.5-C2H2C1 Stage-1 Exact Workspace Single-Run Execution Approval Gate

## Scope and absolute safety

This document locks the exact workspace and prepares one future production
operation. It does not access Firestore, Google Cloud, IAM, credentials, or an
impersonation endpoint.

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
STAGING = 0
COMMIT = 0
PUSH = 0
```

## Git baseline

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_ENTRIES_BEFORE_DOCUMENT = 143
DIRTY_ENTRIES_AFTER_DOCUMENT = 144
STAGING = 0
```

The existing dirty and untracked files are unrelated to this documentation
package and are preserved.

## User workspace selection

The user selected candidate 1 from the three locally evidenced candidates.
This package must not substitute candidate 2 or candidate 3.

```text
WORKSPACE_CANDIDATE_NUMBER = 1
WORKSPACE_SELECTION_APPROVAL = GRANTED
APPROVED_WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
```

Selection was based on the existing local evidence of an active parent,
canonical `super_manager` membership, system-owner linkage, and the broadest
retained operational child-collection set. No production state was rechecked
in this package.

## Exact target parent

The future request is byte-for-byte locked to this parent:

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
DATABASE_ID = (default)
TARGET_PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_PARENT_LOCKED = yes
```

No workspace discovery, fallback, parent substitution, or automatic retry may
change this target. If this target is absent or fails authorization, the future
run stops; it must not try another candidate.

## Exact future operation

Only after a separate explicit execution approval, the operation would be one
Firestore v1 REST `ListCollectionIds` request with:

```text
METHOD = ListCollectionIds
REQUEST_BODY = { "pageSize": 25 }
STAGE1_PAGE_SIZE = 25
STAGE1_MAX_PAGES = 1
STAGE1_LIST_COLLECTION_IDS_LOGICAL_CALL_LIMIT = 1
STAGE1_MANUAL_RETRY = 0
STAGE1_AUTO_PAGINATION = disabled
STAGE1_DOCUMENT_PAYLOAD_LIMIT = 0
NEXT_PAGE_TOKEN_POLICY = STOP
STAGE1_HTTP_TIMEOUT_SECONDS = 10
REDIRECT_POLICY = error
```

The client is the previously approved Node.js 22 built-in `fetch` REST path.
No Firestore client library, automatic paging, SDK retry, or new dependency is
allowed. The existing local contract defines unexpected redirects as an error;
the request must not silently follow them.

## Exact future authentication path

```text
CALLER_FINGERPRINT = sha256/12:5e6692dda08c
AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
```

The future run may use one short-lived in-memory access token for the exact
audit service account through the existing resource-scoped Token Creator path.
Before any token generation it must resolve exactly one active caller and
require the fingerprint to match. A mismatch, target drift, or known IAM drift
fails closed before Firestore access.

The contract forbids Firebase Admin SDK credentials, service-account JSON keys,
refresh tokens, delegation to another service account, token printing,
persistence, logging, or reuse.

## Zero-payload and response contract

This operation must never call `documents.get`, `documents.list`, `runQuery`,
`batchGet`, `listen`, `commit`, or any write API. It must not read the workspace
parent document or any child document.

The future result may retain only:

```text
collectionIds
collectionIdCount
nextPageTokenPresent = yes/no
```

If `nextPageTokenPresent = yes`, the result is incomplete within one page and
the run stops. The token value must not be followed or unnecessarily stored.

## Source-resolution boundary

```text
STUDENT = VERIFIED_LOCAL_SOURCE
SUBJECT = VERIFIED_LOCAL_SOURCE
CLASS = NO_LOCAL_SOURCE_FOUND
RELATIONSHIP_ENROLLMENT = NO_LOCAL_SOURCE_FOUND
STAGE2_APPROVAL = NOT_GRANTED
```

Stage 1 can identify only immediate child collection IDs under the selected
workspace. Collection names may be classified locally as possible class,
relationship/enrollment, known student, known subject, unrelated, or unknown.
No document schema or content may be inspected. Stage 2 remains separately
unauthorized, with the previously designed maximum of 20 document reads.

## Exact user approval text for the next execution package

> Approve exactly one Stage-1 production `ListCollectionIds` operation for
> project `my-management-app-8a933`, database `(default)`, and parent
> `projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`.
> The caller fingerprint must be `sha256/12:5e6692dda08c`, and the only target
> service account is
> `myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com`.
> Approve one short-lived in-memory token generation solely for one Firestore
> v1 `ListCollectionIds` request, with `pageSize=25`, `maxPages=1`, one logical
> call, a 10-second timeout, redirect policy `error`, no retry, no automatic
> pagination, and zero document payload reads. A present `nextPageToken` stops
> the run. This does not authorize another workspace, a second Firestore call,
> document reads, Stage 2, IAM changes, API changes, signing, or deployment.

This text is prepared only. It does not itself grant execution approval.

## Current approval state

```text
STAGE1_ACCESS_TOKEN_GENERATION_APPROVAL = NOT_GRANTED
STAGE1_IMPERSONATION_EXECUTION_APPROVAL = NOT_GRANTED
STAGE1_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED
STAGE2_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

The next package, C2H2C2, may execute only after the user separately approves
this exact one-time operation. It may perform caller validation, one token
generation, one ListCollectionIds call, and local response minimization only.

## Validation and verdict

The document contains no access token, refresh token, private key, JWT,
signature, service-account JSON credential, raw human caller email, or
Firestore document contents.

**Verdict: `P1_5_C2H2C1_EXACT_WORKSPACE_SINGLE_RUN_APPROVAL_GATE_PASS`**
