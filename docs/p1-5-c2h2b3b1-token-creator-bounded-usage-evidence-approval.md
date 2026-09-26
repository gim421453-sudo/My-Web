# P1.5-C2H2B3B1 Token Creator Bounded Usage Evidence Approval

## 1. Scope and baseline

This document is a query preflight and approval gate only. It performs no live
Google Cloud, Cloud Audit Logs, IAM, workload, Firebase, or Firestore request.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 133
STAGING = 0

PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
```

The principal and project identity come from existing B2/B3A2 evidence. They
must not be live-resolved again in B3B2. The audit SA remains unchanged and
Stage 1 remains unauthorized.

## 2. Authoritative log contract

Google Cloud's Service Account Credentials audit contract establishes:

```text
AUDIT_LOG_SERVICE = iamcredentials.googleapis.com
AUDIT_LOG_CLASS = DATA_ACCESS
CALLER_FIELD = protoPayload.authenticationInfo.principalEmail
TARGET_FIELD = resource.labels.email_id
RESOURCE_TYPE = service_account
```

Relevant exact method names and Token Creator permissions are:

| Method | Relevant permission in `roles/iam.serviceAccountTokenCreator` | Included in query |
| --- | --- | --- |
| `GenerateAccessToken` | `iam.serviceAccounts.getAccessToken` | yes |
| `GenerateIdToken` | `iam.serviceAccounts.getOpenIdToken` | yes |
| `SignBlob` | `iam.serviceAccounts.signBlob` | yes |
| `SignJwt` | `iam.serviceAccounts.signJwt` | yes |

`GenerateIdToken` is included because the official role and audit contracts
identify it as a Token Creator capability. No unrelated IAM method is included.

Authoritative references:

- [Service Account Credentials audit logging](https://cloud.google.com/iam/docs/audit-logging/audit-logging-iamcreds)
- [Service-account audit-log examples](https://cloud.google.com/iam/docs/audit-logging/examples-service-accounts)
- [`gcloud logging read`](https://cloud.google.com/sdk/gcloud/reference/logging/read)
- [Cloud Logging storage and retention](https://cloud.google.com/logging/docs/store-log-entries)

```text
AUDIT_LOG_SERVICE_CONTRACT = VERIFIED
AUDIT_LOG_METHOD_CONTRACT = VERIFIED
TARGET_SERVICE_ACCOUNT_EXTRACTION = VERIFIED
```

## 3. Availability and retention limits

Service Account Credentials methods generate Data Access audit logs. Google
documents that these logs cannot be enabled independently; IAM API Data Access
logging, or Data Access logging for all services, must be enabled. Data Access
logging is generally disabled by default and requires Private Logs Viewer-level
access to read.

Data Access entries are normally stored in `_Default`, whose default retention
is 30 days but can be configured or excluded/routed. This approval does not add
a second query for logging configuration or bucket inventory.

Consequences:

- a matching event is strong evidence of recent use;
- an empty exact-principal query does not by itself prove logging was enabled;
- unless independent retained evidence proves sufficient availability for the
  full period, an empty result is `UNRESOLVED_LOG_EVIDENCE`, not `NEVER_USED` or
  `SAFE_TO_REMOVE`; and
- the execution report must state its actual observable window.

```text
AUDIT_LOGGING_AVAILABILITY_BEFORE_QUERY = UNVERIFIED
DEFAULT_DATA_ACCESS_RETENTION = 30 days, configurable
```

## 4. Canonical query filter

The canonical one-line filter template is:

```text
logName="projects/my-management-app-8a933/logs/cloudaudit.googleapis.com%2Fdata_access" AND protoPayload.serviceName="iamcredentials.googleapis.com" AND protoPayload.authenticationInfo.principalEmail="firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com" AND (protoPayload.methodName="GenerateAccessToken" OR protoPayload.methodName="GenerateIdToken" OR protoPayload.methodName="SignBlob" OR protoPayload.methodName="SignJwt")
```

```text
QUERY_FILTER_FINGERPRINT = sha256:cb634139ac38b37efe47b2954b730c1856772e743250ca18378880542526048d
```

The project is constrained both by the exact `logName` and the explicit
`--project` argument. The caller comparison is exact, not substring-based. The
target is intentionally not filtered because discovering the exact target is
the purpose of the query.

## 5. Prepared query, not approved

The following is reviewed command text only. It must not run in B3B1.

```powershell
# NOT APPROVED FOR EXECUTION
$ProjectId = 'my-management-app-8a933'
$Filter = 'logName="projects/my-management-app-8a933/logs/cloudaudit.googleapis.com%2Fdata_access" AND protoPayload.serviceName="iamcredentials.googleapis.com" AND protoPayload.authenticationInfo.principalEmail="firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com" AND (protoPayload.methodName="GenerateAccessToken" OR protoPayload.methodName="GenerateIdToken" OR protoPayload.methodName="SignBlob" OR protoPayload.methodName="SignJwt")'

