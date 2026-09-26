# P1.5-C2H2D2A3 Workspace-2 Final Bounded Page-2 Live Discovery

## Verdict

`P1_5_C2H2D2A3_PAGE1_STATE_DRIFT_ABORT`

The approved page-1 replay returned successfully, but its deterministic ID-set
fingerprint did not match the approved prior page-1 evidence. The hard drift
gate stopped the session before page 2. No retry or additional production
operation was made.

## Locked target and local gates

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
DATABASE_ID = (default)
WORKSPACE_ID = ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2
WORKSPACE_CLASSIFICATION = historical/orphan
TARGET_PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2

WINDOWS_ADAPTER_SHA256_MATCH = yes
POWERSHELL_RUNNER_SHA256_MATCH = yes
ADAPTER_TEST_SHA256_MATCH = yes
ALL_ADAPTER_HASHES_MATCH = yes

ACTIVE_USER_COUNT = 1
CALLER_FINGERPRINT = sha256/12:5e6692dda08c
CALLER_FINGERPRINT_MATCH = yes
AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
```

## Credential and page-1 replay

```text
ACCESS_TOKEN_LOGICAL_GENERATIONS = 1
ACCESS_TOKEN_GENERATION_RESULT = SUCCESS
ACCESS_TOKENS_GENERATED = 1
IMPERSONATION_EXECUTIONS = 1
ACCESS_TOKEN_PERSISTED = no
ACCESS_TOKEN_PRINTED = no
ACCESS_TOKEN_REUSED_LATER = no

PAGE1_LIST_COLLECTION_IDS_CALLS = 1
PAGE1_HTTP_STATUS = 200
PAGE1_LIST_COLLECTION_IDS_RESULT = SUCCESS
PAGE1_COLLECTION_ID_COUNT = 25
REPLAY_PAGE1_COLLECTION_SET_SHA256 = 6ffbc127fa36fdb1541a6bbbdf4c08da86fa2b5669451b59a0fc1ff8014d02c7
PREVIOUS_PAGE1_COLLECTION_SET_SHA256 = 571babddba1b1ec07d4c1ecf3fb49db04830aabf0637d3740b9de0fc79afbc9c
PAGE1_SET_MATCH = no
PAGE1_NEXT_PAGE_TOKEN_PRESENT = yes
STATE_DRIFT_DETECTED = yes
PAGE1_CONTINUATION_DRIFT = no
CONTINUATION_TOKEN_PERSISTED = no
CONTINUATION_TOKEN_PRINTED = no
```

The page-1 collection IDs were used only in memory to compute the approved
sorted newline-join SHA-256 value. They are not repeated here because the
replay is drift validation rather than new source evidence.

## Required stop result

```text
PAGE2_LIST_COLLECTION_IDS_CALLS = 0
PAGE2_HTTP_STATUS = NOT_EXECUTED
PAGE2_LIST_COLLECTION_IDS_RESULT = NOT_EXECUTED
PAGE2_COLLECTION_ID_COUNT = UNRESOLVED
PAGE2_COLLECTION_IDS = UNRESOLVED
PAGE2_NEXT_PAGE_TOKEN_PRESENT = UNRESOLVED
WORKSPACE_2_DISCOVERY_EXHAUSTIVE = UNRESOLVED

PAGE2_CLASS_CANDIDATES = UNRESOLVED
PAGE2_RELATIONSHIP_CANDIDATES = UNRESOLVED
PAGE2_STUDENT_CANDIDATES = UNRESOLVED
PAGE2_SUBJECT_CANDIDATES = UNRESOLVED
ADDITIONAL_STAGE2_SOURCE_CANDIDATE = UNRESOLVED
```

The approved contract prohibits reconciling changed inventory or calling page
2 after this mismatch. This result neither proves source absence nor promotes
any source to authority.

## Historical interpretation

The original A3 verdict remains accurate for its then-approved hard gate. A
later local review confirmed that the two historical hashes used different
sort contracts. Therefore this label must be read as an old-contract abort,
not proof of a production mutation:

```text
A3_STATE_DRIFT_LABEL_HISTORICAL = PAGE1_SET_MISMATCH_ABORT_UNDER_OLD_CONTRACT
ACTUAL_PRODUCTION_COLLECTION_MEMBERSHIP_CHANGE = NOT_ESTABLISHED
LOCAL_FINGERPRINT_DEFECT = CONFIRMED
```

## Safety accounting

```text
LOCAL_HASH_VALIDATIONS = 3
LOCAL_CALLER_VALIDATIONS = 1
ACCESS_TOKEN_CALLS = 1
ACCESS_TOKENS_GENERATED = 1
IMPERSONATION_EXECUTIONS = 1
LIST_COLLECTION_IDS_CALLS = 1
PAGE1_CALLS = 1
PAGE2_CALLS = 0
PAGE3_CALLS = 0
OTHER_FIRESTORE_API_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_DOCUMENT_PAYLOADS = 0
FIRESTORE_WRITES = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
SERVICE_USAGE_READS = 0
API_MUTATIONS = 0
SIGN_BLOB_CALLS = 0
SIGN_JWT_CALLS = 0
GENERATE_ID_TOKEN_CALLS = 0
SERVICE_ACCOUNT_KEY_READS = 0
STAGE2_CALLS = 0
WORKSPACE_3_INSPECTION_APPROVAL = NOT_GRANTED
STAGE2_DOCUMENT_READ_APPROVAL = NOT_GRANTED
CANONICAL_WRITE_APPROVAL = NOT_GRANTED
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Next recommendation

Do not make another live request under this package. A local policy review is
required to decide how to handle page-1 inventory drift before considering any
new approval. Workspace 2 remains historical recovery evidence only.
