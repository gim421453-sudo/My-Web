# P1.5-C2H2B3B2R Token-Creator Bounded Usage Live Retry

## 1. Scope and baseline

This package executed the one user-approved retry of the existing bounded
Cloud Audit Logs query. The project, caller, service, four methods, 30-day
lookback, 100-entry limit, descending order, target extraction, and output
semantics were unchanged. Only the external timeout increased from 60 to 180
seconds.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 136
STAGING = 0
QUERY_FILTER_FINGERPRINT_MATCH = yes
QUERY_FILTER_SHA256 = cb634139ac38b37efe47b2954b730c1856772e743250ca18378880542526048d
LOCAL_PARSER_PREFLIGHT = pass
```

The parser preflight covered zero, one, multiple, and 100 entries, plus missing
target, missing status, and null values before the live query ran.

## 2. Execution result

```text
LOOKBACK_DAYS = 30
MAX_RESULT_ENTRIES = 100
OUTER_TIMEOUT_SECONDS = 180
PREVIOUS_LOGICAL_QUERY_COUNT = 1
ADDITIONAL_LOGICAL_QUERY_COUNT = 1
TOTAL_B3B2_FAMILY_LOGICAL_QUERY_COUNT = 2
CLOUD_AUDIT_LOG_LOGICAL_QUERIES_THIS_PACKAGE = 1

QUERY_STARTED_AT = 2026-08-22T12:12:57.3263008Z
QUERY_COMPLETED_AT = 2026-08-22T12:13:09.1837051Z
RETRY_RESULT = COMPLETED
RETURNED_ENTRY_COUNT = 0
RESULT_LIMIT_REACHED = no
RESULT_TRUNCATION_STATUS = not-truncated
LOG_EVIDENCE_COVERAGE = SUFFICIENT_FOR_30D_OBSERVATION
```

The response completed successfully and contained zero matching entries. Raw
log entries were not written to disk or retained in this document. Coverage is
limited to the approved 30-day Data Access log boundary; it does not establish
historical non-use, complete logging coverage outside that boundary, or safety
to remove the role.

## 3. Safe aggregation

```text
TOKEN_CREATOR_RECENT_USAGE = NO_RECENT_USAGE_EVIDENCE_30D
TOKEN_CREATOR_USAGE_DEPENDENCY_EVIDENCE = NO_RECENT_USAGE_EVIDENCE

EVENT_COUNT = 0
SUCCESS_EVENT_COUNT = 0
FAILED_EVENT_COUNT = 0
UNKNOWN_STATUS_EVENT_COUNT = 0
DISTINCT_TARGET_COUNT = 0
UNEXPECTED_CALLER_IN_RESULT = no
UNEXPECTED_METHOD_IN_RESULT = no
INVALID_TARGET_SYNTAX_COUNT = 0
FIRST_SEEN = not-applicable
LAST_SEEN = not-applicable
RESOURCE_SCOPED_REPLACEMENT_TARGETS = []
```

There are no method/target/status aggregate rows because the bounded response
was empty.

## 4. Decision boundary

```text
RESOURCE_SCOPE_NARROWING_DESIGN_READY = no
REMOVAL_POLICY_REVIEW_READY = yes
ROLE_UNUSED = not-established
ROLE_NEVER_USED = not-established
SAFE_TO_REMOVE = not-established
STAGE1_EXECUTION_AUTHORIZED = no
```

The next safe package is a design-only residual-risk and removal-policy
decision. It must not remove or narrow `roles/iam.serviceAccountTokenCreator`
automatically.

## 5. Safety counters

```text
MANUAL_RETRY_AFTER_APPROVED_RETRY = 0
THIRD_QUERY_ATTEMPTS = 0
NINETY_DAY_QUERY_COUNT = 0
NINETY_DAY_QUERY_APPROVAL = NOT_GRANTED
WORKLOAD_METADATA_READS = 0
WORKLOAD_METADATA_APPROVAL = NOT_GRANTED
LIVE_IAM_READS = 0
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
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## 6. Verdict

`P1_5_C2H2B3B2R_NO_RECENT_USAGE_EVIDENCE`

