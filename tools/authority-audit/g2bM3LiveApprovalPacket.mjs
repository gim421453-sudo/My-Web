import { createHash } from "node:crypto";
import { G2B_CREATE_EVIDENCE_SHA256 } from "./g2bM3AuthorityReattestation.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";

export const G2B_M3_LIVE_APPROVAL_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RECOVERY-ANCHOR-HARDENED-LIVE";
export const RECOVERY_ANCHOR_IMPLEMENTATION_ATTESTATION_SHA256 = "fd4e1551b7c698928e8f779074c16045bd4600f0e54cb48de4e1c6b6d037f814";
export const RUNTIME_CAPABILITY_ATTESTATION_SHA256 = "c3093a9413c2a083c112b4abef9cd8a9959b002c1a13917cfb9facd147abf911";
export const FINAL_EXECUTION_COMPOSITE_SHA256 = "cf3a391c7a3ca311d35aea539f83e71a0e1aa6f61f6c986d78c1acdc5e35a119";

const REQUIRED_KEYS = Object.freeze([
  "stage", "type", "targetResource", "targetRole", "g2bCreateEvidenceSha256",
  "implementationAttestationSha256", "runtimeCapabilityAttestationSha256", "finalExecutionCompositeSha256", "graphIdentity",
  "recoveryAnchorRequired", "anchorMustBeVerifiedBeforePrestate", "recoverySecretStateRequirement", "recoverySecretInvalidPolicy",
  "anchorPersistenceFailurePolicy", "anchorVerificationFailurePolicy", "preRemoteVerifiedAnchorResumePolicy", "approvalConsumptionPoint",
  "prestateResultDomain", "preexistingBindingPolicy", "prestateAmbiguousPolicy", "prestateReadFailurePolicy",
  "localIdentityDiscoveryMax", "prestateRemoteReadsMax", "mutationAttemptsMax", "poststateRemoteReadsMax", "projectIamReadsMax",
  "indeterminatePolicy", "indeterminateAnchorPreservationPolicy", "poststateRequired", "poststatePresentConfirmedSuccessSemantics",
  "poststateAbsentPolicy", "poststateAmbiguousPolicy", "poststateReadFailurePolicy", "retriesMax", "rollbacksMax",
  "secondMutationReachable", "m4Allowed", "firestoreAllowed", "accessTokenAllowed", "cloudLoggingAllowed",
  "testIamPermissionsAllowed", "serviceAccountKeyAllowed", "livePacketComplete",
]);

export function buildG2BM3LiveApprovalPacket() {
  return Object.freeze({
    stage: G2B_M3_LIVE_APPROVAL_STAGE,
    type: "M3_MUTATION",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    g2bCreateEvidenceSha256: G2B_CREATE_EVIDENCE_SHA256,
    implementationAttestationSha256: RECOVERY_ANCHOR_IMPLEMENTATION_ATTESTATION_SHA256,
    runtimeCapabilityAttestationSha256: RUNTIME_CAPABILITY_ATTESTATION_SHA256,
    finalExecutionCompositeSha256: FINAL_EXECUTION_COMPOSITE_SHA256,
    graphIdentity: "g2b-m3-cc2f7c2ccd1e38c5",
    recoveryAnchorRequired: true,
    anchorMustBeVerifiedBeforePrestate: true,
    recoverySecretStateRequirement: "READY_CURRENTUSER_DPAPI_EXPECTED_GENERATION_NO_SILENT_ROTATION",
    recoverySecretInvalidPolicy: "ANCHOR_NOT_VERIFIED_M3_MUTATION_0_REMOTE_PRESTATE_0_IF_DISCOVERED_BEFORE_PRESTATE_STOP",
    anchorPersistenceFailurePolicy: "ANCHOR_NOT_VERIFIED_REMOTE_PRESTATE_0_M3_MUTATION_0_STOP",
    anchorVerificationFailurePolicy: "ANCHOR_NOT_VERIFIED_REMOTE_PRESTATE_0_M3_MUTATION_0_STOP",
    preRemoteVerifiedAnchorResumePolicy: "EXISTING_ACTIVE_VERIFIED_ANCHOR_BLOCKS_NEW_OPERATION_NO_PRINCIPAL_SUBSTITUTION_NO_UNRELATED_GENERATION_REUSE",
    approvalConsumptionPoint: "FIRST_APPROVED_FRESH_REMOTE_PRESTATE_READ_BEGINS",
    prestateResultDomain: "TARGET_MEMBER_ABSENT|TARGET_MEMBER_PRESENT|AMBIGUOUS|READ_FAILURE|IDENTITY_FAILURE|ANCHOR_FAILURE",
    preexistingBindingPolicy: "M3_MUTATION_0_NO_DUPLICATE_NO_REMOVE_READD_SEPARATE_ADOPTION_REVIEW",
    prestateAmbiguousPolicy: "M3_MUTATION_0_NO_RETRY_STOP",
    prestateReadFailurePolicy: "M3_MUTATION_0_NO_RETRY_STOP",
    localIdentityDiscoveryMax: 1,
    prestateRemoteReadsMax: 1,
    mutationAttemptsMax: 1,
    poststateRemoteReadsMax: 1,
    projectIamReadsMax: 0,
    indeterminatePolicy: "SEPARATE_READ_ONLY_ANCHOR_BASED_RECOVERY_NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK",
    indeterminateAnchorPreservationPolicy: "PRESERVE_VERIFIED_ANCHOR_AND_OPERATION_CONTEXT_NO_DELETE_ROTATE_INVALIDATE_BEFORE_READ_ONLY_RECOVERY",
    poststateRequired: true,
    poststatePresentConfirmedSuccessSemantics: "ONLY_PRESENT_CONFIRMED_ESTABLISHES_M3_COMPLETION",
    poststateAbsentPolicy: "NO_SECOND_MUTATION_NO_RETRY_NO_ROLLBACK_STOP",
    poststateAmbiguousPolicy: "NO_SECOND_MUTATION_NO_RETRY_NO_M4_STOP",
    poststateReadFailurePolicy: "NO_SECOND_MUTATION_NO_RETRY_NO_M4_STOP",
    retriesMax: 0,
    rollbacksMax: 0,
    secondMutationReachable: false,
    m4Allowed: false,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
    livePacketComplete: true,
  });
}

export function verifyG2BM3LiveApprovalPacket(packet) {
  const expected = buildG2BM3LiveApprovalPacket();
  const shapeValid = packet && typeof packet === "object"
    && Object.keys(packet).length === REQUIRED_KEYS.length
    && REQUIRED_KEYS.every((key) => Object.prototype.hasOwnProperty.call(packet, key));
  const exact = shapeValid && REQUIRED_KEYS.every((key) => packet[key] === expected[key]);
  return Object.freeze({ ok: exact, code: exact ? "G2B_M3_LIVE_APPROVAL_PACKET_FAIL_CLOSED" : "G2B_M3_LIVE_APPROVAL_PACKET_LOCK_MISMATCH" });
}

export function sha256ExactBytes(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
