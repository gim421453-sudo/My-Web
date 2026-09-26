import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildReplacementWriterPreflightPacket,
  classifyReplacementWriterMetadata,
  sha256ExactBytes,
  verifyReplacementWriterPreflightPacket,
} from "../authority-audit/replacementWriterPreflight.mjs";

const packet = buildReplacementWriterPreflightPacket();
assert.equal(verifyReplacementWriterPreflightPacket(packet).ok, true);
for (const [field, value] of [
  ["target", "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com"],
  ["prestateRemoteReadsMax", 2], ["iamPolicyReadsMax", 1], ["projectIamReadsMax", 1],
  ["retriesMax", 1], ["serviceAccountCreateMutationsMax", 1], ["serviceAccountEnableMutationsMax", 1],
  ["iamPolicyMutationsMax", 1], ["m3MutationsMax", 1], ["firestoreAllowed", true],
]) assert.equal(verifyReplacementWriterPreflightPacket({ ...packet, [field]: value }).ok, false, field);

const exact = { name: "projects/my-management-app-8a933/serviceAccounts/myweb-class-migration-writer-g2@my-management-app-8a933.iam.gserviceaccount.com" };
assert.equal(classifyReplacementWriterMetadata({ parsed: exact }), "PRESENT_ENABLED");
assert.equal(classifyReplacementWriterMetadata({ parsed: { ...exact, disabled: true } }), "PRESENT_DISABLED");
assert.equal(classifyReplacementWriterMetadata({ notFoundProven: true }), "ABSENT");
assert.equal(classifyReplacementWriterMetadata({ readFailed: true, notFoundProven: true }), "READ_FAILURE");
assert.notEqual(classifyReplacementWriterMetadata({ parsed: null }), "ABSENT");
const bytes = readFileSync(new URL("../../docs/p1-5-c2h2e3d-w1c-m3l3-replacement-writer-preflight-approval-packet.md", import.meta.url));
assert.match(sha256ExactBytes(bytes), /^[a-f0-9]{64}$/);
console.log("replacement writer preflight packet matrix passed; remote operations=0");
