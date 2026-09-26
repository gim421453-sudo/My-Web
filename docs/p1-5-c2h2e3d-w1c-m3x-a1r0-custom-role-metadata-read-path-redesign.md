# P1.5-C2H2E3D-W1C-M3X-A1R0 Custom Role Metadata Read-Path Redesign

## Verdict

`P1_5_C2H2E3D_W1C_M3X_A1R0_NEW_ROLE_READ_PATH_APPROVAL_GATE_PASS`

This package performed local forensic inspection and synthetic validation only. It
performed no gcloud command, live IAM read, mutation, token operation, impersonation,
Firestore access, Class write, or manifest persistence.

## Prior budget and incident

```text
A1_VERDICT = P1_5_C2H2E3D_W1C_M3X_A1_IAM_EVIDENCE_INCOMPLETE
A1_STAGE1_ROLE_READ_BUDGET = EXHAUSTED
A1_CANONICAL_ROLE_READ_BUDGET = EXHAUSTED
A1_APPROVAL_REUSED = no
```

The prior A1 result correctly kept both role states `UNRESOLVED`; unresolved was not
treated as absence or permission drift.

## Previous read path diagnosis

The previous transient executor used the equivalent of:

```text
gcloud iam roles describe projects/<project>/roles/<roleId> --project <project> --format=json
```

The local Cloud SDK source at
`lib/googlecloudsdk/surface/iam/roles/describe.py` passes the positional role and
parent flags to `iam_util.GetRoleName`. The source at
`lib/googlecloudsdk/command_lib/iam/iam_util.py` rejects a role beginning with
`projects/` when `--project` is also supplied, and rejects slash-containing custom
role IDs. Therefore the last proven step was local process construction; the role
metadata response became unresolved at command validation/nonzero process handling.

```text
A1_ROLE_READ_IMPLEMENTATION = transient PowerShell Json helper invoking gcloud iam roles describe
A1_ROLE_READ_TRANSPORT = gcloud.cmd subprocess with stdout capture and stderr suppression
A1_ROLE_RESOURCE_INPUT_FORM = incorrect full resource plus --project combination
A1_ROLE_OUTPUT_FORMAT = --format=json requested
A1_ROLE_METADATA_PARSER = ConvertFrom-Json; null on nonzero, empty, or parse failure
STAGE1_A1_LAST_PROVEN_STEP = command invocation constructed
STAGE1_A1_UNRESOLVED_AT = Cloud SDK argument validation/nonzero result
CANONICAL_A1_LAST_PROVEN_STEP = command invocation constructed
CANONICAL_A1_UNRESOLVED_AT = Cloud SDK argument validation/nonzero result
A1_ROLE_METADATA_ROOT_CAUSE = WRONG_ROLE_RESOURCE_FORMAT
```

This is a local command-construction diagnosis, not a claim about live role absence.

## Installed SDK contract

The installed SDK source defines custom-role input as a role ID without a resource
prefix and requires exactly one parent flag. The supported future form is:

```text
gcloud iam roles describe mywebStage1CollectionIdReader --project=my-management-app-8a933 --format=json --verbosity=error
gcloud iam roles describe mywebCanonicalStateReader --project=my-management-app-8a933 --format=json --verbosity=error
```

```text
LOCAL_EXACT_ROLE_DESCRIBE_COMMAND_SUPPORTED = yes
LOCAL_EXACT_ROLE_DESCRIBE_SYNTAX = gcloud iam roles describe <ROLE_ID> --project=<PROJECT_ID> --format=json --verbosity=error
NEW_ROLE_READ_METHOD = exact role ID plus exact project scope; structured JSON; exact name and permission validation
NEW_ROLE_READ_USES_EXACT_ROLE_LOOKUP = yes
NEW_ROLE_READ_STRUCTURED_OUTPUT = yes
NEW_ROLE_READ_REQUIRED_FIELDS = [name, includedPermissions, stage, deleted]
NEW_ROLE_READ_VERBOSITY_ARGUMENT = --verbosity=error
HUMAN_FORMAT_ROLE_METADATA_PARSING = no
```

No role list, search, substring filter, organization enumeration, or alternate cloud
API fallback is allowed. Full resource names are accepted only as expected returned
`name` values, never as the positional custom-role argument when `--project` is used.

## Exact classification contract

1. Process exit nonzero, timeout, empty stdout, malformed JSON, missing required field,
   or unexpected response shape produces `UNRESOLVED`.
2. An explicitly classified exact not-found response produces `ABSENT`; generic
   nonzero output never becomes `ABSENT`.
3. Returned `name` must exactly equal the expected full resource name.
4. `deleted=true` produces `DELETED`, never a healthy baseline.
5. Normalize `includedPermissions` as unique sorted strings and compare with no extras
   and no missing permissions.
6. The role `stage` is recorded but does not reject an otherwise exact role unless a
   separately approved policy requires a stage constraint.

```text
DELETED_ROLE_ACCEPTED_AS_BASELINE = no
ROLE_PERMISSION_METADATA_STILL_REQUIRED = yes
UNKNOWN_IAM_STATE_ACCEPTED_AS_SAFE = no
```

## Synthetic validation

The local contract was checked against eight bounded fixtures:

| Fixture | Expected result |
|---|---|
| Stage-1 exact name and `datastore.entities.list` | `EXISTS_EXACT` |
| Canonical exact name and `datastore.entities.get` | `EXISTS_EXACT` |
| Extra permission | `PERMISSION_CONFLICT` |
| Missing permission | `PERMISSION_CONFLICT` |
| Wrong returned resource name | `UNEXPECTED_RESOURCE` / fail |
| Explicit not-found classification | `ABSENT` |
| Unknown nonzero or malformed JSON | `UNRESOLVED` |
| Deleted role | `DELETED` / not safe baseline |

No live cloud calls were made for these checks.

## Fresh A1R1 gate prepared, not granted

```text
NEW_STAGE1_ROLE_METADATA_READ_MAX = 1
NEW_CANONICAL_ROLE_METADATA_READ_MAX = 1
NEW_TOTAL_ROLE_METADATA_READ_MAX = 2
NEW_ROLE_METADATA_RETRY_MAX = 0
NEW_PROJECT_IAM_POLICY_READ_MAX = 0
NEW_ACTIVE_CALLER_DISCOVERY_MAX = 0
NEW_IAM_MUTATION_MAX = 0
A1R1_NEW_ROLE_METADATA_READ_APPROVAL = NOT_GRANTED
M3_NEW_LIVE_MUTATION_APPROVAL = NOT_GRANTED
M4_APPROVAL = NOT_GRANTED
```

A1R1 must read only the two exact role IDs with the contract above. It must not read
the project policy again, rediscover the caller, read service-account policies, retry,
or fall back to role listing. Even if both roles are later `EXISTS_EXACT`, M3X remains
closed and requires a separate A2 relock plus new M3 approval.

## Safety and repository accounting

```text
REAL_GCLOUD_COMMANDS = 0
LIVE_IAM_READS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
ACCESS_TOKEN_CALLS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

No credential, token, human principal, full IAM policy, private key, or personal path
is stored in this document. No runtime predicate or production code was changed.
