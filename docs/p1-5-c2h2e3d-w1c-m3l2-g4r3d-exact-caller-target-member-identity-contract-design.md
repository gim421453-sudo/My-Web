# P1.5-C2H2E3D-W1C-M3L2-G4R3D

## Scope

This is a local-only identity contract design. No gcloud, IAM, Firestore, production, token, M3, M4, or Cloud Logging operation was performed.

## Evidence baseline

- Branch: `checkpoint/notice-auth-recovery-20260723`
- HEAD: `84b2c16`
- G4R2 composite: `790c903219ec3cb7f9aa536c2c3881b8fc889471fd0505f05c38060d1835d0c1`
- G4R2 result document hash: `11bbaf9eb8238cbcefc049da4a5c2bab58cad1cdf081d8232fd39d09558f11ce`
- G4R1 attestation: `5ac0ad87de153ec0e43289a224d1a91ff5407cc66c3ec3bfcb5596a9b108843e`

The G4R2 blocker is reproduced: fresh prestate identity is still based on the old fixed 48-bit fingerprint contract.

## Current OP-A and identity flow

Source: `tools/authority-audit/m3RuntimeCommandGraph.mjs`.

1. `buildActiveCallerCommand()` constructs `gcloud auth list --filter=status:ACTIVE --format=value(account) --verbosity=error`.
2. `runM3Dormant()` parses newline-delimited output and requires exactly one value.
3. The current gate authorizes continuation by comparing `sha256(trim(lowercase(principal)), utf8).slice(0,12)` to a fixed value. This is a 48-bit diagnostic fingerprint, not an authorization-grade exact identity proof.
4. The accepted principal is retained transiently and passed to `callerMember()` for policy parsing and `buildWriterBindingMutationCommand()`.
5. `callerMember()` maps the proven service-account suffix to `serviceAccount:<exact value>`; other validated email principals map to `user:<exact value>`.
6. The same principal is supplied to current policy parsing and OP-E member construction, but later gcloud commands do not carry explicit `--account` pinning.

## Exact future contract

The future session creates one immutable in-memory context:

`principalKind + exactPrincipal + exactIamMember + pinnedCredentialIdentity`

The exact principal is transient only. It is validated strictly, converted once to the exact IAM member, and reused by fresh prestate and OP-E. Authorization never uses a full or truncated hash, substring, title, or historical identity. A fresh prestate compares the exact member transiently and persists only `PRESENT`, `ABSENT`, `AMBIGUOUS`, or `READ_FAILURE`. Any account/config/credential change stops before prestate or mutation. A process restart cannot resume the context.

Target role remains `roles/iam.serviceAccountTokenCreator`; the member kind rule above is bounded to behavior proven by the current constructor.

## Effective credential and TOCTOU finding

`windowsGcloudProcessAdapter.mjs` resolves a local executable and forwards command arguments/environment, but does not pin the gcloud account. The current M3 command builders contain no explicit `--account`; local source also does not prove that configuration or an external impersonation setting cannot alter the effective caller. Therefore:

- `EFFECTIVE_CALLER_CAN_DIFFER_FROM_OP_A_PRINCIPAL = UNRESOLVED`
- `CURRENT_ACCOUNT_SELECTION_TOCTOU = POSSIBLE`
- `UNAPPROVED_IMPERSONATION = BLOCK`
- `IDENTITY_CONTRACT_COMMAND_SURFACE_CHANGE_REQUIRED = yes`

Safe future options are explicit account selection on every relevant command or an isolated gcloud configuration/session bound to the approved execution. Either option requires new runtime implementation and full external capability/argv re-attestation; G4R1/G4R2 authority is not reusable after that change.

## Proposed implementation scope, not implemented here

- `m3RuntimeCommandGraph.mjs`: create/freeze the identity context once, replace hash authorization with exact validation, pass the context to prestate and OP-E, and stop on account drift.
- `windowsGcloudProcessAdapter.mjs`: only if required to bind the approved account/configuration to each process invocation.
- Related prestate parsing: exact transient member comparison with bounded result codes.

No runtime code was changed in G4R3D.

## Privacy and gates

Raw principal, IAM member, process output, credentials, and identity hashes are not persisted or logged by this design artifact. M3 mutation is not used as an identity diagnostic. M3L3 approval is not granted.

Live counters: `REAL_GCLOUD_EXECUTIONS=0`, `LIVE_IAM_READS=0`, `IAM_MUTATIONS=0`, `M3_LIVE_MUTATIONS=0`, `M4_MUTATIONS=0`, `ACCESS_TOKEN_CALLS=0`, `FIRESTORE_API_CALLS=0`, `STAGING=0`, `COMMIT=0`, `PUSH=0`, `DEPLOY=0`.

## Reproducible local attestation

Evidence: `docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3d-exact-caller-target-member-identity-contract-v1.json`.

The verifier canonicalizes recursively sorted JSON and computes UTF-8 SHA-256. The final payload hash and this report's byte hash are reported externally to avoid self-referential hashing.

Payload SHA-256: `6dcce593886701d31bd341bf91d6edf080cd76082fb39dcfb30aec23a7dc27ef`.

Verdict: **P1_5_C2H2E3D_W1C_M3L2_G4R3D_EFFECTIVE_CALLER_IDENTITY_SEMANTICS_UNRESOLVED**

Recommended next stage: `P1.5-C2H2E3D-W1C-M3L2-G4R3H` exact caller/target-member identity contract implementation, local-only and without M3 live approval.
