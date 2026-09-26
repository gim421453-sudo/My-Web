# P1.5-C2H2E3D-W1C-M3X-A1 Audit Reader Baseline Read-Only Recovery

## Verdict

`P1_5_C2H2E3D_W1C_M3X_A1_IAM_EVIDENCE_INCOMPLETE`

This package was read-only. It did not retry M3X, change IAM, generate a token, use
impersonation, call Firestore, or write a Class or manifest.

## Incident comparison

```text
M3X_VERDICT = P1_5_C2H2E3D_W1C_M3X_AUDIT_BASELINE_REGRESSION_ABORT
M3X_M3_MUTATIONS = 0
M3X_M4_ATTEMPTS = 0
M3X_ABORTED_APPROVAL_REUSED = no
```

## Fresh bounded IAM facts

The approved A1 read budget was used once for each of the two custom-role metadata
reads and once for the project IAM policy read. The project policy was evaluated only
as bounded predicates; it was not emitted or stored.

```text
STAGE1_ROLE_STATE = UNRESOLVED
STAGE1_ROLE_EXACT_PERMISSIONS = unresolved
CANONICAL_READER_ROLE_STATE = UNRESOLVED
CANONICAL_READER_ROLE_EXACT_PERMISSIONS = unresolved

AUDIT_SA_STAGE1_READER_BINDING = PRESENT
AUDIT_SA_CANONICAL_STATE_READER_BINDING = PRESENT
AUDIT_SA_CLASS_CREATE_ROLE = absent
WRITER_CUSTOM_ROLE_BINDING = absent
WRITER_DATA_CREATE_AUTHORITY = no
CALLER_PROJECT_WIDE_TOKEN_CREATOR = not_reevaluated
FIREBASE_ADMIN_PROJECT_WIDE_TOKEN_CREATOR = not_reevaluated
STAGE1_BINDING_HAS_CONDITION = no
CANONICAL_READER_BINDING_HAS_CONDITION = no
```

The two role metadata reads did not produce usable role objects in this bounded run,
so exact permissions were not inferred from historical documents. This leaves the
overall production audit baseline unresolved rather than treating partial evidence as
safe.

## M3X predicate diagnosis

```text
M3X_AUDIT_BASELINE_PREDICATE_PATH = transient bounded PowerShell precheck in the M3X executor; no repository runtime helper
M3X_BASELINE_REQUIRED_PREDICATES = [stage1 exact role, canonical exact role, both exact audit bindings, audit Class-create absent, writer M4 absent]
CURRENT_PREDICATE_RESULT_ON_A1_FACTS = NOT_PROVEN
ROOT_CAUSE = OTHER_PROVEN_LOCAL_PREDICATE_DEFECT
ACTUAL_AUDIT_BASELINE_REGRESSED = unresolved
M3X_ABORT_CAUSED_BY_LOCAL_PREDICATE_LIMITATION = yes
```

The M3X transient predicate treated the result of a string-valued binding helper as a
boolean in the audit Class-create check. The helper returned `ABSENT` as a non-empty
string, which is truthy in PowerShell, so an absent binding could incorrectly make the
baseline gate fail. This is a local predicate defect, not evidence of a production IAM
regression. No runtime code was changed because the role permission evidence remains
incomplete and there is no persisted predicate implementation to patch.

## Safety accounting

```text
M3_MUTATION_ATTEMPTS = 0
M4_MUTATION_ATTEMPTS = 0
IAM_MUTATIONS = 0
ACCESS_TOKEN_CALLS = 0
WRITER_IMPERSONATION_CALLS = 0
FIRESTORE_API_CALLS = 0
FIRESTORE_READS = 0
FIRESTORE_WRITES = 0
SERVICE_ACCOUNT_KEY_LIST_CALLS = 0
SERVICE_ACCOUNT_KEY_CREATION = 0
SERVICE_ACCOUNT_KEY_USE = 0
CUSTOM_ROLE_MUTATIONS = 0
RULES_CHANGES = 0
INDEX_CHANGES = 0
UNKNOWN_IAM_STATE_ACCEPTED_AS_SAFE = no
```

```text
PROJECT_IAM_POLICY_READS = 1
STAGE1_CUSTOM_ROLE_READS = 1
CANONICAL_READER_CUSTOM_ROLE_READS = 1
WRITER_CUSTOM_ROLE_READS = 0
ACTIVE_CALLER_DISCOVERY_CALLS = 0
AUDIT_SA_IAM_POLICY_READS = 0
```

## Approval state and next action

```text
LOCAL_PREDICATE_CODE_CHANGED = no
M3R_APPROVAL_LOCK_STATUS = unchanged
M3X_ABORTED_APPROVAL_REUSED = no
FUNCTIONS_TEST_BLOCKER_FOR_FINAL_CLASS_WRITE = PRESENT
```

Do not retry M3X. First obtain a separately approved bounded read that successfully
resolves both custom-role definitions and exact permissions. If the fresh baseline is
then safe, prepare a new M3X precheck/relock approval; do not mutate under this A1
package.

## Repository and privacy

No raw human principal, full IAM policy, token, credential JSON, private key, or
personal path was stored in this report. No file other than this result document was
modified; there was no staging, commit, push, or deploy.
