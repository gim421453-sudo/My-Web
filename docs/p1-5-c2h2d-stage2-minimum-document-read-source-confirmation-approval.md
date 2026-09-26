# P1.5-C2H2D Stage-2 Minimum Document-Read Source Confirmation Approval

## Verdict

`P1_5_C2H2D_NO_STAGE2_CANDIDATE_PASS`

This is a local source-mapping decision only. It uses the existing C2H2C2C
result and repository evidence; it performs no Firestore document read.

## Baseline and Stage-1 input

```text
BRANCH = checkpoint/notice-auth-recovery-20260723
HEAD = 84b2c16
STAGE1_COLLECTION_ID_COUNT = 23
PRODUCTION_STUDENT_EXPECTED_PATH_PRESENT = no
PRODUCTION_SUBJECT_EXPECTED_PATH_PRESENT = no
```

The 23 IDs below were read from the local C2H2C2C result document, not
reconstructed from memory or re-queried. Reference counts are fixed-string
matches within local source roots (`app.js`, `services`, `functions`, `tools`,
and `docs`) at this gate. A collection-key contract means the existing
workspace sync can actively read/write it; it does not establish a class or
enrollment schema.

| Collection ID | Local refs | Active read/write | Contract found | Operational use | Class relevance | Relationship relevance | Legacy only | Authority only | Local evidence |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| `academicSchedules` | 58 | yes/yes | yes | yes | NONE | NONE | no | no | `workspaceDataService.js:3-46,582`; school calendar integration |
| `afterschoolAttendance` | 7 | yes/yes | yes | yes | NONE | NONE | no | no | workspace sync key |
| `afterschoolPrograms` | 18 | yes/yes | yes | yes | NONE | NONE | no | no | workspace sync key |
| `afterschoolSchedules` | 9 | yes/yes | yes | yes | NONE | NONE | no | no | workspace sync key |
| `attendance` | 478 | yes/yes | yes | yes | NONE | NONE | no | no | attendance feature, not student-class-subject enrollment |
| `clubPrograms` | 21 | yes/yes | yes | yes | NONE | NONE | no | no | workspace sync key |
| `exams` | 185 | yes/yes | yes | yes | NONE | NONE | no | no | assessment operational data |
| `homeLetters` | 74 | yes/yes | yes | yes | NONE | NONE | no | no | notice/letter operational data |
| `lessons` | 131 | yes/yes | yes | yes | NONE | POSSIBLE (insufficient) | no | no | local plan calls relationships dispersed business context, not a complete source |
| `mealApplications` | 54 | yes/yes | yes | yes | NONE | NONE | no | no | meal operational data |
| `meals` | 137 | yes/yes | yes | yes | NONE | NONE | no | no | meal operational data |
| `members` | 1111 | yes/yes | yes | yes | NONE | NONE | no | yes | canonical workspace authority/membership, explicitly excluded |
| `penalties` | 97 | yes/yes | yes | yes | NONE | NONE | no | no | discipline operational data |
| `people` | 123 | yes/yes | yes | yes | NONE | POSSIBLE (blocked) | yes | no | `studentRosterService.js:7,277-299`; `people_fallback` is blocked |
| `periodTimes` | 117 | yes/yes | yes | yes | NONE | NONE | no | no | timetable period configuration |
| `projects` | 133 | yes/yes | yes | yes | NONE | NONE | no | no | project operational data |
| `schedules` | 162 | yes/yes | yes | yes | NONE | NONE | no | no | schedule operational data |
| `schoolNotices` | 67 | yes/yes | yes | yes | NONE | NONE | no | no | notice operational data |
| `settings` | 784 | yes/yes | yes | yes | NONE | NONE | no | no | dedicated settings document contract at `workspaceDataService.js:48,486` |
| `specialLecturePrograms` | 15 | yes/yes | yes | yes | NONE | NONE | no | no | workspace sync key |
| `teachers` | 121 | yes/yes | yes | yes | NONE | NONE | no | no | teacher operational data, not student enrollment |
| `timetable` | 1432 | yes/yes | yes | yes | NONE | NONE | no | no | timetable cells, not class entities |
| `timetableSets` | 178 | yes/yes | yes | yes | NONE | NONE | no | no | timetable grouping/configuration |