gcloud logging read $Filter `
  --project=$ProjectId `
  --freshness=30d `
  --order=desc `
  --limit=100 `
  --format='json(timestamp,protoPayload.methodName,protoPayload.authenticationInfo.principalEmail,protoPayload.status.code,resource.type,resource.labels.email_id)' `
  --verbosity=error `
  --quiet
```

The execution package must record its UTC end time immediately before the call
and derive the start time as exactly 30 days earlier. `--freshness=30d` anchors
the descending query to execution time and avoids a second query.

The output projection excludes request, response, authorization details, raw
metadata, tokens, JWTs, signatures, and key material. It includes only fields
needed for local classification.

## 6. Query limits, pagination, retry, and timeout

```text
PRIMARY_LOOKBACK_DAYS = 30
MAX_LOG_QUERY_LOGICAL_CALLS = 1
MAX_RESULT_ENTRIES = 100
AUTO_PAGINATION_BOUNDED = yes
MANUAL_PAGINATION = prohibited
RETRY_POLICY = NO_MANUAL_RETRY; GCLOUD_INTERNAL_TRANSPORT_RETRIES_NOT_EXPOSED
OUTER_PROCESS_TIMEOUT_SECONDS = 60
```

`gcloud logging read --limit=100` hard-bounds returned entries, but the CLI may
perform internal backend pagination or transport retries to satisfy that one
logical command. The exact backend attempt count is not guaranteed by the CLI.
The execution report must distinguish:

```text
LOGICAL_QUERY_COUNT = 0 or 1
TRANSPORT_ATTEMPT_COUNT = UNOBSERVED_BY_GCLOUD unless independently available
```

No manual retry is permitted. The execution runner must enforce a 60-second
outer deadline without persisting raw output. Timeout, truncation, malformed
output, or more than 100 returned entries stops the package. It must not issue a
broader or second query.

## 7. Minimal local extraction

For each returned entry, retain only:

```text
timestamp
method category
caller fingerprint
target service-account resource/email
target fingerprint
status classification
```

Group deterministically by:

```text
CALLER_FINGERPRINT + TARGET_FINGERPRINT + METHOD + STATUS
```

Then report `EVENT_COUNT`, `FIRST_SEEN`, and `LAST_SEEN`. Do not persist duplicate
raw entries or the exact caller email beyond the approved evidence header.

Status classification:

- absent or zero `protoPayload.status.code`: `SUCCESSFUL_USE`;
- nonzero status code: `FAILED_ATTEMPT`;
- malformed or unavailable status: `UNKNOWN_STATUS`.

A failed attempt is not proof of a legitimate dependency. If
`resource.labels.email_id` is absent or malformed, classify the target as
unresolved; do not inspect `protoPayload.request` as an automatic fallback.

## 8. Result mapping

| Evidence | `TOKEN_CREATOR_RECENT_USAGE` | Policy consequence |
| --- | --- | --- |
| successful events, one exact target | `CONFIRMED_SINGLE_TARGET` | exact resource-scoped replacement candidate may be designed; no mutation |
| successful events, multiple exact targets | `CONFIRMED_MULTIPLE_TARGETS` | exact target-set review required; do not assume every target remains necessary |
| events exist but target cannot be extracted | `CONFIRMED_TARGET_UNRESOLVED` | do not guess target |
| zero events and sufficient independent availability evidence | `NO_RECENT_USAGE_EVIDENCE_30D` | combine with local/runtime evidence; do not auto-remove |
| unavailable logging, insufficient retention/schema/access, timeout, or unproven availability after an empty result | `UNRESOLVED_LOG_EVIDENCE` | request only the smallest additional evidence package |

`NO_RECENT_USAGE_EVIDENCE_30D` never equals `NEVER_USED` or automatic removal
approval. A 90-day extension requires a separate approval.

## 9. Abort conditions

```text
PROJECT_ID_MISMATCH
PROJECT_NUMBER_MISMATCH
PRINCIPAL_MISMATCH
AUDIT_LOG_SCHEMA_UNVERIFIED
AUDIT_LOG_CLASS_UNVERIFIED
LOGGING_AVAILABILITY_UNVERIFIED
QUERY_SCOPE_TOO_BROAD
AUTO_PAGINATION_NOT_BOUNDED
RESULT_LIMIT_NOT_BOUNDED
RESULT_TRUNCATED_REQUIRES_NEW_APPROVAL
UNEXPECTED_SERVICE_IN_QUERY
UNRELATED_PRINCIPAL_DATA_REQUIRED
FIRESTORE_ACCESS_REQUIRED
TOKEN_GENERATION_REQUIRED
IAM_MUTATION_REQUIRED
TIMEOUT
LOCAL_RESULT_PARSE_FAILURE
OTHER_FAIL_CLOSED
```

