# P1.5-C2H2E3D Real Class Create Write Safety and Approval Gate

## Verdict

`P1_5_C2H2E3D_WRITER_IDENTITY_IAM_GATE_REQUIRED`

This is a local design and synthetic-validation review only. No production
Firebase, Firestore, IAM, gcloud, token, or migration call was made.

## Baseline and locked target

- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD at review start: `84b2c16`
- Target workspace: `owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1`
- Target collection/document: `workspaces/{workspaceId}/classRegistry/class_2026_g2_c5`
- Approved operation: one `NEW_BOOTSTRAP_CREATE`, `manual_verified_entry`, `SINGLE_CLASS`
- Approved display value: `2학년 5반`; status `active`; school year `2026`; grade `2`
- The supplied plan ID and source fingerprint are reused; no new plan or fingerprint is created.

The existing C1A7 document records `P1_5_C2H2E3C1A7_TARGET_ABSENT_PASS`, HTTP `404`,
target `ABSENT`, CAS `MISSING`, create prerequisite confirmed, and zero writes.
That is stale read evidence, not a write-time compare-and-set. It does not authorize
an unconditional set or update.

## Canonical Class contract

Evidence: `functions/src/registries/entityRegistryContract.ts:3-10,20-29,39-71`
and `functions/src/registries/classRegistryContract.ts:11-57`.

- Schema version: `1`.
- Required fields: `schemaVersion`, `version`, `workspaceId`, `classId`, `status`,
  `source`, `createdAt`, `updatedAt`, `createdBy`, `displayName`.
- Optional fields: `schoolYear`, `grade`.
- Allowed status: `active` or `inactive`.
- Allowed source: `manual_admin`, `migration`, `system_bootstrap`, or `external_import`.
- The parser rejects unknown fields, mismatched workspace/entity IDs, invalid versions,
  untrusted timestamps, invalid status/source, and invalid creator IDs.
- The document parser has no provenance fields. Adding the E0F envelope to the Class
  document would violate the existing exact key allowlist.

The approved intake label `manual_verified_entry` is not a canonical `source` enum.
It must be mapped by a separately approved policy to an existing source value, or the
operation must stop. This review does not invent a new source value or field.

### Future payload preview

The shape below is a review preview, not an executable payload. Trusted server values
are placeholders and must not be supplied by a client:

```text
{
  schemaVersion: 1,
  version: 1,
  workspaceId: <locked target workspace>,
  classId: "class_2026_g2_c5",
  status: "active",
  source: <approved existing source mapping; unresolved for manual_verified_entry>,
  createdAt: <trusted transaction timestamp>,
  updatedAt: <trusted transaction timestamp>,
  createdBy: <verified writer actor>,
  displayName: "2학년 5반",
  schoolYear: "2026",
  grade: "2"
}
```

The exact Class document allowlist is the required and optional field list above.
`foo`, privilege fields, provenance fields, arbitrary timestamps, arbitrary creator
values, or any other extra property must be rejected.

## Server-value and CAS contracts

Evidence: `functions/src/registries/registryMutationService.ts:97-108,143-161` and
`functions/src/migrations/migrationRehearsalApplyAdapter.ts:139-151,231-281`.

- Initial version is server-constructed as `1`; updates use the existing expected-version
  contract and increment the version. The client cannot choose an arbitrary CAS value.
- `createdAt` and `updatedAt` are the trusted transaction clock (`transaction.now`).
- `createdBy` is the verified backend actor identity, not an intake-provided UID.
- The existing interactive registry service creates `manual_admin` records and generates
  a random class ID. It therefore cannot be used as the approved exact-ID migration
  writer without a separate contract decision.

## Atomic create-only mechanism

Evidence: `functions/src/repositories/trustedTransaction.ts:16,72-89` and
`functions/src/registries/registryMutationRepository.ts:6-19`.

The only locally proven primitive is a trusted backend Firestore transaction calling
`transaction.create(firestore.doc(path), data)`, through `TrustedTransaction` and
`createRegistryMutationRepository().createClass()`. This is create-only: if the exact
document exists at commit time, Firestore rejects the create and does not overwrite it.
The migration rehearsal adapter is explicitly Emulator/test-only; it is evidence of
the primitive and race behavior, not production authorization.

```text
READ_THEN_UNCONDITIONAL_SET_ALLOWED = no
READ_THEN_UPDATE_ALLOWED = no
CLIENT_ONLY_EXISTENCE_CHECK_SUFFICIENT = no
SERVER_ATOMIC_CREATE_ONLY = yes
UPSERT_CAPABILITY_IN_APPROVED_PATH = none
CONCURRENT_CREATE_OVERWRITE_PREVENTED = yes (synthetic/local transaction evidence)
```

Target-exists race policy: classify as `ALREADY_EXISTS`/`PRECONDITION_FAILED`, stop,
do not retry, do not assume equivalence, and require a separately approved exact read
and conflict review. Absent success is exactly one create intent at the locked target;
no other Class, Student, Subject, Enrollment, relationship, manifest, Rules, or Index
write is allowed.

## Payload, target, and provenance gates

Before any future token or write, the planner must reject changes to project, database,
workspace, collection, class ID, display name, school year, grade, source mapping,
source fingerprint, or plan ID. It must also reject invalid status, missing required
fields, extra fields, and any non-approved source mapping.

The E0F provenance validator in `functions/src/migrations/canonicalBootstrapProvenance.ts:4-15,27-44,63-102`
accepts only schema version 1, the existing `sha256-c14n-v1:` fingerprint format, and
matching 64-hex batch/manifest IDs. `createCanonicalBootstrapProvenanceFromApprovedManifest`
reuses `planId` for both manifest identities. Therefore:

