# M3L3 R3 Canonical Policy Recovery Approval Packet V2

## Approval Required

```text
STAGE=P1.5-C2H2E3D-W1C-M3L3-R3
TYPE=READ_ONLY
PURPOSE=canonical-policy-shape-aware exact M3 binding state recovery
REMOTE_CALLS_MAX=1
RETRIES=0
MUTATIONS=0
CURRENT_M3_STATE=READ_FAILURE
PARSER_LOCAL_FIX=PASS
PARSER_ATTESTATION_SHA256=a455d5df0210395c4c8625e5774384838ffcd8980f3e46321af03c28e6735455
R3_RECOVERY_PLAN_SHA256=220ef3972c120ffc931626bd975e6359f7e4588119f3122359fc63668a26c189
CURRENT_AUTHORITY_CHAIN=R2_READ_FAILURE>RF1_SAFE_RESULT_FIX>R3_PARSER_ATTESTATION>R3_RECOVERY_PLAN
SAFE_TO_CONTINUE_WITHOUT_APPROVAL=no
```

This packet supersedes the preliminary R3 packet. It authorizes nothing until
an explicit approval is supplied. The single permitted policy read consumes the
approval at start, including a failed read.

## Local Proof And Fail-Closed Contract

- Local Google IAM `Policy` proto declares `bindings` as a repeated field.
- The locally installed proto3 JSON serializer omits empty repeated arrays.
- Therefore an omitted `bindings` field is normalized to `[]` only for an
  otherwise strict policy object with a nonempty `etag`.
- `{}`, arrays, scalar roots, error payloads, unknown root keys, malformed
  bindings, malformed role/member values, malformed conditions, and malformed
  audit configuration are rejected. No default is invented for them.
- The parser retains no policy, member, etag, condition, identity, stdout, or
  stderr in its public projection. Exact comparison is transient only.

## Locked Local Inputs

```text
tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs=33a887e60c57383c7b53448a84c63252f7772210e043844f10a8611ba633a7cd
tools/authority-audit-tests/m3l3R3CanonicalPolicyParser.test.mjs=fdab61b473300a8827b86bdf7d105bd928f6837d0c1829ca91a17c6d50d7df26
tools/authority-audit/m3l3R3CanonicalPolicyRecoveryExecutor.mjs=7328e4ff13c7018ddd415c2e51961d8e05f40d3f0612e8405e232dd29b239427
tools/authority-audit-tests/m3l3R3CanonicalPolicyRecoveryExecutor.test.mjs=4d351e3d7f381503f0d033591b35c1efb637565bf802f993af7cd513fd08efff
tools/authority-audit/m3l3R3CanonicalPolicyParserAttestation.mjs=4a257074b52f7300d8b396b24fe51ce9d6c4f5063c7b432539f33d7c16fbdcaf
tools/authority-audit-tests/m3l3R3CanonicalPolicyParserAttestation.test.mjs=3e844fd41c93fc404d16cb73b467457ee99a19653e7bb28781422025690ac584
tools/authority-audit/m3l3R3CanonicalPolicyRecoveryPlan.mjs=00b3ce3a627c4a2457011a8d7828abf15bf3905a74fde1102c9bd92504e804f5
tools/authority-audit-tests/m3l3R3CanonicalPolicyRecoveryPlan.test.mjs=4a7072a442c028af18872a8f4bf7620d23e1cee0cafd71bae1c2b4e0d810da77
```

## Remote Budget

- Active caller discovery: at most 1 local command.
- Writer service-account `getIamPolicy`: at most 1 remote read.
- Project IAM reads, IAM mutations, M3/M4 mutations, access tokens,
  Firestore, Cloud Logging, `testIamPermissions`, service-account keys,
  retries, and rollbacks: 0.
- Stop after the result. A separate explicit approval is required for every
  subsequent operation.

## Allowed Bounded Results

`PRESENT_CONFIRMED`, `ZERO_BINDINGS_ABSENT`, `MEMBER_ABSENT`, `AMBIGUOUS`,
`READ_FAILURE`, or `IDENTITY_FAILURE`.
