import assert from "node:assert/strict";
import { buildReplacementWriterG2BCreatePacket, verifyReplacementWriterG2BCreatePacket } from "../authority-audit/replacementWriterG2BCreate.mjs";

const packet = buildReplacementWriterG2BCreatePacket();
assert.equal(verifyReplacementWriterG2BCreatePacket(packet).ok, true);
for (const [field, value] of [
  ["target", "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com"],
  ["target", "myweb-class-migration-writer-g2@my-management-app-8a933.iam.gserviceaccount.com"],
  ["precreateRemoteReadsMax", 0], ["serviceAccountCreateMutationsMax", 2], ["postcreateRemoteReadsMax", 0],
  ["projectIamReadsMax", 1], ["iamPolicyReadsMax", 1], ["secondCreateReachable", true], ["m3MutationsMax", 1],
]) assert.equal(verifyReplacementWriterG2BCreatePacket({ ...packet, [field]: value }).ok, false, field);
console.log("G2B replacement writer create approval matrix passed; remote operations=0");