`workspaceDataService.js:3-46,381-382,582,658` is the common active collection
key and sync evidence for all rows except the distinct authority meaning of
`members`. `members` also has explicit canonical membership handling in
`services/authService.js:499-647`. The source-resolution plan records
`students` and `subjects` as the verified local operational paths, and records
Class plus Relationship/Enrollment as `NO_LOCAL_SOURCE_FOUND`; it also states
that `studentRegistry`, `classRegistry`, `subjectRegistry`, and
`studentEnrollments` are canonical destinations, not implicit migration
sources.

## Candidate decision

No returned collection meets the Class standard: there is no local evidence of
a document-per-class operational entity, stable class ID plus class attributes,
or an explicit mapping to `classRegistry`. No returned collection meets the
Student-Class-Subject relationship standard either. `lessons` is at most
business context, and `people` remains policy-blocked despite legacy person
fallback behavior. Authority membership is not operational enrollment.

```text
CLASS_STAGE2_CANDIDATE_PATHS = []
RELATIONSHIP_STAGE2_CANDIDATE_PATHS = []

PRIMARY_WORKSPACE_CONTAINS_IDENTIFIABLE_CLASS_SOURCE = no
PRIMARY_WORKSPACE_CONTAINS_IDENTIFIABLE_RELATIONSHIP_SOURCE = no

CLASS_SOURCE_RESOLUTION_STATUS = NO_CANDIDATE_IN_SELECTED_WORKSPACE
RELATIONSHIP_SOURCE_RESOLUTION_STATUS = NO_CANDIDATE_IN_SELECTED_WORKSPACE

STAGE2_DOCUMENT_READ_PLAN = NONE
STAGE2_MAX_DOCUMENT_READS = 0
STAGE2_DOCUMENT_READ_APPROVAL_NEEDED = no
```

The negative result does not prove production absence. It proves only that the
selected workspace's Stage-1 collection names plus local repository evidence do
not identify a safe exact document-read target.

## Negative-result interpretation

| Explanation | Classification | Reason |
| --- | --- | --- |
| Operational Class source never existed in this workspace | POSSIBLE | No class collection or local class source mapping is present. |
| Source was deleted or historically migrated | POSSIBLE | Local evidence cannot inspect historical production state. |
| Source lives in another workspace | POSSIBLE | Other workspaces remain out of scope and uninspected. |
| Source is embedded in an operational collection | POSSIBLE | `lessons` and other business collections may have contextual fields, but no complete relationship contract is locally proven. |
| Source uses a returned non-obvious collection name | POSSIBLE | Names alone cannot prove an entity/relationship schema. |
| Source exists only locally and not in current production | POSSIBLE | Even expected local `students` and `subjects` are absent from Stage-1. |

None of these explanations is `SUPPORTED` strongly enough to justify a random
or broad Stage-2 document read.

## Approval state and next decision

```text
STAGE2_DOCUMENT_READ_APPROVAL = NOT_GRANTED
STAGE2_DOCUMENT_READS = 0
OTHER_WORKSPACE_INSPECTION_APPROVAL = NOT_GRANTED
CANONICAL_REGISTRY_WRITE_APPROVAL = NOT_GRANTED
CANONICAL_ENROLLMENT_WRITE_APPROVAL = NOT_GRANTED
STAGE1_ADDITIONAL_CALL_APPROVAL = NOT_GRANTED
```

The next package should be **P1.5-C2H2D1 No-Candidate Source-Resolution Policy
Decision**. It must decide, without automatically acting, whether to approve a
different explicitly selected workspace metadata inspection, accept source
absence, use an approved legacy/local artifact, or defer canonical population
until an authoritative source is created.

## Safety accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
IMPERSONATION_EXECUTIONS = 0
LIST_COLLECTION_IDS_CALLS = 0
OTHER_FIRESTORE_API_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
