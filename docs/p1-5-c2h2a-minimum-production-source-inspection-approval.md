# MY WEB - P1.5-C2H2A Minimum Production Source-Inspection Approval

## 1. Purpose and non-authorization notice

This package designs a future two-stage, production read-only inspection. It
does not execute or approve either stage.

> **P1.5-C2H2A PASS DOES NOT AUTHORIZE ANY PRODUCTION READ.**
>
> Stage 1 and Stage 2 each require a later, separate, explicit user approval.

| Safety item | Result |
| --- | --- |
| Production Firebase access/read/write | `0 / 0 / 0` |
| IAM/API mutations | `0 / 0` |
| Rules/index changes | `0 / 0` |
| Runtime/client changes | `0 / 0` |
| Staging/commit/push/deploy | `0 / 0 / 0 / 0` |

## 2. Baseline and unchanged source matrix

Git baseline at document creation:

| Item | Value |
| --- | --- |
| Branch | `checkpoint/notice-auth-recovery-20260723` |
| HEAD | `84b2c16` |
| Dirty entries | `123` |
| Staging | `0` |

This design preserves the C2H2 findings:

| Entity | Status | Primary path |
| --- | --- | --- |
| Student | `VERIFIED_LOCAL_SOURCE` | `workspaces/{workspaceId}/students` |
| Subject | `VERIFIED_LOCAL_SOURCE` | `workspaces/{workspaceId}/subjects` |
| Class | `NO_LOCAL_SOURCE_FOUND` | none |
| Relationship / enrollment | `NO_LOCAL_SOURCE_FOUND` | none |

`FULL_RELATIONSHIP_INVENTORY_READY = no` and
`CURRENT_READINESS_LEVEL = LEVEL_0`. A plan is not source evidence and does not
raise either value.

## 3. Questions this package may eventually answer

Only these questions are in scope:

1. Does a production operational class source exist under one approved
   workspace?
2. If it exists, what exact path, structural schema, and ID model does it use?
3. Where is the complete student-to-class relationship stored?
4. Where is the complete student-to-subject relationship stored?
5. Is the relationship embedded, separately stored, distributed, or absent?

Migration classification, mapping, broad discovery, source mutation, and
canonical destination writes remain out of scope.

## 4. Why two stages are mandatory

Local evidence found no active class or complete enrollment source path. An
exact-path document read therefore cannot yet be authorized without guessing.

```text
NOT_APPROVED
  -> STAGE_1_PREFLIGHT_VERIFIED
  -> STAGE_1_EXPLICITLY_APPROVED
  -> STAGE_1_COMPLETED | STAGE_1_ABORTED
  -> HUMAN_REVIEW
  -> STAGE_2_PREFLIGHT_VERIFIED
  -> STAGE_2_EXPLICITLY_APPROVED
  -> STAGE_2_COMPLETED | STAGE_2_ABORTED
```

No state transition is automatic. Stage 1 output is not permission to perform
Stage 2.

## 5. Stage 1: minimum path resolution

### 5.1 Selected mechanism

The narrowest locally evidenced API shape is Firestore v1
`ListCollectionIds` with the exact approved workspace document as `parent`:

```text
projects/{expectedProject}/databases/{approvedDatabase}/documents/
workspaces/{approvedWorkspaceId}
```

Local SDK declarations confirm that the request accepts an exact parent,
`pageSize`, and `pageToken` (`@google-cloud/firestore` v1 client declarations,
`listCollectionIds`). They also warn that the normal client call auto-paginates
by default. A future implementation must therefore use one non-auto-paginated
call with `autoPaginate=false` or an equivalently reviewable single-page REST
request.

The high-level `DocumentReference.listCollections()` is not approved for this
run because it returns all immediate child collection references and does not
express the required one-page limit at the call site.

### 5.2 Exact Stage 1 boundary

| Control | `DESIGN_DEFAULT` | Approval behavior |
| --- | --- | --- |
| Workspaces | `1` | exact ID required before execution |
| Parent documents | `1` | approved workspace document only |
| Metadata operations | `1` | one `ListCollectionIds` call |
| Page size | `25` collection IDs | `SUBJECT_TO_APPROVAL` |
| Pages | `1` | no follow-up page token |
| Document reads | `0` | payload reads forbidden |
| Collection-group queries | `0` | forbidden |
| Root/project discovery | `0` | forbidden |
| Recursive discovery | `0` | forbidden |

