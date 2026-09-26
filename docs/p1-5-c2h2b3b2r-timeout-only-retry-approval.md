# P1.5-C2H2B3B2R Timeout-Only Retry Approval

## 1. Scope and baseline

This is a retry preflight and approval gate only. It does not rerun the Cloud
Audit Logs query and authorizes no live read or mutation.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 135
STAGING = 0

PREVIOUS_VERDICT = P1_5_C2H2B3B2_LOG_EVIDENCE_INSUFFICIENT
PREVIOUS_LOGICAL_QUERY_COUNT = 1
PREVIOUS_OUTER_TIMEOUT_SECONDS = 60
PREVIOUS_EXECUTION_RESULT = TIMEOUT
PREVIOUS_COMPLETED_JSON_RESPONSE = none
```

The first approved query was executed and remains part of the accounting. It is
not erased or reclassified as if no attempt occurred.

## 2. Immutable query contract

The proposed retry preserves every evidence dimension:

```text
PROJECT_ID = my-management-app-8a933
CALLER = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
SERVICE = iamcredentials.googleapis.com
METHODS = [GenerateAccessToken, GenerateIdToken, SignBlob, SignJwt]
LOOKBACK_DAYS = 30
MAX_RESULT_ENTRIES = 100
TARGET_EXTRACTION = resource.labels.email_id only
ORDER = descending timestamp
OUTPUT_FIELDS = timestamp, method, exact caller, status code, resource type, target label
```

The exact canonical filter is unchanged:

```text
logName="projects/my-management-app-8a933/logs/cloudaudit.googleapis.com%2Fdata_access" AND protoPayload.serviceName="iamcredentials.googleapis.com" AND protoPayload.authenticationInfo.principalEmail="firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com" AND (protoPayload.methodName="GenerateAccessToken" OR protoPayload.methodName="GenerateIdToken" OR protoPayload.methodName="SignBlob" OR protoPayload.methodName="SignJwt")
```

```text
QUERY_FILTER_SHA256 = cb634139ac38b37efe47b2954b730c1856772e743250ca18378880542526048d
FILTER_RECOMPUTED_LOCALLY = yes
FILTER_FINGERPRINT_MATCH = yes
FILTER_CHANGE = none
```

Any future mismatch must abort before a live call. The retry package must not
repair, normalize differently, or broaden the filter automatically.

## 3. Only approved envelope change

```text
PREVIOUS_OUTER_TIMEOUT_SECONDS = 60
PROPOSED_OUTER_TIMEOUT_SECONDS = 180
```

The longer client-side wait is justified because the first exact query reached
the 60-second outer timeout without a completed response. It does not expand the
project, caller, methods, log class, lookback, result limit, target extraction,
output fields, pagination policy, or retry policy. It does not guarantee that
the query will complete.

## 4. Retry accounting and stop rule

```text
ADDITIONAL_LOGICAL_QUERY_LIMIT = 1
TOTAL_B3B2_FAMILY_LOGICAL_QUERY_LIMIT = 2
AUTO_FURTHER_RETRY = no
MANUAL_RETRY_INSIDE_EXECUTION_PACKAGE = no
```

The future package may invoke the exact command once. `gcloud` internal
transport attempt and backend pagination counts remain unexposed; they must not
be represented as one physical request.

If the 180-second retry times out, fails, or returns malformed/incomplete data:

```text
TOKEN_CREATOR_USAGE_DEPENDENCY_EVIDENCE = LOG_QUERY_TIMEOUT_TWICE
LOG_EVIDENCE_STATUS = INSUFFICIENT
```

Then stop. Do not automatically increase to 300/600 seconds, retry a third
time, change client/filter/limit/lookback, query logging configuration, run a
90-day window, inspect workloads, or mutate IAM.

## 5. Result and parser constraints

The already-prepared local parser must handle 0, 1, many, and exactly 100
entries, plus missing target, missing status, and null fields without another
live call.

- Zero completed entries: `NO_RECENT_USAGE_EVIDENCE_30D`, never `UNUSED`,
  `NEVER_USED`, or `SAFE_TO_REMOVE`.
- One successful exact target: `CONFIRMED_SINGLE_TARGET`.
- Multiple successful targets: `CONFIRMED_MULTIPLE_TARGETS`.
- Failed entries only: `FAILED_ATTEMPTS_ONLY`.
- Successful event without approved target label:
  `CONFIRMED_TARGET_UNRESOLVED`.
- Exactly 100 entries: `RESULT_LIMIT_REACHED = yes` and
  `POSSIBLY_TRUNCATED = yes`; do not fetch another page.

Target extraction remains limited to `resource.labels.email_id`. No request,
response, resource-name, text-search, or guessed fallback is permitted.

## 6. Prepared retry command, not approved

The command is identical to B3B2. Only the external runner deadline changes to
180 seconds. This command must not run in this approval-gate package.

```powershell
# NOT APPROVED FOR EXECUTION IN B3B2R-P
$ProjectId = 'my-management-app-8a933'
$Filter = 'logName="projects/my-management-app-8a933/logs/cloudaudit.googleapis.com%2Fdata_access" AND protoPayload.serviceName="iamcredentials.googleapis.com" AND protoPayload.authenticationInfo.principalEmail="firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com" AND (protoPayload.methodName="GenerateAccessToken" OR protoPayload.methodName="GenerateIdToken" OR protoPayload.methodName="SignBlob" OR protoPayload.methodName="SignJwt")'

