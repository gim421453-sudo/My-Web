# P1.5-C2H2E Source Absence Acceptance and Canonical Bootstrap Policy

## Verdict

`P1_5_C2H2E_NEEDS_SCHEMA_PROVENANCE_FIX`

This is a local design and policy decision. It does not perform a production
read, document inspection, mutation, deployment, or Rules change.

## Decision Record

```text
SOURCE_DISCOVERY_POLICY = STOPPED_BY_POLICY
TRUSTWORTHY_CLASS_SOURCE_STATUS = NOT_FOUND_WITH_BOUNDED_DISCOVERY
TRUSTWORTHY_RELATIONSHIP_SOURCE_STATUS = NOT_FOUND_WITH_BOUNDED_DISCOVERY
GLOBAL_CLASS_SOURCE_ABSENCE_PROVEN = no
GLOBAL_RELATIONSHIP_SOURCE_ABSENCE_PROVEN = no

PRIMARY_WORKSPACE_COLLECTION_ENUMERATION_COMPLETE = yes
WORKSPACE2_COLLECTION_ENUMERATION_COMPLETE = yes
WORKSPACE3_INSPECTED = no
WORKSPACE3_FURTHER_INSPECTION_REQUIRED = no
STAGE2_DOCUMENT_READ_JUSTIFIED = no

HISTORICAL_SUBJECT_SOURCE_CANDIDATE = workspaces/ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2/subjects
HISTORICAL_SUBJECT_SOURCE_AUTHORITY = NOT_VERIFIED

CLASS_POLICY = BOOTSTRAP_FROM_NEW_AUTHORITATIVE_INPUT
RELATIONSHIP_POLICY = BOOTSTRAP_FROM_NEW_AUTHORITATIVE_INPUT
CLASS_BOOTSTRAP_READINESS = NOT_READY_FOR_WRITE
RELATIONSHIP_BOOTSTRAP_READINESS = NOT_READY_FOR_WRITE
CANONICAL_WRITE_APPROVAL = NOT_GRANTED
ADDITIONAL_SOURCE_DISCOVERY_PRODUCTION_ACCESS = NOT_REQUIRED
```

The bounded result is not that Class or Enrollment data does not exist
anywhere. It is that no trustworthy Class or Relationship/Enrollment source
was found in the approved collection-ID inventories, and speculative legacy
probing is no longer justified.

## Bounded Evidence

| Scope | What was observed | What it establishes | What it does not establish |
| --- | --- | --- | --- |
| Primary owner workspace | Complete collection-ID enumeration | No identifiable Class or Relationship/Enrollment collection-name candidate | Document schema, embedded fields, or global absence |
| Workspace 2 historical/orphan workspace | Fresh page-1 to page-2 enumeration complete | No Class, Relationship, or Student candidate; `subjects` is a historical Subject candidate only | Source authority or document semantics |
| Workspace 3 | Not inspected | Nothing new | Global absence |

`ListCollectionIds` discovers direct child collection names only. Therefore:

```text
COLLECTION_ID_ENUMERATION_COMPLETE_FOR_INSPECTED_WORKSPACES = yes
DOCUMENT_SCHEMA_ABSENCE_PROVEN = no
EMBEDDED_CLASS_DATA_ABSENCE_PROVEN = no
EMBEDDED_RELATIONSHIP_DATA_ABSENCE_PROVEN = no
```

Workspace 3 remains outside the scope because its prior information value was
LOW, it has no current workspace-reference or canonical-membership evidence,
and a missing candidate does not justify unbounded historical probing. A future
inspection requires both `NEW_SPECIFIC_EVIDENCE` and `NEW_EXPLICIT_APPROVAL`.

## Source Classification and Trust Matrix

Source classes are mutually distinct:

| Source class | Meaning | Automatic migration authority |
| --- | --- | --- |
| `CURRENT_AUTHORITATIVE_SOURCE` | Current, validated source contract | Only after its own write approval |
| `HISTORICAL_RECOVERY_SOURCE` | Evidence retained for an explicit recovery review | No |
| `LEGACY_REFERENCE_ONLY` | Context only | No |

