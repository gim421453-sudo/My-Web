# P1.5-C2H2E3C1 Exact Real Class Production State Single Read Approval Gate

## Verdict

P1_5_C2H2E3C1_EXACT_STATE_SINGLE_READ_APPROVAL_GATE_PASS

This is a local design/preflight document only. It performs no token generation, Firestore access, IAM mutation, canonical write, manifest persistence, or Git/deployment action. A future C1A execution requires separate explicit approval.

## Locked Identity

E3B_PLAN_ID = 2444353eee9cb986fcdad6e9a00d95f4713826b050d19b0d5df7f09d5e1f16e1
E3B_SOURCE_FINGERPRINT = sha256-c14n-v1:2555187cdceaf6b6cb1304e0a462aa61c074e02868ba50bdf40370fff342f1da
TARGET_WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_CLASS_ID = class_2026_g2_c5
TARGET_PATH_CONTRACT_MATCH = yes
AUDIT_SA_GET_CAPABILITY_PREPARED = yes
C0A_CLOSURE_VERDICT = P1_5_C2H2E3C0A_MINIMAL_STATE_READ_IAM_MUTATION_PASS

## Exact Resource

EXACT_FIRESTORE_DOCUMENT_RESOURCE = projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5

Canonical path: workspaces/{workspaceId}/classRegistry/{classId}.

Future HTTP GET URL:
https://firestore.googleapis.com/v1/projects/my-management-app-8a933/databases/%28default%29/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5

Only this document may be targeted. Parent, sibling, collection, query, collection-group, pagination, and other-workspace reads are prohibited.

## Class Schema And Field Mask

CLASS_SCHEMA_VERSION = 1
CLASS_SCHEMA_VERSION_FIELD = schemaVersion
CLASS_IDENTITY_FIELD = classId
CLASS_DISPLAY_NAME_FIELD = displayName
CLASS_STATUS_FIELD = status
CLASS_SCHOOL_YEAR_FIELD = schoolYear
CLASS_GRADE_FIELD = grade
CLASS_CAS_VERSION_FIELD = version
CLASS_UPDATED_AT_FIELD = updatedAt

EXACT_DOCUMENT_FIELD_MASK = [schemaVersion, version, workspaceId, classId, status, source, createdAt, updatedAt, createdBy, displayName, schoolYear, grade]
FIELD_MASK_WILL_BE_USED = yes

The mask includes the base fields required by the active parser, including source, createdAt, and createdBy; schoolYear and grade remain optional. The returned document.name must equal the exact locked resource before semantic parsing.

## Future C1A Budget

FUTURE_ACCESS_TOKEN_MAX = 1
FUTURE_GET_DOCUMENT_MAX = 1
FUTURE_RETRY_MAX = 0
FUTURE_QUERY_MAX = 0
FUTURE_LIST_MAX = 0

The future runner must validate project, database, workspace, class ID, target path, caller fingerprint, audit SA, and local integrity locks before creating one short-lived in-memory impersonated token. The token must never be logged or persisted and must be discarded immediately after the request. No Firebase Admin fallback or service-account JSON key is allowed.

Only an HTTP GET/GetDocument with repeated mask.fieldPaths parameters is permitted. RunQuery, BatchGet, ListDocuments, ListCollectionIds, collection-group reads, pagination, and retries are prohibited.

## Classification

ABSENT_CLASSIFICATION_READY = yes
PRESENT_EQUIVALENCE_COMPARISON_READY = yes
PRESENT_CONFLICT_COMPARISON_READY = yes
PRESENT_SCHEMA_REVIEW_CLASSIFICATION_READY = yes

For exact 404, classify TARGET_STATE=ABSENT, CURRENT_CAS_STATE=MISSING, and CREATE_STATE_PREREQUISITE=CONFIRMED, then stop without a second read. This does not authorize create.

For exact 200, require exact resource-name match and parse only the returned Class document. Compare:
classId = class_2026_g2_c5
displayName = 2학년 5반
status = active
schoolYear = 2026
grade = 2

Equal values produce PRESENT_EQUIVALENT; differing valid values produce PRESENT_CONFLICT; malformed, unsupported, or CAS-incomplete data produces PRESENT_SCHEMA_OR_STATE_REVIEW_REQUIRED. None authorizes update, upsert, reconciliation, delete, or create. 401/403 stops. 429, 5xx, timeout, and network errors produce STATE_READ_INCONCLUSIVE, with retry zero.

## Tool Integrity Locks

WINDOWS_GCLOUD_ADAPTER_SHA256 = 512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
WINDOWS_RUNNER_SHA256 = 4df22c3c9a7d2ff73d7ff6d85f1181a6db0d2384ee0db56c0e427deae1577b50
WINDOWS_ADAPTER_TEST_SHA256 = 72cded08eded6e59bf8aea0fa55251a8de51e90ca314a08bd567ad0312a9bbc2
HISTORICAL_TOKEN_TOOL_LOCKS_MATCH = yes

C1A_ADDITIONAL_LOCKED_FILES:
- tools/authority-audit/windowsGcloudProcessAdapter.mjs | 512eaa9fa4fc5ea4f394e1a90116425142e4555df58b65e5d1c41b0d1a56190f
- tools/authority-audit/invokeWindowsExecutable.ps1 | 4df22c3c9a7d2ff73d7ff6d85f1181a6db0d2384ee0db56c0e427deae1577b50
- tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs | 72cded08eded6e59bf8aea0fa55251a8de51e90ca314a08bd567ad0312a9bbc2
- functions/src/registries/classRegistryContract.ts | bd3a236ac56d2339d6304f7b2e17a2074cb218b59e173eecd5c9cb6f09a47f8b

The existing runProductionInventory.mjs and firestoreReadOnlyStore.mjs are not C1A files because they support broader inventory/list or Admin SDK flows. A future C1A runner must be separately reviewed and locked to this single request.

## Approval Boundary

C1A_EXACT_STATE_READ_APPROVAL = NOT_GRANTED
ACCESS_TOKEN_APPROVAL = NOT_GRANTED
FIRESTORE_EXACT_DOCUMENT_READ_APPROVAL = NOT_GRANTED
FIRESTORE_WRITE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
RECOMMENDED_NEXT_ACTION = WAIT_FOR_EXPLICIT_C1A_EXACT_STATE_READ_APPROVAL

Suggested future approval, not an approval: permit one short-lived in-memory token and one exact GetDocument for the locked Class resource, with zero retries, queries, lists, fallbacks, writes, manifest persistence, IAM changes, Rules/index changes, or Git/deployment actions. Stop after classification.

## Safety Counters

LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
IAM_LIVE_READS = 0
IAM_MUTATIONS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
MANIFEST_PERSISTENCE_CALLS = 0
CANONICAL_WRITES = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
