# P1.5-C2H2E3D-W1C-M3L2-R1B1H Identity-Independent Target-Role Absence Helper

## Scope

This batch adds one local, pure diagnostic helper and focused synthetic tests.
It does not read IAM, call gcloud, access Cloud Logging, execute M3/M4, create
tokens, access Firestore, or modify the M3 runtime.

## Implementation

`tools/authority-audit/writerPolicyTargetRoleAbsenceDiagnostic.mjs` accepts only
a transient parsed policy object. It fail-closes to `AMBIGUOUS` unless all of
the following are true:

- `version` is the supported value `3`;
- `etag` is a non-empty string;
- `bindings` is explicitly present and is an array; and
- every binding has a string `role`, a string-array `members` field, and an
  object-shaped optional `condition`.

The exact role comparison is strict equality with
`roles/iam.serviceAccountTokenCreator`. A matching role always returns
`AMBIGUOUS`; member values and condition expressions are not evaluated. A
complete valid binding array with no exact target role returns `ABSENT_PROVEN`.
The helper never returns a present state and never returns policy, binding,
member, condition, or etag values.

The empty object and a policy with a missing `bindings` field are therefore
`AMBIGUOUS`; an explicit complete `bindings: []` is `ABSENT_PROVEN`.

## Tests

`tools/authority-audit-tests/writerPolicyTargetRoleAbsenceDiagnostic.test.mjs`
covers empty/incomplete input, explicit empty bindings, unrelated roles,
exact and conditional target roles, malformed bindings, collapsed numeric
projections, closed result domain, and output privacy.

## R1B2 design boundary

The future R1B2 flow may reuse the existing locked OP-C writer-service-account
policy read, then validate transiently, classify with this helper, and discard
the raw policy. It remains unapproved here. The future budget remains one
writer-SA policy read, zero retries, zero logging/project IAM reads, zero
mutations, zero token calls, and zero Firestore calls.

```text
PRODUCTION_M3_RUNTIME_CHANGED = 0
F4P1_MEMBER_PRIVACY_CONTRACT_CHANGED = no
R1B_EXTERNAL_CAPABILITY_IMPACT = NONE
REAL_GCLOUD_EXECUTIONS = 0
LIVE_IAM_READS = 0
IAM_MUTATIONS = 0
M3_MUTATIONS = 0
M4_MUTATIONS = 0
FIRESTORE_API_CALLS = 0
STAGING = 0
COMMIT = 0
PUSH = 0
DEPLOY = 0
```

## Final attestation

The exact current file bytes were hashed without normalization:

```text
R1B1H_HELPER_SHA256 = 72656d4091e058a2c937d52ecaad905285e3f77494a772be0f119c48937a4a69
R1B1H_HELPER_TEST_SHA256 = f8995d73d011104062ef291a17682f0f2970c5d9905305f854dfce7450227ee6
```

The closed result domain is exactly `ABSENT_PROVEN` / `AMBIGUOUS`. The helper
cannot return `PRESENT_PROVEN`; malformed, incomplete, unsupported, and
collapsed-projection inputs fail closed to `AMBIGUOUS`. The explicit complete
empty binding set returns `ABSENT_PROVEN`.

The focused helper test and all 12 current authority-audit regression files
passed. Root `npm.cmd run typecheck` passed. `git diff --check` reported zero
new whitespace errors; only pre-existing CRLF normalization warnings remain.

```text
HELPER_PURITY = PASS
HELPER_PRODUCTION_M3_DEPENDENCY = no
HELPER_PRIVACY = PASS
F4P1_RUNTIME_CHANGED = 0
F4P1_MEMBER_PRIVACY_CONTRACT_CHANGED = no
M3_RUNTIME_REATTESTATION_REQUIRED = no
R1B2_LIVE_APPROVAL = NOT_GRANTED
AUTHORITY_AUDIT_REGRESSION_COUNT = 12
AUTHORITY_AUDIT_REGRESSION_RESULT = PASS
TYPECHECK = PASS
NEW_WHITESPACE_ERRORS = 0
```
