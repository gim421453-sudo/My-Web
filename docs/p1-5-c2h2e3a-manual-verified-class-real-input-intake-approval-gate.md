# P1.5-C2H2E3A Manual Verified Real Class Input Intake Approval Gate

## Scope And Approval State

This is a design and approval gate only. It consumes no real Class record and
does not read Firestore, production sources, external services, or unspecified
files. It does not persist a manifest or write a canonical Class.

```text
REAL_CLASS_RECORD_USE_APPROVAL = NOT_GRANTED
REAL_CLASS_DRY_RUN_EXECUTION_APPROVAL = NOT_GRANTED
REAL_SOURCE_FINGERPRINT_APPROVAL = NOT_GRANTED
REAL_PLAN_APPROVAL = NOT_GRANTED
REAL_TARGET_WORKSPACE_APPROVAL = NOT_GRANTED
REAL_ENROLLMENT_INPUT_APPROVAL = NOT_GRANTED
CLASS_BOOTSTRAP_WRITE_READINESS = NOT_READY_FOR_WRITE
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
```

## Exact Local Class Contract

| Item | Actual contract |
| --- | --- |
| CLASS_SCHEMA_FILE | `functions/src/registries/classRegistryContract.ts` |
| CLASS_SCHEMA_VERSION | `1` (`CANONICAL_ENTITY_REGISTRY_SCHEMA_VERSION`) |
| CLASS_BOOTSTRAP_INPUT_TYPE | `ClassBootstrapInputV1` inside `CanonicalBootstrapInputV1` |
| CLASS_IDENTITY_FIELDS | `classId` plus its explicit `workspaceId` binding |
| CLASS_REQUIRED_FIELDS | `classId`, `displayName`, `status` |
| CLASS_OPTIONAL_FIELDS | `schoolYear`, `grade` |
| CLASS_REFERENCE_FIELDS | none |
| CLASS_STATUS_FIELDS | `status`: `active` or `inactive` |
| CLASS_BOOTSTRAP_IDENTITY_CONTRACT | explicit `workspaceId` + explicit `classId`; no display-name derivation |
| SOURCE_KIND_FIELD | `sourceKind` |
| WORKSPACE_ID_FIELD | `workspaceId` |

The canonical registry document also contains backend metadata fields
`schemaVersion`, `version`, `workspaceId`, `classId`, `status`, `source`,
`createdAt`, `updatedAt`, and `createdBy`. These are not user-supplied Class
bootstrap fields. The E1 input normalizer trims required/optional text, rejects
unknown fields and whitespace-bearing IDs, validates ID syntax, and passes the
result through the existing Class registry parser. It does not infer IDs or
references.

## Target Workspace

Local policy and approved workspace-selection records consistently identify:

```text
FIRST_REAL_CLASS_TARGET_WORKSPACE = owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1
TARGET_WORKSPACE_CONFIDENCE = VERIFIED_LOCAL_POLICY
```

This is a local policy candidate, not an execution approval. E3B must require
the user to repeat and explicitly approve the exact `workspaceId`. There is no
current-workspace fallback, UI inference, display-name matching, owner-derived
selection, or path guessing.

## What “Manual Verified” Means

`manual_verified_entry` means normalized values manually entered or supplied
after checking a known current evidence basis. It does not mean memory-only
guessing, free-form unreviewed typing, legacy-workspace inference, historical
reconstruction, timetable inference, membership inference, teacher assignment
as Class identity, or an unknown source.

Allowed policy categories, subject to evidence review, are:

```text
CURRENT_OFFICIAL_SCHOOL_INFORMATION
CURRENT_VERIFIED_TIMETABLE_OR_CLASS_INFORMATION
CURRENT_TEACHER_OR_SCHOOL_PROVIDED_INFORMATION
CURRENT_OPERATOR_VERIFIED_RECORD
OTHER_EXPLICITLY_RATIFIED_CURRENT_EVIDENCE
```

These categories are not automatically equivalent. The reviewer must confirm
that the evidence is current, scoped to the target workspace, and actually
proves the Class identity.

Before a future dry-run can be ready:

```text
CLASS_SCHEMA_VALID = yes
CLASS_SOURCE_AUTHORITY_CONFIRMED = yes
CLASS_SOURCE_SCOPE_CONFIRMED = yes
CLASS_SOURCE_FRESHNESS_CONFIRMED = yes
```

## Intake Policy

```text
SOURCE_KIND = manual_verified_entry
OPERATION = NEW_BOOTSTRAP_CREATE
SOURCE_FRESHNESS = CURRENT or explicitly accepted AS_OF_DATE
SOURCE_SCOPE = SINGLE_CLASS
INITIAL_CLASS_INTAKE_COMPLETENESS = SINGLE_CLASS
SOURCE_ABSENCE_IMPLIES_DELETE = no
REAL_CLASS_CAS_STATUS = UNRESOLVED_UNTIL_SEPARATE_STATE_VALIDATION
```

The first intake is create-only. It does not authorize update, upsert,
reconciliation, deactivate, archive, delete, or purge. `UNKNOWN` freshness and
`HISTORICAL_RECOVERY` are rejected under normal bootstrap. A possible existing
identity remains unresolved until a separately approved state-validation step.

## Evidence Metadata

The future local intake envelope should carry only bounded metadata:

```text
verificationBasis
sourceAsOf / sourceDate
sourceScope
verificationMethod
evidenceReference
operatorAttestation
```

