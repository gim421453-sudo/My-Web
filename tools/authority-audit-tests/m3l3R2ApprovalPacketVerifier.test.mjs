import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  M3L3_R2_APPROVAL_PACKET_CONTRACT,
  M3L3_R2_APPROVAL_PACKET_PATH,
  M3L3_R2_APPROVAL_PACKET_SHA256,
  verifyM3L3R2ApprovalPacket,
} from "../authority-audit/m3l3R2ApprovalPacketVerifier.mjs";

const content = readFileSync(M3L3_R2_APPROVAL_PACKET_PATH, "utf8");
const verified = verifyM3L3R2ApprovalPacket();
assert.equal(verified.ok, true);
assert.equal(verified.sha256, M3L3_R2_APPROVAL_PACKET_SHA256);
assert.equal(verifyM3L3R2ApprovalPacket({ content: content.replace("REMOTE_CALLS_MAX =", "REMOTE_CALLS_OTHER =") }).ok, false);
assert.deepEqual(M3L3_R2_APPROVAL_PACKET_CONTRACT, {
  remoteReadsMax: 1,
  retriesMax: 0,
  mutationsMax: 0,
  projectIamReadsMax: 0,
  rawIdentityPersisted: false,
  rawPolicyPersisted: false,
  rawProcessOutputPersisted: false,
});

console.log(`M3L3 R2 approval packet verifier passed: ${verified.sha256}; production access=0`);
