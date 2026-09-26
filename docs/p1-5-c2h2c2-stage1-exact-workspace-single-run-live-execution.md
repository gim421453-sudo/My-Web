# MY WEB - P1.5-C2H2C2 Stage-1 Exact Workspace Single-Run Live Execution

## Execution boundary

The user-approved execution was attempted only for the locked workspace parent.
The local caller fingerprint matched, but the single approved short-lived token
generation failed. The fail-closed rule therefore stopped before Firestore.

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
DATABASE_ID = (default)
WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_PARENT_LOCKED = yes
CALLER_FINGERPRINT = sha256/12:5e6692dda08c
CALLER_FINGERPRINT_MATCH = yes
AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
```

## Result

```text
ACTIVE_USER_COUNT = 1
ACCESS_TOKEN_LOGICAL_GENERATIONS = 1
ACCESS_TOKEN_GENERATION_RESULT = FAILED
ACCESS_TOKEN_PERSISTED = no
ACCESS_TOKEN_PRINTED = no
IMPERSONATION_TARGET = exact audit SA
LIST_COLLECTION_IDS_LOGICAL_CALLS = 0
HTTP_STATUS = NOT_EXECUTED
LIST_COLLECTION_IDS_RESULT = NOT_EXECUTED
COLLECTION_ID_COUNT = UNRESOLVED
COLLECTION_IDS = []
NEXT_PAGE_TOKEN_PRESENT = UNRESOLVED
RESULT_COMPLETE_WITHIN_ONE_PAGE = UNRESOLVED
ERROR_CATEGORY = access-token-generation-failed
```

No token value, authorization header, raw response, or credential diagnostic
was retained. The failure was not retried and no IAM repair or additional
authentication inspection was performed.

## Firestore and mutation counters

```text
LOCAL_CALLER_VALIDATIONS = 1
ACCESS_TOKEN_CALLS = 1
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 1
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_DOCUMENT_PAYLOADS = 0
FIRESTORE_WRITES = 0
LIVE_GOOGLE_CLOUD_READS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
SIGN_BLOB_CALLS = 0
SIGN_JWT_CALLS = 0
GENERATE_ID_TOKEN_CALLS = 0
SERVICE_ACCOUNT_KEY_READS = 0
STAGE2_CALLS = 0
TOKEN_REUSED = no
```

## Source-resolution state

```text
STUDENT = VERIFIED_LOCAL_SOURCE
SUBJECT = VERIFIED_LOCAL_SOURCE
CLASS = NO_LOCAL_SOURCE_FOUND
RELATIONSHIP_ENROLLMENT = NO_LOCAL_SOURCE_FOUND
CLASS_COLLECTION_CANDIDATES = []
CLASS_SOURCE_STATUS = NOT_EXECUTED
RELATIONSHIP_COLLECTION_CANDIDATES = []
RELATIONSHIP_SOURCE_STATUS = NOT_EXECUTED
STAGE2_APPROVAL = NOT_GRANTED
STAGE2_DOCUMENT_READS = 0
```

Because the collection-ID request did not run, no production collection path
was identified or classified.

## Safety validation

The result contains no access token, refresh token, private key, JWT,
signature, service-account JSON credential, raw caller email, authorization
header, or Firestore document contents. The audit service-account identity is
retained only as the approved target identifier.

```text
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

**Verdict: `P1_5_C2H2C2_ACCESS_TOKEN_GENERATION_FAILED`**

## Next action

Do not retry within this package. A new narrowly scoped approval is required to
investigate or repeat token generation. No Stage-2 approval is created by this
failure.
