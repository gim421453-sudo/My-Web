import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const M3L3_R3_APPROVAL_PACKET_PATH = "docs/p1-5-c2h2e3d-w1c-m3l3-r3-canonical-policy-shape-read-only-approval-packet-v2.md";
export const M3L3_R3_APPROVAL_PACKET_SHA256 = "444939c4eba2639c46a0372b198fdaebe244deb6091a1fd6e0cbc97c22553fcd";

const TERMS = Object.freeze([
  "STAGE=P1.5-C2H2E3D-W1C-M3L3-R3", "TYPE=READ_ONLY", "REMOTE_CALLS_MAX=1", "RETRIES=0", "MUTATIONS=0",
  "CURRENT_M3_STATE=READ_FAILURE", "PARSER_LOCAL_FIX=PASS", "SAFE_TO_CONTINUE_WITHOUT_APPROVAL=no",
  "Project IAM reads, IAM mutations, M3/M4 mutations, access tokens", "subsequent operation.",
]);
const hash = (value) => createHash("sha256").update(value).digest("hex");

export function verifyM3L3R3ApprovalPacket({ repositoryRoot = process.cwd(), content = null } = {}) {
  const packet = content ?? readFileSync(resolve(repositoryRoot, M3L3_R3_APPROVAL_PACKET_PATH), "utf8");
  if (typeof packet !== "string") return Object.freeze({ ok: false, code: "R3_PACKET_INVALID_CONTENT" });
  if (hash(packet) !== M3L3_R3_APPROVAL_PACKET_SHA256) return Object.freeze({ ok: false, code: "R3_PACKET_HASH_MISMATCH" });
  if (!TERMS.every((term) => packet.includes(term))) return Object.freeze({ ok: false, code: "R3_PACKET_CONTRACT_MISMATCH" });
  return Object.freeze({ ok: true, code: "R3_CANONICAL_POLICY_READ_ONLY_PACKET_LOCKED", sha256: M3L3_R3_APPROVAL_PACKET_SHA256 });
}
