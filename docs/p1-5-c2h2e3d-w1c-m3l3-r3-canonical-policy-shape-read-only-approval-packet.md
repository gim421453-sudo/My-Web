# M3L3 R3 Canonical Policy-Shape Read-Only Approval Packet

```text
==================================================
APPROVAL REQUIRED
==================================================

STAGE =
P1.5-C2H2E3D-W1C-M3L3-R3

TYPE =
READ_ONLY

PURPOSE =
Perform one newly approved writer-SA getIamPolicy read using a locally
tested canonical IAM Policy projection that distinguishes a valid policy
whose bindings field is omitted from an unrecognized JSON response.

CURRENT_M3_STATE =
READ_FAILURE

R2_APPROVAL_STATUS =
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

## R2 Evidence

- R2 evidence: `607db23fc03c830d14f9da9e8241a6629ee6cd967cd64b44d6e99d16ad431fae`
- R2 result document: `106fab9b3cbc583dd3bff9f97f46b7db7962f16154f79c001d908e7a45566309`
- R2 packet: `5ae22bdf0fcfb8d44e62eedda3a65c88f38282bb80d2dca90271012bd4b3d9f4`

R2 completed one permitted read. Its safe outcome was `UNSUPPORTED_POLICY_SHAPE` with a successful process exit. It did not establish present, absent, or mutation state.

## Required Local Precondition

Before any R3 remote operation, a local-only parser and deterministic test must prove all of the following:

1. The top-level value is an IAM Policy object, not an error payload or arbitrary JSON.
2. Only supported policy fields are accepted.
3. An omitted `bindings` field is treated as an empty binding array only after that object validation succeeds.
4. A malformed, unknown, or error-shaped payload remains `READ_FAILURE` or `AMBIGUOUS`.
5. The exact target-role/member comparison stays transient.
6. Raw policy, identity, account argument, etag, conditions, stdout, stderr, credential, token, and local paths are never retained.

The parser implementation and test hashes must be recorded in a revised packet before any R3 execution. This document alone does not authorize running an unimplemented or unlocked parser.

## Exact Remote Scope After Precondition

- Local exact identity discovery: max 1
- Writer-SA `getIamPolicy`: max 1
- Exact target role: `roles/iam.serviceAccountTokenCreator`
- Project IAM reads: 0
- IAM, M3, M4, and project IAM mutations: 0
- Access-token and impersonation calls: 0
- Firestore, Cloud Logging, `testIamPermissions`, and service-account key operations: 0
- Retry and rollback: 0

The R3 approval becomes consumed when its single policy read begins. It is not a retry of R1 or R2. Stop after the read and local evidence generation.

## Result Domain

- `PRESENT_CONFIRMED`
- `ZERO_BINDINGS_ABSENT`
- `MEMBER_ABSENT`
- `AMBIGUOUS`
- `READ_FAILURE`
- `IDENTITY_FAILURE`

No M3 or M4 action is authorized for any result. A new approval is required for every subsequent remote operation.
