# P1.5-C2H2C2C Corrected Stage-1 Single-Run Live Retry

## Verdict

`P1_5_C2H2C2C_STAGE1_SINGLE_RUN_PASS`

The corrected local adapter generated one short-lived credential successfully
and used it immediately for the one approved Firestore metadata request. No
document content was read and no additional production call was made.

## Locked target and local gates

```text
PROJECT_ID = my-management-app-8a933
PROJECT_NUMBER = 607154464656
DATABASE_ID = (default)
WORKSPACE_ID = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_PARENT = projects/my-management-app-8a933/databases/(default)/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1

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
COLLECTION_ID_COUNT = 23
NEXT_PAGE_TOKEN_PRESENT = no
RESULT_COMPLETE_WITHIN_ONE_PAGE = yes
```

The token was captured only in parent-process memory, used for this exact
request, and then discarded. The process result contained stderr, but no raw
stdout/stderr, token, header, or error payload was retained.

## Returned collection IDs

```text
academicSchedules
afterschoolAttendance
afterschoolPrograms
afterschoolSchedules
attendance
clubPrograms
exams
homeLetters
lessons
mealApplications
meals
members
penalties
people
periodTimes
projects
schedules
schoolNotices
settings
specialLecturePrograms
teachers
timetable
timetableSets
```

The bounded response contained 23 collection IDs; the list above contains the
23 returned IDs in response order. No document ID, document field, or document
payload was requested or retained.

## Local-only source classification

Existing local source evidence identifies `students` and `subjects` as the
only verified operational student/subject paths. Neither is present in this
workspace's one-page metadata response. Local evidence has no class entity or
complete enrollment source. Therefore no returned ID is promoted to a class or
relationship/enrollment candidate.

| Classification | Returned IDs | Rationale |
| --- | --- | --- |
| `KNOWN_STUDENT_SOURCE` | none | `students` was not returned. |
| `KNOWN_SUBJECT_SOURCE` | none | `subjects` was not returned. |
| `POTENTIAL_CLASS_SOURCE` | none | No local class source exists; do not infer one from schedule/timetable labels. |
| `POTENTIAL_RELATIONSHIP_OR_ENROLLMENT_SOURCE` | none | No atomic relationship source is locally established. |
| `UNKNOWN` | `people` | It is a legacy fallback explicitly blocked from source authority. |
| `UNRELATED_OPERATIONAL_COLLECTION` | all remaining returned IDs | Operational, scheduling, attendance, notice, settings, teacher, or authority context only; none is promoted without a separately approved document read. |

`members` is authority context, not an operational enrollment source. Likewise,
`lessons`, `academicSchedules`, `projects`, and timetable-related collections
remain operational context only. The one metadata response does not establish
their schemas.

```text
CLASS_COLLECTION_CANDIDATES = []
CLASS_SOURCE_STATUS = NO_STAGE1_CANDIDATE_FOUND
RELATIONSHIP_COLLECTION_CANDIDATES = []
RELATIONSHIP_SOURCE_STATUS = NO_STAGE1_CANDIDATE_FOUND
STAGE2_APPROVAL = NOT_GRANTED
STAGE2_DOCUMENT_READS = 0
```

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
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Next recommendation

Do not make another production call from this package. A future
**P1.5-C2H2D Stage-2 Minimum Document-Read Source Confirmation Approval Gate**
must first design an exact bounded document-read target. This Stage-1 response
did not identify a Class or Relationship/Enrollment candidate, so it must not
invent one or authorize Stage 2 automatically.
