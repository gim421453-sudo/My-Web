# P1.5-C2H2B3B Project Token Creator Narrowing Design

## 1. Scope and verified baseline

This is a policy and command-preflight document only. It performs and authorizes
no IAM, API, Firebase, Firestore, credential, deployment, staging, or commit
operation.

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
DIRTY_COUNT_BEFORE_THIS_DOCUMENT = 132
STAGING = 0

GRANTEE = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
ROLE = roles/iam.serviceAccountTokenCreator
SCOPE = PROJECT
PROJECT = my-management-app-8a933
```

B3A2 verified the current direct project roles and established:

```text
PROJECT_TOKEN_CREATOR_BOUND = yes
FIREBASE_ADMIN_SA_CURRENTLY_HAS_DATASTORE_ENTITIES_LIST = no
FIREBASE_ADMIN_SA_CURRENTLY_HAS_DATASTORE_ENTITIES_GET = no
FIREBASE_ADMIN_SA_CURRENTLY_HAS_DATASTORE_WRITE = no
FIREBASE_ADMIN_SA_HAS_BROAD_PROJECT_ADMIN = no
TRANSITIVE_AUDIT_SA_PATH = PRESENT
WOULD_AUDIT_SA_DATA_ROLE_CREATE_NEW_EFFECTIVE_DATA_CAPABILITY = YES
EXISTING_BROAD_BINDING_STAGE1_STATUS = BLOCK_STAGE1_PENDING_NARROWING
```

No live result is re-read here. Binding origin remains `NOT_ESTABLISHED`.

## 2. Security problem and target property

A project-level Token Creator grant is inherited across service-account
resources in the project. The grantee can therefore potentially sign as or
impersonate the future audit service account. Granting that audit account
`datastore.entities.list` would create a new transitive data capability.

The required future property is:

```text
FIREBASE_ADMIN_SA_CAN_IMPERSONATE_AUDIT_SA = no
```

No exception is implied by both accounts being in the same project. Any
exception requires a separately approved, documented risk decision.

## 3. Current dependency evidence

Local and retained evidence shows:

- no active `createCustomToken`, `signBlob`, `signJwt`, or
  `generateAccessToken` call;
- no direct runtime, signing, or impersonation reference to the exact Firebase
  Admin SDK service account;
- production Functions count previously verified as zero;
- historical/manual key-file evidence, but no proven current runtime use; and
- no established origin for the broad binding.

Repository absence does not prove production non-use or a managed Firebase
dependency is absent.

```text
CURRENT_BINDING_DEPENDENCY = UNRESOLVED_FOR_REMOVAL
```

## 4. Remediation option matrix

| Option | Security effect | Functional risk | Evidence required | Current status |
| --- | --- | --- | --- | --- |
| A. Remove project-wide binding without replacement | eliminates the broad transitive path | unknown dependency could regress | evidence that no current caller/target operation needs it | `UNRESOLVED`; not executable |
| B. Replace with resource-scoped binding | limits Token Creator to exact required target account(s) | wrong target or missing operation could regress | exact caller, target SA, operation, reason, workload linkage, rollback | structurally preferred; `TARGET_UNRESOLVED` |
| C. Keep broad binding | preserves unknown dependency | transitive audit-SA capability remains | explicit residual-risk acceptance or continued Stage-1 block | not preferred; Stage 1 remains blocked |
| D. Isolate the audit architecture | can avoid placing audit SA inside the broad impersonation scope | added architecture and operations complexity | proof that isolation is materially safer and maintainable | `NEEDS_REVIEW`; not currently recommended |

### Option A: removal without replacement

This becomes eligible only after dependency evidence supports that no current
Firebase, application, managed, historical, or manual workflow needs the grant.
Its security benefit is complete removal of this project-wide impersonation
edge. Its principal risk is an outage in an unidentified signing workflow.

### Option B: resource-scoped replacement

If a dependency exists, the preferred architecture is:

```text
exact Firebase Admin SDK caller
  -> roles/iam.serviceAccountTokenCreator
  -> exact verified target service-account resource only
