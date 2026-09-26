import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { sha256Canonical } from "./g2bM3AuthorityReattestation.mjs";

export const G2B_M3_NEW_OPERATION_GENERATION = "9662e385-82ab-4a73-8a5a-e8a25a9f4478";
export const G2B_M3_NEW_OPERATION_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-NEW-OPERATION-AFTER-CONFIRMED-ABSENCE";
export const PRIOR_RECOVERY_EXECUTION_EVIDENCE_SHA256 = "c6b0c47798a85235138bc25eadf947021514ae3004969663799ed2fcd02ba979";

const REQUIRED_KEYS = Object.freeze([
  "stage", "type", "purpose", "targetResource", "targetRole", "priorRecoveryExecutionEvidenceSha256", "priorRecoveryResult", "priorOperationReusable", "priorAnchorReusable", "newOperationGeneration",
  "implementationAttestationSha256", "runtimeCapabilityAttestationSha256", "finalExecutionCompositeSha256", "graphIdentity", "recoveryAnchorRequired", "newAnchorRequired", "freshOpARequired", "anchorMustBeVerifiedBeforePrestate", "freshPrestateRequired", "approvalConsumptionPoint",
  "localIdentityDiscoveryMax", "prestateRemoteReadsMax", "mutationAttemptsMax", "poststateRequired", "poststateRemoteReadsMax", "projectIamReadsMax", "iamPolicyReadsMax", "retriesMax", "rollbacksMax", "secondMutationReachable", "indeterminatePolicy",
  "identityFailurePolicy", "secretFailurePolicy", "anchorPersistenceFailurePolicy", "anchorVerificationFailurePolicy", "prestateReadFailurePolicy", "prestateAmbiguousPolicy", "preexistingBindingPolicy", "mutationIndeterminatePolicy", "poststateAbsentPolicy", "poststateAmbiguousPolicy", "poststateReadFailurePolicy",
  "m4Allowed", "firestoreAllowed", "accessTokenAllowed", "cloudLoggingAllowed", "testIamPermissionsAllowed", "serviceAccountKeyAllowed", "packetComplete",
]);

export function buildG2BM3NewOperationApprovalPacket({ implementation, runtimeCapability, composite } = {}) {
  if (!implementation || !runtimeCapability || !composite) throw new Error("reattested-authority-artifacts-required");
  return Object.freeze({
    stage: G2B_M3_NEW_OPERATION_STAGE,
    type: "M3_MUTATION_NEW_OPERATION_AFTER_CONFIRMED_ABSENCE_RECOVERY",
    purpose: "perform one newly-authorized G2B M3 operation after the prior INDETERMINATE mutation was independently recovered as MEMBER_ABSENT_CONFIRMED",
    targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE,
    priorRecoveryExecutionEvidenceSha256: PRIOR_RECOVERY_EXECUTION_EVIDENCE_SHA256,
    priorRecoveryResult: "MEMBER_ABSENT_CONFIRMED", priorOperationReusable: false, priorAnchorReusable: false,
    newOperationGeneration: G2B_M3_NEW_OPERATION_GENERATION,
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    finalExecutionCompositeSha256: sha256Canonical(composite),
    graphIdentity: runtimeCapability.graphIdentity,
    recoveryAnchorRequired: true, newAnchorRequired: true, freshOpARequired: true,
    anchorMustBeVerifiedBeforePrestate: true, freshPrestateRequired: true,
    approvalConsumptionPoint: "FIRST_APPROVED_FRESH_REMOTE_PRESTATE_READ_BEGINS",
    localIdentityDiscoveryMax: 1, prestateRemoteReadsMax: 1, mutationAttemptsMax: 1,
    poststateRequired: true, poststateRemoteReadsMax: 1, projectIamReadsMax: 0, iamPolicyReadsMax: 2,
    retriesMax: 0, rollbacksMax: 0, secondMutationReachable: false,
    indeterminatePolicy: "SEPARATE_READ_ONLY_ANCHOR_BASED_RECOVERY_NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK",
    identityFailurePolicy: "M3_MUTATION_0_REMOTE_PRESTATE_0_STOP",
    secretFailurePolicy: "M3_MUTATION_0_REMOTE_PRESTATE_0_STOP",
    anchorPersistenceFailurePolicy: "M3_MUTATION_0_REMOTE_PRESTATE_0_STOP",
    anchorVerificationFailurePolicy: "M3_MUTATION_0_REMOTE_PRESTATE_0_STOP",
    prestateReadFailurePolicy: "M3_MUTATION_0_NO_RETRY_STOP",
    prestateAmbiguousPolicy: "M3_MUTATION_0_NO_RETRY_STOP",
    preexistingBindingPolicy: "M3_MUTATION_0_NO_DUPLICATE_NO_REMOVE_READD_SEPARATE_ADOPTION_REVIEW",
    mutationIndeterminatePolicy: "NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK_SEPARATE_READ_ONLY_ANCHOR_BASED_RECOVERY",
    poststateAbsentPolicy: "NO_SECOND_MUTATION_NO_RETRY_NO_ROLLBACK_STOP",
    poststateAmbiguousPolicy: "NO_SECOND_MUTATION_NO_RETRY_NO_M4_STOP",
    poststateReadFailurePolicy: "NO_SECOND_MUTATION_NO_RETRY_NO_M4_STOP",
    m4Allowed: false, firestoreAllowed: false, accessTokenAllowed: false, cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false, serviceAccountKeyAllowed: false, packetComplete: true,
  });
}

export function verifyG2BM3NewOperationApprovalPacket(packet, artifacts) {
  let expected;
  try { expected = buildG2BM3NewOperationApprovalPacket(artifacts); } catch { return Object.freeze({ ok: false, code: "G2B_M3_NEW_OPERATION_PACKET_ARTIFACTS_MISSING" }); }
  const exact = packet && typeof packet === "object" && Object.keys(packet).length === REQUIRED_KEYS.length
    && REQUIRED_KEYS.every((key) => Object.prototype.hasOwnProperty.call(packet, key) && packet[key] === expected[key]);
  return Object.freeze({ ok: exact, code: exact ? "G2B_M3_NEW_OPERATION_PACKET_FAIL_CLOSED" : "G2B_M3_NEW_OPERATION_PACKET_LOCK_MISMATCH" });
}
