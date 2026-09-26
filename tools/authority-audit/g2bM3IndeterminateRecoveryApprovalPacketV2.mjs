import { createHash } from "node:crypto";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";

export const HISTORICAL_INCOMPLETE_RECOVERY_PACKET_SHA256 = "7b6531a58d0ff572bb8f057d1452de427da3878e7cf3b117239edf88e58f46a9";
export const M3_EXECUTION_EVIDENCE_SHA256 = "e040333f84a2c154c5804057b705929897122a4888968f6e04c6737427429822";
export const M3_RESULT_DOCUMENT_SHA256 = "32d8e79d9cea3a772daa770ef06e1566f16af75612bfe142f94328108ac22691";

const REQUIRED_KEYS = Object.freeze([
  "stage", "type", "purpose", "targetResource", "targetRole", "m3ExecutionEvidenceSha256", "m3ResultDocumentSha256", "historicalIncompleteRecoveryPacketSha256",
  "recoveryAnchorRequired", "recoveryAnchorStateRequirement", "recoverySecretStateRequirement", "recoveryRequiresNewOpA", "localIdentityDiscoveryMax",
  "writerSaIamReadsMax", "iamPolicyReadsMax", "physicalRemotePolicyReadsMax", "projectIamReadsMax", "approvalConsumptionPoint",
  "canonicalPolicyParserRequired", "legacyPolicyParserFallbackAllowed", "anchorTargetContextMatchRequired", "anchorSecretGenerationMatchRequired", "anchorOperationGenerationMatchRequired",
  "recoveryResultDomain", "oneMatchPolicy", "zeroMatchPolicy", "multipleMatchPolicy", "presentConfirmedSemantics", "memberAbsentConfirmedSemantics",
  "ambiguousSemantics", "readFailureSemantics", "policyParseFailureSemantics", "anchorInvalidSemantics", "secretUnavailableSemantics", "privacyGuardFailureSemantics",
  "retriesMax", "rollbacksMax", "mutationsMax", "m3MutationsMax", "m4MutationsMax", "secondMutationAllowed", "m4Allowed", "firestoreAllowed",
  "accessTokenAllowed", "cloudLoggingAllowed", "testIamPermissionsAllowed", "serviceAccountKeyAllowed", "rawMemberPersisted", "rawPrincipalPersisted", "rawPolicyPersisted",
  "allRequiredLocalLocksMatch", "packetReproducible", "recoveryPacketComplete",
]);