The API does not provide a server-side collection-name filter. The one page may
therefore contain unrelated immediate child collection IDs. This limitation is
explicit: only IDs are retained, no collection is opened, and no name becomes a
source automatically. If a next-page token is returned, Stage 1 records
`INCOMPLETE_METADATA_PAGE` and stops. It does not fetch page 2 or claim that no
candidate exists.

Known-path probes such as `classes`, `classrooms`, `homerooms`, `groups`,
`enrollments`, `studentClasses`, or `studentSubjects` are not selected for Stage
1. They would encode name guesses and consume document reads without resolving
unknown names.

### 5.3 Stage 1 allowed output

Only the following may leave transient execution memory:

- SHA-256-based project, database, and workspace fingerprints;
- immediate child collection IDs from the single response;
- request and response counts;
- whether a next-page token was present;
- redaction and abort status;
- inspection timestamp and artifact hash.

No workspace ID, document payload, student PII, free text, credential, token,
or raw principal identifier may be recorded.

### 5.4 Candidate rules

Names resembling `classes`, `classrooms`, `homerooms`, or `groups` remain
`CLASS_PATH_CANDIDATE`. Names resembling `enrollments`, `studentClasses`, or
`studentSubjects` remain `RELATIONSHIP_PATH_CANDIDATE`. Name similarity alone
never produces an approved source.

The following are always excluded from academic enrollment inference:

- `teacherAssignments`;
- workspace membership collections, including `members`, `workspace_members`,
  and `workspaceMembers`;
- user roles or local browser role state;
- timetable co-occurrence and free-text labels;
- canonical destinations `studentRegistry`, `classRegistry`, `subjectRegistry`,
  and `studentEnrollments` when evaluating legacy operational sources.

### 5.5 Stage 1 abort conditions

Abort before the request, leaving reads at zero, when any of these is true:

- project ID, project number, database, or workspace does not exactly match the
  signed approval;
- the workspace has not been explicitly approved;
- the principal's read-only capability cannot be demonstrated;
- any write-capable component is loaded into the inspection process;
- the API cannot constrain the parent to the approved workspace;
- auto-pagination cannot be disabled;
- the requested page size exceeds the approved value.

Abort after the single metadata response, without another request, when:

- a next-page token exists;
- document fields or unexpected sensitive payload appear;
- response scope is broader than immediate children of the approved parent;
- output redaction or artifact hashing fails.

## 6. Stage 2: exact candidate document inspection

Stage 2 requires review of the Stage 1 artifact and a new explicit approval. It
uses only exact candidate paths selected by a human reviewer.

### 6.1 Class inspection contract

| Control | `DESIGN_DEFAULT` |
| --- | --- |
| Workspace | `1` approved workspace |
| Paths | `1` exact class candidate collection |
| Documents | maximum `10` |
| Pages | `1`, no pagination |
| Order | stable document name/ID order where supported |
| Operations | read/list only |
| Raw dump | forbidden |

The approved field mask may contain only locally motivated structural fields:

```text
id, classId, workspaceId, workspace_id, status, active, deleted,
schoolYear, year, grade, className, name, homeroom, classroom
```

The exact subset must be stated in the Stage 2 approval. Unknown fields are not
automatically added. Labels are retained only as redacted type/presence or a
minimal human-review hint when explicitly approved.

The inspection answers:

- whether document IDs are stable operational identifiers;
- whether a separate internal identifier exists;
- whether workspace binding is present and consistent;
- whether rows are active, deleted, or legacy;
- whether the source is entity-based or label-only;
- whether duplicate or conflicting identity representations exist.

The future result must be exactly one of:

```text
VERIFIED_PRODUCTION_SOURCE
LABEL_ONLY_SOURCE
UNSTABLE_ID_SOURCE
CONFLICTING_SOURCE
LEGACY_SOURCE
NO_CLASS_SOURCE
UNKNOWN
```

### 6.2 Relationship inspection order

Relationship inspection follows this fixed order:

1. Read a bounded structural projection from the already locally verified
   `workspaces/{approvedWorkspaceId}/students` path.
2. Inspect at most one exact relationship candidate path only if Stage 1 found
   it and the Stage 2 approval names it.
3. Inspect only class/subject reference fields included in that approval.

It never scans production for records that merely resemble relationships.

### 6.3 Student structural projection

