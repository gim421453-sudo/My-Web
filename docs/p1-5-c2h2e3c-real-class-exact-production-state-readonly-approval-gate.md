# P1.5-C2H2E3C Real Class Exact Production State Read-Only Approval Gate

## Verdict

`P1_5_C2H2E3C_NEEDS_MINIMAL_IAM_READ_PERMISSION_GATE`

This is a local design and preflight record. It neither reads the production
target nor changes IAM, canonical data, Rules, indexes, manifests, or Git
staging.

## E3B Locked Intake Identity

```text
E3B_CLOSURE_VERDICT = P1_5_C2H2E3B_REAL_CLASS_LOCAL_PURE_DRY_RUN_PASS

TARGET_WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_CLASS_ID = class_2026_g2_c5
SOURCE_KIND = manual_verified_entry
OPERATION = NEW_BOOTSTRAP_CREATE

REAL_CLASS_PLAN_ID_FULL = 2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1
REAL_CLASS_SOURCE_FINGERPRINT_FULL = sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da

CLASS_COUNT = 1
ENROLLMENT_COUNT = 0
PLANNED_CLASS_CREATE_INTENTS = 1
```

The E3B source fingerprint covers the normalized `CanonicalBootstrapInputV1`.
Its human verification evidence remains approval context rather than a field in
that hash contract. Any change to the workspace, class ID, normalized Class
fields, source kind, plan ID, or provenance identity requires
`PLAN_REAPPROVAL_REQUIRED` before a later state read or write package.

## Canonical Target And Local Schema Contract

```text
CANONICAL_CLASS_TARGET_PATH = workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5
CANONICAL_CLASS_TARGET_PATH_CONFIRMED = yes
CLASS_REGISTRY_PATH = workspaces/{workspaceId}/classRegistry/{classId}
CLASS_SCHEMA_VERSION = 1
CLASS_VERSION_FIELD = version
CLASS_UPDATED_AT_FIELD = updatedAt
CLASS_EXISTENCE_STATE_REQUIRED_FOR_CREATE = MISSING only
CURRENT_PRODUCTION_TARGET_STATE = UNKNOWN
CURRENT_CAS_STATE = UNRESOLVED
```

The exact path is confirmed by the active lookup and mutation repositories:
`functions/src/registries/entityRegistryRepository.ts` and
`functions/src/registries/registryMutationRepository.ts`. The create service
rejects every lookup state other than `MISSING`; it does not upsert.

The parser in `functions/src/registries/classRegistryContract.ts` requires
exactly the allowed Class keys and validates: `schemaVersion`, `version`,
`workspaceId`, `classId`, `status`, `source`, `createdAt`, `updatedAt`,
`createdBy`, `displayName`, and optional `schoolYear` / `grade`. The base
registry contract accepts schema version `1`, an integer `version >= 1`, and
only active/inactive status. The live-read comparison needs only the returned
Class document; it must not request neighboring records.

CAS-relevant state is `version`. For a present document, identity binding,
schema validity, status, `displayName`, optional `schoolYear`, optional
`grade`, and `version` are required to distinguish an equivalent canonical
record, a conflict, and a state requiring separate review. Timestamps and
creator identity are structural fields, not E3B input equivalence fields.

## Future Exact Read Contract

This is a design only, not an execution approval.

```text
PROJECT = my-management-app-8a933
DATABASE = (default)
TARGET = projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5

ACCESS_TOKEN_GENERATION_MAX = 1
FIRESTORE_EXACT_DOCUMENT_GET_MAX = 1
MAXIMUM_DOCUMENT_TARGETS = 1
QUERIES = 0
LIST_DOCUMENTS = 0
LIST_COLLECTION_IDS = 0
COLLECTION_GROUP = 0
AUTO_PAGINATION = 0
RETRY_MAX = 0
TOKEN_STORAGE = MEMORY_ONLY
TOKEN_LOGGING = 0
```

Before that single call, the executor must fail closed for a changed project,
database, workspace, class ID, target path, caller identity, audit service
account, permission state, or E3B plan/fingerprint lock. It must stop after a
NOT_FOUND response without listing the collection. A present document may only
be locally classified as `PRESENT_EQUIVALENT`, `PRESENT_CONFLICT`, or
`PRESENT_VERSION_STATE_REQUIRES_REVIEW`; it does not authorize update, upsert,
or reconciliation.

```text
AUTO_UPDATE_IF_PRESENT = no
AUTO_UPSERT_IF_PRESENT = no
SOURCE_ABSENCE_IMPLIES_DELETE = no
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
```

An absent target could establish only
`CREATE_STATE_PREREQUISITE_CONFIRMED`. A separately approved write gate would
still be mandatory.

## Local IAM Evidence And Gap

```text
AUDIT_SERVICE_ACCOUNT = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
CURRENT_AUDIT_SA_DATA_PERMISSIONS = [datastore.entities.list]
DATASTORE_ENTITIES_GET_PRESENT = no
FUTURE_EXACT_DOCUMENT_READ_EXECUTION_READY = no
```

The latest approved local controlled-mutation record is
`docs/p1-5-c2h2b5-stage1-iam-minimal-controlled-mutation.md`. It records the
custom role `mywebStage1CollectionIdReader`, bound at project scope to the
audit service account, with exactly `datastore.entities.list` and no extra
permission. That historical evidence does not prove present live IAM state;
no live IAM read was made here.

The existing caller-to-audit-service-account Token Creator path was recorded
there as an exact, unconditional binding on the audit service-account resource.
It remains an input to a later live preflight only. No token generation ran in
this package. The removed project-wide Firebase Admin SDK Token Creator edge is
not a fallback.

```text
MINIMUM_IAM_BINDING_SCOPE = project scope, based on the locally evidenced existing custom-role binding
DOCUMENT_LEVEL_IAM_SCOPE_AVAILABLE = unknown
FIREBASE_ADMIN_FALLBACK_ALLOWED = no
SA_JSON_KEY_REQUIRED = no
```

Local evidence does not establish a narrower Firestore IAM resource scope.
The future minimal-IAM package must verify IAM resource-scope mechanics before
making any claim beyond this project-scoped local record. It must preserve the
Stage-1 role unchanged and design a separate role, such as
`mywebCanonicalStateReader` only if local naming policy permits it, containing
exactly `datastore.entities.get` and no list, create, update, delete,
database-wide, Firebase, or IAM permission. It must not use
`roles/datastore.viewer`, the Firebase Admin SDK service account, or a
service-account JSON key.

## Next Boundary

```text
RECOMMENDED_NEXT_ACTION = P1.5-C2H2E3C0 MINIMAL EXACT-STATE-READ IAM APPROVAL GATE
```

That package may design and separately seek approval for the smallest IAM
change. It must not perform the later exact-document read. Only after the
permission and caller path are proven in a distinct gate may
`P1.5-C2H2E3C1 EXACT REAL CLASS PRODUCTION STATE SINGLE READ APPROVAL` be
presented.

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
