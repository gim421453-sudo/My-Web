# P1.5-C2H2B2-P Live IAM Read-Only Verification Approval Gate

## 1. Scope and current safety state

This package prepares commands and approval language only. It performs no live
Google Cloud, IAM, Firebase, or Firestore request. The locally suggested name
`myweb-authority-audit-reader` remains a search candidate, not a resolved
principal.

```text
EXPECTED_PROJECT_ID = my-management-app-8a933
EXPECTED_PROJECT_NUMBER = 607154464656
EXPECTED_FIRESTORE_DATABASE_ID = (default)
APPROVED_WORKSPACE_ID = NOT_APPROVED

LIVE_GOOGLE_CLOUD_IAM_READS = 0
PRODUCTION_FIREBASE_ACCESS = 0
PRODUCTION_FIRESTORE_READS = 0
PRODUCTION_FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
```

The local machine does not currently expose a `gcloud` executable. No package,
CLI, SDK, or dependency was installed to compensate for that absence.

## 2. Exact future read boundary

The future B2 execution may read only:

1. project metadata needed to cross-check the project ID and number;
2. service-account metadata in the exact project, filtered locally to the
   candidate name;
3. the project IAM policy, once, to isolate roles granted to the resolved audit
   service account and project-level Token Creator bindings;
4. the IAM policy of the exact resolved service-account resource, once;
5. an exact custom-role definition only when such a role is bound to the audit
   service account.

It may not read Firestore metadata or documents, list collection IDs, mint a
token, test impersonation, inspect keys, change IAM, enable APIs, or deploy.
Workspace selection remains outside B2.

## 3. Preconditions and local variables

The commands below are a reviewed future command set. They are not authorized
by this document and were not executed. A future operator must use a clean
PowerShell and set only non-secret local variables:

```powershell
$ExpectedProjectId = 'my-management-app-8a933'
$ExpectedProjectNumber = '607154464656'
$CandidateLocalPart = 'myweb-authority-audit-reader'
```

Abort before the first live call unless the user has approved the exact text in
section 13. Never rely on `gcloud config get-value project` as authority.

## 4. Command 0: project identity cross-check

This is one Google Cloud project-metadata read, not a Firestore read:

```powershell
$Project = gcloud projects describe $ExpectedProjectId `
  --format='json(projectId,projectNumber)'
$Project = $Project | ConvertFrom-Json
if ($Project.projectId -ne $ExpectedProjectId) { throw 'PROJECT_ID_MISMATCH' }
if ([string]$Project.projectNumber -ne $ExpectedProjectNumber) {
  throw 'PROJECT_NUMBER_MISMATCH'
}
```

Any command failure or mismatch aborts all remaining calls. The explicit
project resource is the positional argument; no default project is trusted.

## 5. Command 1: exact audit-principal resolution

This command reads service-account metadata only. It does not request or list
keys. The project is explicit.

```powershell
$ServiceAccounts = gcloud iam service-accounts list `
  --project=$ExpectedProjectId `
  --filter="email~'^$CandidateLocalPart@'" `
  --format='json(email,name,uniqueId,displayName,disabled)'
$ServiceAccounts = @($ServiceAccounts | ConvertFrom-Json)
$ExactMatches = @($ServiceAccounts | Where-Object {
  $_.email -match "^$([regex]::Escape($CandidateLocalPart))@" -and
  $_.name -like "projects/$ExpectedProjectId/serviceAccounts/*"
})
```

Resolution policy:

| Match count | Result | Next action |
| ---: | --- | --- |
| `0` | `AUDIT_PRINCIPAL_NOT_FOUND` | abort |
| `1` | plausible exact match | continue only if not disabled |
| `>1` | `MULTIPLE_AUDIT_PRINCIPALS` | abort for manual selection |

The result must supply the exact email, resource name, unique ID, display name,
and disabled state. The email must not be constructed from the project naming
convention. A disabled match returns `AUDIT_PRINCIPAL_DISABLED`.

After the one-match gate only:

```powershell
$AuditServiceAccount = $ExactMatches[0]
$AuditServiceAccountEmail = [string]$AuditServiceAccount.email
$AuditServiceAccountMember = "serviceAccount:$AuditServiceAccountEmail"
```

## 6. Command 2: project roles and broad impersonation scope

Read the project IAM policy exactly once. Keep it in memory and print only
bindings relevant to the exact audit member or Token Creator scope. Do not save
the unfiltered policy to disk or print it.

```powershell
$ProjectPolicyJson = gcloud projects get-iam-policy $ExpectedProjectId `
  --format=json
$ProjectPolicy = $ProjectPolicyJson | ConvertFrom-Json

