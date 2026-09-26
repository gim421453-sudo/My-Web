import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { M3_R3_PACKET_V2_PATH, verifyM3L3M3R3LivePacketV2 } from "../authority-audit/m3l3M3R3LivePacketV2Verifier.mjs";

const packet = readFileSync(M3_R3_PACKET_V2_PATH, "utf8");
assert.equal(verifyM3L3M3R3LivePacketV2({ content: packet }).ok, true);
for (const key of ["APPROVAL_CONSUMPTION_POINT", "INDETERMINATE_POLICY", "PREEXISTING_BINDING_POLICY", "POSTSTATE_REQUIRED"]) {
  assert.equal(verifyM3L3M3R3LivePacketV2({ content: packet.replace(new RegExp(`^${key}=.*\\r?\\n`, "m"), "") }).ok, false);
}
assert.equal(verifyM3L3M3R3LivePacketV2({ content: packet.replace("WHEN_FRESH_EXACT_PRESTATE_READ_BEGINS", "AFTER_MUTATION") }).ok, false);
assert.equal(verifyM3L3M3R3LivePacketV2({ content: packet.replace("SEPARATE_APPROVAL_NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK", "RETRY_ALLOWED") }).ok, false);
assert.equal(verifyM3L3M3R3LivePacketV2({ content: packet.replace("REQUIRES_SEPARATE_GATE_NO_DUPLICATE_MUTATION", "DUPLICATE_MUTATION_ALLOWED") }).ok, false);
assert.equal(verifyM3L3M3R3LivePacketV2({ content: packet.replace("POSTSTATE_REQUIRED=true", "POSTSTATE_REQUIRED=false") }).ok, false);
for (const [from, to] of [["PRESTATE_REMOTE_READS_MAX=5", "PRESTATE_REMOTE_READS_MAX=4"], ["POSTSTATE_REMOTE_READS_MAX=2", "POSTSTATE_REMOTE_READS_MAX=1"], ["PROJECT_IAM_READS_MAX=2", "PROJECT_IAM_READS_MAX=1"], ["PROJECT_IAM_READS_MAX=2", "PROJECT_IAM_READS_MAX=3"], ["OP_D_PRE,OP_D_POST", "OP_D_PRE,OP_D_POST,OP_X"], ["MUTATION_ATTEMPTS_MAX=1", "MUTATION_ATTEMPTS_MAX=2"], ["M4_ALLOWED=no", "M4_ALLOWED=yes"]]) {
  assert.equal(verifyM3L3M3R3LivePacketV2({ content: packet.replace(from, to) }).ok, false);
}
console.log("M3-R3 V2 packet attack matrix passed; real gcloud=0");
