# M3L3 R1 Read-Only Recovery Approval Packet

```text
==================================================
APPROVAL REQUIRED
==================================================

STAGE =
P1.5-C2H2E3D-W1C-M3L3-R1

TYPE =
READ_ONLY

PURPOSE =
Recover the current exact writer-SA Token Creator binding state after the consumed M3L3 session lost its local result projection.

REMOTE_CALLS_MAX =
1

RETRIES =
0

MUTATIONS =
0

CURRENT_REMOTE_STATE =
UNKNOWN_AFTER_CONSUMED_M3L3_SESSION

APPROVAL_CONSUMED_PREVIOUSLY =
yes

SAFE_TO_CONTINUE_WITHOUT_APPROVAL =
no
```

## Exact Operation

1. Local `RECOVERY_OP_A`, maximum once: discover exactly one active current principal and construct an immutable transient identity context. This is local gcloud auth-state inspection and performs no remote IAM read.
2. Remote `RECOVERY_OP_C`, maximum once: read the IAM policy of `myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com` and evaluate only `roles/iam.serviceAccountTokenCreator` against the exact transient member.

No project IAM policy read, role metadata read, writer metadata read, token generation, `testIamPermissions`, Cloud Logging, Firestore, mutation, retry, or rollback is authorized.

## Result Domain

- `TARGET_MEMBER_PRESENT_CONFIRMED`: prepare an M4 approval gate only; do not execute M4.
- `TARGET_ROLE_ZERO_BINDINGS_ABSENT_PROVEN`: prepare a new M3 mutation approval packet; do not mutate.
- `TARGET_MEMBER_ABSENT_CONFIRMED`: prepare a new M3 mutation approval packet; do not mutate.
- `AMBIGUOUS`: stop with no mutation.
- `READ_FAILURE`: stop with no retry.
- `IDENTITY_FAILURE`: stop before the remote read.

## Authority

- G4R3R2 composite: `1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195`
- G4R3R1 attestation: `82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9`
- G4R3H-R2 attestation: `dd488891964eeac9427557b95c5cf46a42bb2f5969bbc6bcba6f55c176c79adc`
- Corrected live evidence: `8595cabe34d7f04b8433ef0db99faf364ab51ec337e4764c4b8fbb637b7de322`
- RF1 fix attestation: `a6adbddc5cfc112b070d0392d7dd6ef2680b3e1d16111bf82f10dbfc1bace7a9`
- Recovery plan: `0e5156bdc9040f541c36e22892621ae1a48c9019fc1d060cd6ae2dbcdd0cc501`

## Privacy Boundary

The exact principal, exact IAM member, raw policy, raw process output, account argument, config-root value, credential, token, etag, and IAM condition remain transient and must not be printed or persisted. Only the closed result enum and bounded counters may be retained.