$AuditProjectBindings = @($ProjectPolicy.bindings | Where-Object {
  @($_.members) -contains $AuditServiceAccountMember
} | ForEach-Object {
  [pscustomobject]@{ role = $_.role; member = $AuditServiceAccountMember }
})

$ProjectTokenCreatorBindings = @($ProjectPolicy.bindings | Where-Object {
  $_.role -eq 'roles/iam.serviceAccountTokenCreator'
} | ForEach-Object {
  foreach ($Member in @($_.members)) {
    [pscustomobject]@{ role = $_.role; member = $Member }
  }
})

$AuditProjectBindings | Format-Table -AutoSize
$ProjectTokenCreatorBindings | Format-Table -AutoSize
```

The report must enumerate every project-level role bound to the exact audit
member. `roles/datastore.viewer` establishes the expected predefined-role
evidence for `datastore.entities.list`. Absence returns
`DATA_READ_PERMISSION_MISSING` unless another role is subsequently proven to
contain the permission.

Fail closed on these roles or equivalents:

- `roles/owner`, `roles/editor`;
- Firebase administrative roles;
- Datastore/Firestore owner, admin, writer, user, or import/export roles with
  material entity mutation capability;
- any broad administrative role not affirmatively classified;
- any custom role before its included permissions are reviewed.

The project-level Token Creator output is used only to classify broad
impersonation scope. It does not prove that any displayed principal is the
approved future caller.

## 7. Conditional custom-role read

For every project custom role bound to the exact audit member, one separately
counted read is allowed only after its full role name is found in Command 2.
Convert `projects/{project}/roles/{roleId}` to its terminal role ID and keep the
same explicit project:

```powershell
$CustomRole = gcloud iam roles describe $ExactProjectCustomRoleId `
  --project=$ExpectedProjectId `
  --format='json(name,title,stage,includedPermissions)'
```

Accept only after confirming that the role includes the required list
permission and excludes data mutation and broad administrative permissions.
An organization-level custom role is not covered by this command set because no
approved organization resource is known. Its presence returns
`CUSTOM_ROLE_REQUIRES_REVIEW`; do not infer safety.

## 8. Command 3: exact service-account resource IAM policy

Run only after exactly one enabled service account is resolved. The resource is
the exact account and the project is explicit:

```powershell
$ServiceAccountPolicyJson = gcloud iam service-accounts get-iam-policy `
  $AuditServiceAccountEmail `
  --project=$ExpectedProjectId `
  --format=json
$ServiceAccountPolicy = $ServiceAccountPolicyJson | ConvertFrom-Json
$ServiceAccountTokenCreators = @($ServiceAccountPolicy.bindings |
  Where-Object { $_.role -eq 'roles/iam.serviceAccountTokenCreator' } |
  ForEach-Object {
    foreach ($Member in @($_.members)) {
      [pscustomobject]@{ role = $_.role; member = $Member }
    }
  })
$ServiceAccountTokenCreators | Format-Table -AutoSize
```

No access token is generated. Policy evidence alone determines whether an exact
principal has `iam.serviceAccounts.getAccessToken` through the common Token
Creator role. Other roles require explicit permission evidence and otherwise
remain `UNKNOWN`.

Impersonation scope classification:

| Service-account policy | Project policy | Classification |
| --- | --- | --- |
| binding present | none | `SERVICE_ACCOUNT_RESOURCE_SCOPED` |
| none | binding present | `PROJECT_SCOPED` |
| binding present | binding present | `BOTH` |
| none | none | `NONE` |
| read or role classification incomplete | any | `UNKNOWN` |

`PROJECT_SCOPED` and `BOTH` require policy review; they are not automatically
accepted. No first principal is automatically selected as the exact authorized
caller.

## 9. Read accounting and hard ceilings

| Counter | Maximum | Notes |
| --- | ---: | --- |
| `PROJECT_METADATA_READ_CALLS` | `1` | project ID/number cross-check |
| `SERVICE_ACCOUNT_LIST_READ_CALLS` | `1` | candidate resolution |
| `PROJECT_IAM_POLICY_READ_CALLS` | `1` | roles for audit SA plus project Token Creator bindings |
| `SERVICE_ACCOUNT_IAM_POLICY_READ_CALLS` | `1` | exact SA resource only |
| `CUSTOM_ROLE_READ_CALLS` | number of exact project custom roles encountered | each separately reported; no organization role read |
| `FIRESTORE_CALLS` | `0` | hard invariant |
| `ACCESS_TOKEN_CALLS` | `0` | hard invariant |

There is no automatic retry. Any nonzero exit, malformed output, authorization
failure, project mismatch, or incomplete classification aborts the sequence and
is reported as `IAM_READ_FAILED` or the more specific fail-closed category.

## 10. Result model

