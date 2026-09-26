import assert from "node:assert/strict";
import {
  buildG2BCurrentFinalExecutionComposite,
  buildG2BCurrentImplementationAttestation,
  buildG2BCurrentRuntimeCapabilityAttestation,
  buildG2BCurrentLiveGraph,
  G2B_CURRENT_M3_OPERATION_GENERATION,
  sha256Canonical,
  verifyG2BCurrentLiveAttestations,
} from "../authority-audit/g2bM3CurrentLiveAttestation.mjs";
import {
  buildG2BCurrentLiveApprovalPacket,
  verifyG2BCurrentLiveApprovalPacket,
} from "../authority-audit/g2bM3CurrentLiveApprovalPacket.mjs";

const implementation = buildG2BCurrentImplementationAttestation();
const runtimeCapability = buildG2BCurrentRuntimeCapabilityAttestation();
const composite = buildG2BCurrentFinalExecutionComposite({ implementation, runtimeCapability });
const packet = buildG2BCurrentLiveApprovalPacket({ implementation, runtimeCapability, composite });

assert.equal(runtimeCapability.graph.projectIamReadReachability, 0);
assert.equal(runtimeCapability.executorBound, true);
assert.equal(runtimeCapability.coordinatorToExecutorBindingVerified, true);
assert.equal(runtimeCapability.unboundRemoteCapabilities, 0);
assert.equal(runtimeCapability.unboundProcessCapabilities, 0);
assert.equal(verifyG2BCurrentLiveAttestations({ implementation, runtimeCapability, composite }).ok, true);
assert.equal(verifyG2BCurrentLiveApprovalPacket(packet, { implementation, runtimeCapability, composite }).ok, true);
assert.equal(packet.operationGeneration, G2B_CURRENT_M3_OPERATION_GENERATION);
assert.equal(packet.totalProjectIamReadsMax, 0);
assert.equal(packet.totalPhysicalRemoteReadsMax, 2);
assert.equal(runtimeCapability.prospectiveM3Reachable, false);
assert.equal(runtimeCapability.budgets.mutationProcessPhysicalProviderCallsMin, 2);
assert.equal(runtimeCapability.budgets.totalPhysicalProviderCallsMin, 4);
assert.equal(packet.status, "SUPERSEDED_REMOTE_CAPABILITY_ACCOUNTING_REPAIR_REQUIRED");
assert.equal(packet.m3MutationReachable, false);
assert.equal(packet.packetComplete, false);

console.log(JSON.stringify({
  implementationAttestationSha256: sha256Canonical(implementation),
  runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
  finalExecutionCompositeSha256: sha256Canonical(composite),
  currentGraphIdentity: buildG2BCurrentLiveGraph().identity,
  packetSha256: sha256Canonical(packet),
}));
console.log("G2B current live attestation and packet matrix passed; remote operations=0");
