import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildCurrentReadOnlyRecoveryPacket,
  verifyCurrentReadOnlyRecoveryPacket,
} from "../authority-audit/g2bM3CurrentReadOnlyRecoveryApprovalPacket.mjs";

const packet = buildCurrentReadOnlyRecoveryPacket();
assert.equal(verifyCurrentReadOnlyRecoveryPacket(packet).ok, true);
const document = readFileSync("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-current-operation-read-only-anchor-recovery-approval-v2.md", "utf8");
const fields = Object.fromEntries([...document.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map(([, key, value]) => [key, value]));
for (const [key, value] of Object.entries({
  STAGE: packet.stage,
  TYPE: packet.type,
  TARGET_ROLE: packet.targetRole,
  M3_OPERATION_GENERATION: packet.operationGeneration,
  M3_EXECUTION_EVIDENCE_SHA256: packet.executionEvidenceSha256,
  M3_RESULT_DOCUMENT_SHA256: packet.resultDocumentSha256,
  RECOVERY_APPROVAL_PACKET_SHA256: packet.recoveryApprovalPacketSha256,
  RECOVERY_REQUIRES_NEW_OP_A: "no",
  LOCAL_IDENTITY_DISCOVERY_MAX: "0",
  WRITER_IAM_POLICY_READS_MAX: "1",
  IAM_POLICY_READS_MAX: "1",
  PHYSICAL_REMOTE_POLICY_READS_MAX: "1",
  PROJECT_IAM_READS_MAX: "0",
  MUTATIONS_MAX: "0",
  M3_MUTATIONS_MAX: "0",
  RECOVERY_PACKET_COMPLETE: "yes",
})) assert.equal(fields[key], value, `${key} must match the verified packet`);
assert.equal(packet.recoveryRequiresNewOpA, false);
assert.equal(packet.localIdentityDiscoveryMax, 0);
assert.equal(packet.writerIamPolicyReadsMax, 1);
assert.equal(packet.iamPolicyReadsMax, 1);
assert.equal(packet.physicalRemotePolicyReadsMax, 1);
assert.equal(packet.projectIamReadsMax, 0);
assert.equal(packet.mutationsMax, 0);
assert.equal(packet.m3MutationsMax, 0);
assert.equal(packet.m4MutationsMax, 0);
assert.equal(packet.retries, 0);
assert.equal(packet.rollbacks, 0);
assert.equal(packet.legacyPolicyParserFallbackAllowed, false);
assert.equal(packet.recoveryPacketComplete, true);

const reject = (mutate) => {
  const candidate = { ...packet };
  mutate(candidate);
  assert.equal(verifyCurrentReadOnlyRecoveryPacket(candidate).ok, false);
};
reject((value) => { value.operationGeneration = "00000000-0000-0000-0000-000000000000"; });
reject((value) => { value.targetRole = "roles/owner"; });
reject((value) => { value.recoveryRequiresNewOpA = true; });
reject((value) => { value.mutationsMax = 1; });
reject((value) => { value.projectIamReadsMax = 1; });
reject((value) => { value.recoveryApprovalPacketSha256 = "0".repeat(64); });

console.log("Current-generation read-only recovery packet verifier passed; remote operations=0; mutations=0");
