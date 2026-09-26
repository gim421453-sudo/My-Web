import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const M3L3_R2_APPROVAL_PACKET_PATH = "docs/p1-5-c2h2e3d-w1c-m3l3-r2-safe-read-failure-diagnostic-approval-packet.md";
export const M3L3_R2_APPROVAL_PACKET_SHA256 = "5ae22bdf0fcfb8d44e62eedda3a65c88f38282bb80d2dca90271012bd4b3d9f4";

const SOURCE_LOCKS = Object.freeze([
  Object.freeze({
    path: "tools/authority-audit/m3l3ReadFailureSafeDiagnostic.mjs",
    sha256: "ae597471b67f84d6412f63099057a5eb4b70f5a816697772984c0b48a809d3ee",
  }),
  Object.freeze({
    path: "tools/authority-audit/m3l3ReadFailureDiagnosticExecutor.mjs",
    sha256: "dc8459cfb8501866396bdab4f35f2f68b694436c239bf34c81fe66000323815a",
  }),
  Object.freeze({
    path: "tools/authority-audit-tests/m3l3ReadFailureDiagnosticExecutor.test.mjs",
    sha256: "16de005f898cc243f9b30d5b718779bd5028f855c6b32c5416daafefae856d8d",
  }),
]);

const REQUIRED_TERMS = Object.freeze([
  "TYPE =\nREAD_ONLY",
  "REMOTE_CALLS_MAX =\n1",
  "RETRIES =\n0",
  "MUTATIONS =\n0",
  "- Project IAM reads: 0",
  "- IAM mutations: 0",
  "- M3/M4 mutations: 0",
  "- Access-token calls: 0",
  "- Firestore calls: 0",
  "- Cloud Logging reads: 0",
  "- `testIamPermissions`: 0",
  "- Service-account key operations: 0",
  "The approval is consumed when step 2 begins, regardless of outcome. It is not reusable.",
  "Stop after the single read and local evidence generation.",
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

export function verifyM3L3R2ApprovalPacket({ repositoryRoot = process.cwd(), content = null } = {}) {
  const packet = content === null
    ? readFileSync(resolve(repositoryRoot, M3L3_R2_APPROVAL_PACKET_PATH), "utf8")
    : content;
  if (typeof packet !== "string") return Object.freeze({ ok: false, code: "R2_PACKET_INVALID_CONTENT" });
  if (sha256(packet) !== M3L3_R2_APPROVAL_PACKET_SHA256) {
    return Object.freeze({ ok: false, code: "R2_PACKET_HASH_MISMATCH" });
  }
  if (!REQUIRED_TERMS.every((term) => packet.includes(term))) {
    return Object.freeze({ ok: false, code: "R2_PACKET_CONTRACT_MISMATCH" });
  }
  for (const lock of SOURCE_LOCKS) {
    if (sha256(readFileSync(resolve(repositoryRoot, lock.path))) !== lock.sha256) {
      return Object.freeze({ ok: false, code: "R2_PACKET_SOURCE_LOCK_DRIFT" });
    }
  }
  return Object.freeze({
    ok: true,
    code: "R2_PACKET_EXACT_READ_ONLY_CONTRACT_LOCKED",
    sha256: M3L3_R2_APPROVAL_PACKET_SHA256,
  });
}

export const M3L3_R2_APPROVAL_PACKET_CONTRACT = Object.freeze({
  remoteReadsMax: 1,
  retriesMax: 0,
  mutationsMax: 0,
  projectIamReadsMax: 0,
  rawIdentityPersisted: false,
  rawPolicyPersisted: false,
  rawProcessOutputPersisted: false,
});
