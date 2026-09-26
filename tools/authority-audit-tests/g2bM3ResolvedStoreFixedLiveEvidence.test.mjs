import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  buildResolvedStoreFixedRecoveryApprovalPacket,
  canonicalJson,
  sha256Canonical,
  verifyResolvedStoreFixedRecoveryApprovalPacket,
} from "../authority-audit/g2bM3ResolvedStoreFixedLiveEvidence.mjs";

const artifacts = buildResolvedStoreFixedRecoveryApprovalPacket();
const { executionEvidence, result, packet } = artifacts;

assert.equal(verifyResolvedStoreFixedRecoveryApprovalPacket(artifacts).ok, true);
assert.equal(executionEvidence.prestateResult, "MEMBER_ABSENT_CONFIRMED");
assert.equal(executionEvidence.mutationOutcome, "INDETERMINATE");
assert.equal(executionEvidence.mutationAttemptsUsed, 1);
assert.equal(executionEvidence.poststateWriterIamPolicyReadsUsed, 0);
assert.equal(executionEvidence.retriesUsed, 0);
assert.equal(executionEvidence.rollbacksUsed, 0);
assert.equal(executionEvidence.secondMutationUsed, 0);
assert.equal(executionEvidence.privacy.rawMemberPersisted, false);
assert.equal(executionEvidence.privacy.rawPrincipalPersisted, false);
assert.equal(result.executionEvidenceSha256, sha256Canonical(executionEvidence));
assert.equal(packet.resultDocumentSha256, sha256Canonical(result));
assert.equal(packet.recoveryRequiresNewOpA, false);
assert.equal(packet.localIdentityDiscoveryMax, 0);
assert.equal(packet.writerIamPolicyReadsMax, 1);
assert.equal(packet.projectIamReadsMax, 0);
assert.equal(packet.mutationsMax, 0);
assert.equal(packet.m3MutationsMax, 0);
assert.equal(packet.m4MutationsMax, 0);
assert.equal(packet.retries, 0);
assert.equal(packet.rollbacks, 0);
assert.equal(packet.secondMutationAllowed, false);
assert.equal(packet.safeToContinueWithoutApproval, false);
assert.equal(packet.recoveryApprovalPacketSha256, sha256Canonical(Object.fromEntries(
  Object.entries(packet).filter(([key]) => key !== "recoveryApprovalPacketSha256"),
)));

for (const lock of packet.sourceLocks) {
  assert.equal(createHash("sha256").update(readFileSync(lock.path)).digest("hex"), lock.sha256, lock.path);
}

for (const path of [
  "docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-resolvedstore-fixed-live-execution-evidence.md",
  "docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-resolvedstore-fixed-live-result.md",
  "docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-resolvedstore-fixed-read-only-anchor-recovery-approval.md",
]) {
  const text = readFileSync(path, "utf8");
  assert.doesNotMatch(text, /RAW_(?:MEMBER|PRINCIPAL|POLICY|SECRET)=/);
  assert.doesNotMatch(text, /(?:stdout|stderr)\s*=/i);
}

const approvalDocument = readFileSync(
  "docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-resolvedstore-fixed-read-only-anchor-recovery-approval.md",
  "utf8",
);
const fields = Object.fromEntries([...approvalDocument.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map(([, key, value]) => [key, value]));
assert.equal(fields.STAGE, packet.stage);
assert.equal(fields.TYPE, packet.type);
assert.equal(fields.M3_OPERATION_GENERATION, packet.operationGeneration);
assert.equal(fields.M3_EXECUTION_EVIDENCE_SHA256, packet.executionEvidenceSha256);
assert.equal(fields.M3_RESULT_DOCUMENT_SHA256, packet.resultDocumentSha256);
assert.equal(fields.RECOVERY_APPROVAL_PACKET_SHA256, packet.recoveryApprovalPacketSha256);
assert.equal(fields.WRITER_IAM_POLICY_READS_MAX, "1");
assert.equal(fields.PROJECT_IAM_READS_MAX, "0");
assert.equal(fields.MUTATIONS_MAX, "0");
assert.equal(fields.SAFE_TO_CONTINUE_WITHOUT_APPROVAL, "no");

const changed = structuredClone(artifacts);
changed.packet.mutationsMax = 1;
assert.equal(verifyResolvedStoreFixedRecoveryApprovalPacket(changed).ok, false);
assert.equal(canonicalJson(artifacts), canonicalJson(buildResolvedStoreFixedRecoveryApprovalPacket()));

console.log("ResolvedStore-fixed live evidence and read-only recovery packet passed; remote operations=0; mutations=0");
