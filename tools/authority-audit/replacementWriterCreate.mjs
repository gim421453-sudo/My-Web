import { createHash } from "node:crypto";
import { REPLACEMENT_WRITER_SERVICE_ACCOUNT } from "./writerRotationAuthority.mjs";

export const REPLACEMENT_WRITER_PREFLIGHT_EVIDENCE_SHA256 = "9a71aee4f6ed5e88ec727c77e2798a71d335e1762d835e4e60e1ff9ec50fc5b3";

export function buildReplacementWriterCreatePacket(preflightEvidenceSha256) {
  return Object.freeze({
    stage: "P1.5-C2H2E3D-W1C-M3L3-REPLACEMENT-WRITER-CREATE",
    type: "REPLACEMENT_WRITER_CREATE",
    purpose: "create the exact absent G2 writer once without granting IAM roles or using it",
    target: REPLACEMENT_WRITER_SERVICE_ACCOUNT,
    preflightEvidenceSha256,
    prestateRemoteReadsMax: 1,
    createMutationAttemptsMax: 1,
    poststateRemoteReadsMax: 1,
    projectIamReadsMax: 0,
    iamPolicyReadsMax: 0,
    retriesMax: 0,
    rollbacksMax: 0,
    approvalConsumptionPoint: "WHEN_G2_CREATE_PRESTATE_READ_BEGINS",
    preexistingPresentPolicy: "STOP_NO_CREATE_PREPARE_SEPARATE_REPLACEMENT_WRITER_ADOPTION_REVIEW",
    indeterminatePolicy: "STOP_NO_RETRY_NO_DELETE_NO_IAM_POLICY_MUTATION_NO_M3_NO_M4",
    poststateRequired: true,
    enabledPoststateSuccessSemantics: "EXACT_G2_SERVICE_ACCOUNT_STATUS_ENABLED_CONFIRMED",
    serviceAccountDisableMutationsMax: 0,
    serviceAccountEnableMutationsMax: 0,
    serviceAccountDeleteMutationsMax: 0,
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

export function verifyReplacementWriterCreatePacket(packet, expectedPreflightEvidenceSha256) {
  const expected = buildReplacementWriterCreatePacket(expectedPreflightEvidenceSha256);
  const literalFields = ["stage", "type", "purpose", "target", "preflightEvidenceSha256", "approvalConsumptionPoint", "preexistingPresentPolicy", "indeterminatePolicy", "enabledPoststateSuccessSemantics"];
  const budgetFields = ["prestateRemoteReadsMax", "createMutationAttemptsMax", "poststateRemoteReadsMax", "projectIamReadsMax", "iamPolicyReadsMax", "retriesMax", "rollbacksMax", "serviceAccountDisableMutationsMax", "serviceAccountEnableMutationsMax", "serviceAccountDeleteMutationsMax", "iamPolicyMutationsMax", "m3MutationsMax", "m4MutationsMax"];
  const deniedFields = ["firestoreAllowed", "accessTokenAllowed", "cloudLoggingAllowed", "testIamPermissionsAllowed", "serviceAccountKeyAllowed"];
  if (!packet || typeof packet !== "object") return Object.freeze({ ok: false, code: "G2_CREATE_PACKET_INVALID" });
  if (literalFields.some((field) => packet[field] !== expected[field]) || budgetFields.some((field) => packet[field] !== expected[field]) || packet.poststateRequired !== true) return Object.freeze({ ok: false, code: "G2_CREATE_PACKET_LOCK_MISMATCH" });
  if (deniedFields.some((field) => packet[field] !== false)) return Object.freeze({ ok: false, code: "G2_CREATE_FORBIDDEN_OPERATION_REACHABLE" });
  return Object.freeze({ ok: true, code: "G2_CREATE_PACKET_FAIL_CLOSED" });
}

export function sha256ExactBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function buildReplacementWriterCreateV2Packet() {
  return Object.freeze({
    stage: "P1.5-C2H2E3D-W1C-M3L3-REPLACEMENT-WRITER-CREATE-V2",
    type: "REPLACEMENT_WRITER_CREATE",
    purpose: "create the exact G2 replacement writer once after a fresh authoritative absence check, without granting or using any IAM authority",
    target: REPLACEMENT_WRITER_SERVICE_ACCOUNT,
    preflightEvidenceSha256: REPLACEMENT_WRITER_PREFLIGHT_EVIDENCE_SHA256,
    preflightResultDocumentSha256: "83d84cb9120e9f7d565a1b6f5816adf4042674fe6e6110799970e52bc03b93a4",
    freshPrecreateStateCheckRequired: true,
    precreateRemoteReadsMax: 1,
    serviceAccountCreateMutationsMax: 1,
    postcreateRemoteReadsMax: 1,
    postcreateRequired: true,
    approvalConsumptionPoint: "WHEN_G2_CREATE_PRESTATE_READ_BEGINS",
    preexistingAccountPolicy: "STOP_NO_CREATE_PREPARE_SEPARATE_REPLACEMENT_WRITER_ADOPTION_REVIEW",
    createIndeterminatePolicy: "STOP_NO_RETRY_NO_SECOND_CREATE_NO_DELETE_NO_ENABLE_NO_DISABLE_NO_IAM_POLICY_MUTATION_NO_PROJECT_IAM_MUTATION_NO_M3_NO_M4_PREPARE_SEPARATE_READ_ONLY_CREATE_RECOVERY",
    postcreatePresentEnabledSuccessSemantics: "EXACT_G2_SERVICE_ACCOUNT_STATUS_ENABLED_CONFIRMED",
    postcreatePresentDisabledPolicy: "STOP_NO_ENABLE_NO_DELETE_NO_SECOND_CREATE_NO_M3_NO_M4_PREPARE_SEPARATE_REVIEW_OR_RECOVERY",
    postcreateAbsentPolicy: "STOP_NO_SECOND_CREATE_NO_RETRY_NO_DELETE_NO_M3_NO_M4_PREPARE_SEPARATE_READ_ONLY_RECOVERY",
    ambiguousPolicy: "STOP_NO_RETRY_NO_SECOND_CREATE_NO_MUTATION",
    readFailurePolicy: "STOP_NO_RETRY_NO_SECOND_READ_UNDER_CONSUMED_APPROVAL_NO_SECOND_CREATE_NO_MUTATION",
    retriesMax: 0,
    rollbacksMax: 0,
    secondCreateReachable: false,
    serviceAccountDisableMutationsMax: 0,
    serviceAccountEnableMutationsMax: 0,
    serviceAccountDeleteMutationsMax: 0,
    iamPolicyReadsMax: 0,
    iamPolicyMutationsMax: 0,
    projectIamReadsMax: 0,
    projectIamMutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
  });
}

export function verifyReplacementWriterCreateV2Packet(packet) {
  const expected = buildReplacementWriterCreateV2Packet();
  if (!packet || typeof packet !== "object") return Object.freeze({ ok: false, code: "G2_CREATE_V2_PACKET_INVALID" });
  if (Object.keys(expected).some((field) => packet[field] !== expected[field])) return Object.freeze({ ok: false, code: "G2_CREATE_V2_LITERAL_OR_BUDGET_MISMATCH" });
  if (packet.target === "myweb-class-migration-writer@my-management-app-8a933.iam.gserviceaccount.com") return Object.freeze({ ok: false, code: "G2_CREATE_V2_TARGET_FROZEN" });
  return Object.freeze({ ok: true, code: "G2_CREATE_V2_PACKET_FAIL_CLOSED" });
}
