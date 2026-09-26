import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildG2BImplementationAttestation, buildG2BRuntimeCapabilityAttestation, buildG2BFinalExecutionComposite,
} from "../authority-audit/g2bM3AuthorityReattestation.mjs";
import { buildG2BM3NewOperationApprovalPacket, verifyG2BM3NewOperationApprovalPacket, G2B_M3_NEW_OPERATION_GENERATION } from "../authority-audit/g2bM3NewOperationApprovalPacket.mjs";

const implementation = buildG2BImplementationAttestation();
const runtimeCapability = buildG2BRuntimeCapabilityAttestation();
const composite = buildG2BFinalExecutionComposite({ implementation, runtimeCapability });
const artifacts = { implementation, runtimeCapability, composite };
const packet = buildG2BM3NewOperationApprovalPacket(artifacts);
assert.equal(verifyG2BM3NewOperationApprovalPacket(packet, artifacts).ok, true);
assert.match(G2B_M3_NEW_OPERATION_GENERATION, /^[0-9a-f-]{36}$/);
assert.equal(packet.priorOperationReusable, false);
assert.equal(packet.priorAnchorReusable, false);
assert.equal(packet.freshOpARequired, true);
for (const [key, value] of Object.entries({ newOperationGeneration: "11111111-1111-4111-8111-111111111111", mutationAttemptsMax: 2, retriesMax: 1, freshPrestateRequired: false, m4Allowed: true })) {
  assert.equal(verifyG2BM3NewOperationApprovalPacket({ ...packet, [key]: value }, artifacts).ok, false, `${key} must fail closed`);
}
assert.equal(verifyG2BM3NewOperationApprovalPacket(packet, { ...artifacts, composite: { ...composite, graphIdentity: "wrong" } }).ok, false);
const document = readFileSync("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-operation-approval-packet.md", "utf8");
const fields = Object.fromEntries([...document.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map(([, key, value]) => [key, value]));
for (const [documentKey, packetKey] of Object.entries({
  STAGE: "stage", TYPE: "type", TARGET_RESOURCE: "targetResource", TARGET_ROLE: "targetRole", NEW_M3_OPERATION_GENERATION: "newOperationGeneration",
  IMPLEMENTATION_ATTESTATION_SHA256: "implementationAttestationSha256", RUNTIME_CAPABILITY_ATTESTATION_SHA256: "runtimeCapabilityAttestationSha256",
  FINAL_EXECUTION_COMPOSITE_SHA256: "finalExecutionCompositeSha256", CURRENT_GRAPH_IDENTITY: "graphIdentity", APPROVAL_CONSUMPTION_POINT: "approvalConsumptionPoint",
})) assert.equal(fields[documentKey], String(packet[packetKey]), `${documentKey} must match packet`);
console.log("G2B M3 new-operation approval packet attack matrix passed; remote operations=0");
