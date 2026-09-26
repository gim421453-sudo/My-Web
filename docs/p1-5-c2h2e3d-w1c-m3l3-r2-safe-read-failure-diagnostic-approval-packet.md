# M3L3 R2 Safe Read-Failure Diagnostic Approval Packet

```text
==================================================
APPROVAL REQUIRED
==================================================

STAGE =
P1.5-C2H2E3D-W1C-M3L3-R2

TYPE =
READ_ONLY

PURPOSE =
Perform one newly approved exact writer-SA getIamPolicy read with a
privacy-bounded process diagnostic so the R1 READ_FAILURE can be
classified without retaining raw output, identity, or policy data.

CURRENT_M3_STATE =
READ_FAILURE

R1_APPROVAL_STATUS =
CONSUMED_NON_REUSABLE

REMOTE_CALLS_MAX =
1

RETRIES =
0

MUTATIONS =
0

SAFE_TO_CONTINUE_WITHOUT_APPROVAL =
no
```

## Locked Local Inputs

- R1 evidence: `3cd19a1d6e03d63684e0bf7a7f42d0cc7f477fc0a985f94e4f51742bf7f4c20c`
- R1 result document: `cce0636504186aea24c95fa88426f6de2f37a6f0acae697af82441f3808245f2`
- RF1 attestation: `a6adbddc5cfc112b070d0392d7dd6ef2680b3e1d16111bf82f10dbfc1bace7a9`
- Recovery plan: `0e5156bdc9040f541c36e22892621ae1a48c9019fc1d060cd6ae2dbcdd0cc501`
- G4R3R2 composite: `1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195`
- Safe diagnostic helper: `ae597471b67f84d6412f63099057a5eb4b70f5a816697772984c0b48a809d3ee`
- R2 executor: `dc8459cfb8501866396bdab4f35f2f68b694436c239bf34c81fe66000323815a`
- R2 synthetic test: `16de005f898cc243f9b30d5b718779bd5028f855c6b32c5416daafefae856d8d`

Any hash mismatch blocks execution.

## Exact Operation

1. Local OP-A, maximum once: discover exactly one active current principal, validate the supported principal kind, and construct the transient immutable identity context.
2. Remote operation, maximum once: call `getIamPolicy` only for the exact class-migration writer service account.
3. Inspect only `roles/iam.serviceAccountTokenCreator` transiently against the exact current IAM member.
4. Persist only the closed M3 state or the bounded diagnostic projection.

The approval is consumed when step 2 begins, regardless of outcome. It is not reusable.

The executor validates its bounded R2 projection through the RF1-corrected
safe result assembler before returning any result.

## Strict Budget

- Local identity discovery: max 1
- Writer-SA `getIamPolicy`: max 1
- Project IAM reads: 0
- IAM mutations: 0
- M3/M4 mutations: 0
- Access-token calls: 0
- Firestore calls: 0
- Cloud Logging reads: 0
- `testIamPermissions`: 0
- Service-account key operations: 0
- Retries: 0
- Rollbacks: 0

No project policy read, writer metadata read, role metadata read, token generation, impersonated API call, mutation, commit, push, or deploy is authorized.

## Bounded Result

The M3 result remains limited to:

- `PRESENT_CONFIRMED`
- `ZERO_BINDINGS_ABSENT`
- `MEMBER_ABSENT`
- `AMBIGUOUS`
- `READ_FAILURE`
- `IDENTITY_FAILURE`

On `READ_FAILURE`, the diagnostic may contain only:

- outcome enum
- zero/nonzero/unavailable exit classification
- timeout boolean
- allowlisted spawn-error code
- stdout/stderr byte buckets and line counts
- policy parse-shape enum
- allowlisted stderr rule IDs
- unknown stderr line count

It must not contain raw stdout/stderr, exact identity/member, policy/bindings, normalized line, normalized fingerprint, account argument, config path, credential, token, etag, or condition.

## Stop Boundary

Stop after the single read and local evidence generation. Any second read, IAM mutation, M4 action, project IAM read, token call, Firestore call, Cloud Logging read, `testIamPermissions`, commit, push, or deploy requires a new explicit approval.
