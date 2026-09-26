import { createHash } from "node:crypto";
import {
  ACTIVE_REPLACEMENT_WRITER_GENERATION,
  ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT,
  FROZEN_WRITER_SERVICE_ACCOUNT,
  REPLACEMENT_WRITER_SERVICE_ACCOUNT,
} from "./writerRotationAuthority.mjs";

export const G2B_PREFLIGHT_EXECUTION_EVIDENCE_SHA256 = "069fa04d097135592c9e72c21bd2451f15ebbce3163cf75647465bbdbf50a781";
export const G2B_PREFLIGHT_RESULT_DOCUMENT_SHA256 = "2b306a74e64199b1aab534b6ed206a014a16aceff693c50498b90cb93084a11a";

export function buildReplacementWriterG2BCreatePacket() {
  return Object.freeze({
    stage: "P1.5-C2H2E3D-W1C-M3L3-REPLACEMENT-WRITER-G2B-CREATE",
    type: "REPLACEMENT_WRITER_G2B_CREATE",
    purpose: "create the exact absent G2B replacement writer once after a fresh metadata prestate read, without granting or using any IAM authority",
    targetGeneration: ACTIVE_REPLACEMENT_WRITER_GENERATION,
    target: ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT,
    preflightExecutionEvidenceSha256: G2B_PREFLIGHT_EXECUTION_EVIDENCE_SHA256,
    preflightResultDocumentSha256: G2B_PREFLIGHT_RESULT_DOCUMENT_SHA256,
    freshPrecreateStateCheckRequired: true,
    precreateRemoteReadsMax: 1,
    serviceAccountCreateMutationsMax: 1,
    postcreateRequired: true,
    postcreateRemoteReadsMax: 1,
    projectIamReadsMax: 0,
    iamPolicyReadsMax: 0,
    retriesMax: 0,
    rollbacksMax: 0,
    secondCreateReachable: false,
    approvalConsumptionPoint: "WHEN_G2B_CREATE_PRESTATE_READ_BEGINS",
    preexistingAccountPolicy: "STOP_NO_CREATE_PREPARE_SEPARATE_G2B_ADOPTION_REVIEW",
    createIndeterminatePolicy: "STOP_NO_RETRY_NO_SECOND_CREATE_NO_DELETE_NO_ENABLE_NO_DISABLE_NO_IAM_POLICY_MUTATION_NO_PROJECT_IAM_MUTATION_NO_M3_NO_M4_PREPARE_SEPARATE_READ_ONLY_CREATE_RECOVERY",
    postcreatePresentEnabledSuccessSemantics: "EXACT_G2B_SERVICE_ACCOUNT_STATUS_ENABLED_CONFIRMED",
    postcreatePresentDisabledPolicy: "STOP_NO_ENABLE_NO_DELETE_NO_SECOND_CREATE_NO_M3_NO_M4_PREPARE_SEPARATE_G2B_REVIEW_OR_RECOVERY",
    postcreateAbsentPolicy: "STOP_NO_SECOND_CREATE_NO_RETRY_NO_DELETE_NO_M3_NO_M4_PREPARE_SEPARATE_READ_ONLY_RECOVERY",
    ambiguousPolicy: "STOP_NO_RETRY_NO_SECOND_CREATE_NO_MUTATION",
    readFailurePolicy: "STOP_NO_RETRY_NO_SECOND_READ_UNDER_CONSUMED_APPROVAL_NO_SECOND_CREATE_NO_MUTATION",
    serviceAccountDisableMutationsMax: 0,
    serviceAccountEnableMutationsMax: 0,
    serviceAccountDeleteMutationsMax: 0,
    projectIamMutationsMax: 0,
    iamPolicyMutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
  });
}

export function verifyReplacementWriterG2BCreatePacket(packet) {
  const expected = buildReplacementWriterG2BCreatePacket();
  if (!packet || typeof packet !== "object") return Object.freeze({ ok: false, code: "G2B_CREATE_PACKET_INVALID" });
  if (packet.target === FROZEN_WRITER_SERVICE_ACCOUNT || packet.target === REPLACEMENT_WRITER_SERVICE_ACCOUNT) return Object.freeze({ ok: false, code: "G2B_CREATE_HISTORICAL_TARGET" });
  if (Object.keys(expected).some((field) => packet[field] !== expected[field])) return Object.freeze({ ok: false, code: "G2B_CREATE_PACKET_LOCK_MISMATCH" });
  return Object.freeze({ ok: true, code: "G2B_CREATE_PACKET_FAIL_CLOSED" });
}

export function sha256ExactBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