`LOGGING_AVAILABILITY_UNVERIFIED` does not prevent the approved exact query from
finding positive evidence, but it prevents an empty result from being promoted
to `NO_RECENT_USAGE_EVIDENCE_30D` without independent evidence.

## 10. Approval artifact

```json
{
  "type": "TokenCreatorUsageEvidenceApproval",
  "approvalVersion": "1",
  "projectId": "my-management-app-8a933",
  "projectNumber": "607154464656",
  "principal": "firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com",
  "lookbackDays": 30,
  "logService": "iamcredentials.googleapis.com",
  "methodNames": [
    "GenerateAccessToken",
    "GenerateIdToken",
    "SignBlob",
    "SignJwt"
  ],
  "queryFilterFingerprint": "sha256:cb634139ac38b37efe47b2954b730c1856772e743250ca18378880542526048d",
  "resultLimit": 100,
  "autoPagination": "bounded-by-result-limit; backend-page-count-not-guaranteed",
  "retryPolicy": "no-manual-retry; gcloud-internal-transport-retries-not-exposed",
  "timeout": "60s outer process deadline",
  "allowedOutputFields": [
    "timestamp",
    "method category",
    "caller fingerprint",
    "target service-account resource/email",
    "target fingerprint",
    "status classification",
    "event count",
    "first seen",
    "last seen"
  ],
  "approvalTimestamp": null,
  "approvedByUser": false
}
```

## 11. Exact future approval request

> Approve one-time, 30-day bounded Cloud Audit Logs read-only verification for
> project `my-management-app-8a933` / project number `607154464656`. The query
> must match only caller
> `firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com`,
> service `iamcredentials.googleapis.com`, Data Access audit logs, and methods
> `GenerateAccessToken`, `GenerateIdToken`, `SignBlob`, and `SignJwt`. It may run
> one logical query, return at most 100 entries, extract the target only from
> `resource.labels.email_id`, and retain only timestamp, method, caller/target
> fingerprints, target resource/email, status, count, firstSeen, and lastSeen.
> It must not auto-page beyond the 100-entry cap or retry manually. This approval
> does not include another IAM read, a 90-day extension, workload metadata,
> Firestore/Firebase data, service-account keys, raw request/response data,
> token generation, impersonation execution, IAM/API mutation, or deployment.

Creating this document does not grant approval.

## 12. Approval checklist

- [ ] Project exact
- [ ] Principal exact
- [ ] 30-day window accepted
- [ ] IAM Credentials methods verified
- [ ] Audit log class verified
- [ ] Query filter reviewed
- [ ] Result limit fixed at 100
- [ ] Auto-pagination bounded
- [ ] No raw request/response persistence
- [ ] No Firestore
- [ ] No token generation
- [ ] No IAM mutation
- [ ] Explicit user approval granted

## 13. Required values and current approval state

```text
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
AUDIT_LOG_SERVICE_CONTRACT = VERIFIED
AUDIT_LOG_METHOD_CONTRACT = VERIFIED
AUDIT_LOG_CLASS = DATA_ACCESS
TARGET_SERVICE_ACCOUNT_EXTRACTION = VERIFIED

PRIMARY_LOOKBACK_DAYS = 30
OPTIONAL_90D_EXTENSION = SEPARATE_APPROVAL_REQUIRED
MAX_LOG_QUERY_LOGICAL_CALLS = 1
MAX_RESULT_ENTRIES = 100
AUTO_PAGINATION_BOUNDED = yes
RETRY_POLICY = NO_MANUAL_RETRY; GCLOUD_INTERNAL_TRANSPORT_RETRIES_NOT_EXPOSED

B3B2_LOG_READ_APPROVAL = NOT_GRANTED
90D_EXTENSION_APPROVAL = NOT_GRANTED
WORKLOAD_METADATA_APPROVAL = NOT_GRANTED
IAM_MUTATION_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

## 14. Safety accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
CLOUD_AUDIT_LOG_READS = 0
LIVE_IAM_READS = 0
WORKLOAD_METADATA_READS = 0
FIRESTORE_ACCESS = 0
FIRESTORE_READS = 0
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

## 15. Verdict

**`P1_5_C2H2B3B1_BOUNDED_USAGE_EVIDENCE_APPROVAL_GATE_PASS`**

The exact 30-day query is ready for separate approval. It has not run. B3B2 may
execute only this query after explicit user approval; workload metadata, IAM
mutation, Firestore access, and the 90-day extension remain unapproved.
