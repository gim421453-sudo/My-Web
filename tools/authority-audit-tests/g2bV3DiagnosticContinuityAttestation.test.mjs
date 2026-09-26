import assert from "node:assert/strict";
import {
  buildG2BV3DiagnosticContinuityAttestation,
  inspectG2BV3SourceLockDeltas,
  verifyG2BV3DiagnosticContinuityAttestation,
} from "../authority-audit/g2bV3DiagnosticContinuityAttestation.mjs";

const deltas = inspectG2BV3SourceLockDeltas();
assert.equal(deltas.mismatchCount, 5);
assert.deepEqual(deltas.deltas.map(({ path, classification, runtimeEntryPointReachable }) => ({ path, classification, runtimeEntryPointReachable })), [
  { path: "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs", classification: "DIAGNOSTIC_RUNTIME_SEMANTIC", runtimeEntryPointReachable: true },
  { path: "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs", classification: "DIAGNOSTIC_RUNTIME_SEMANTIC", runtimeEntryPointReachable: true },
  { path: "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py", classification: "DIAGNOSTIC_RUNTIME_SEMANTIC", runtimeEntryPointReachable: true },
  { path: "tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs", classification: "TEST_ONLY", runtimeEntryPointReachable: false },
  { path: "tools/authority-audit-tests/g2bExplicitSetIamPolicySdkContract.test.mjs", classification: "TEST_ONLY", runtimeEntryPointReachable: false },
]);
assert.equal(deltas.diagnosticRuntimeRelevantChangeCount, 3);
assert.equal(deltas.unknownChangeCount, 0);

const artifacts = buildG2BV3DiagnosticContinuityAttestation();
assert.equal(artifacts.attestation.historicalV3SourceLockMatchCurrentBytes, false);
assert.equal(artifacts.attestation.runtimeSourceLockMatch, false);
assert.equal(artifacts.attestation.historicalRuntimeSemanticFingerprint, artifacts.attestation.currentRuntimeSemanticFingerprint);
assert.equal(artifacts.attestation.currentM3RuntimeSafetyImprovedByGuardChange, true);
assert.equal(artifacts.attestation.continuityPass, false);
assert.equal(verifyG2BV3DiagnosticContinuityAttestation(artifacts).ok, false);
console.log("G2B historical V3 continuity correctly blocked by transport source changes; local-only; remote operations=0");
