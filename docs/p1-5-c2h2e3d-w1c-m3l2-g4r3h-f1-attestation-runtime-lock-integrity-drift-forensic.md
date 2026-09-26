# P1.5-C2H2E3D-W1C-M3L2-G4R3H-F1

## Scope

This is a local forensic record of the G4R3H attestation-chain drift. Existing G4R3H artifacts are preserved; no runtime, cloud, IAM, Firestore, token, or production operation was performed.

## Finding

The result document literally records the implementation-pass verdict and named attestation `69547b022df6d32b2e8fc1820c35339205627315b76d5163ffb04af32284dbbb`. The current canonical evidence is reproducible under the current verifier as `4b57d183865f0671736497059b67bd5873d441b6c25f94c2fef15d37aa62b134`. The result document also records an older M3 lock (`d966...`) while canonical evidence and the current M3 file are `36776...`.

This is classified as `MULTIPLE_DRIFTS`: the named attestation is not reproducible from the current evidence, and the result document independently disagrees with the canonical M3 lock. The original complete input for `69547...` is not present in the repository artifacts inspected here; it is not hash-fitted or reconstructed.

## Safe status

Current implementation semantics remain locally passing, but the current payload is not promoted to execution authority. `G4R3R1_APPROVAL_ELIGIBLE=no`, `M3L3_APPROVAL_ELIGIBLE=no`, and `M3L3_LIVE_APPROVAL=NOT_GRANTED` remain in force.

The minimum safe recovery is `NEW_G4R3H_GENERATION_REQUIRED`: preserve generation 1, then create a separately named current-state attestation with fresh exact locks and a new result document in a later approved stage.

Canonical forensic evidence: [F1 evidence](evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3h-f1-attestation-integrity-drift-forensic-v1.json).

F1 canonical attestation SHA-256: `845c4ce63d9830966ab331afd641cae127f106d3f93d03ef704a5f79659eb33b` (independently recomputed twice).

Verdict: `P1_5_C2H2E3D_W1C_M3L2_G4R3H_F1_CURRENT_IMPLEMENTATION_PASS_NEW_GENERATION_ATTESTATION_REQUIRED`
