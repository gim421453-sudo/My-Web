import assert from "node:assert/strict";
import { buildReplacementWriterCreatePacket, buildReplacementWriterCreateV2Packet, verifyReplacementWriterCreatePacket, verifyReplacementWriterCreateV2Packet } from "../authority-audit/replacementWriterCreate.mjs";

const preflightEvidence = "9a71aee4f6ed5e88ec727c77e2798a71d335e1762d835e4e60e1ff9ec50fc5b3";
const packet = buildReplacementWriterCreatePacket(preflightEvidence);
assert.equal(verifyReplacementWriterCreatePacket(packet, preflightEvidence).ok, true);
for (const [field, value] of [["createMutationAttemptsMax", 2], ["prestateRemoteReadsMax", 2], ["iamPolicyReadsMax", 1], ["retriesMax", 1], ["serviceAccountDeleteMutationsMax", 1], ["m3MutationsMax", 1], ["firestoreAllowed", true]]) {
  assert.equal(verifyReplacementWriterCreatePacket({ ...packet, [field]: value }, preflightEvidence).ok, false, field);
}
const v2 = buildReplacementWriterCreateV2Packet();
assert.equal(verifyReplacementWriterCreateV2Packet(v2).ok, true);
for (const [field, value] of [
  ["preflightResultDocumentSha256", "missing"], ["freshPrecreateStateCheckRequired", false],
  ["precreateRemoteReadsMax", 0], ["precreateRemoteReadsMax", 2], ["serviceAccountCreateMutationsMax", 2],
  ["postcreateRequired", false], ["postcreateRemoteReadsMax", 0], ["postcreatePresentDisabledPolicy", undefined],
  ["postcreateAbsentPolicy", undefined], ["ambiguousPolicy", undefined], ["readFailurePolicy", undefined],
  ["projectIamMutationsMax", undefined], ["projectIamMutationsMax", 1], ["secondCreateReachable", true],
  ["target", "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com"],
]) assert.equal(verifyReplacementWriterCreateV2Packet({ ...v2, [field]: value }).ok, false, field);
console.log("replacement writer create packet matrix passed; remote operations=0");
