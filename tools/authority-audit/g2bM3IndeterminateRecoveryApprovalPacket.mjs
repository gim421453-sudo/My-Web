import { createHash } from "node:crypto";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";

export const G2B_M3_INDETERMINATE_EXECUTION_EVIDENCE_SHA256 = "e040333f84a2c154c5804057b705929897122a4888968f6e04c6737427429822";
export const G2B_M3_INDETERMINATE_RESULT_SHA256 = "32d8e79d9cea3a772daa770ef06e1566f16af75612bfe142f94328108ac22691";

export function buildG2BM3IndeterminateRecoveryApprovalPacket() {
  return Object.freeze({
    stage: "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-READ_ONLY-ANCHOR-RECOVERY",
    type: "READ_ONLY_ANCHOR_BASED_M3_RECOVERY",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    executionEvidenceSha256: G2B_M3_INDETERMINATE_EXECUTION_EVIDENCE_SHA256,
    resultDocumentSha256: G2B_M3_INDETERMINATE_RESULT_SHA256,
    operationGenerationFingerprint: "sha256:bbb6b71caea87db0c1a2bf0e57a2ce4752abed4535412a54826c84cd9deb3d34",
    recoverySecretRequirement: "READY_CURRENTUSER_DPAPI_EXPECTED_GENERATION_NO_SILENT_ROTATION",
    anchorRequirement: "EXACTLY_ONE_PRESERVED_MUTATION_INDETERMINATE_ANCHOR",
    recoveryRequiresNewOpA: false,
    writerSaIamReadsMax: 1,
    projectIamReadsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    retriesMax: 0,
    rollbacksMax: 0,
    firestoreMax: 0,
    accessTokenMax: 0,
    cloudLoggingMax: 0,
    testIamPermissionsMax: 0,
    serviceAccountKeyMax: 0,
    resultDomain: "PRESENT_CONFIRMED|MEMBER_ABSENT_CONFIRMED|AMBIGUOUS|READ_FAILURE|POLICY_PARSE_FAILURE|ANCHOR_INVALID|SECRET_UNAVAILABLE|PRIVACY_GUARD_FAILURE",
    presentSemantics: "EXACT_ANCHOR_MATCH_COUNT_ONE",
    absentSemantics: "VALID_FULL_PARSE_ZERO_HMAC_MATCHES",
    indeterminatePolicy: "NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK",
  });
}

export function verifyG2BM3IndeterminateRecoveryApprovalPacket(packet) {
  const expected = buildG2BM3IndeterminateRecoveryApprovalPacket();
  const exact = packet && typeof packet === "object" && Object.keys(packet).length === Object.keys(expected).length
    && Object.entries(expected).every(([key, value]) => packet[key] === value);
  return Object.freeze({ ok: exact, code: exact ? "G2B_M3_INDETERMINATE_RECOVERY_PACKET_FAIL_CLOSED" : "G2B_M3_INDETERMINATE_RECOVERY_PACKET_LOCK_MISMATCH" });
}

export function sha256ExactBytes(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
