# P1.5-C2H2B3A1 Firebase Admin Live Dependency Verification Approval

## 1. Scope and baseline

This package is a command preflight and approval gate only. It performs no live
Google Cloud, IAM, Cloud Audit Logs, workload, Firebase, or Firestore request.
It does not authorize any later command merely by existing.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
EXPECTED_PROJECT_ID = my-management-app-8a933
EXPECTED_PROJECT_NUMBER = 607154464656
RUNTIME_CODE_CHANGES = 0
```

The retained B2 evidence resolves the exact principal without a new lookup:

```text
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT_MEMBER = serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
PRINCIPAL_RESOLUTION_STATUS = RESOLVED_FROM_EXISTING_EVIDENCE
SOURCE_EVIDENCE = docs/p1-5-c2h2b2-exact-audit-principal-live-iam-verification.md
```

## 2. Central question and stop rule

The minimum verification must ultimately classify:

```text
WOULD_AUDIT_SA_DATA_ROLE_CREATE_NEW_EFFECTIVE_DATA_CAPABILITY_FOR_EXISTING_FIREBASE_ADMIN_SA
= YES / NO / UNRESOLVED
```

The work is split into independent stages. Execute only Stage A after a future
explicit approval. Do not continue to Stage B or C automatically. Stop as soon
as the central question is supported by sufficient evidence.

| Stage | Question | Current approval |
| --- | --- | --- |
| A | exact project roles and direct data capabilities of the Firebase Admin SDK SA | `NOT_GRANTED` |
| B | recent IAM Credentials signing or impersonation usage | `NOT_GRANTED` |
| C | minimal deployed-workload identity metadata | `NOT_GRANTED` |

## 3. Stage A exact read boundary

Stage A is limited to:

1. one project metadata read to verify the exact project ID and number;
2. one project IAM policy read, retained in memory only;
3. immediate extraction of bindings whose member exactly equals the resolved
   Firebase Admin SDK service-account member;
4. one read per exact **project-scoped** custom role encountered in those
   extracted bindings, only when required to classify its permissions.

The project IAM API returns the full allow policy. That implementation fact does
not authorize inspection, printing, or persistence of unrelated bindings. The
command filters the response in memory and emits only roles for the exact
principal. An organization-scoped custom role is an abort condition requiring a
new approval.

Stage A must not read service-account keys, a service-account resource policy,
Cloud Audit Logs, workload metadata, Firestore, or Firebase data. It must not
mint credentials or impersonate any principal.

## 4. Stage A prepared PowerShell

These commands are reviewed text only and were not executed.

```powershell
$ExpectedProjectId = 'my-management-app-8a933'
$ExpectedProjectNumber = '607154464656'
$FirebaseAdminSa = 'firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com'
$FirebaseAdminMember = "serviceAccount:$FirebaseAdminSa"

$Project = gcloud projects describe $ExpectedProjectId `
  --format='json(projectId,projectNumber)' | ConvertFrom-Json

if ($Project.projectId -ne $ExpectedProjectId) {
  throw 'PROJECT_ID_MISMATCH'
}
if ([string]$Project.projectNumber -ne $ExpectedProjectNumber) {
  throw 'PROJECT_NUMBER_MISMATCH'
}

$Policy = gcloud projects get-iam-policy $ExpectedProjectId `
  --format=json | ConvertFrom-Json

$ExactBindings = @($Policy.bindings | Where-Object {
  @($_.members) -contains $FirebaseAdminMember
} | ForEach-Object {
  [pscustomobject]@{ role = [string]$_.role }
})

$ProjectRoles = @($ExactBindings.role | Sort-Object -Unique)
$ProjectRoles

$ProjectCustomRoles = @($ProjectRoles | Where-Object {
  $_ -like "projects/$ExpectedProjectId/roles/*"
})
$OrganizationCustomRoles = @($ProjectRoles | Where-Object {
  $_ -like 'organizations/*/roles/*'
})

if ($OrganizationCustomRoles.Count -gt 0) {
  throw 'ORG_CUSTOM_ROLE_ENCOUNTERED'
}
```

For each exact role in `$ProjectCustomRoles`, and only if encountered:

```powershell
$RoleId = ($ExactProjectCustomRole -split '/')[-1]
$RoleDefinition = gcloud iam roles describe $RoleId `
  --project=$ExpectedProjectId `
  --format='json(name,title,stage,includedPermissions)' | ConvertFrom-Json
