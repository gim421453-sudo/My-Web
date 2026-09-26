import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  buildG2BRootCauseFixedApprovalPacket,
  buildG2BRootCauseFixedAttestations,
  verifyG2BRootCauseFixedPacket,
  G2B_ROOT_CAUSE_FIXED_OPERATION_GENERATION,
  LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256,
} from "../authority-audit/g2bM3RootCauseFixedApprovalPacket.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "../authority-audit/g2bRecoveryAnchor.mjs";
import {
  evaluateCanonicalWriterPolicyMembers,
  projectCanonicalWriterPolicyResult,
} from "../authority-audit/m3l3R3CanonicalPolicyParser.mjs";

const artifacts = buildG2BRootCauseFixedAttestations();
const packet = buildG2BRootCauseFixedApprovalPacket(artifacts);
assert.equal(packet.targetResource, G2B_TARGET_RESOURCE);
assert.equal(packet.targetRole, G2B_TARGET_ROLE);
assert.equal(packet.operationGeneration, G2B_ROOT_CAUSE_FIXED_OPERATION_GENERATION);
assert.equal(packet.priorRecoveryExecutionEvidenceSha256, LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256);
assert.equal(packet.targetBoundExecutorVerified, true);
assert.equal(packet.type, "M3_MUTATION_AFTER_PROVEN_TARGET_FIX");
assert.equal(packet.targetResourceCrossArtifactMatch, true);
assert.equal(packet.g2bTargetBoundBuilderSourceLockMatch, true);
assert.equal(packet.currentLiveChainSourceLocksMatch, true);
assert.equal(packet.mutationTargetExactLiteralBound, true);
assert.equal(packet.legacyTargetMutationReachability, 0);
assert.equal(packet.poststateRequired, true);
assert.equal(packet.packetReproducible, true);
assert.equal(packet.status, "SUPERSEDED_REMOTE_CAPABILITY_ACCOUNTING_REPAIR_REQUIRED");
assert.equal(packet.m3MutationReachable, false);
assert.equal(packet.packetComplete, false);
assert.equal(artifacts.runtimeCapability.graph.operationGeneration, G2B_ROOT_CAUSE_FIXED_OPERATION_GENERATION);
assert.equal(packet.legacyWriterSurfaceReachableFromCurrentExecutor, false);
assert.equal(packet.mutationAttemptsMax, 1);
assert.equal(packet.retriesMax, 0);
assert.equal(packet.secondMutationReachable, false);
assert.equal(packet.safeToContinueWithoutApproval, false);
assert.equal(packet.firestoreAllowed, false);
assert.equal(verifyG2BRootCauseFixedPacket(packet, artifacts).ok, true);
assert.notEqual(packet.operationGeneration, "9662e385-82ab-4a73-8a5a-e8a25a9f4478");
const parserLock = artifacts.implementation.sourceLocks.find((entry) => entry.path === "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs");
assert.equal(parserLock?.sha256, createHash("sha256").update(readFileSync(parserLock.path)).digest("hex"));
for (const requiredPath of [
  "tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs",
  "tools/authority-audit/invokeWindowsDpapi.ps1",
  "tools/authority-audit/g2bM3RootCauseFixedApprovalPacket.mjs",
]) {
  const lock = artifacts.implementation.sourceLocks.find((entry) => entry.path === requiredPath);
  assert.equal(lock?.sha256, createHash("sha256").update(readFileSync(requiredPath)).digest("hex"), requiredPath);
}
const executorSource = readFileSync("tools/authority-audit/g2bM3CurrentLiveExecutor.mjs", "utf8");
const recoverySource = readFileSync("tools/authority-audit/g2bRecoveryAnchor.mjs", "utf8");
assert.match(executorSource, /projectCanonicalWriterPolicyResult/);
assert.match(recoverySource, /evaluateCanonicalWriterPolicyMembers/);
for (const policy of ["{}", '{"etag":"synthetic","bindings":null}', '{"etag":"synthetic","unexpected":true}']) {
  assert.equal(projectCanonicalWriterPolicyResult(policy, "serviceAccount:synthetic@example.invalid").state, "READ_FAILURE");
  assert.equal(evaluateCanonicalWriterPolicyMembers(policy, () => false).state, "POLICY_PARSE_FAILURE");
}
assert.equal(projectCanonicalWriterPolicyResult('{"etag":"synthetic"}', "serviceAccount:synthetic@example.invalid").state, "ZERO_BINDINGS_ABSENT");
const packetDocument = readFileSync("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-root-cause-fixed-approval-packet.md", "utf8");
const fields = Object.fromEntries([...packetDocument.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map(([, key, value]) => [key, value]));
assert.equal(fields.STAGE, packet.stage);
assert.equal(fields.TYPE, packet.type);
assert.equal(fields.OPERATION_GENERATION, packet.operationGeneration);
assert.notEqual(fields.IMPLEMENTATION_ATTESTATION_SHA256, String(packet.implementationAttestationSha256), "historical approval packet must not be relabeled as current source evidence");
assert.notEqual(fields.PACKET_SHA256, (await import("../authority-audit/g2bM3CurrentLiveAttestation.mjs")).sha256Canonical(packet));
assert.match(createHash("sha256").update(readFileSync("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-root-cause-fixed-approval-packet.md")).digest("hex"), /^[a-f0-9]{64}$/);
console.log("G2B root-cause-fixed local attestation and approval packet passed; remote operations=0");