gcloud logging read $Filter `
  --project=$ProjectId `
  --freshness=30d `
  --limit=100 `
  --order=desc `
  --format='json(timestamp,protoPayload.methodName,protoPayload.authenticationInfo.principalEmail,protoPayload.status.code,resource.type,resource.labels.email_id)' `
  --verbosity=error `
  --quiet
```

The outer runner, not the filter or command options, enforces the proposed
180-second deadline entirely in memory. Raw logs must not be persisted.

## 7. Approval artifact

```json
{
  "type": "TokenCreatorUsageTimeoutRetryApproval",
  "projectId": "my-management-app-8a933",
  "principal": "firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com",
  "filterFingerprint": "sha256:cb634139ac38b37efe47b2954b730c1856772e743250ca18378880542526048d",
  "lookbackDays": 30,
  "maxResults": 100,
  "previousOuterTimeoutSeconds": 60,
  "newOuterTimeoutSeconds": 180,
  "additionalLogicalQueries": 1,
  "automaticFurtherRetry": false,
  "90DayExpansion": false,
  "workloadMetadata": false,
  "firestore": false,
  "iamMutation": false,
  "approvedByUser": false
}
```

## 8. Exact future approval request

> 프로젝트 `my-management-app-8a933`에서 이전에 승인된 것과 byte-level
> fingerprint가 동일한 30일 IAM Credentials Cloud Audit Logs 필터를 한 번만
> 다시 실행하는 것을 승인합니다. 프로젝트, exact caller, 네 메서드,
> 30일 범위, 100건 상한, target 추출 방식, 출력 필드 및 필터 fingerprint는
> 변경하지 않고 outer timeout만 60초에서 180초로 늘립니다. 추가 재시도,
> 90일 확장, workload metadata, IAM/Firestore 조회, service-account key 조회,
> token 생성, impersonation, IAM/API 변경 및 배포는 승인하지 않습니다.

Creating this document does not grant approval.

## 9. Approval and safety state

```text
B3B2R_LOG_RETRY_APPROVAL = NOT_GRANTED
OUTER_TIMEOUT_180_APPROVAL = NOT_GRANTED
FURTHER_RETRY_APPROVAL = NOT_GRANTED
NINETY_DAY_QUERY_APPROVAL = NOT_GRANTED
WORKLOAD_METADATA_APPROVAL = NOT_GRANTED
IAM_MUTATION_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no

LIVE_GOOGLE_CLOUD_READS = 0
CLOUD_AUDIT_LOG_READS = 0
LIVE_IAM_READS = 0
WORKLOAD_METADATA_READS = 0
FIRESTORE_ACCESS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
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

## 10. Required values

```text
QUERY_FILTER_SHA256 = cb634139ac38b37efe47b2954b730c1856772e743250ca18378880542526048d
FILTER_CHANGE = none
LOOKBACK_DAYS = 30
MAX_RESULT_ENTRIES = 100
PREVIOUS_OUTER_TIMEOUT_SECONDS = 60
PROPOSED_OUTER_TIMEOUT_SECONDS = 180
ADDITIONAL_LOGICAL_QUERY_LIMIT = 1
AUTO_FURTHER_RETRY = no
B3B2R_LOG_RETRY_APPROVAL = NOT_GRANTED
NINETY_DAY_QUERY_APPROVAL = NOT_GRANTED
WORKLOAD_METADATA_APPROVAL = NOT_GRANTED
IAM_MUTATION_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

## 11. Verdict

**`P1_5_C2H2B3B2R_TIMEOUT_ONLY_RETRY_APPROVAL_GATE_PASS`**

One additional exact query is ready for separate approval with only the outer
timeout changed to 180 seconds. No retry was executed in this package.