```text
AUDIT_SERVICE_ACCOUNT_EMAIL
AUDIT_SERVICE_ACCOUNT_UNIQUE_ID
AUDIT_SERVICE_ACCOUNT_DISABLED
AUDIT_SERVICE_ACCOUNT_MATCH_COUNT
PROJECT_DATA_ROLES
DATASTORE_VIEWER_BOUND
DATASTORE_ENTITIES_LIST_SATISFIED
UNEXPECTED_WRITE_CAPABLE_ROLE_COUNT
CUSTOM_ROLE_COUNT
SERVICE_ACCOUNT_IMPERSONATION_BINDINGS
PROJECT_LEVEL_TOKEN_CREATOR_BINDINGS
IMPERSONATION_RESOURCE_SCOPE
EXACT_IMPERSONATING_PRINCIPAL
IAM_TECHNICAL_RESULT
```

Raw policy objects must not appear in the report. Report only the minimum role,
member, account metadata, classifications, and counters required above.

## 11. Fail-closed categories

```text
AUDIT_PRINCIPAL_NOT_FOUND
MULTIPLE_AUDIT_PRINCIPALS
AUDIT_PRINCIPAL_DISABLED
DATA_READ_PERMISSION_MISSING
UNEXPECTED_WRITE_CAPABLE_ROLE
CUSTOM_ROLE_REQUIRES_REVIEW
IMPERSONATION_PERMISSION_MISSING
IMPERSONATION_SCOPE_TOO_BROAD_REQUIRES_REVIEW
PROJECT_ID_MISMATCH
PROJECT_NUMBER_MISMATCH
IAM_READ_FAILED
OTHER_FAIL_CLOSED
```

No category is translated into success, credential fallback, token generation,
or Firestore access.

## 12. Prepared-command mutation review

The executable command set contains only these Google Cloud read verbs:

```text
gcloud projects describe
gcloud iam service-accounts list
gcloud projects get-iam-policy
gcloud iam roles describe
gcloud iam service-accounts get-iam-policy
```

It contains no service-account key command, policy setter, binding adder or
remover, resource create/delete/disable/enable command, service enablement,
token generation, impersonation flag, Firebase command, or Firestore endpoint.
PowerShell operations only filter in-memory output and enforce abort gates.

## 13. Exact future user approval request

> Approve one-time read-only Google Cloud IAM verification for project
> `my-management-app-8a933` / project number `607154464656` to resolve the exact
> myweb authority audit service account, inspect only project IAM bindings
> relevant to that account, project-level Token Creator scope, and IAM policy on
> that exact service-account resource, and conditionally inspect exact project
> custom-role permission definitions if encountered. This does not authorize
> Firestore access, ListCollectionIds, document reads, token generation,
> impersonation execution, IAM or API changes, deployment, or data writes.

This approval is **not granted** by creating or reading this document. The user
must explicitly approve it in a later task before any command above is run.

## 14. Approval checklist

- [x] Project ID scope reviewed
- [x] Project number reviewed
- [x] Exact read-only command set reviewed
- [x] No Firestore command included
- [x] No token-generation command included
- [x] No IAM mutation command included
- [x] No API mutation command included
- [x] Output minimized
- [x] Custom-role fail-closed policy defined
- [ ] Explicit user approval granted

## 15. Required final values

```text
LIVE_IAM_VERIFICATION_COMMAND_SET_READY = yes
AUDIT_SERVICE_ACCOUNT_SEARCH_CANDIDATE = myweb-authority-audit-reader
LIVE_PROJECT_ID = my-management-app-8a933
LIVE_PROJECT_NUMBER = 607154464656
APPROVED_WORKSPACE_ID = NOT_APPROVED

LIVE_IAM_READ_APPROVAL = NOT_GRANTED
FIRESTORE_READ_APPROVAL = NOT_GRANTED
ACCESS_TOKEN_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_AUTHORIZED = no

LIVE_GOOGLE_CLOUD_IAM_READS = 0
PRODUCTION_FIREBASE_ACCESS = 0
PRODUCTION_FIRESTORE_READS = 0
PRODUCTION_FIRESTORE_WRITES = 0
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

## 16. Verdict

**`P1_5_C2H2B2P_LIVE_IAM_VERIFICATION_APPROVAL_GATE_PASS`**

This verdict means only that the exact live IAM read-only procedure is narrow,
fail closed, and ready to present for permission. It does not authorize live IAM
access and does not advance Stage 1 beyond `STAGE1_EXECUTION_AUTHORIZED = no`.

If the user later grants the exact approval in section 13, the next package may
be `P1.5-C2H2B2 - Exact Audit Principal and Live IAM Binding Read-Only
Verification`. It must preserve Firestore calls `0`, ListCollectionIds calls
`0`, access-token generation `0`, and IAM mutations `0`.