```

No automatic retry is allowed. Any command failure, malformed response,
principal mismatch, unexpected scope, or incomplete permission classification
stops Stage A fail closed.

## 5. Stage A result model

Only the following minimized output may be retained:

```text
PROJECT_ROLES = [...]
DOES_IT_ALREADY_HAVE_DATASTORE_ENTITIES_LIST = yes/no/unresolved
DOES_IT_ALREADY_HAVE_DATASTORE_ENTITIES_GET = yes/no/unresolved
DOES_IT_ALREADY_HAVE_FIRESTORE_DATA_WRITE_CAPABILITY = yes/no/unresolved
DOES_IT_HAVE_BROAD_ADMIN_ROLE = yes/no
CUSTOM_ROLE_COUNT = number
NEW_EFFECTIVE_CAPABILITY_FROM_AUDIT_ROLE = LIKELY_NO/POSSIBLE_YES/UNRESOLVED
```

Raw IAM policy content and unrelated members must not be printed or persisted.
Known predefined roles may be classified only from an authoritative role
contract. An unfamiliar role or unclear conditional binding remains
`unresolved`; it is not guessed safe.

Decision after Stage A:

- Existing equivalent or broader data-read authority supports
  `NEW_EFFECTIVE_CAPABILITY_FROM_AUDIT_ROLE = LIKELY_NO`, subject to remaining
  impersonation semantics.
- No equivalent data authority supports `POSSIBLE_YES`; do not grant the audit
  role until the transitive risk is resolved or explicitly accepted.
- Incomplete role or condition evidence remains `UNRESOLVED`.

## 6. Stage B separate approval template

Stage B is initially unnecessary and remains unapproved. Request it only if
Stage A leaves actual Token Creator use materially relevant.

> Approve one bounded read-only Cloud Audit Logs query for project
> `my-management-app-8a933`, limited to the exact Firebase Admin SDK service
> account, IAM Credentials signing or impersonation method families
> (`GenerateAccessToken`, `SignBlob`, and `SignJwt` after verifying their exact
> audit-log names), and a maximum 30-day window. Retain only method category,
> time bucket/count, principal fingerprint, resource type, and call count. This
> does not authorize Firestore access, raw project log export, credential
> payload access, token generation, impersonation, IAM mutation, or deployment.

Permitted classifications are:

```text
RECENT_TOKEN_CREATOR_USAGE_CONFIRMED
NO_RECENT_TOKEN_CREATOR_USAGE_EVIDENCE
LOGGING_NOT_AVAILABLE
LOG_SCOPE_INSUFFICIENT
UNRESOLVED
```

No event in 30 days means only `NO_RECENT_TOKEN_CREATOR_USAGE_EVIDENCE`, never
`NEVER_USED`.

## 7. Stage C separate approval template

Stage C is initially unnecessary and remains unapproved. Request it only if
Stages A and an explicitly approved Stage B still leave a material workload
identity question.

> Approve minimal read-only workload identity metadata inspection in project
> `my-management-app-8a933`, limited to only the specifically named relevant
> services among Cloud Functions, Cloud Run, App Engine, and Firebase App
> Hosting. Return deployment presence and runtime service-account identity only.
> This does not authorize full resource inventory, application configuration or
> secret inspection, restart, revision change, redeploy, identity change,
> Firestore access, token generation, impersonation, or IAM mutation.

Carried prior evidence says deployed Functions were `0`; it is historical
evidence and must not be silently treated as a current live read.

## 8. Final decision and Stage-1 mapping

Use `NO` only when exact evidence shows that the Firebase Admin SDK SA already
has equivalent or broader effective data access, so the proposed audit-SA role
adds no meaningful data capability.

Use `YES` only when all are supported:

1. the Firebase Admin SDK SA lacks equivalent direct data access;
2. the existing project-wide Token Creator binding permits it to impersonate
   the audit SA; and
3. the audit SA would receive `datastore.entities.list`.

Otherwise use `UNRESOLVED`.

| Central result | Stage-1 outcome |
| --- | --- |
| `NO` | `SAFE_TO_RETURN_TO_B4_WITH_EXISTING_BINDING_UNCHANGED` or `PROCEED_WITH_DOCUMENTED_SECURITY_DEBT` |
| `YES` | `BLOCK_STAGE1_PENDING_BINDING_NARROWING_OR_EXPLICIT_RISK_ACCEPTANCE` |
| `UNRESOLVED` | `BLOCK_STAGE1_PENDING_MINIMUM_ADDITIONAL_VERIFICATION` |

The origin of the existing broad binding may remain `NOT_ESTABLISHED`; the
primary question is its effective security impact.

## 9. Abort conditions

```text
PROJECT_ID_MISMATCH
PROJECT_NUMBER_MISMATCH
PRINCIPAL_MISMATCH
UNRELATED_IAM_SCOPE_REQUIRED
ORG_CUSTOM_ROLE_ENCOUNTERED
LOG_QUERY_SCOPE_TOO_BROAD
WORKLOAD_QUERY_SCOPE_TOO_BROAD
FIRESTORE_ACCESS_REQUIRED
TOKEN_GENERATION_REQUIRED
IAM_MUTATION_REQUIRED
OTHER_FAIL_CLOSED
```

## 10. Live-read accounting

| Counter | Stage A ceiling | Current value |
| --- | ---: | ---: |
| `PROJECT_METADATA_READ_CALLS` | `1` | `0` |
| `PROJECT_IAM_POLICY_READ_CALLS` | `1` | `0` |
| `PROJECT_CUSTOM_ROLE_READ_CALLS` | exact encountered project roles only | `0` |
| `CLOUD_AUDIT_LOG_QUERY_CALLS` | `0` | `0` |
| `WORKLOAD_METADATA_READ_CALLS_BY_SERVICE` | `0` | `0` |
| `FIRESTORE_CALLS` | `0` | `0` |
| `ACCESS_TOKEN_CALLS` | `0` | `0` |
| `IAM_MUTATIONS` | `0` | `0` |

## 11. Legacy key security debt

B3A found historical/manual tooling references consistent with JSON-key-file
use for the Firebase Admin SDK account family. No key material was opened,
printed, used, or searched beyond the approved local evidence.

```text
LEGACY_SERVICE_ACCOUNT_KEY_SECURITY_DEBT = PRESENT_CANDIDATE
```

Active key inventory, rotation, revocation, or deletion belongs in a separate
`SERVICE ACCOUNT KEY INVENTORY / ROTATION REVIEW` package.

## 12. Exact Stage A approval request

> Approve one-time Stage A read-only Google Cloud IAM verification for project
> `my-management-app-8a933` / project number `607154464656`. It may read project
> metadata once, read the project IAM policy once, immediately extract only
> roles bound to
> `serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com`,
> and read only exact project-scoped custom-role definitions encountered in
> those extracted bindings when needed for permission classification. The full
> project policy may be returned by the API but must remain in memory and must
> not be printed or persisted. This approval does not include Cloud Audit Logs,
> workload metadata, Firestore or Firebase data, service-account keys, access
> token generation, impersonation execution, IAM/API mutation, deployment, or
> any write.

Creating this document does **not** grant that approval.

## 13. Current approval state and required values

```text
FIREBASE_ADMIN_SDK_SERVICE_ACCOUNT = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
PRINCIPAL_RESOLUTION_STATUS = RESOLVED_FROM_EXISTING_EVIDENCE

STAGE_A_COMMAND_SET_READY = yes
STAGE_A_EXPECTED_PROJECT_IAM_READ_CALLS = 1
STAGE_A_CUSTOM_ROLE_READS_ONLY_IF_ENCOUNTERED = yes
STAGE_B_REQUIRED_INITIALly = no
STAGE_C_REQUIRED_INITIALly = no

LEGACY_SERVICE_ACCOUNT_KEY_SECURITY_DEBT = PRESENT_CANDIDATE

STAGE_A_LIVE_READ_APPROVAL = NOT_GRANTED
STAGE_B_LOG_READ_APPROVAL = NOT_GRANTED
STAGE_C_WORKLOAD_READ_APPROVAL = NOT_GRANTED
IAM_MUTATION_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no
```

## 14. Safety accounting

```text
LIVE_IAM_READS = 0
CLOUD_AUDIT_LOG_READS = 0
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

**`P1_5_C2H2B3A1_LIVE_DEPENDENCY_VERIFICATION_APPROVAL_GATE_PASS`**

The exact principal and narrow Stage A command set are ready for a separate
approval. Stage A has not run. Stage B and C remain independent, unapproved,
and unnecessary initially.
