import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  M3L3_R3_APPROVAL_PACKET_PATH,
  M3L3_R3_APPROVAL_PACKET_SHA256,
  verifyM3L3R3ApprovalPacket,
} from "../authority-audit/m3l3R3ApprovalPacketVerifier.mjs";

const packet = readFileSync(M3L3_R3_APPROVAL_PACKET_PATH, "utf8");
assert.equal(verifyM3L3R3ApprovalPacket().ok, true);
assert.equal(verifyM3L3R3ApprovalPacket().sha256, M3L3_R3_APPROVAL_PACKET_SHA256);
assert.equal(verifyM3L3R3ApprovalPacket({ content: packet.replace("MUTATIONS=0", "MUTATIONS=1") }).ok, false);
console.log("M3L3 R3 approval packet verifier passed; local only; remote calls=0");