No historical source becomes current authoritative data merely because it is
readable or named similarly.

| Source domain | Local source found | Primary collection candidate | Workspace 2 collection candidate | Production document schema verified | Trustworthy current source | Next policy |
| --- | --- | --- | --- | --- | --- | --- |
| Student | `VERIFIED_LOCAL_SOURCE` | None identified | None identified | No | `LOCAL_SOURCE_ONLY` | Do not infer current production verification or populate a registry |
| Subject | `VERIFIED_LOCAL_SOURCE` | None identified | `subjects` only | No | `LOCAL_SOURCE_ONLY` | Preserve `HISTORICAL_SUBJECT_SOURCE_CANDIDATE`; do not investigate or migrate it automatically |
| Class | No operational legacy source | None identified | None identified | No | `NOT_FOUND_WITH_BOUNDED_DISCOVERY` | Bootstrap only from a newly ratified authoritative input |
| Relationship/Enrollment | No complete Student-Class-Subject legacy source | None identified | None identified | No | `NOT_FOUND_WITH_BOUNDED_DISCOVERY` | Bootstrap only from a newly ratified authoritative input |

`subjects` in Workspace 2 is neither a Class source nor an Enrollment source.
Its authority is `NOT_VERIFIED`, its Stage-2 approval is `NOT_GRANTED`, and it
must not expand this package into Subject migration work.

## Stop-Discovery Policy

Further production discovery is stopped by policy for Class and
Relationship/Enrollment. No Stage-2 document read is justified because no
sufficiently supported candidate path exists. Random reads of operational
documents are forbidden.

The following are not approved as substitute sources without a separately
ratified mapping contract:

- `members` or `teacherAssignments` for academic enrollment;
- `people`, `lessons`, `timetable`, `timetableSets`, `teachers`,
  `specialLecturePrograms`, or `specialLectureSchedules` for canonical Class
  or Enrollment;
- embedded labels or identifiers inferred from schedule context.

`EMPTY_BUT_UNRESOLVED_SOURCE` is an allowed transition state. No canonical
Class or Enrollment record is created merely because its canonical collection
is empty. No legacy data deletion, workspace cleanup, or Rules change is
authorized by this policy.

Discovery may reopen only on concrete new evidence: an exact source path,
backup/export metadata naming the source, an old migration script naming it, a
current official source, or an explicitly provided authoritative dataset.
Generic uncertainty is insufficient.

## Canonical Contracts Already Present Locally

The existing local contracts establish canonical destinations and validation;
they do not establish a production migration source.

| Destination | Local contract | Required identity and baseline fields |
| --- | --- | --- |
| `workspaces/{workspaceId}/studentRegistry/{studentId}` | `functions/src/registries/studentRegistryContract.ts` | `schemaVersion`, `version`, `workspaceId`, `studentId`, `status`, `source`, timestamps, `createdBy`; optional `displayName`, `studentNumber` |
| `workspaces/{workspaceId}/classRegistry/{classId}` | `functions/src/registries/classRegistryContract.ts` | Same base fields plus required `displayName`; optional `schoolYear`, `grade` |
| `workspaces/{workspaceId}/subjectRegistry/{subjectId}` | `functions/src/registries/subjectRegistryContract.ts` | Same base fields plus required `displayName`; optional `subjectCode` |
| `workspaces/{workspaceId}/studentEnrollments/{studentId}` | `functions/src/relationships/studentEnrollmentContract.ts` | `schemaVersion`, `version`, `workspaceId`, `studentId`, `classId`, unique `subjectIds`, `status`, `source`, timestamps, `createdBy` |
| `workspaces/{workspaceId}/teacherAssignments/{assignmentId}` | `functions/src/teacherAssignments/teacherAssignmentContract.ts` | Separate authority for teacher scope; not Student enrollment |

