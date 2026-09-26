import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { M3L3_M3_R2_PACKET_PATH, verifyM3L3M3R2ApprovalPacket } from "../authority-audit/m3l3M3R2ApprovalPacketVerifier.mjs";

const packet = readFileSync(M3L3_M3_R2_PACKET_PATH, "utf8");
const verified = verifyM3L3M3R2ApprovalPacket({ content: packet });
assert.equal(verified.ok, true);
assert.match(verified.sha256, /^[a-f0-9]{64}$/);
assert.equal(verifyM3L3M3R2ApprovalPacket({ content: packet.replace("PROJECT_IAM_READS_MAX=2", "PROJECT_IAM_READS_MAX=1") }).ok, false);
assert.equal(verifyM3L3M3R2ApprovalPacket({ content: packet.replace("OP_D_PRE,OP_D_POST", "OP_D_PRE,OP_D_POST,OP_X") }).ok, false);
assert.equal(verifyM3L3M3R2ApprovalPacket({ content: packet.replace("PROJECT_IAM_MUTATIONS_MAX=0", "PROJECT_IAM_MUTATIONS_MAX=1") }).ok, false);
assert.equal(verifyM3L3M3R2ApprovalPacket({ content: `${packet}\n--account=synthetic-principal` }).ok, false);
console.log(`M3-R2 corrected graph-bound approval packet passed: ${verified.sha256}; real gcloud=0`);
