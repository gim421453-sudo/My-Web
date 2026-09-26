import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildG2BProviderProcessDiagnosticPacketV2,
  verifyG2BProviderProcessDiagnosticPacketV2,
} from "../authority-audit/g2bM3ProviderProcessDiagnosticPacketV2.mjs";

const artifacts = buildG2BProviderProcessDiagnosticPacketV2();
assert.equal(verifyG2BProviderProcessDiagnosticPacketV2(artifacts).ok, true);
assert.equal(artifacts.sourceLockManifest.localDependencyCount, 5);
assert.equal(artifacts.sourceLockManifest.unboundDiagnosticRemoteCapabilities, 0);
assert.equal(artifacts.implementation.mutationArgvContractValid, true);
assert.equal(artifacts.implementation.mutationTarget, "EXACT_G2B_WRITER_SERVICE_ACCOUNT_RESOURCE");
assert.equal(artifacts.implementation.mutationTargetContractBound, true);
assert.equal(artifacts.implementation.mutationStderrSanitizerBound, true);
assert.equal(artifacts.runtimeCapability.failedMutationTimeWindowAvailable, false);
assert.equal(artifacts.runtimeCapability.failedMutationTargetAvailable, true);
assert.equal(artifacts.runtimeCapability.failedMutationMethodAvailable, true);
assert.equal(artifacts.runtimeCapability.operationGenerationCorrelationAvailable, false);
assert.equal(artifacts.runtimeCapability.testIamPermissionsCallsMax, 0);
assert.equal(artifacts.runtimeCapability.cloudLoggingReadsMax, 0);
assert.equal(artifacts.runtimeCapability.totalPhysicalRemoteReadsMax, 0);
assert.equal(artifacts.packet.status, "BLOCKED");
assert.equal(artifacts.packet.diagnosticPacketComplete, false);
assert.equal(artifacts.packet.safeToContinueWithoutApproval, false);
assert.equal(artifacts.packet.mutations, 0);
assert.equal(artifacts.packet.targetResource, "EXACT_G2B_WRITER_SERVICE_ACCOUNT_RESOURCE");
assert.equal(JSON.stringify(artifacts).includes("@"), false);

for (const [key, path] of Object.entries({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-provider-process-source-lock-manifest-v2.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-provider-process-implementation-attestation-v2.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-provider-process-runtime-capability-v2.json",
  composite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-provider-process-execution-composite-v2.json",
  packet: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-provider-process-diagnostic-packet-v2.json",
})) {
  const persisted = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(typeof persisted.schema, "string");
  // Historical evidence remains immutable. Matching a current local projection
  // is allowed; it never turns the old blocked packet into an execution grant.
  if (key === "packet") {
    assert.notEqual(persisted.status, "APPROVED");
    assert.equal(persisted.safeToContinueWithoutApproval, false);
  }
}

for (const mutate of [
  (value) => { value.packet.totalPhysicalRemoteReadsMax = 1; },
  (value) => { value.packet.mutations = 1; },
  (value) => { value.runtimeCapability.cloudLoggingReadsMax = 1; },
  (value) => { value.implementation.mutationArgvContractValid = false; },
  (value) => { value.sourceLockManifest.localDependencies[0].sha256 = "0".repeat(64); },
]) {
  const changed = structuredClone(artifacts);
  mutate(changed);
  assert.equal(verifyG2BProviderProcessDiagnosticPacketV2(changed).ok, false);
}

console.log("G2B provider/process diagnostic packet v2 blocked safely; remote operations=0");