The supported registry sources are `manual_admin`, `migration`,
`system_bootstrap`, and `external_import`. Enrollment supports
`manual_admin`, `migration`, and `system_bootstrap`. These enums describe
accepted categories, not a grant to select one without a ratified input and
operation contract.

## Bootstrap and Referential-Integrity Policy

Class bootstrap needs a stable `classId`, the required local `displayName`, and
the shared canonical base fields. Enrollment bootstrap is fail-closed and may
begin only after the referenced Student, Class, and every Subject registry
document exists, parses as canonical, and is `active`.

The local validator in
`functions/src/relationships/enrollmentReferentialValidator.ts` already
rejects missing, inactive, or malformed Student/Class/Subject references. The
mutation service uses a version guard for updates and rejects a duplicate
Enrollment at the deterministic `{studentId}` location. Registry mutations
reject an existing target before creation and compare `expectedVersion` before
an update.

Future bootstrap ordering is therefore constrained by current contracts:

1. Validate or create the authoritative Student and Subject registry records.
2. Validate or create the authoritative Class registry record.
3. Validate all active references, then create the Enrollment.

This ordering is a policy sequence, not approval to execute a write.

## Provenance, Version, and Replay Assessment

```text
PROVENANCE_SUPPORT = PARTIAL
BOOTSTRAP_VERSION_GUARD_AVAILABLE = yes
BOOTSTRAP_IDEMPOTENCY_SUPPORT = yes
BOOTSTRAP_REPLAY_PROTECTION = yes
```

The current contracts require typed `source`, `createdAt`, `updatedAt`, and
`createdBy`. Registry and Enrollment mutations use transactional completed
idempotency records and success audit records, and updates use `version` CAS.
This is enough to protect a defined operation, but it is not enough to retain
the evidence identity of a future bootstrap input: the entity contracts have
no dedicated input fingerprint, source version, import batch identifier, or
migration manifest reference.

Accordingly, a future bootstrap must not overload arbitrary metadata or infer
source provenance. Duplicate Class, Student, Subject, and deterministic
Enrollment identities must fail closed or use an explicitly approved,
deterministic reconciliation policy. A future manual entry/import/official
source process must provide explicit operator intent, strict schema mapping,
preview or dry run, duplicate detection, invalid-row quarantine where
applicable, referential validation, and a specific production-write approval.

## Approval Gates

```text
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
CANONICAL_ENROLLMENT_WRITE_APPROVAL = NOT_GRANTED
CANONICAL_REGISTRY_WRITE_APPROVAL = NOT_GRANTED
PRODUCTION_MIGRATION_EXECUTION_APPROVAL = NOT_GRANTED
RULES_DEPLOY_APPROVAL = NOT_GRANTED
```

Future authoritative input can be one of `MANUAL_VERIFIED_ENTRY`,
`USER_APPROVED_IMPORT`, `SYSTEM_GENERATED_FROM_VERIFIED_CURRENT_SOURCE`,
`OFFICIAL_SCHOOL_SOURCE`, or another explicitly ratified source. None is
enabled by this document. Existing migration classifier and rehearsal paths
remain `DRY_RUN_ONLY` for unresolved Class and Relationship sources.

## One Recommended Next Action

`RECOMMENDED_NEXT_ACTION = CANONICAL_SCHEMA_PROVENANCE_NARROW_FIX_NEXT`

Proceed only to **P1.5-C2H2E0F Canonical Bootstrap Schema/Provenance Narrow
Fix**, local only. Its purpose is to define minimal immutable provenance and
input-identity fields compatible with the existing strict contracts, plus a
dry-run validation/manifest boundary. It must not perform a production write,
read new speculative sources, change Rules, or execute a migration.

## Safety Accounting

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
ACCESS_TOKENS_GENERATED = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_DOCUMENT_PAYLOADS = 0
FIRESTORE_WRITES = 0
IAM_READS = 0
IAM_MUTATIONS = 0
API_READS = 0
API_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
