# P1.5-C2H2B3B2 Token Creator Bounded Usage Live Verification

## 1. Scope and baseline

This report records the explicitly approved one-time 30-day Cloud Audit Logs
query. It did not perform IAM, workload, Firebase, Firestore, credential,
impersonation, mutation, deployment, staging, or commit operations.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_RESULT_DOCUMENT = 134
STAGING = 0

PROJECT_ID = my-management-app-8a933
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
```

## 2. Pre-execution verification

The local parser was validated before the live call for zero, one, and multiple
entries; missing status; missing target; and failed status. No live request was
needed for parser preparation.

The canonical filter was hashed with the same UTF-8 normalization used in
B3B1:

```text
EXPECTED_QUERY_FILTER_SHA256 = cb634139ac38b37efe47b2954b730c1856772e743250ca18378880542526048d
ACTUAL_QUERY_FILTER_SHA256 = cb634139ac38b37efe47b2954b730c1856772e743250ca18378880542526048d
QUERY_FILTER_FINGERPRINT_MATCH = yes
```

## 3. Exact executed scope

The single logical command was bounded by:

```text
PROJECT = my-management-app-8a933
LOG_NAME = cloudaudit.googleapis.com/data_access
SERVICE = iamcredentials.googleapis.com
CALLER = exact Firebase Admin SDK service account
METHODS = [GenerateAccessToken, GenerateIdToken, SignBlob, SignJwt]
LOOKBACK_DAYS = 30
MAX_RESULT_ENTRIES = 100
ORDER = descending timestamp
TARGET_FIELD = resource.labels.email_id
```

The requested output projection contained only timestamp, method, exact caller,
status code, resource type, and target label. It excluded request, response,
authorization details, delegation details, credentials, signatures, and key
material.

## 4. Execution outcome

The approved logical query started after the fingerprint gate. It did not
complete within the preapproved 60-second outer process deadline. The runner
stopped the in-flight job and did not issue another query.

```text
CLOUD_AUDIT_LOG_LOGICAL_QUERIES = 1
TRANSPORT_ATTEMPT_COUNT = UNOBSERVED_BY_GCLOUD
OUTER_PROCESS_TIMEOUT_SECONDS = 60
EXECUTION_RESULT = TIMEOUT
QUERY_STARTED_AT = NOT_RETAINED_DUE_TIMEOUT_BRANCH
QUERY_COMPLETED_AT = NOT_COMPLETED
OBSERVABLE_WINDOW = UNRESOLVED
SECOND_LOGICAL_QUERY_ATTEMPTED = no
```

No complete JSON response was received. Consequently, this is neither an empty
result nor evidence of zero usage.

## 5. Evidence classification

```text
RETURNED_ENTRY_COUNT = UNRESOLVED
RESULT_LIMIT_REACHED = unresolved
LOG_EVIDENCE_COVERAGE = UNRESOLVED

TOKEN_CREATOR_RECENT_USAGE = UNRESOLVED_LOG_EVIDENCE
TOKEN_CREATOR_USAGE_DEPENDENCY_EVIDENCE = LOG_EVIDENCE_INSUFFICIENT

EVENT_COUNT = UNRESOLVED
SUCCESS_EVENT_COUNT = UNRESOLVED
FAILED_EVENT_COUNT = UNRESOLVED
UNKNOWN_STATUS_EVENT_COUNT = UNRESOLVED
DISTINCT_TARGET_COUNT = UNRESOLVED

RESOURCE_SCOPED_REPLACEMENT_TARGETS = []
RESOURCE_SCOPED_REPLACEMENT_TARGETS_NOTE = no completed response; not evidence of zero targets
RESOURCE_SCOPE_NARROWING_DESIGN_READY = no
REMOVAL_POLICY_REVIEW_READY = no
```

The result must not be classified as `NO_RECENT_USAGE_EVIDENCE_30D`, `UNUSED`,
or `SAFE_TO_REMOVE`.

## 6. Security decision

The pre-existing security state remains unchanged:

```text
CURRENT_BINDING_DEPENDENCY = UNRESOLVED_FOR_REMOVAL
TRANSITIVE_STAGE1_RISK = CONFIRMED
SAFE_TO_GRANT_AUDIT_DATA_ROLE_NOW = no
REMOVAL_WITHOUT_REPLACEMENT_STATUS = UNRESOLVED
RESOURCE_SCOPED_REPLACEMENT_STATUS = TARGET_UNRESOLVED
IAM_MUTATION_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

The timeout does not authorize a broader query, a 90-day query, workload
metadata, target-field fallback, or IAM mutation.

## 7. Live-read accounting

```text
CLOUD_AUDIT_LOG_LOGICAL_QUERIES = 1
PROJECT_IAM_POLICY_READ_CALLS = 0
LIVE_IAM_READS = 0
NINETY_DAY_QUERY_COUNT = 0
WORKLOAD_METADATA_READS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
SERVICE_ACCOUNT_KEY_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
```

## 8. Repository and sensitive-data accounting

```text
RULES_CHANGES = 0
INDEX_CHANGES = 0
RUNTIME_CODE_CHANGES = 0
CLIENT_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

No raw log entry, access token, ID token, JWT, signature, private key,
service-account JSON key, raw request/response, or unrelated principal was
persisted.

## 9. Smallest next package

Do not retry automatically. If another attempt is desired, prepare a separate
approval gate for the same filter, project, caller, four methods, 30-day window,
and 100-entry cap with a longer outer process timeout. The approval must still
authorize only one new logical query and must not broaden scope or add IAM,
workload, Firestore, 90-day, token, impersonation, or mutation operations.

## 10. Verdict

**`P1_5_C2H2B3B2_LOG_EVIDENCE_INSUFFICIENT`**

The exact approved query was attempted once and stopped at its timeout. No
usage, target, removal, or narrowing conclusion can be drawn from the incomplete
response.