```

The target must not be guessed. In particular, App Engine default, Compute
default, an arbitrary runtime account, and the audit SA are not candidates
without direct evidence.

### Option C: keep broad binding

Keeping the binding is operationally conservative but leaves the confirmed
transitive path. The audit SA must not receive `datastore.entities.list` under
the current least-privilege policy unless a separate residual-risk exception is
approved.

### Option D: alternative audit architecture

Possible concepts include a principal outside the service-account inheritance
scope, a narrowly permissioned direct human/caller identity, or project-level
isolation. None is selected or implemented here. Narrowing the existing grant
is preferred unless evidence shows an alternative is materially safer.

## 5. Minimum dependency evidence sequence

The unresolved question is:

> What exact service account, if any, does the Firebase Admin SDK service
> account currently need to impersonate or sign as, for which exact operation?

Use the following tiers and stop when that question is resolved:

1. **Tier 1:** existing local evidence and the already captured B2/B3A2 IAM
   evidence. This tier is exhausted but does not prove safe removal.
2. **Tier 2:** separately approved, bounded IAM Credentials usage evidence for
   the exact Firebase Admin SDK principal.
3. **Tier 3:** separately approved minimal workload identity metadata only if
   Tier 2 cannot resolve a plausible current dependency.

### Tier 2 approval design

The next approval gate should permit a maximum 30-day, principal-filtered query
for verified IAM Credentials audit method names corresponding to
`GenerateAccessToken`, `SignBlob`, and `SignJwt`. Retain only method, timestamp
bucket, caller, target service-account resource if available, count, and status.
Do not persist raw log payloads, credentials, or unrelated principals.

A 90-day extension requires another approval. No recent event means
`NO_RECENT_USAGE_EVIDENCE`, not `UNUSED`.

### Tier 3 design

If still necessary, inspect only plausibly relevant MY WEB workloads among
Cloud Functions, Cloud Run, App Engine, and Firebase App Hosting. Return only
deployment presence, runtime service account, exact Firebase Admin SDK SA
reference, and signing/impersonation dependency. Do not perform a full project
inventory or read application data or secrets.

Dependency evidence must distinguish:

```text
USER_APPLICATION_DEPENDENCY
GOOGLE_OR_FIREBASE_MANAGED_DEPENDENCY
HISTORICAL_OR_MANUAL_DEPENDENCY
NO_RECENT_USAGE_EVIDENCE
UNKNOWN
```

## 6. Safe narrowing state machine

```text
S0_CURRENT_BROAD_BINDING
  -> S1_DEPENDENCY_RESOLVED
  -> S2_REPLACEMENT_BINDING_PREPARED (only if needed)
  -> S3_PROJECT_BINDING_REMOVAL_APPROVED
  -> S4_REPLACEMENT_BINDING_APPLIED (only if needed)
  -> S5_PROJECT_BINDING_REMOVED
  -> S6_POST_CHANGE_IAM_VERIFIED
  -> S7_FUNCTIONAL_VERIFICATION
  -> S8_STAGE1_IAM_UNBLOCKED
```

No transition may be skipped. Every mutation state requires a fresh explicit
approval, exact before-state capture, failure counters, and an abort path.

If replacement is required, the future order is:

1. capture exact project and target-resource IAM before-state and version/etag;
2. add only the exact resource-scoped replacement binding;
3. verify that replacement from a new read;
4. remove only the exact project-level binding;
5. verify the broad binding is absent;
6. run narrowly defined dependency functional verification; and
7. retain minimized rollback evidence.

If no replacement is required, omit S2/S4 and remove only after dependency
absence and mutation approval are established.

## 7. Mutation command preflight, not approved

The following templates document exact future intent. They must not run under
this package.

Project-wide removal candidate:

```powershell
# NOT APPROVED FOR EXECUTION
gcloud projects remove-iam-policy-binding 'my-management-app-8a933' `
  --member='serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com' `
  --role='roles/iam.serviceAccountTokenCreator' `
  --condition=None
```

Conditional resource-scoped replacement, only after `$VerifiedTargetSa` is
resolved from approved evidence:

```powershell
# NOT APPROVED; $VerifiedTargetSa MUST NOT be guessed
gcloud iam service-accounts add-iam-policy-binding $VerifiedTargetSa `
  --project='my-management-app-8a933' `
  --member='serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com' `
  --role='roles/iam.serviceAccountTokenCreator' `
  --condition=None
```

Any future mutation package must verify that current state still matches the
approved before-state and fail on concurrent IAM changes. It must not use
Owner, Editor, Firebase Admin, a guessed target, or a broader fallback.

## 8. Exact rollback design

The only project-level grant that rollback may restore is:

```text
principal = firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com
role = roles/iam.serviceAccountTokenCreator
project = my-management-app-8a933
condition = none
```

Exact project-level rollback template:

```powershell
# NOT APPROVED FOR EXECUTION
gcloud projects add-iam-policy-binding 'my-management-app-8a933' `
  --member='serviceAccount:firebase-adminsdk-fbsvc@my-management-app-8a933.iam.gserviceaccount.com' `
  --role='roles/iam.serviceAccountTokenCreator' `
  --condition=None
