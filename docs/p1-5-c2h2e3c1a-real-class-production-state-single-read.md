# P1.5-C2H2E3C1A Exact Real Class Production State Single Read

## Verdict

P1_5_C2H2E3C1A_STATE_READ_INCONCLUSIVE

The local identity, project, caller, and execution-lock gates passed. One approved audit-SA token-generation call was initiated, but the Windows PowerShell process treated gcloud's impersonation warning on stderr as a terminating error before the token could be handed to the HTTP client. The exact Firestore GET therefore did not run.

The one-token budget is considered consumed. No second token or retry was attempted.

## Locked Target

PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c
AUDIT_SERVICE_ACCOUNT = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com

E3B_PLAN_ID = 2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1
E3B_SOURCE_FINGERPRINT = sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da
TARGET_WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_CLASS_ID = class_2026_g2_c5

EXACT_FIRESTORE_DOCUMENT_RESOURCE = projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5
TARGET_PATH_CONTRACT_MATCH = yes
ALL_C1_EXECUTION_LOCKS_MATCH = yes

## Read Attempt Result

ACCESS_TOKEN_CALLS = 1
ACCESS_TOKENS_GENERATED = 1
EXACT_GET_DOCUMENT_REQUESTS = 0
HTTP_STATUS = not_attempted
RETURNED_RESOURCE_MATCH = not_applicable
TARGET_STATE = STATE_READ_INCONCLUSIVE
CURRENT_CAS_STATE = UNRESOLVED
CREATE_STATE_PREREQUISITE_CONFIRMED = no

The token was held only in the interrupted process path and was not written to a file, result document, console output, or persistent store. No Authorization header was retained.

## Safety Boundary

TOKEN_PERSISTED = no
TOKEN_LOGGED = no
IAM_MUTATIONS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
FIREBASE_ADMIN_FALLBACK_USED = no
SERVICE_ACCOUNT_JSON_KEY_USED = no
RETRIES = 0
QUERY_REQUESTS = 0
BATCH_GET_REQUESTS = 0
LIST_DOCUMENT_REQUESTS = 0
LIST_COLLECTION_IDS_REQUESTS = 0

No production Class state was resolved. No create, update, adoption, reconciliation, or write recommendation is authorized.

## Next Action

RECOMMENDED_NEXT_ACTION = PREPARE A NARROW RUNNER STDERR-HANDLING FIX AND REQUEST A NEW EXPLICIT C1A APPROVAL

The fix must preserve the locked adapter hashes or receive a separate integrity approval. A future attempt must use the approved Windows process adapter, capture gcloud stderr in memory without treating a non-error warning as a terminating failure, and then perform at most one new token plus one exact GetDocument. No automatic retry is authorized by this record.

## Git And Safety Counters

BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