| Control | `DESIGN_DEFAULT` |
| --- | --- |
| Student path | exact approved `workspaces/{workspaceId}/students` |
| Documents | maximum `10` |
| Pages | `1`, no pagination |
| Allowed candidate fields | `classId`, `className`, `class`, `subjectIds`, `subjects`, `subjectId`, `subjectName`, `workspaceId`, `workspace_id`, `status`, `active`, `deleted` |
| Forbidden values | names, student numbers, Auth UIDs, email, phone, notes, attachments, arbitrary free text |

Only field presence, type, cardinality, valid opaque-reference shape, and
workspace consistency are retained. Student document IDs are hashed per
artifact and never emitted raw.

### 6.4 Optional exact relationship candidate

If Stage 1 yields a reviewed relationship candidate, the separate Stage 2
approval may add one exact path with:

- maximum `10` documents;
- one page and no pagination;
- a pre-approved structural field mask derived from Stage 1 review and local
  contracts;
- no names, notes, contact data, attachments, or raw dump.

Thus one relationship Stage 2 run has a maximum of `20` document reads across
at most two exact paths. A class run and a relationship run should be approved
separately; they are not silently combined.

The relationship result must be exactly one of:

```text
EMBEDDED_COMPLETE_RELATIONSHIP
EMBEDDED_PARTIAL_RELATIONSHIP
SEPARATE_ENROLLMENT_SOURCE
DISTRIBUTED_RELATIONSHIP
LABEL_ONLY_RELATIONSHIP
NO_OPERATIONAL_RELATIONSHIP_SOURCE
CONFLICTING_RELATIONSHIP_SOURCES
UNKNOWN
```

## 7. Project, database, workspace, and principal gates

Future preflight must verify before the first read:

```text
EXPECTED_PROJECT_ID = my-management-app-8a933
EXPECTED_PROJECT_NUMBER = 607154464656
EXPECTED_DATABASE = REQUIRED_BEFORE_EXECUTION
APPROVED_WORKSPACE_ID = REQUIRED_BEFORE_EXECUTION
```

Project, database, principal, and workspace fingerprints in the approval must
match the runtime values. Any mismatch aborts with `READS = 0`.

The future principal must be a separately approved, short-lived, read-only
identity. It must not have Owner, Editor, Firebase Admin, Firestore/Datastore
write capability, service-account key creation, broad token creation, or an
exported service-account JSON key. C2H2B must document the exact required IAM
permission set from authoritative API behavior before requesting execution
approval; this document does not invent a role or mutate IAM.

Write protection is established by capability review and process composition,
never by attempting a production write. The inspection process must not import
migration apply/rollback adapters, mutation repositories, audit writers,
idempotency writers, or manifest persistence code.

## 8. ProductionSourceInspectionArtifact

The future artifact contains only:

```text
inspectionVersion
sourceResolutionVersion
classifierContractVersion
stage
projectFingerprint
databaseFingerprint
workspaceFingerprint
approvedPathFingerprints
metadataRequestCount
documentReadCount
candidateCollectionIds
schemaFingerprints
stableIdFindings
relationshipFindings
nextPageTokenPresent
redactionStatus
abortStatus
abortReason
generatedAt
artifactHash
```

It is a local, redacted evidence artifact, not a Firestore document or migration
manifest. It contains no raw documents, credentials, project/workspace IDs,
student IDs, labels, or PII. Schema fingerprints are computed from sorted field
names and value types only, after applying the approved field mask.

The artifact becomes `STALE` when project, database, workspace, approved path,
schema fingerprint, source-resolution version, classifier contract, read
budget, or principal approval changes.

## 9. Local contract mismatches carried from C2H2

No mismatch is repaired here.

| ID | File/symbol | Risk | Inspection clarification | Later repair need |
| --- | --- | --- | --- | --- |
| `LCM-1` | `studentRosterService.js` `canonical:true`; `app.js` roster labels | operational `students` may be confused with canonical `studentRegistry` | Stage 2 student projection can clarify source shape/provenance, not terminology | typed source-kind/terminology cleanup likely after inspection |
| `LCM-2` | `app.js:34876` `learningCanonicalSubjectRowsV137` | operational `subjects` may be confused with canonical `subjectRegistry` | neither Stage 1 nor current Stage 2 target proves subject provenance | separate subject provenance inventory before applyability |
| `LCM-3` | `app.js:64-88,263-292`; `workspaceDataService.js:640-659` | default/local subject rows may be bootstrapped into an empty remote source | neither path resolution nor relationship sampling proves row provenance | dedicated subject provenance audit and explicit runtime decision required |

`LOCAL_CONTRACT_MISMATCH_COUNT = 3`.

## 10. Stage 1 human approval record

