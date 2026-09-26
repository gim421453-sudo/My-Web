# P1.5-C2H2E3D-W1C-M3L2-G4R3H

## Scope

This package implements the exact effective-caller contract locally. It does not execute gcloud, read IAM, mutate IAM, access Firestore, generate tokens, use M4, or contact production.

## Runtime contract

- OP-A remains a single-call active-account discovery step and is not an authorization proof.
- A supported `user` or `serviceAccount` principal is normalized by outer trimming and exact validation only.
- The IAM member is constructed once and carried through a non-enumerable frozen in-memory identity context.
- OP-B, OP-C pre/post, OP-D pre/post, and OP-E receive `--configuration=NONE` and the same transient `--account` pin.
- `CLOUDSDK_CONFIG` is snapshotted once for the bounded session. The child environment removes only the three proven auth override surfaces: access token, credential file, and impersonation.
- Exact prestate compares the exact member transiently and returns a closed result. Only `TARGET_MEMBER_ABSENT` can pass the prestate gate; the same context member is used by OP-E.
- No unpinned retry, credential copy, config mutation, token generation, writer impersonation, Firestore, M4, or Cloud Logging path was added.

## Evidence

The canonical payload is [the G4R3H evidence JSON](../evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3h-exact-effective-caller-identity-implementation-v1.json). Focused coverage is in [the local identity test](../tools/authority-audit-tests/g4r3hExactEffectiveCallerIdentity.test.mjs).

The pre-patch runtime lock was not captured before editing began, so it is explicitly recorded as `NOT_CAPTURED_AT_PATCH_START`; no fabricated pre-patch hash is asserted. Post-patch locks are exact byte hashes. This prevents the local package from being treated as a complete historical diff attestation.

## Authority status

The implementation is local-only. G4R1/G4R2 remain historical evidence for the pre-identity-patch runtime. A post-G4R3H external-capability re-attestation and new final composite are mandatory. M3L3 approval is not granted.

Verdict: `P1_5_C2H2E3D_W1C_M3L2_G4R3H_EXACT_IDENTITY_CONTRACT_IMPLEMENTATION_PASS_G4R3R1_REQUIRED`

Canonical payload SHA-256: `69547b022df6d32b2e8fc1820c35339205627315b76d5163ffb04af32284dbbb` (independently recomputed twice). The post-patch runtime locks are `d966ee74e2530d1cd682d863bc934d19f1f1167598ae3455c18eff74e9420f03` for the M3 graph and `b2d04308371d832bbdfb62cdd2c3569e3685de0b340f6de14aea38118fbe7578` for the Windows adapter; focused test lock: `0b258aa28b2b76e7b7140cc9ec1f116fdf9ed64fe192f0885c807b708b530767`.
