import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  buildG2BResolvedStoreFixedApprovalPacket,
  buildG2BResolvedStoreFixedAttestations,
  G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION,
  SUPERSEDED_PRELIVE_OPERATION_GENERATION,
  verifyG2BResolvedStoreFixedPacket,
} from "../authority-audit/g2bM3ResolvedStoreFixedApprovalPacket.mjs";
import { sha256Canonical } from "../authority-audit/g2bM3CurrentLiveAttestation.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "../authority-audit/g2bRecoveryAnchor.mjs";

const artifacts = buildG2BResolvedStoreFixedAttestations();
const packet = buildG2BResolvedStoreFixedApprovalPacket(artifacts);
assert.equal(packet.operationGeneration, G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION);
assert.notEqual(packet.operationGeneration, SUPERSEDED_PRELIVE_OPERATION_GENERATION);
assert.equal(packet.targetResource, G2B_TARGET_RESOURCE);
assert.equal(packet.targetRole, G2B_TARGET_ROLE);
assert.equal(packet.resolvedStoreReferenceDefectFixed, true);
assert.equal(packet.operationGenerationReusedAfterPreOpABlock, false);
assert.equal(packet.resolvedStoreFixSourceLockMatch, true);
assert.equal(packet.currentAttestationChainComplete, true);
assert.equal(packet.currentCanonicalParserSourceLockMatch, true);
assert.equal(packet.currentRecoveryCrashWindowCoverage, "PASS");
assert.equal(packet.legacyTargetMutationReachability, 0);
assert.equal(packet.unboundRemoteCapabilities, 0);
assert.equal(packet.unboundProcessCapabilities, 0);
assert.equal(packet.retries, 0);
assert.equal(packet.rollbacks, 0);
assert.equal(packet.secondMutationReachable, false);
assert.equal(packet.safeToContinueWithoutApproval, false);
assert.equal(verifyG2BResolvedStoreFixedPacket(packet, artifacts).ok, true);
for (const lock of artifacts.implementation.sourceLocks) {
  assert.equal(lock.sha256, createHash("sha256").update(readFileSync(lock.path)).digest("hex"), lock.path);
}
const executor = readFileSync("tools/authority-audit/g2bM3CurrentLiveExecutor.mjs", "utf8");
assert.match(executor, /resolvedStore\.load\(operationGenerationId\)/);
assert.doesNotMatch(executor, /^\s*if \(typeof store\.load/m);
const documentText = readFileSync("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-resolvedstore-fixed-live-approval-packet.md", "utf8");
const documentFields = Object.fromEntries([...documentText.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map(([, key, value]) => [key, value]));
const historicalComposite = JSON.parse(readFileSync(
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-resolvedstore-fixed-final-execution-composite-v1.json",
  "utf8",
));
for (const [documentKey, packetKey] of Object.entries({
  STAGE: "stage",
  TYPE: "type",
  TARGET_RESOURCE: "targetResource",
  TARGET_ROLE: "targetRole",
  M3_OPERATION_GENERATION: "operationGeneration",
  IMPLEMENTATION_ATTESTATION_SHA256: null,
  RUNTIME_CAPABILITY_ATTESTATION_SHA256: null,
  FINAL_EXECUTION_COMPOSITE_SHA256: null,
  M3_MUTATION_APPROVAL_PACKET_SHA256: null,
  CURRENT_GRAPH_IDENTITY: null,
})) {
  const expected = packetKey === null
    ? String(historicalComposite[documentKey === "M3_MUTATION_APPROVAL_PACKET_SHA256" ? "packetSha256" : {
      IMPLEMENTATION_ATTESTATION_SHA256: "implementationAttestationSha256",
      RUNTIME_CAPABILITY_ATTESTATION_SHA256: "runtimeCapabilityAttestationSha256",
      FINAL_EXECUTION_COMPOSITE_SHA256: "finalExecutionCompositeSha256",
      CURRENT_GRAPH_IDENTITY: "graphIdentity",
    }[documentKey]])
    : String(packet[packetKey]);
  assert.equal(documentFields[documentKey], expected, documentKey);
}
assert.notEqual(
  documentFields.IMPLEMENTATION_ATTESTATION_SHA256,
  artifacts.implementation.sha256,
  "historical approval evidence must not be silently relocked to current source bytes",
);
for (const key of [
  "RESOLVED_STORE_REFERENCE_DEFECT_FIXED", "LIVE_EXECUTOR_BOUND", "RESOLVED_STORE_FIX_SOURCE_LOCK_MATCH",
  "CURRENT_ATTESTATION_CHAIN_COMPLETE", "TARGET_RESOURCE_CROSS_ARTIFACT_MATCH", "PACKET_REPRODUCIBLE",
  "LIVE_PACKET_COMPLETE",
]) assert.equal(documentFields[key], "yes", key);
assert.equal(documentFields.SAFE_TO_CONTINUE_WITHOUT_APPROVAL, "no");
const changed = structuredClone(packet);
changed.resolvedStoreReferenceDefectFixed = false;
assert.equal(verifyG2BResolvedStoreFixedPacket(changed, artifacts).ok, false);
assert.match(sha256Canonical(packet), /^[a-f0-9]{64}$/);
console.log("G2B resolvedStore-fixed complete approval packet passed; local only; remote operations=0");
