import { createHash } from "node:crypto";
import {
  FROZEN_WRITER_SERVICE_ACCOUNT,
  REPLACEMENT_WRITER_SERVICE_ACCOUNT,
} from "./writerRotationAuthority.mjs";

export const OLD_WRITER_CONTAINMENT_EVIDENCE_SHA256 = "4d4c3e8709748eadc17c3f40434e178769cccf96f6d612d23af4bccf0f9af18e";
export const OLD_WRITER_CONTAINMENT_RESULT_SHA256 = "54926df37ad9e8c2ad7e7a0ff14b6e1f01dfaca4a0bb8ef2366162197cc1ee91";
const PROJECT_ID = "my-management-app-8a933";

export function buildReplacementWriterPreflightPacket() {
  return Object.freeze({
    stage: "P1.5-C2H2E3D-W1C-M3L3-REPLACEMENT-WRITER-PREFLIGHT",
    type: "READ_ONLY_REPLACEMENT_WRITER_PREFLIGHT",
    purpose: "determine exact existence/status of the G2 replacement writer without creating or mutating it",
    target: REPLACEMENT_WRITER_SERVICE_ACCOUNT,
    oldWriterContainmentEvidenceSha256: OLD_WRITER_CONTAINMENT_EVIDENCE_SHA256,
    oldWriterContainmentResultSha256: OLD_WRITER_CONTAINMENT_RESULT_SHA256,
    prestateRemoteReadsMax: 1,
    projectIamReadsMax: 0,
    iamPolicyReadsMax: 0,
    retriesMax: 0,
    rollbacksMax: 0,
    approvalConsumptionPoint: "WHEN_G2_SERVICE_ACCOUNT_METADATA_PRESTATE_READ_BEGINS",
    resultDomain: Object.freeze(["ABSENT", "PRESENT_ENABLED", "PRESENT_DISABLED", "AMBIGUOUS", "READ_FAILURE"]),
    absentResultPolicy: "STOP_PREPARE_SEPARATE_REPLACEMENT_WRITER_CREATE_APPROVAL_NO_AUTOMATIC_CREATE",
    presentEnabledPolicy: "STOP_PREPARE_SEPARATE_REPLACEMENT_WRITER_ADOPTION_REVIEW_NO_AUTOMATIC_ADOPTION",
    presentDisabledPolicy: "STOP_PREPARE_SEPARATE_REPLACEMENT_WRITER_ADOPTION_REVIEW_NO_ENABLE_NO_CREATE",
    ambiguousPolicy: "STOP_NO_CREATE_NO_MUTATION_NO_RETRY",
    readFailurePolicy: "STOP_NO_CREATE_NO_MUTATION_NO_RETRY",
    serviceAccountCreateMutationsMax: 0,
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

export function verifyReplacementWriterPreflightPacket(packet) {
  const expected = buildReplacementWriterPreflightPacket();
  const literalFields = [
    "stage", "type", "purpose", "target", "oldWriterContainmentEvidenceSha256", "oldWriterContainmentResultSha256",
    "approvalConsumptionPoint", "absentResultPolicy", "presentEnabledPolicy", "presentDisabledPolicy", "ambiguousPolicy", "readFailurePolicy",
  ];
  const budgetFields = [
    "prestateRemoteReadsMax", "projectIamReadsMax", "iamPolicyReadsMax", "retriesMax", "rollbacksMax",
    "serviceAccountCreateMutationsMax", "serviceAccountDisableMutationsMax", "serviceAccountEnableMutationsMax",
    "serviceAccountDeleteMutationsMax", "iamPolicyMutationsMax", "m3MutationsMax", "m4MutationsMax",
  ];
  const deniedFields = ["firestoreAllowed", "accessTokenAllowed", "cloudLoggingAllowed", "testIamPermissionsAllowed", "serviceAccountKeyAllowed"];
  if (!packet || typeof packet !== "object") return Object.freeze({ ok: false, code: "G2_PREFLIGHT_PACKET_INVALID" });
  if (packet.target === FROZEN_WRITER_SERVICE_ACCOUNT) return Object.freeze({ ok: false, code: "G2_PREFLIGHT_TARGET_FROZEN" });
  if (literalFields.some((field) => packet[field] !== expected[field])) return Object.freeze({ ok: false, code: "G2_PREFLIGHT_LITERAL_MISMATCH" });
  if (budgetFields.some((field) => packet[field] !== expected[field])) return Object.freeze({ ok: false, code: "G2_PREFLIGHT_BUDGET_MISMATCH" });
  if (!Array.isArray(packet.resultDomain) || packet.resultDomain.join("|") !== expected.resultDomain.join("|")) return Object.freeze({ ok: false, code: "G2_PREFLIGHT_RESULT_DOMAIN_INVALID" });
  if (deniedFields.some((field) => packet[field] !== false)) return Object.freeze({ ok: false, code: "G2_PREFLIGHT_FORBIDDEN_OPERATION_REACHABLE" });
  return Object.freeze({ ok: true, code: "G2_PREFLIGHT_PACKET_FAIL_CLOSED" });
}

export function classifyReplacementWriterMetadata({ parsed = null, notFoundProven = false, readFailed = false } = {}) {
  if (readFailed === true) return "READ_FAILURE";
  if (notFoundProven === true) return "ABSENT";
  const expectedName = `projects/${PROJECT_ID}/serviceAccounts/${REPLACEMENT_WRITER_SERVICE_ACCOUNT}`;
  if (!parsed || parsed.name !== expectedName) return "AMBIGUOUS";
  return parsed.disabled === true ? "PRESENT_DISABLED" : "PRESENT_ENABLED";
}

export function sha256ExactBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
