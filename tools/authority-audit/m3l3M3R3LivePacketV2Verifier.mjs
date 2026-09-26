import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildM3L3M3R3CanonicalRuntimeRelock } from "./m3l3M3R3CanonicalRuntimeRelock.mjs";

export const M3_R3_PACKET_V2_PATH = "docs/p1-5-c2h2e3d-w1c-m3l3-m3-r3-live-approval-packet-v2.md";
const hash = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const forbidden = /(?:AIza[0-9A-Za-z_-]{20,}|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:user|serviceAccount):[^\s]+@[^\s]+|--account=[^<\s][^\s]*)/i;

function field(packet, key) {
  const match = packet.match(new RegExp(`^${key}=([^\r\n]+)$`, "m"));
  return match && (packet.match(new RegExp(`^${key}=`, "gm")) ?? []).length === 1 ? match[1] : null;
}

export function verifyM3L3M3R3LivePacketV2({ repositoryRoot = process.cwd(), content = null } = {}) {
  const packet = content ?? readFileSync(resolve(repositoryRoot, M3_R3_PACKET_V2_PATH), "utf8");
  if (typeof packet !== "string" || forbidden.test(packet)) return Object.freeze({ ok: false, code: "PACKET_PRIVACY_INVALID" });
  const graph = buildM3L3M3R3CanonicalRuntimeRelock({ repositoryRoot });
  const expected = Object.freeze({
    STAGE: "P1.5-C2H2E3D-W1C-M3L3-M3-R3-LIVE-V2", TYPE: "M3_MUTATION", CURRENT_M3_STATE: "ZERO_BINDINGS_ABSENT",
    APPROVAL_CONSUMPTION_POINT: "WHEN_FRESH_EXACT_PRESTATE_READ_BEGINS",
    INDETERMINATE_POLICY: "SEPARATE_APPROVAL_NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK",
    PREEXISTING_BINDING_POLICY: "REQUIRES_SEPARATE_GATE_NO_DUPLICATE_MUTATION",
    POSTSTATE_REQUIRED: "true", PRESTATE_REMOTE_READS_MAX: String(graph.budget.prestateRemoteReadsMax),
    MUTATION_ATTEMPTS_MAX: "1", POSTSTATE_REMOTE_READS_MAX: String(graph.budget.poststateRemoteReadsMax),
    PROJECT_IAM_READS_MAX: String(graph.budget.projectIamReadsMax), ALLOWED_PROJECT_IAM_READ_NODES: "OP_D_PRE,OP_D_POST",
    RETRIES: "0", ROLLBACKS: "0", SECOND_MUTATION_REACHABLE: "no", M4_ALLOWED: "no", FIRESTORE_ALLOWED: "no", ACCESS_TOKEN_ALLOWED: "no",
    CLOUD_LOGGING_ALLOWED: "no", TEST_IAM_PERMISSIONS_ALLOWED: "no", SERVICE_ACCOUNT_KEY_ALLOWED: "no", SAFE_TO_CONTINUE_WITHOUT_APPROVAL: "no",
    CURRENT_GRAPH_IDENTITY: graph.graph.identity,
  });
  if (!Object.entries(expected).every(([key, value]) => field(packet, key) === value)) return Object.freeze({ ok: false, code: "PACKET_COMPOSITE_CONTRACT_MISMATCH" });
  return Object.freeze({ ok: true, code: "M3_R3_LIVE_PACKET_V2_LOCKED", sha256: hash(packet) });
}
