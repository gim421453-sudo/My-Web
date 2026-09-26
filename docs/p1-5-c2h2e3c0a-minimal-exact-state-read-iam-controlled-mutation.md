# P1.5-C2H2E3C0A Minimal Exact-State-Read IAM Controlled Mutation

## Verdict

`P1_5_C2H2E3C0A_MINIMAL_STATE_READ_IAM_MUTATION_PASS`

This controlled production change prepared one additional IAM data capability
for a later, separately approved exact Class state read. It did not create an
access token, read or write Firestore, persist a manifest, or modify canonical
data. The existing Stage-1 role and caller impersonation binding were
preserved.

## Identity Gates

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
ACTIVE_CALLER_COUNT = 1
ACTIVE_CALLER_FINGERPRINT = sha256/12:5e6692dda08c

AUDIT_SERVICE_ACCOUNT = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
STAGE1_ROLE_EXISTS = yes
STAGE1_ROLE_PERMISSIONS = [datastore.entities.list]
STAGE1_ROLE_CHANGED = no
```

The caller fingerprint and project identity matched the explicit C0A gate.
The active human caller's raw identity was used transiently for IAM comparison
and is not retained here.

The prepared capability remains bound to the approved E3B identity only:

```text
TARGET_WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_CLASS_ID = class_2026_g2_c5
REAL_CLASS_PLAN_ID_FULL = 2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1
REAL_CLASS_SOURCE_FINGERPRINT_FULL = sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da
```

## Role And Binding Result

```text
NEW_CUSTOM_ROLE = projects/my-management-app-8a933/roles/mywebCanonicalStateReader
NEW_ROLE_PRE_STATE = ABSENT
NEW_ROLE_POST_STATE = EXISTS_EXACT
NEW_ROLE_PERMISSIONS = [datastore.entities.get]
NEW_ROLE_EXTRA_PERMISSIONS = 0

AUDIT_SA_NEW_ROLE_BINDING_PRE_STATE = absent
AUDIT_SA_NEW_ROLE_BINDING_POST_STATE = present
AUDIT_SA_DATA_CAPABILITIES_AFTER = [datastore.entities.list, datastore.entities.get]
AUDIT_SA_WRITE_PERMISSION_ADDED = no
NEW_LIST_PERMISSION_ADDED_BY_C0A = no
```

The new role has exactly one permission and exactly one member: the dedicated
audit service account. The prior `mywebStage1CollectionIdReader` role remains
separate and unchanged; the audit SA therefore retains its pre-existing list
capability through that older role. This result must not be described as a
global Get-only capability.

The active caller's existing resource-scoped Token Creator binding was not
changed. No project-wide caller Token Creator binding or Firebase Admin SDK
project-wide Token Creator binding is present.

```text
CALLER_AUDIT_SA_RESOURCE_TOKEN_CREATOR = present
CALLER_PROJECT_WIDE_TOKEN_CREATOR = absent
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR = absent
C0A_TOKEN_CREATOR_MUTATIONS = 0
UNEXPECTED_IAM_DELTA = 0
```

## Mutations And Rollback

```text
MAX_NORMAL_IAM_MUTATIONS = 2
IAM_MUTATIONS_APPLIED = 2
MUTATION_A = CREATE mywebCanonicalStateReader with datastore.entities.get only
MUTATION_B = BIND exact role to exact audit SA at project scope

ROLLBACK_REQUIRED = no
ROLLBACK_EXECUTED = no
ROLLBACK_RESULT = NOT_REQUIRED
ROLLBACK_ORDER = [remove exact new binding, delete only newly-created role]
```

One malformed local command invocation was rejected before the binding API
call because PowerShell split the member argument. It did not change IAM and
was not counted as an applied mutation. The corrected binding invocation
applied the single approved binding. No duplicate binding was issued after
post-state verification.

If rollback had been required, it would have removed only the C0A-created
audit-SA binding and then the newly-created role, in that order. It would not
touch the Stage-1 role, caller Token Creator resource binding, Firebase service
agent roles, or other principals.

## No Data Access Boundary Crossed

```text
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
CANONICAL_WRITES = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
```

The IAM capability is prepared only. It does not establish whether the exact
Class document exists, does not resolve its CAS state, and does not authorize
an update, upsert, reconciliation, or create.

```text
EXACT_STATE_READ_CAPABILITY_PREPARED = yes
FIRESTORE_EXACT_READ_APPROVAL = NOT_GRANTED
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3C1 EXACT REAL CLASS PRODUCTION STATE SINGLE READ APPROVAL GATE
```

## Bounded Verification Accounting

The following local count records the bounded live metadata checks performed by
this package. It includes caller/project identity, exact role, project policy,
and exact audit-SA resource policy reads. It excludes the rejected command,
tokens, and Firestore operations.

```text
LIVE_GOOGLE_CLOUD_METADATA_IAM_READS = 11
IAM_LIVE_READS = 9
IAM_MUTATIONS_APPLIED = 2
IAM_ROLLBACK_MUTATIONS = 0
```

## Final Safety State

```text
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
