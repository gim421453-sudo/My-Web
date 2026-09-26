import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildOldWriterContainmentApprovalPacket,
  classifyFutureWriterTarget,
  FROZEN_WRITER_SERVICE_ACCOUNT,
  REPLACEMENT_WRITER_SERVICE_ACCOUNT,
  ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT,
  WRITER_ROTATION_AUTHORITY_CONTRACT,
  verifyOldWriterContainmentApprovalPacket,
  verifyOldWriterContainmentPacketBytes,
} from "../authority-audit/writerRotationAuthority.mjs";
import {
  createFutureRecoveryAnchor,
  createFutureRecoverySession,
  FUTURE_RECOVERY_ANCHOR_CONTRACT,
  transitionFutureRecoverySession,
  verifyFutureRecoveryAnchor,
} from "../authority-audit/futureRecoveryAnchorContract.mjs";

for (const operation of ["M3", "M4", "IMPERSONATION", "FIRESTORE_MIGRATION", "CLASS_WRITE", "TOKEN_GENERATION", "TRUSTED_MUTATION"]) {
  assert.equal(classifyFutureWriterTarget({ resource: FROZEN_WRITER_SERVICE_ACCOUNT, operation }).ok, false);
}
assert.equal(classifyFutureWriterTarget({ resource: FROZEN_WRITER_SERVICE_ACCOUNT, operation: "READ_ONLY_FORENSIC", separatelyApproved: true }).ok, true);
assert.equal(classifyFutureWriterTarget({ resource: REPLACEMENT_WRITER_SERVICE_ACCOUNT, operation: "M3" }).ok, false);
assert.equal(classifyFutureWriterTarget({ resource: ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT, operation: "M3" }).ok, false);
assert.equal(classifyFutureWriterTarget({ resource: ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT, operation: "M3", verifiedRecoveryAnchor: true }).ok, true);
assert.equal(classifyFutureWriterTarget({ resource: "writer-other@example.invalid", operation: "M3" }).ok, false);

const packet = buildOldWriterContainmentApprovalPacket();
assert.deepEqual([packet.prestateRemoteReadsMax, packet.mutationAttemptsMax, packet.poststateRemoteReadsMax, packet.projectIamReadsMax, packet.retriesMax, packet.m3MutationsMax], [1, 1, 1, 0, 0, 0]);
assert.equal(verifyOldWriterContainmentApprovalPacket(packet).ok, true);
for (const [field, value] of [
  ["approvalConsumptionPoint", "AFTER_MUTATION"],
  ["preexistingDisabledPolicy", "RETRY_DISABLE"],
  ["indeterminatePolicy", "RETRY"],
  ["poststateRequired", false],
  ["disabledPoststateSuccessSemantics", "COMMAND_EXIT_ZERO"],
  ["prestateRemoteReadsMax", 2],
  ["mutationAttemptsMax", 2],
  ["poststateRemoteReadsMax", 2],
  ["projectIamReadsMax", 1],
  ["retriesMax", 1],
  ["rollbacksMax", 1],
  ["serviceAccountEnableMutationsMax", 1],
  ["serviceAccountDeleteMutationsMax", 1],
  ["iamPolicyMutationsMax", 1],
  ["m3MutationsMax", 1],
  ["m4MutationsMax", 1],
  ["firestoreAllowed", true],
  ["accessTokenAllowed", true],
  ["cloudLoggingAllowed", true],
  ["testIamPermissionsAllowed", true],
  ["serviceAccountKeyAllowed", true],
]) {
  assert.equal(verifyOldWriterContainmentApprovalPacket({ ...packet, [field]: value }).ok, false, field);
}
const packetBytes = readFileSync(new URL("../../docs/p1-5-c2h2e3d-w1c-m3l3-old-writer-containment-approval-packet.md", import.meta.url));
const packetHash = verifyOldWriterContainmentPacketBytes(packetBytes, "0".repeat(64));
assert.equal(packetHash.code, "CONTAINMENT_PACKET_HASH_MISMATCH");
assert.equal(verifyOldWriterContainmentPacketBytes(packetBytes, packetHash.actualSha256).ok, true);
assert.equal(verifyOldWriterContainmentPacketBytes(packetBytes, "0".repeat(64)).ok, false);

const secret = Buffer.alloc(32, 7);
const input = { member: "user:synthetic@example.invalid", targetResource: ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT, targetRole: "roles/iam.serviceAccountTokenCreator", sessionGeneration: "synthetic-generation", operationOrdinal: 1 };
const created = createFutureRecoveryAnchor(input, secret);
const verified = { ...created, state: "ANCHOR_VERIFIED" };
assert.equal(verifyFutureRecoveryAnchor({ persistedAnchor: verified, currentMember: input.member, targetResource: input.targetResource, targetRole: input.targetRole }, secret).state, "EXACT_MEMBER_MATCH");
assert.equal(verifyFutureRecoveryAnchor({ persistedAnchor: verified, currentMember: "user:other@example.invalid", targetResource: input.targetResource, targetRole: input.targetRole }, secret).state, "AMBIGUOUS");
assert.throws(() => createFutureRecoveryAnchor(input, Buffer.alloc(12, 1)), /protected-anchor-secret-required/);
assert.equal(JSON.stringify(created).includes(input.member), false);

let session = createFutureRecoverySession(input.targetResource, input.targetRole);
assert.equal(transitionFutureRecoverySession(session, "MUTATION_STARTED").ok, false);
session = transitionFutureRecoverySession(session, "ANCHOR_CREATED").session;
session = transitionFutureRecoverySession(session, "ANCHOR_VERIFIED").session;
assert.equal(session.mutationReachable, true);
assert.equal(transitionFutureRecoverySession(session, "MUTATION_STARTED").ok, true);
assert.equal(FUTURE_RECOVERY_ANCHOR_CONTRACT.truncatedFingerprintAuthority, false);
assert.equal(WRITER_ROTATION_AUTHORITY_CONTRACT.oldWriterReusableForNewM3, false);
console.log("writer quarantine, rotation, and future recovery-anchor matrix passed; remote operations=0");