```

Rollback cases:

| Failure point | Safe rollback order |
| --- | --- |
| A. Replacement added; broad grant still present | verify broad grant remains; remove only the exact new replacement if abandoning the change |
| B. Broad grant removed; replacement remains | restore exact broad grant first and verify it; then decide whether the replacement should be removed |
| C. Functional regression after broad removal | restore and verify the exact broad grant before changing the replacement; re-run only the affected functional check |

Rollback must never add Owner, Editor, Firebase Admin, another principal, or an
unapproved condition. A replacement must not be removed before prior
functionality is restored when that could prolong an outage.

## 9. Functional verification boundary

Post-narrowing verification may test only a feature proven to depend on the
Token Creator grant. It must not use ListCollectionIds, migration source reads,
or Stage-1 Firestore access as a functional test.

If no active dependency can be safely exercised:

```text
FUNCTIONAL_VERIFICATION = LIMITED_TO_IAM_AND_RUNTIME_METADATA
```

No production action should be invented merely to test IAM.

## 10. Relationship to Stage 1

The audit SA remains unchanged:

```text
AUDIT_SA_DATASTORE_ENTITIES_LIST = NOT_GRANTED
AUDIT_SA_CUSTOM_ROLE = NOT_CREATED
```

Stage 1 may return to B4 only after one of these separately approved outcomes:

1. the project-wide Token Creator grant is safely removed or narrowed;
2. an alternative architecture eliminates the Firebase Admin SA to audit-SA
   transitive path; or
3. the user explicitly accepts the documented residual risk as a policy
   exception.

The default preference is safe removal or exact resource-scoped narrowing.

## 11. Legacy key debt

```text
LEGACY_SERVICE_ACCOUNT_KEY_SECURITY_DEBT = PRESENT_CANDIDATE
```

Key inventory, inspection, use, rotation, revocation, and deletion are outside
this package and must remain separate from Token Creator narrowing.

## 12. Final policy matrix

```text
CURRENT_PROJECT_TOKEN_CREATOR_SCOPE = PROJECT
CURRENT_BINDING_DEPENDENCY = UNRESOLVED_FOR_REMOVAL
TRANSITIVE_STAGE1_RISK = CONFIRMED
SAFE_TO_GRANT_AUDIT_DATA_ROLE_NOW = no

REMOVAL_WITHOUT_REPLACEMENT_STATUS = UNRESOLVED
RESOURCE_SCOPED_REPLACEMENT_STATUS = TARGET_UNRESOLVED
ALTERNATIVE_AUDIT_ARCHITECTURE_STATUS = NEEDS_REVIEW

PREFERRED_NARROWING_STRATEGY = RESOLVE_DEPENDENCY_THEN_REMOVE_OR_RESOURCE_SCOPE
TOKEN_CREATOR_NARROWING_DEPENDENCY_EVIDENCE_REQUIRED = yes
DEPENDENCY_EVIDENCE_REQUIRED = yes
RECOMMENDED_NEXT_PACKAGE = P1.5-C2H2B3B1 FIREBASE ADMIN TOKEN-CREATOR BOUNDED USAGE EVIDENCE APPROVAL GATE
```

## 13. Approval and safety status

```text
TOKEN_CREATOR_REMOVAL_APPROVAL = NOT_GRANTED
TOKEN_CREATOR_REPLACEMENT_BINDING_APPROVAL = NOT_GRANTED
AUDIT_DATA_ROLE_APPROVAL = NOT_GRANTED
AUDIT_CALLER_IMPERSONATION_APPROVAL = NOT_GRANTED
STAGE1_EXECUTION_APPROVAL = NOT_GRANTED

LIVE_IAM_READS = 0
CLOUD_AUDIT_LOG_READS = 0
WORKLOAD_METADATA_READS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
FIRESTORE_ACCESS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
LIST_COLLECTION_IDS_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
RUNTIME_CODE_CHANGES = 0
CLIENT_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## 14. Second-pass policy review

- No replacement service account is selected or guessed.
- The command templates are clearly non-executable and contain no hidden helper
  mutation.
- No Firestore test is bundled with IAM dependency verification.
- Rollback restores only the exact existing principal, role, scope, and
  unconditional state.
- Dependency uncertainty remains explicit rather than being translated into
  safe removal.

## 15. Verdict

**`P1_5_C2H2B3B_NEEDS_BOUNDED_USAGE_EVIDENCE`**

The narrowing policy is defined, but removal and replacement remain unsafe to
execute until the exact current dependency and any required target service
account are resolved. The next package is an approval gate only; it must not
query logs automatically or mutate IAM.