```text
PROVENANCE_VALIDATION = PASS for the existing E0F envelope contract
E3B_PLAN_ID_REUSED = yes
E3B_SOURCE_FINGERPRINT_REUSED = yes
```

This does not make manifest persistence approved, and it does not resolve the
`manual_verified_entry` to canonical `source` mapping.

## Writer and IAM gate

The audit reader remains read-only:

```text
AUDIT_SA_USED_AS_WRITER = no
AUDIT_SA_WRITE_PERMISSION_PROPOSED = no
```

No existing approved production migration writer is proven by the local repository and
documents. The audit service account must not be widened. A dedicated migration/trusted
backend writer is required, but must not be created or granted in E3D:

```text
EXISTING_APPROVED_PRODUCTION_MIGRATION_WRITER = no
WRITER_IDENTITY = unresolved
DEDICATED_WRITER_REQUIRED = yes
MINIMUM_REQUIRED_DATA_PERMISSIONS = ["datastore.entities.create"] (design candidate only)
EXTRA_DATA_PERMISSIONS = 0 expected
BROAD_ROLE_REQUIRED = no
FUTURE_TOKEN_CREATOR_SCOPE = exact-service-account
```

The permission candidate is grounded in the earlier local IAM contract document and
must be confirmed for the selected Cloud API path in a separate approval gate. No
delete, broad update, list, or query permission is proposed. Any future impersonation
must use a short-lived in-memory token, no JSON key, exact writer service-account
resource scope, and the existing quiet stderr/success contract. No token is generated
here. Firestore Rules are not the trusted backend authority for this IAM/API mutation.

## Manifest, rollback, and outcome policy

The migration rehearsal adapter accepts a prepared persistent manifest and can mark
completion in the same transaction, but its transaction binding is Emulator-only and
its manifest port is optional. A production migration manifest state is not proven for
this exact one-class operation. Consequently:

```text
MANIFEST_ROLE_IN_REAL_CREATE = unresolved until a separately approved live migration manifest contract exists
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
```

Manifest persistence must not be silently bundled with the Class write. Source absence
never authorizes deletion; automatic delete rollback is disabled.

```text
CLASS_CREATE_MAX = 1
CLASS_UPDATE_MAX = 0
CLASS_DELETE_MAX = 0
OTHER_CANONICAL_WRITE_MAX = 0
MANIFEST_WRITE_MAX = 0
AUTOMATIC_CREATE_RETRY = 0
SECOND_WRITE_AFTER_TIMEOUT = 0
AUTOMATIC_DELETE_ROLLBACK = no
ALREADY_EXISTS_POLICY = STOP_AND_REVIEW
AMBIGUOUS_WRITE_RECOVERY = WRITE_OUTCOME_INDETERMINATE; stop, then use a separately approved exact read
POST_CREATE_READ_REQUIRED_ON_CONFIRMED_SUCCESS = no, if the full response name and canonical payload validate
```

If the response is lost or the network outcome is ambiguous, no blind resend is
permitted. A confirmed response must have the exact approved document name and pass the
canonical parser. Success never authorizes any other write.

## Future runtime graph and locks

The future graph is intentionally dormant and not implemented or invoked:

```text
approved input/provenance
  -> exact target/payload validator
  -> dedicated verified writer authorization
  -> one server transaction.create at the exact class path
  -> exact response-name/schema validation
  -> safe result; no retry and no extra writes
```

Provisional locks:

```text
E3D_PROVISIONAL_WRITE_RUNTIME_LOCKS = [one target, create-only, update/delete/other/manifest 0, retry 0, no live entrypoint]
E3D_PROVISIONAL_WRITE_TEST_LOCKS = [synthetic target-exists race, absent success, payload allowlist, identity drift rejection, extra-field rejection, invalid status rejection]
```

All future production approvals remain ungranted:

```text
REAL_CLASS_CREATE_APPROVAL = NOT_GRANTED
WRITER_IAM_MUTATION_APPROVAL = NOT_GRANTED
MANIFEST_PERSISTENCE_APPROVAL = NOT_GRANTED
```

## Validation and safety counters

No production call was made:

```text
REAL_GCLOUD_COMMANDS = 0
LIVE_ACTIVE_CALLER_DISCOVERY_CALLS = 0
LIVE_ACCESS_TOKEN_CALLS = 0
LIVE_FIRESTORE_READS = 0
LIVE_FIRESTORE_WRITES = 0
IAM_LIVE_READS = 0
IAM_MUTATIONS = 0
CANONICAL_WRITES = 0
MANIFEST_PERSISTENCE_CALLS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

The Functions build completed during local validation. The first sandboxed
`npm.cmd --prefix functions test` build phase succeeded, but the test workers were
blocked by Windows sandbox `spawn EPERM`; this is an environment execution failure,
not an assertion pass. No production or emulator mutation was run for E3D. Therefore
the focused test result is `NOT_RUN/ENVIRONMENT_BLOCKED`, and this document does not
claim a new implementation test pass.

```text
FOCUSED_TEST_COUNT = 0 new tests
FOCUSED_TEST_RESULT = FAIL (environment blocked: spawn EPERM; no assertion failures observed)
REGRESSION_RESULT = NOT_RUN for E3D-specific changes
```

## Final gate

The exact target absence is established only at the prior C1A7 read time. Atomic
create-only behavior is locally evidenced, but the exact production writer identity,
effective IAM binding, canonical source mapping for `manual_verified_entry`, and live
manifest state are not approved. The next gate is:

```text
RECOMMENDED_NEXT_ACTION = MINIMAL_CLASS_MIGRATION_WRITER_IAM_APPROVAL_GATE
```

No live Class creation approval is granted by this review.
