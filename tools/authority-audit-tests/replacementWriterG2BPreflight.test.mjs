import assert from "node:assert/strict";
import { buildReplacementWriterG2BPreflightPacket, verifyReplacementWriterG2BPreflightPacket } from "../authority-audit/replacementWriterG2BPreflight.mjs";
const packet = buildReplacementWriterG2BPreflightPacket();
assert.equal(verifyReplacementWriterG2BPreflightPacket(packet).ok, true);
for (const [field, value] of [["target", "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com"], ["target", "myweb-class-migration-writer-g2@my-management-app-8a933.iam.gserviceaccount.com"], ["g2bAccountIdProviderValid", false], ["prestateRemoteReadsMax", 2], ["projectIamReadsMax", 1], ["iamPolicyReadsMax", 1], ["serviceAccountCreateMutationsMax", 1], ["presentEnabledPolicy", "ADOPT"], ["firestoreAllowed", true]]) assert.equal(verifyReplacementWriterG2BPreflightPacket({ ...packet, [field]: value }).ok, false, field);
console.log("G2B replacement writer preflight matrix passed; remote operations=0");