Evidence documents, absolute paths, credentials, tokenized URLs, and personal
email addresses are not required or stored in canonical provenance. A bounded
logical note may identify a document title/date, school notice identifier,
timetable revision, or verification note.

The current E1 source fingerprint covers normalized `CanonicalBootstrapInputV1`
only. Authority evidence is therefore:

```text
AUTHORITY_EVIDENCE_INCLUDED_IN_SOURCE_FINGERPRINT = not_currently-modeled
AUTHORITY_EVIDENCE_APPROVAL_BINDING_READY = yes (policy-level binding)
```

The evidence approval must be bound alongside the exact workspace, source kind,
scope, normalized fingerprint, plan ID, and manifest review. E3A does not alter
fingerprint semantics or add persisted evidence fields.

## Data Boundary And Normalization

Only Class-domain fields are accepted. Do not collect student names, emails,
phones, profiles, memberships, Enrollment, Student, or Subject data.

```text
USER-SUPPLIED VERIFIED CLASS VALUES
  -> strict manual intake envelope
  -> CanonicalBootstrapInputV1
  -> sha256-c14n-v1
  -> pure local dry-run
  -> in-memory manifest review
  -> STOP
```

Raw manual values are `NOT_PERSISTED_BY_BOOTSTRAP_CORE` and
`TEMPORARILY_LOCAL_ONLY` for the active intake context. No extra archive is
created. At E3A:

```text
REAL_SOURCE_FINGERPRINT_AT_E3A = NOT_COMPUTED
REAL_PLAN_ID_AT_E3A = NOT_ASSIGNED
```

## E3B Boundary

The next package is:

`P1.5-C2H2E3B MANUAL VERIFIED REAL CLASS INPUT LOCAL INTAKE AND PURE DRY-RUN`

E3B may use only the exact Class records and metadata explicitly supplied by the
user for that intake. It may normalize locally, validate, compute the real
fingerprint, assign/reuse a plan ID, produce a pure dry-run, and show an
in-memory manifest. It must not read Firestore, check production existence,
persist a manifest, write Class/Enrollment, read historical workspace data,
inspect Workspace 3, call external sources, or deploy.

E3B review must show workspace ID, normalized Class records, source kind,
verification summary, fingerprint, plan ID, validation/duplicate results,
planned targets, CAS status, and manifest preview. Any normalized input or
workspace change requires `PLAN_REAPPROVAL_REQUIRED` and a new approval.

## Future User Input Form

Do not pre-fill real values. The user must provide placeholders below with
actual values in a later, separately approved E3B request:

```text
TARGET_WORKSPACE:
SOURCE_KIND: manual_verified_entry
OPERATION: NEW_BOOTSTRAP_CREATE
SOURCE_AS_OF:
SOURCE_SCOPE: SINGLE_CLASS
COMPLETENESS: SINGLE_CLASS
VERIFICATION_BASIS:
VERIFICATION_METHOD:
EVIDENCE_REFERENCE:
OPERATOR_ATTESTATION:

CLASS_RECORDS:
- classId:
  displayName:
  status: active | inactive
  schoolYear: (optional)
  grade: (optional)
```

Approval must state that the listed values are current and verified, and that
only the explicitly listed Class records are in scope. It must not authorize
searching other messages/files, Enrollment processing, or external discovery.

Suggested approval wording:

> `P1.5-C2H2E3B Manual Verified Real Class Input Local Intake and Pure Dry-Run`를 승인합니다. target workspace는 `<EXACT_WORKSPACE_ID>`, source kind은 `manual_verified_entry`, operation은 `NEW_BOOTSTRAP_CREATE`입니다. 사용자가 명시적으로 제공한 `<N>`개의 Class record와 verification metadata만 로컬에서 normalize/validate하고 `sha256-c14n-v1`, plan ID, E0F provenance/replay identity, zero-persistence dry-run, in-memory manifest preview를 생성합니다. 다른 파일·workspace·Firestore·external source는 조회하지 않으며, manifest persistence, canonical Class/Enrollment write, Rules/Indexes 변경, staging, commit, push, deploy는 수행하지 않습니다. 결과 검토 후 후속 단계는 별도 승인합니다.

This wording is a template only and is not approved by E3A.

## Safety And Final State

```text
WORKSPACE_BINDING_REQUIRED = yes
SOURCE_SCOPE_BINDING_REQUIRED = yes
SOURCE_FRESHNESS_REQUIRED = yes
REAL_ENROLLMENT_INPUT_APPROVAL = NOT_GRANTED
ENROLLMENT_INTAKE_EXECUTION = NOT_AUTHORIZED
REAL_TARGET_WORKSPACE_APPROVAL = NOT_GRANTED
REAL_CLASS_RECORD_USE_APPROVAL = NOT_GRANTED
REAL_CLASS_DRY_RUN_EXECUTION_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
CANONICAL_CLASS_WRITE_APPROVAL = NOT_GRANTED
```

```text
LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
PRODUCTION_SOURCE_READS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
REAL_CLASS_RECORDS_INGESTED = 0
REAL_ENROLLMENT_RECORDS_INGESTED = 0
REAL_STUDENT_RECORDS_INGESTED = 0
REAL_SOURCE_FILES_OPENED = 0
REAL_SOURCE_ROWS_PARSED = 0
MANIFEST_PERSISTENCE_CALLS = 0
CANONICAL_WRITES = 0
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

E3A is complete as a policy gate. It does not consume real Class input.
