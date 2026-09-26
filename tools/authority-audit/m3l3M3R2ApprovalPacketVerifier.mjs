import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const M3L3_M3_R2_PACKET_PATH = "docs/p1-5-c2h2e3d-w1c-m3l3-m3-r2-corrected-project-iam-read-mutation-approval-packet.md";

const REQUIRED = Object.freeze([
  "STAGE=P1.5-C2H2E3D-W1C-M3L3-M3-R2",
  "TYPE=M3_MUTATION",
  "CURRENT_M3_STATE=ZERO_BINDINGS_ABSENT",
  "R3_RECOVERY_EVIDENCE_SHA256=29c9f7727155318c8d93b1adeed854713ee0c865c3a5a6db552d9d74f370beeb",
  "OLD_M3_PACKET_STATUS=SUPERSEDED_INSUFFICIENT_PROJECT_IAM_READ_SCOPE",
  "EXECUTION_AUTHORITY=G4R3H-R2>G4R3R1>G4R3R2",
  "LOCAL_IDENTITY_DISCOVERY_MAX=1",
  "PRESTATE_REMOTE_READS_MAX=5",
  "MUTATION_ATTEMPTS_MAX=1",
  "POSTSTATE_REMOTE_READS_MAX=2",
  "PROJECT_IAM_READS_MAX=2",
  "ALLOWED_PROJECT_IAM_READ_NODES=OP_D_PRE,OP_D_POST",
  "PROJECT_IAM_MUTATIONS_MAX=0",
  "RETRIES=0",
  "ROLLBACKS=0",
  "SECOND_MUTATION_REACHABLE=no",
  "PRESTATE_REQUIRED=yes",
  "POSTSTATE_REQUIRED=yes",
  "M4_ALLOWED=no",
  "FIRESTORE_ALLOWED=no",
  "ACCESS_TOKEN_ALLOWED=no",
  "CLOUD_LOGGING_ALLOWED=no",
  "TEST_IAM_PERMISSIONS_ALLOWED=no",
  "SERVICE_ACCOUNT_KEY_ALLOWED=no",
  "SAFE_TO_CONTINUE_WITHOUT_APPROVAL=no",
]);

const FORBIDDEN = /(?:AIza[0-9A-Za-z_-]{20,}|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:user|serviceAccount):[^\s]+@[^\s]+|--account=[^<\s][^\s]*)/i;

export function verifyM3L3M3R2ApprovalPacket({ repositoryRoot = process.cwd(), content = null } = {}) {
  const packet = content ?? readFileSync(resolve(repositoryRoot, M3L3_M3_R2_PACKET_PATH), "utf8");
  if (typeof packet !== "string" || FORBIDDEN.test(packet)) return Object.freeze({ ok: false, code: "M3_R2_PACKET_PRIVACY_OR_CONTENT_INVALID" });
  if (!REQUIRED.every((term) => packet.includes(term))) return Object.freeze({ ok: false, code: "M3_R2_PACKET_CONTRACT_MISMATCH" });
  const exactLine = (key, value) => new RegExp(`^${key}=${value}$`, "m").test(packet)
    && (packet.match(new RegExp(`^${key}=`, "gm")) ?? []).length === 1;
  if (!exactLine("PROJECT_IAM_READS_MAX", "2")
    || !exactLine("ALLOWED_PROJECT_IAM_READ_NODES", "OP_D_PRE,OP_D_POST")
    || !exactLine("PROJECT_IAM_MUTATIONS_MAX", "0")) {
    return Object.freeze({ ok: false, code: "M3_R2_PROJECT_IAM_SCOPE_INVALID" });
  }
  return Object.freeze({
    ok: true,
    code: "M3_R2_GRAPH_BOUND_PACKET_LOCKED",
    sha256: createHash("sha256").update(packet, "utf8").digest("hex"),
  });
}
