# P1.5-C2H2E3C0 Minimal Exact-State-Read IAM Approval Gate

## Verdict

`P1_5_C2H2E3C0_MINIMAL_STATE_READ_IAM_APPROVAL_GATE_PASS`

This document designs a future IAM-only approval boundary. It makes no live
IAM or Firestore call, creates no token, and changes no canonical record,
manifest, Rule, index, or Git state.

## Locked Class Read Identity

```text
TARGET_WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_CLASS_ID = class_2026_g2_c5
REAL_CLASS_PLAN_ID_FULL = 2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1
REAL_CLASS_SOURCE_FINGERPRINT_FULL = sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da
FUTURE_EXACT_STATE_READ_PATH = projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5
```

The E3B input remains a `NEW_BOOTSTRAP_CREATE` proposal. Production target
existence and CAS state remain unknown. A changed workspace, Class ID, plan ID,
or source fingerprint requires `PLAN_REAPPROVAL_REQUIRED`; C0 must not reuse
this design for a changed input.

## Local IAM Evidence

The approved local B5 result records only the following historical state. It
does not prove current live IAM state, and C0 performs no live recheck.

```text
AUDIT_SERVICE_ACCOUNT = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
CURRENT_STAGE1_ROLE = mywebStage1CollectionIdReader
CURRENT_STAGE1_ROLE_PERMISSIONS = [datastore.entities.list]
CURRENT_AUDIT_SA_GET_PERMISSION = absent
ACTIVE_CALLER_TOKEN_CREATOR_SCOPE = EXACT_AUDIT_SA_RESOURCE_ONLY
FIREBASE_ADMIN_PROJECT_TOKEN_CREATOR = absent
```

`mywebStage1CollectionIdReader` is the approved historical collection-ID
discovery role. It must remain semantically and mechanically unchanged:

```text
CURRENT_STAGE1_ROLE_WILL_BE_MODIFIED = no
DO_NOT_MODIFY_EXISTING_STAGE1_ROLE = yes
```

The pre-existing caller-to-audit-SA resource-only Token Creator grant is
expected to remain present. C0A must prove that exact precondition before a
mutation, but must not add a project-wide caller grant. The Firebase Admin SDK
service account is not an allowed fallback, and its project-wide Token Creator
edge must remain absent.

## Proposed Separate Custom Role

The local naming convention includes `mywebStage1CollectionIdReader`. The
following name is therefore a semantic candidate, not a claim that the live
role ID is unused:

```text
PROPOSED_CUSTOM_ROLE_ID = mywebCanonicalStateReader
PROPOSED_CUSTOM_ROLE_PERMISSIONS = [datastore.entities.get]
PROPOSED_CUSTOM_ROLE_EXTRA_PERMISSIONS = 0
CUSTOM_ROLE_DEFINITION_SCOPE = PROJECT
EXPECTED_ROLE_BINDING_SCOPE = PROJECT
DOCUMENT_LEVEL_IAM_BINDING_SUPPORTED = unknown
TARGET_PRINCIPAL = serviceAccount:myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
```

The existing local evidence demonstrates project-scoped custom-role binding.
It does not establish document-level Firestore IAM binding mechanics, so C0
does not claim it. Project scope is acceptable only for this dedicated audit
service account, one `datastore.entities.get` permission, and a later
application contract that permits exactly one GetDocument with no query or
list. A future C0A pre-state check must fail closed if the proposed role already
exists with any different permission set or unrelated binding.

The new role must not contain `datastore.entities.list`, create, update,
delete, `datastore.databases.*`, `firebase.*`, `firebaseauth.*`, `iam.*`, or
`resourcemanager.*`. `roles/datastore.viewer`, Owner, Editor, Firebase Admin,
and service-account JSON keys are prohibited.

```text
CALLER_AUDIT_SA_TOKEN_CREATOR_ALREADY_EXPECTED = yes
NEW_CALLER_TOKEN_CREATOR_MUTATION_REQUIRED = no
FIREBASE_ADMIN_BROAD_TOKEN_CREATOR_RECREATED = no
SERVICE_ACCOUNT_JSON_KEY_REQUIRED = no
```

## Future C0A Controlled Mutation Contract

This is not approval to execute C0A. Its maximum normal mutation budget would
be two, after bounded live pre-state checks for project identity, exact custom
role state, project IAM policy, and the exact audit-SA resource policy only if
needed to verify the existing impersonation grant.

```text
MAX_NORMAL_IAM_MUTATIONS = 2
MUTATION_A = create projects/my-management-app-8a933/roles/mywebCanonicalStateReader with exactly datastore.entities.get, if absent
MUTATION_B = bind that exact role only to the exact audit service account at the evidenced project scope
FIRESTORE_READ_INCLUDED_IN_C0A = no
```

If the role already exists with the exact contract, reuse can be considered
only after live pre-state verification. If it has extra or different
permissions, C0A must stop rather than alter it. No human, group, domain,
public, or other service-account principal may receive the role.

Post-state must show the new role with exactly one permission, the audit SA as
the only new principal, no write permission, no list-permission change, and an
unchanged Stage-1 role. An unexpected delta stops the process before any
Firestore action.

```text
ROLLBACK_ORDER = [remove newly-added audit-SA binding, delete newly-created custom role]
```

Rollback may touch only C0-created state. If role creation succeeds but binding
fails, delete only the newly-created and still-unbound role after verification.
If binding succeeds but verification fails, remove that binding first, then
delete only a C0-created role with no other use. Neither branch authorizes a
Firestore test, read, or write.

## Approval Boundary

```text
C0A_IAM_MUTATION_APPROVAL = NOT_GRANTED
ACCESS_TOKEN_APPROVAL = NOT_GRANTED
FIRESTORE_EXACT_READ_APPROVAL = NOT_GRANTED
FIRESTORE_WRITE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
RECOMMENDED_NEXT_ACTION = WAIT_FOR_EXPLICIT_C0A_IAM_MUTATION_APPROVAL
```

Suggested future approval text, not an approval:

> Approve at most two IAM mutations in `my-management-app-8a933`: create a
> separate custom role containing only `datastore.entities.get`, then bind it
> only to the dedicated audit service account. Preserve the existing Stage-1
> role and resource-scoped caller impersonation binding. Do not generate a
> token, read Firestore, write Firestore, persist a manifest, change Rules or
> indexes, or perform Git/deployment actions. Verify the exact IAM post-state
> and fail closed with a reverse-order rollback of only newly-created C0 state.

Even a successful C0A ends at `EXACT_STATE_READ_CAPABILITY_PREPARED`. The
one-token/one-GetDocument operation requires the separate C1/C1A approval.

## Safety Accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
IAM_LIVE_READS = 0
IAM_MUTATIONS = 0
MANIFEST_PERSISTENCE_CALLS = 0
CANONICAL_WRITES = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
