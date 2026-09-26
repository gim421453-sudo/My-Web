import { createHash } from "node:crypto";
import { ACTIVE_REPLACEMENT_WRITER_GENERATION, ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT, FROZEN_WRITER_SERVICE_ACCOUNT, REPLACEMENT_WRITER_SERVICE_ACCOUNT } from "./writerRotationAuthority.mjs";
import { REPLACEMENT_WRITER_GENERATION_2B_ACCOUNT_ID, isProviderCompatibleServiceAccountId } from "./replacementWriterIdentityRedesign.mjs";

export const FAILED_G2_CREATE_EVIDENCE_SHA256 = "cdede0b4453817e36462b59de842c792df62a4815f3127f6313cc9c9ad9b7f55";
export const FAILED_G2_CREATE_RESULT_SHA256 = "e1b4b26e52f744c7a1a57d097889eaac95725a4eb1fba97996eb5f8c02487dc5";

export function buildReplacementWriterG2BPreflightPacket() {
  return Object.freeze({
    stage: "P1.5-C2H2E3D-W1C-M3L3-REPLACEMENT-WRITER-G2B-PREFLIGHT",
    type: "READ_ONLY_REPLACEMENT_WRITER_PREFLIGHT",
    purpose: "determine exact existence/status of the G2B replacement writer without creating or mutating it",
    targetGeneration: ACTIVE_REPLACEMENT_WRITER_GENERATION,
    target: ACTIVE_REPLACEMENT_WRITER_SERVICE_ACCOUNT,
    g2bAccountIdLength: REPLACEMENT_WRITER_GENERATION_2B_ACCOUNT_ID.length,
    g2bAccountIdProviderValid: isProviderCompatibleServiceAccountId(REPLACEMENT_WRITER_GENERATION_2B_ACCOUNT_ID),
    failedG2CreateEvidenceSha256: FAILED_G2_CREATE_EVIDENCE_SHA256,
    failedG2CreateResultSha256: FAILED_G2_CREATE_RESULT_SHA256,
    oldWriterContainmentState: "DISABLED_CONFIRMED_FROZEN",
    prestateRemoteReadsMax: 1, projectIamReadsMax: 0, iamPolicyReadsMax: 0, retriesMax: 0, rollbacksMax: 0,
    approvalConsumptionPoint: "WHEN_G2B_SERVICE_ACCOUNT_METADATA_PRESTATE_READ_BEGINS",
    resultDomain: Object.freeze(["ABSENT", "PRESENT_ENABLED", "PRESENT_DISABLED", "AMBIGUOUS", "READ_FAILURE"]),
    absentResultPolicy: "STOP_PREPARE_SEPARATE_REPLACEMENT_WRITER_G2B_CREATE_APPROVAL_NO_AUTOMATIC_CREATE",
    presentEnabledPolicy: "STOP_PREPARE_SEPARATE_G2B_ADOPTION_REVIEW_NO_AUTOMATIC_ADOPTION",
    presentDisabledPolicy: "STOP_PREPARE_SEPARATE_G2B_ADOPTION_REVIEW_NO_ENABLE_NO_CREATE",
    ambiguousPolicy: "STOP_NO_RETRY_NO_CREATE_NO_MUTATION",
    readFailurePolicy: "STOP_NO_RETRY_NO_CREATE_NO_MUTATION",
    serviceAccountCreateMutationsMax: 0, serviceAccountDisableMutationsMax: 0, serviceAccountEnableMutationsMax: 0, serviceAccountDeleteMutationsMax: 0,
    iamPolicyMutationsMax: 0, projectIamMutationsMax: 0, m3MutationsMax: 0, m4MutationsMax: 0,
    firestoreAllowed: false, accessTokenAllowed: false, cloudLoggingAllowed: false, testIamPermissionsAllowed: false, serviceAccountKeyAllowed: false,
  });
}

export function verifyReplacementWriterG2BPreflightPacket(packet) {
  const expected = buildReplacementWriterG2BPreflightPacket();
  if (!packet || typeof packet !== "object") return Object.freeze({ ok: false, code: "G2B_PREFLIGHT_PACKET_INVALID" });
  if (packet.target === FROZEN_WRITER_SERVICE_ACCOUNT || packet.target === REPLACEMENT_WRITER_SERVICE_ACCOUNT) return Object.freeze({ ok: false, code: "G2B_PREFLIGHT_HISTORICAL_TARGET" });
  if (Object.keys(expected).filter((field) => field !== "resultDomain").some((field) => packet[field] !== expected[field])
    || !Array.isArray(packet.resultDomain) || packet.resultDomain.join("|") !== expected.resultDomain.join("|")) return Object.freeze({ ok: false, code: "G2B_PREFLIGHT_LOCK_MISMATCH" });
  return Object.freeze({ ok: true, code: "G2B_PREFLIGHT_PACKET_FAIL_CLOSED" });
}

export function sha256ExactBytes(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
