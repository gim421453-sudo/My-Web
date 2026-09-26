# P1.5-C2H2D1 No-Candidate Source-Resolution Policy

## Verdict

`P1_5_C2H2D1_SOURCE_RESOLUTION_POLICY_PASS`

This policy uses local evidence only. It does not inspect either remaining
workspace or read any production document.

## Evidence ledgers

### Class

| Source | Support | Recency | Actionability | Evidence and decision effect |
| --- | --- | --- | --- | --- |
| `LOCAL_CODE` | NEGATIVE | CURRENT | HIGH | `docs/p1-5-c2h2-production-migration-source-resolution-plan.md:295-298` records no operational class entity source; only embedded contextual labels/IDs. |
| `LOCAL_MIGRATION_ARTIFACT` | MEDIUM | CURRENT | LOW | `functions/src/registries/classRegistryContract.ts` and migration classifier establish a canonical destination schema, not a legacy operational source. |
| `PRIMARY_PRODUCTION_STAGE1` | NEGATIVE | CURRENT | HIGH | The complete 23-ID result contained neither `classRegistry` nor a locally mapped class source. |
| `HISTORICAL_WORKSPACE_EVIDENCE` for workspace 2 | MEDIUM | HISTORICAL | MEDIUM | `docs/p1-5-c2h2b1-stage1-workspace-principal-iam-closure.md:72` records dense historical academic data but no identified class/enrollment source. |
| `HISTORICAL_WORKSPACE_EVIDENCE` for workspace 3 | NEGATIVE | HISTORICAL | LOW | The same ledger at line 73 records only a small secondary program/notice collection set. |

### Relationship / Enrollment

| Source | Support | Recency | Actionability | Evidence and decision effect |
| --- | --- | --- | --- | --- |
| `LOCAL_CODE` | NEGATIVE | CURRENT | HIGH | The source-resolution plan records no complete Student-Class-Subject relationship source; business context is dispersed. |
| `LOCAL_MIGRATION_ARTIFACT` | MEDIUM | CURRENT | LOW | `functions/src/relationships/studentEnrollmentContract.ts` defines the canonical destination only; it does not identify an operational source. |
| `PRIMARY_PRODUCTION_STAGE1` | NEGATIVE | CURRENT | HIGH | No `studentEnrollments`, `students`, or `subjects` ID was returned from the selected workspace. |
| `HISTORICAL_WORKSPACE_EVIDENCE` for workspace 2 | MEDIUM | HISTORICAL | MEDIUM | Historical schedules, assignments, lessons, timetable, and period data make one metadata-only inspection informative, but do not prove a complete academic relationship source. |
| `HISTORICAL_WORKSPACE_EVIDENCE` for workspace 3 | NEGATIVE | HISTORICAL | LOW | The secondary-workspace review records notices/settings and program data, not student/class/subject data. |

`people` remains `BLOCKED_LEGACY_FALLBACK`; `members` remains authority data.
Neither can become a Class or enrollment source through this policy.

## Local artifact recovery result

```text
CAN_CLASS_SOURCE_BE_RECONSTRUCTED_FROM_LOCAL_ARTIFACTS = NO
CAN_RELATIONSHIP_SOURCE_BE_RECONSTRUCTED_FROM_LOCAL_ARTIFACTS = NO
CURRENT_TRUSTWORTHY_CLASS_SOURCE = NOT_FOUND
CURRENT_TRUSTWORTHY_RELATIONSHIP_SOURCE = NOT_FOUND
```

Local artifacts establish destination contracts, fixtures, migration
fail-closed behavior, and historical workspace descriptions. They do not
establish an operational collection path, stable source IDs, document schema,
or current authoritative status for either unresolved entity. Further local
analysis may refine historical context but cannot convert it into an
authoritative migration source.

## Student / subject discrepancy