All boxes intentionally remain unchecked:

```text
[ ] exact project ID verified
[ ] project number verified
[ ] exact database verified
[ ] read-only principal verified
[ ] exact workspace selected
[ ] Stage 1 ListCollectionIds mechanism reviewed
[ ] one-parent/one-page scope confirmed
[ ] auto-pagination disabled
[ ] no document payload expected
[ ] zero-write process composition verified
[ ] read budget approved
[ ] abort conditions accepted

[ ] APPROVE ONE STAGE-1 PRODUCTION READ-ONLY PATH-RESOLUTION RUN
```

C2H2A does not check or authorize any item.

## 11. Stage 2 human approval record

All boxes intentionally remain unchecked:

```text
[ ] Stage 1 artifact reviewed and hash verified
[ ] one exact candidate path selected
[ ] candidate operational purpose understood
[ ] exact field mask approved
[ ] exact document/read limit approved
[ ] PII minimization verified
[ ] read-only principal verified
[ ] zero-write process composition verified
[ ] no-pagination behavior verified
[ ] abort conditions accepted

[ ] APPROVE ONE STAGE-2 PRODUCTION READ-ONLY SOURCE INSPECTION RUN
```

## 12. Decision tree

```text
Stage 1 returns no relevant candidate in a complete single page
  -> NO_DISCOVERABLE_SOURCE
  -> do not broaden automatically
  -> architecture/mapping review

Stage 1 returns nextPageToken
  -> INCOMPLETE_METADATA_PAGE
  -> stop
  -> request a newly bounded approval; do not infer absence

Stage 1 returns candidate
  -> human review
  -> request separate Stage 2 approval

Stage 2 verifies entity/relationship source
  -> update source matrix in a later package

Stage 2 finds labels or unstable IDs
  -> reviewed mapping required

Stage 2 finds conflict or remains unknown
  -> full inventory remains blocked

All required sources later resolved
  -> source scope may be considered for LEVEL 1 in a separate review
```

## 13. Student producer-stability caveat

The student path is verified locally as an active runtime read source. No local
writer or producing subsystem was confirmed. This does not downgrade path
existence, but migration applyability remains blocked until a later approved
inventory verifies freshness, producer provenance, field consistency, and
stale/dead-record behavior.

## 14. C2H/C2H1/C2H2 consistency

- The C2H denylist, PII minimization, redacted artifact, and zero-write rules
  remain in force.
- C2H1's state gates and separate explicit approval remain in force. C2H2A
  narrows metadata discovery to one workspace and one page; it does not approve
  C2H1 inventory execution.
- C2H2 source statuses and canonical-destination separation remain unchanged.
- Academic records do not become AuthZ authority. `users.role`, workspace
  memberships, operation mode, browser-local role data, legacy invitations,
  and teacher assignments remain forbidden authority inputs.

## 15. Final status and safety verification

```text
STUDENT_SOURCE_STATUS = VERIFIED_LOCAL_SOURCE
STUDENT_PRIMARY_PATH = workspaces/{workspaceId}/students

SUBJECT_SOURCE_STATUS = VERIFIED_LOCAL_SOURCE
SUBJECT_PRIMARY_PATH = workspaces/{workspaceId}/subjects

CLASS_SOURCE_STATUS = NO_LOCAL_SOURCE_FOUND
CLASS_PRIMARY_PATH = none

RELATIONSHIP_SOURCE_STATUS = NO_LOCAL_SOURCE_FOUND
RELATIONSHIP_PRIMARY_PATH = none

FULL_RELATIONSHIP_INVENTORY_READY = no
CURRENT_READINESS_LEVEL = LEVEL_0
LOCAL_CONTRACT_MISMATCH_COUNT = 3
PRODUCTION_INSPECTION_REQUIRED_FOR = [Class, Relationship / Enrollment]

PRODUCTION_FIREBASE_ACCESS = 0
PRODUCTION_READS = 0
PRODUCTION_WRITES = 0
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

## 16. Verdict and next package

**Verdict: `P1_5_C2H2A_MINIMUM_SOURCE_INSPECTION_APPROVAL_DESIGN_PASS`**

This verdict approves the design only. It does not approve Stage 1.

Recommended next package, and no other execution package:

**P1.5-C2H2B - Stage-1 Production Path-Resolution Read-Only Preflight**

`PREFLIGHT / VERIFICATION ONLY`. Production access and reads must remain zero
during C2H2B unless the user later gives a separate explicit approval.
