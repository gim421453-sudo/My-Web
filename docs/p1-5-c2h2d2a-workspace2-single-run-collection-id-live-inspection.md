# P1.5-C2H2D2A Workspace-2 Single-Run Collection-ID Live Inspection

## Verdict

`P1_5_C2H2D2A_PASS_NEXT_PAGE_STOPPED`

Workspace 2 is historical/orphan recovery evidence only. The bounded metadata
response is not a current canonical or authoritative source decision.

## Locked target and local gates

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
DATABASE_ID = (default)
WORKSPACE_ID = ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2
WORKSPACE_LOCAL_CLASSIFICATION = historical/orphan
TARGET_PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2

WINDOWS_ADAPTER_SHA256_MATCH = yes
POWERSHELL_RUNNER_SHA256_MATCH = yes
ADAPTER_TEST_SHA256_MATCH = yes
ALL_ADAPTER_HASHES_MATCH = yes

ACTIVE_USER_COUNT = 1
CALLER_FINGERPRINT = sha256/12:5e6692dda08c
CALLER_FINGERPRINT_MATCH = yes
AUDIT_SA = myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com
```

## One credential and one metadata request

```text
ACCESS_TOKEN_LOGICAL_GENERATIONS = 1
ACCESS_TOKEN_GENERATION_RESULT = SUCCESS
ACCESS_TOKENS_GENERATED = 1
IMPERSONATION_EXECUTIONS = 1
TOKEN_PERSISTED = no
TOKEN_PRINTED = no
TOKEN_REUSED = no

LIST_COLLECTION_IDS_LOGICAL_CALLS = 1
HTTP_STATUS = 200
LIST_COLLECTION_IDS_RESULT = SUCCESS
COLLECTION_ID_COUNT = 25
NEXT_PAGE_TOKEN_PRESENT = yes
RESULT_COMPLETE_WITHIN_ONE_PAGE = no
```

The same in-memory short-lived credential was used for the single approved
metadata request and discarded when the process ended. A continuation marker
was present, so no page two request was made.

## Returned collection IDs and local classifications

```text
academicSchedules
achievementPolicies
afterschoolAttendance
afterschoolPrograms
afterschoolSchedules
assessmentPlans
assessments
attendance
clubAttendance
clubPrograms
examSchedules
exams
gradeApprovals
gradeAuditLogs
lessonRecordSuppressions
materials
mealApplications
meals
members
notices
portfolios
records
schedules
settings
specialLectureAttendance
```

| Classification | Collection IDs | Local-only interpretation |
| --- | --- | --- |
| `POTENTIAL_CLASS_SOURCE` | none | No class-like collection ID was returned. |
| `POTENTIAL_RELATIONSHIP_OR_ENROLLMENT_SOURCE` | none | No enrollment or student-class-subject relationship ID was returned. |
| `POTENTIAL_STUDENT_SOURCE` | none | No student-like collection ID was returned. |
| `POTENTIAL_SUBJECT_SOURCE` | none | No subject-like collection ID was returned. |
| `AUTHORITY_ONLY` | `members` | Authority membership is not academic enrollment. |
| `KNOWN_LEGACY_OPERATIONAL` | all returned IDs except `members` and `settings` | Scheduling, assessment, attendance, learning record, material, meal, notice, portfolio, or similar historical operational context only. |
| `UNRELATED_OPERATIONAL` | `settings` | Settings metadata is not a registry or enrollment source. |
| `UNKNOWN` | none | No additional unclassified ID remains. |

`people` was not returned, so no blocked legacy fallback was encountered.

```text
WORKSPACE_2_CLASS_CANDIDATES = []
WORKSPACE_2_RELATIONSHIP_CANDIDATES = []
WORKSPACE_2_STUDENT_CANDIDATES = []
WORKSPACE_2_SUBJECT_CANDIDATES = []
ADDITIONAL_STAGE2_SOURCE_CANDIDATE = no
```

No returned name is promoted beyond historical discovery. No document, parent,
or child payload was requested or retained.

## Safety accounting

```text
LOCAL_HASH_VALIDATIONS = 3
LOCAL_CALLER_VALIDATIONS = 1
ACCESS_TOKEN_CALLS = 1
ACCESS_TOKENS_GENERATED = 1
IMPERSONATION_EXECUTIONS = 1
LIST_COLLECTION_IDS_CALLS = 1
OTHER_FIRESTORE_API_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_DOCUMENT_PAYLOADS = 0
FIRESTORE_WRITES = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
SERVICE_USAGE_READS = 0
API_MUTATIONS = 0
SIGN_BLOB_CALLS = 0
SIGN_JWT_CALLS = 0
GENERATE_ID_TOKEN_CALLS = 0
SERVICE_ACCOUNT_KEY_READS = 0
STAGE2_CALLS = 0
STAGE2_DOCUMENT_READ_APPROVAL = NOT_GRANTED
CANONICAL_WRITE_APPROVAL = NOT_GRANTED
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

The artifact retains no credential material, caller email, request headers,
document fields, or response body beyond collection IDs and the bounded status.

## Next recommendation

`P1.5-C2H2E SOURCE ABSENCE ACCEPTANCE AND CANONICAL BOOTSTRAP POLICY`
should remain local/design-only. This result does not justify a second
production request, a workspace 3 inspection, a Stage-2 document read, or a
canonical write.