| Explanation | Classification | Local basis |
| --- | --- | --- |
| Production never populated `students`/`subjects` | POSSIBLE | Both expected IDs are absent from the complete primary Stage-1 response. |
| They were deleted historically | POSSIBLE | Local records do not establish current lifecycle history. |
| They exist in another workspace | POSSIBLE | Workspace 2 has historical academic density; it remains uninspected in this package. |
| Local source contract is newer than production data | POSSIBLE | Local runtime/destination work is newer than the historical operational artifacts. |
| Source is embedded under another name | POSSIBLE | Local plan records contextual fields but no complete contract. |
| Source exists only in test/local state | POSSIBLE | Fixtures establish behavior, not production presence. |

No explanation is sufficiently supported to authorize a Stage-2 document read
or a migration write.

## Option evaluation

| Option | Value | Assessment |
| --- | --- | --- |
| A. `LOCAL_RECONSTRUCTION_FIRST` | MEDIUM | It can preserve historical semantics but cannot establish a current source path after the existing exhaustive source plan. |
| B. Inspect workspace 2 | HIGH | One bounded metadata call has materially higher information value due to historical academic data density, while preserving a zero-document-payload boundary. Its orphan/staleness risk remains explicit. |
| C. Inspect workspace 3 | LOW | Historical evidence indicates only limited secondary program/notice data and no current canonical membership/reference. |
| D. Accept current production source absence | MEDIUM | Correct safe fallback if workspace 2 metadata remains negative or unusable. |
| E. Defer and create authoritative source later | HIGH | Safest data-integrity outcome when no high-confidence source is established; it must not fabricate or silently migrate uncertain data. |

```text
WORKSPACE_2_INSPECTION_VALUE = HIGH
WORKSPACE_3_INSPECTION_VALUE = LOW
OPTION_A_LOCAL_RECONSTRUCTION_VALUE = MEDIUM
OPTION_B_WORKSPACE_2_VALUE = HIGH
OPTION_C_WORKSPACE_3_VALUE = LOW
OPTION_D_ACCEPT_ABSENCE_VALUE = MEDIUM
OPTION_E_DEFER_NEW_SOURCE_VALUE = HIGH
```

## Single policy decision

```text
RECOMMENDED_NEXT_ACTION = INSPECT_WORKSPACE_2_NEXT
SECONDARY_FALLBACK = DEFER_AND_CREATE_AUTHORITATIVE_SOURCE_LATER
ADDITIONAL_PRODUCTION_INSPECTION_REQUIRED = yes
```

The recommended next package is **P1.5-C2H2D2 Workspace-2 Single-Run
Collection-ID Inspection Approval Gate**, design only. It may propose exactly
one `ListCollectionIds` request for
`ws_X6WeHgl3KFe3mxodRLN8NNAkNBc2`, with `pageSize=25`, one page, no retry, no
pagination, and zero document payload. It must not execute that request without
a new explicit approval.

Workspace 2 findings, if any, must be classified as
`CURRENT_AUTHORITATIVE_SOURCE`, `HISTORICAL_RECOVERY_SOURCE`, or
`LEGACY_REFERENCE_ONLY`; historical data never becomes canonical automatically.
If the bounded metadata result is negative or remains ambiguous, stop source
discovery and use the secondary fallback rather than probing workspace 3 by
default.

## Approvals and safety state

```text
WORKSPACE_2_INSPECTION_APPROVAL = NOT_GRANTED
WORKSPACE_3_INSPECTION_APPROVAL = NOT_GRANTED
STAGE2_DOCUMENT_READ_APPROVAL = NOT_GRANTED
CANONICAL_REGISTRY_WRITE_APPROVAL = NOT_GRANTED
CANONICAL_ENROLLMENT_WRITE_APPROVAL = NOT_GRANTED
ADDITIONAL_LIST_COLLECTION_IDS_APPROVAL = NOT_GRANTED

LIVE_GOOGLE_CLOUD_READS = 0
ACCESS_TOKEN_CALLS = 0
IMPERSONATION_EXECUTIONS = 0
FIRESTORE_API_CALLS = 0
LIST_COLLECTION_IDS_CALLS = 0
FIRESTORE_DOCUMENT_READS = 0
FIRESTORE_WRITES = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
API_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```