export function buildG2BM3IndeterminateRecoveryApprovalPacketV2() {
  return Object.freeze({
    stage: "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-READ_ONLY-ANCHOR-RECOVERY-V2",
    type: "READ_ONLY_ANCHOR_BASED_M3_RECOVERY",
    purpose: "determine whether the exact IAM member targeted by the consumed INDETERMINATE G2B M3 mutation is currently present using the preserved authorization-grade recovery anchor",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    m3ExecutionEvidenceSha256: M3_EXECUTION_EVIDENCE_SHA256,
    m3ResultDocumentSha256: M3_RESULT_DOCUMENT_SHA256,
    historicalIncompleteRecoveryPacketSha256: HISTORICAL_INCOMPLETE_RECOVERY_PACKET_SHA256,
    recoveryAnchorRequired: true,
    recoveryAnchorStateRequirement: "EXACTLY_ONE_PRESERVED_MUTATION_INDETERMINATE_ANCHOR",
    recoverySecretStateRequirement: "READY_CURRENTUSER_DPAPI_EXPECTED_GENERATION_NO_SILENT_ROTATION",
    recoveryRequiresNewOpA: false,
    localIdentityDiscoveryMax: 0,
    writerSaIamReadsMax: 1,
    iamPolicyReadsMax: 1,
    physicalRemotePolicyReadsMax: 1,
    projectIamReadsMax: 0,
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_G2B_WRITER_IAM_POLICY_RECOVERY_READ_BEGINS",
    canonicalPolicyParserRequired: true,
    legacyPolicyParserFallbackAllowed: false,
    anchorTargetContextMatchRequired: true,
    anchorSecretGenerationMatchRequired: true,
    anchorOperationGenerationMatchRequired: true,
    recoveryResultDomain: "PRESENT_CONFIRMED|MEMBER_ABSENT_CONFIRMED|AMBIGUOUS|READ_FAILURE|POLICY_PARSE_FAILURE|ANCHOR_INVALID|SECRET_UNAVAILABLE|PRIVACY_GUARD_FAILURE",
    oneMatchPolicy: "EXACTLY_ONE_AUTHORIZATION_GRADE_HMAC_MATCH_REQUIRED_FOR_PRESENT_CONFIRMED",
    zeroMatchPolicy: "VALID_FULL_PARSE_ALL_TARGET_ROLE_MEMBERS_EVALUATED_ZERO_HMAC_MATCHES_REQUIRED_FOR_MEMBER_ABSENT_CONFIRMED",
    multipleMatchPolicy: "MULTIPLE_AUTHORIZATION_GRADE_HMAC_MATCHES_ALWAYS_AMBIGUOUS",
    presentConfirmedSemantics: "VALID_ANCHOR_VALID_SECRET_EXACT_CONTEXT_VALID_FULL_POLICY_PARSE_EXACTLY_ONE_HMAC_MATCH",
    memberAbsentConfirmedSemantics: "VALID_ANCHOR_VALID_SECRET_EXACT_CONTEXT_VALID_FULL_POLICY_PARSE_ZERO_HMAC_MATCHES",
    ambiguousSemantics: "AUTHORIZATION_GRADE_UNIQUENESS_NOT_PROVEN_NO_PRESENT_OR_ABSENT_INFERENCE_STOP",
    readFailureSemantics: "REMOTE_POLICY_READ_NOT_AUTHORIZITATIVELY_AVAILABLE_NO_PRESENT_OR_ABSENT_INFERENCE_STOP",
    policyParseFailureSemantics: "CANONICAL_POLICY_PARSE_INCOMPLETE_OR_INVALID_NO_PRESENT_OR_ABSENT_INFERENCE_STOP",
    anchorInvalidSemantics: "RECOVERY_AUTHORITY_INVALID_NO_REMOTE_READ_IF_DETECTED_PRE_READ_NO_PRESENT_OR_ABSENT_INFERENCE_STOP",
    secretUnavailableSemantics: "EXPECTED_DPAPI_SECRET_UNAVAILABLE_OR_MISMATCHED_NO_ANCHOR_REPLACEMENT_NO_PRESENT_OR_ABSENT_INFERENCE_STOP",
    privacyGuardFailureSemantics: "RAW_AUTHORITY_MATERIAL_WOULD_BE_PERSISTED_OR_EXPOSED_FAIL_CLOSED_NO_RECOVERY_SUCCESS_STOP",
    retriesMax: 0,
    rollbacksMax: 0,
    mutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    secondMutationAllowed: false,
    m4Allowed: false,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
    rawMemberPersisted: false,
    rawPrincipalPersisted: false,
    rawPolicyPersisted: false,
    allRequiredLocalLocksMatch: true,
    packetReproducible: true,
    recoveryPacketComplete: true,
  });
}

export function verifyG2BM3IndeterminateRecoveryApprovalPacketV2(packet) {
  const expected = buildG2BM3IndeterminateRecoveryApprovalPacketV2();
  const exact = packet && typeof packet === "object" && Object.keys(packet).length === REQUIRED_KEYS.length
    && REQUIRED_KEYS.every((key) => Object.prototype.hasOwnProperty.call(packet, key) && packet[key] === expected[key]);
  return Object.freeze({ ok: exact, code: exact ? "G2B_M3_READ_ONLY_RECOVERY_V2_PACKET_FAIL_CLOSED" : "G2B_M3_READ_ONLY_RECOVERY_V2_PACKET_LOCK_MISMATCH" });
}

export function sha256ExactBytes(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
