# P1.5-C2H2B3C0 Token Creator Removal / Residual-Risk Policy

## 1. Scope and baseline

This is a local policy decision only. It performs and authorizes no Google
Cloud, IAM, workload, Firebase, Firestore, token, deployment, or repository
mutation.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 137
STAGING = 0

CURRENT_PROJECT_TOKEN_CREATOR_SCOPE = PROJECT
RECENT_TOKEN_CREATOR_USAGE_EVIDENCE = NO_RECENT_USAGE_EVIDENCE_30D
LOG_EVIDENCE_COVERAGE = SUFFICIENT_FOR_30D_OBSERVATION
TRANSITIVE_STAGE1_RISK = CONFIRMED
```

The 30-day result is meaningful only within its approved Data Access log
boundary. It is not proof of `UNUSED`, `NEVER_USED`, or `SAFE_TO_REMOVE`.

## 2. Evidence ledger

| Evidence | Classification | Policy meaning |
| --- | --- | --- |
| No active local `createCustomToken` | `SUPPORTS_REMOVAL` | no current repository custom-token dependency |
| No active local `SignBlob` | `SUPPORTS_REMOVAL` | no current repository remote blob-signing dependency |
| No active local `SignJwt` | `SUPPORTS_REMOVAL` | no current repository remote JWT-signing dependency |
| No active local `GenerateAccessToken` | `SUPPORTS_REMOVAL` | no current repository access-token dependency through this principal |
| No direct Firebase Admin SDK SA runtime reference | `SUPPORTS_REMOVAL` | configured runtimes do not name the grantee as their identity |
| No direct signing reference | `SUPPORTS_REMOVAL` | no local signing operation needs the binding |
| No direct impersonation reference | `SUPPORTS_REMOVAL` | no local impersonation path uses this grantee |
| Previously verified deployed Functions count `0` | `LIMITED_EVIDENCE` | supports absence but is carried historical evidence, not a fresh inventory |
| Completed 30-day IAM Credentials query returned `0` | `SUPPORTS_REMOVAL` | no recent observed use by the exact caller and methods |
| Binding origin not established | `UNKNOWN` | origin alone does not justify retaining project-wide authority |
| Managed or external workflows not provably absent | `SUPPORTS_KEEPING` | bounded residual regression risk remains |
| Historical/manual JSON-key tooling evidence | `NEUTRAL` | key-local signing does not itself depend on IAM Credentials Token Creator |
| Project-wide scope creates confirmed Stage-1 transitive risk | `SUPPORTS_REMOVAL` | keeping the binding blocks the preferred least-privilege Stage-1 design |

```text
LOCAL_RUNTIME_DEPENDENCY_EVIDENCE = NONE
```

## 3. Workload-metadata value test

| Service | Local evidence of usage | Likely relevant to this Token Creator dependency | Live metadata check value |
| --- | --- | --- | --- |
| Cloud Run | no deployment/configuration evidence | unknown externally, but no local signing path or exact runtime identity reference | `LOW` |
| App Engine | no `app.yaml` or deployment target | no local dependency | `NONE` |
| Firebase App Hosting | no App Hosting configuration | no local dependency | `LOW` |

Cloud Functions is not re-read: existing evidence records zero deployed
Functions and the current Functions entry exports only the trusted-backend
health endpoint. Runtime metadata would show deployment and runtime identity,
but would not establish a signing operation more directly than the completed
caller-and-method-specific logs.

```text
WORKLOAD_METADATA_VERIFICATION_VALUE = LOW
MINIMUM_WORKLOAD_METADATA_VERIFICATION_REQUIRED = no
```

No broad resource inventory, Cloud Asset scan, or further live read is
justified before asking for explicit removal approval.

## 4. Remaining dependency risk

```text
MANAGED_FIREBASE_TOKEN_CREATOR_DEPENDENCY_RISK = LOW
EXTERNAL_WORKFLOW_DEPENDENCY_RISK = LOW
LEGACY_SERVICE_ACCOUNT_KEY_SECURITY_DEBT = PRESENT_CANDIDATE
```

No evidence establishes a Google/Firebase-managed dependency on this broad
grant. Such a dependency remains possible, but the exact caller produced no
approved IAM Credentials events in 30 days and no local managed-runtime
configuration identifies it.

Old scripts, manual external tooling, and non-repository operations cannot be
proved absent. Their current Token Creator risk is low because local tools show
key/ADC credential patterns without the reviewed signing operations, while the
exact live caller showed no recent use. The legacy key concern remains separate
security debt and is not evidence that this IAM binding is required.

## 5. Removal versus replacement

```text
RESOURCE_SCOPED_REPLACEMENT_TARGET = NONE_OBSERVED
RESOURCE_SCOPED_REPLACEMENT_STATUS = NOT_REQUIRED_BY_CURRENT_EVIDENCE
REMOVAL_WITHOUT_REPLACEMENT_STATUS = READY_FOR_APPROVAL
```

No target may be invented. Current evidence supports requesting approval to
remove the project-wide binding without replacement. If a real dependency is
later observed, restore the exact prior binding first, then investigate the
exact target and a resource-scoped replacement.

## 6. Residual risk if removed

| Regression class | Current evidence | Likelihood | Detectability | Rollback speed | Severity |
| --- | --- | --- | --- | --- | --- |
| Custom-token creation | no local call; no 30-day event | low | high through feature failure and IAM error | fast | high if an unknown login flow exists |
| Remote `SignBlob` / `SignJwt` | no local call; no 30-day event | low | high through IAM error | fast | medium-high |
| Service-account access-token generation | no local call; no 30-day event | low | high through IAM error | fast | high for an unknown automation |
| External/manual admin automation | repository cannot exclude it | low | medium; depends on operator reporting | fast | medium-high |
| Managed service workflow | no established dependency | low | medium; surfaced as managed operation failure | fast | high if present |

Functional verification must not manufacture `GenerateAccessToken`,
`SignBlob`, or `SignJwt` traffic. A credible real regression triggers exact
rollback, not a broader role grant.

## 7. Residual risk if kept

Keeping the project-wide binding preserves an impersonation/signing edge over
project service accounts. If the audit SA later receives
`datastore.entities.list`, the Firebase Admin SDK SA gains a new transitive
data-read path. This is a confirmed security consequence, not a theoretical
completeness concern, and it continues to block the preferred Stage-1 design.

```text
SAFE_TO_GRANT_AUDIT_DATA_ROLE_NOW = no
AUDIT_DATA_ROLE_APPROVAL = NOT_GRANTED
```

## 8. Exact rollback readiness

The complete prior binding needed for restoration is known:

```text
PROJECT = my-management-app-8a933
MEMBER = serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
ROLE = roles/iam.serviceAccountTokenCreator
SCOPE = PROJECT
CONDITION = none
EXACT_ROLLBACK_BINDING_KNOWN = yes
```

Future rollback, if separately approved, restores only this exact binding. It
must not add Owner, Editor, Firebase Admin, another member, or a condition.

## 9. Future mutation and verification boundary

The next package may ask for approval for exactly one IAM mutation concept:
remove the exact member above from the project-level
`roles/iam.serviceAccountTokenCreator` binding. It must not bundle audit-SA role
creation, audit-SA data access, caller impersonation, or replacement grants.

After a separately approved future removal, read-only verification should:

1. confirm the exact broad binding is absent from project IAM policy;
2. confirm no unrelated binding changed;
3. confirm the audit SA still lacks `datastore.entities.list` at that point;
4. perform no Firestore call and no token-generation test.

If a credible existing function later fails because of this removal, restore
and verify the exact previous binding, then investigate an exact target. Do not
grant a broad fallback role.

## 10. Policy decision

The available evidence is sufficient to **request explicit approval**, not to
perform removal. Requiring another workload read would add limited information
and would create an unnecessary evidence loop. The broad grant's confirmed
security cost, the aligned local and 30-day evidence, bounded blast radius, and
precise rollback outweigh the remaining low, observable uncertainty.

```text
POLICY_OUTCOME = REMOVAL_APPROVAL_READY_WITH_ROLLBACK
IS_EXISTING_EVIDENCE_SUFFICIENT_TO_REQUEST_REMOVAL_OF_PROJECT_WIDE_TOKEN_CREATOR = YES
TOKEN_CREATOR_REMOVAL_POLICY = READY_FOR_EXPLICIT_APPROVAL
TOKEN_CREATOR_REMOVAL_APPROVAL = NOT_GRANTED
TOKEN_CREATOR_REPLACEMENT_APPROVAL = NOT_GRANTED
IAM_MUTATIONS = 0
STAGE1_EXECUTION_AUTHORIZED = no
```

Recommended next package:

`P1.5-C2H2B3C1 PROJECT-WIDE TOKEN CREATOR REMOVAL MUTATION APPROVAL GATE`

This must remain design/approval-only until the user grants a separate explicit
mutation approval.

## 11. Safety accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
LIVE_IAM_READS = 0
CLOUD_AUDIT_LOG_READS = 0
WORKLOAD_METADATA_READS = 0
FIRESTORE_ACCESS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
ACCESS_TOKEN_GENERATION = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTION = 0
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

## 12. Verdict

`P1_5_C2H2B3C0_REMOVAL_POLICY_DECISION_PASS`

