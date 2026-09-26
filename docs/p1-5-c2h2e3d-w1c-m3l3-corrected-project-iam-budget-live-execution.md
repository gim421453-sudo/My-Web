# P1.5-C2H2E3D-W1C-M3L3 Corrected-Budget Live Execution

## Outcome

- Final verdict: `P1_5_C2H2E3D_W1C_M3L3_BLOCKED`
- Approval: `CONSUMED_NON_REUSABLE`
- Runtime: locked `G4R3R2`; source and SDK locks passed before execution.
- Result: the locked runtime returned, but the local privacy-safe result object failed to serialize because of a field-name `ReferenceError`.
- Recovery: no retry, post-failure IAM read, rollback, second mutation, M4, token, Firestore, Cloud Logging, or `testIamPermissions` call was made.

## Fail-Closed Interpretation

The remote prestate, mutation outcome, poststate, and exact operation counters were not emitted and cannot be reconstructed without a new remote call. They remain `UNKNOWN_NOT_RECOVERED`; no successful binding claim is made. The approved session must not be reused.

The bounded wrapper still enforced the locked maxima and command allowlist before every child process call. Project IAM reads could only map to `OP_D_PRE` and `OP_D_POST`, each at most once and each counted as one physical call.

## Evidence

- Evidence: `docs/evidence/p1-5-c2h2e3d-w1c-m3l3-corrected-project-iam-budget-live-execution-v2.json`
- Verifier: `tools/authority-audit/m3l3CorrectedBudgetLiveExecutionEvidence.mjs`
- Attack checks: `tools/authority-audit-tests/m3l3CorrectedBudgetLiveExecutionEvidence.test.mjs`
- Evidence SHA-256: `8595cabe34d7f04b8433ef0db99faf364ab51ec337e4764c4b8fbb637b7de322`
- Result-document SHA-256 is computed from this finalized UTF-8 file and reported with the execution result.

## Next Gate

A separate explicit recovery approval is required for any remote state confirmation. It must authorize read-only exact post-failure state recovery and must not authorize a second mutation.
