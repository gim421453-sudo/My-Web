import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import {
  G2B_CURRENT_LIVE_STAGE,
  G2B_CURRENT_M3_OPERATION_GENERATION,
  sha256Canonical,
} from "./g2bM3CurrentLiveAttestation.mjs";

export const CURRENT_PRIOR_RECOVERY_EXECUTION_EVIDENCE_SHA256 = "c6b0c47798a85235138bc25eadf947021514ae3004969663799ed2fcd02ba979";

const REQUIRED_KEYS = Object.freeze([
  "stage", "type", "status", "purpose", "targetResource", "targetRole", "priorRecoveryResult", "priorRecoveryExecutionEvidenceSha256", "operationGeneration",
  "implementationAttestationSha256", "runtimeCapabilityAttestationSha256", "finalExecutionCompositeSha256", "graphIdentity",
  "liveExecutorBound", "liveExecutorSourceLockMatch", "liveCoordinatorToExecutorBindingVerified", "unboundRemoteCapabilities", "unboundProcessCapabilities",
  "recoveryAnchorRequired", "newAnchorRequired", "freshOpARequired", "anchorMustBeVerifiedBeforePrestate", "freshPrestateRequired", "approvalConsumptionPoint",
  "prestateWriterIamPolicyReadsMax", "prestateProjectIamReadsMax", "prestatePhysicalRemoteReadsMax", "mutationAttemptsMax", "poststateRequired",
  "poststateWriterIamPolicyReadsMax", "poststateProjectIamReadsMax", "poststatePhysicalRemoteReadsMax", "totalProjectIamReadsMax", "totalPhysicalRemoteReadsMax", "mutationProcessPhysicalProviderCallsMin", "totalPhysicalProviderCallsMin", "totalPhysicalProviderCallsMax", "m3MutationReachable",
  "retriesMax", "rollbacksMax", "secondMutationReachable", "indeterminatePolicy", "m4Allowed", "firestoreAllowed", "accessTokenAllowed",
  "cloudLoggingAllowed", "testIamPermissionsAllowed", "serviceAccountKeyAllowed", "packetComplete",
]);

export function buildG2BCurrentLiveApprovalPacket({ implementation, runtimeCapability, composite } = {}) {
  if (!implementation || !runtimeCapability || !composite) throw new Error("current-live-attestations-required");
  const budgets = runtimeCapability.budgets;
  return Object.freeze({
    stage: G2B_CURRENT_LIVE_STAGE,
    type: "M3_MUTATION_NEW_OPERATION_AFTER_CONFIRMED_ABSENCE_RECOVERY",
    status: "SUPERSEDED_REMOTE_CAPABILITY_ACCOUNTING_REPAIR_REQUIRED",
    purpose: "perform one newly-authorized G2B M3 operation using the fully bound and reattested current live executor after the prior mutation was independently recovered as MEMBER_ABSENT_CONFIRMED",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    priorRecoveryResult: "MEMBER_ABSENT_CONFIRMED",
    priorRecoveryExecutionEvidenceSha256: CURRENT_PRIOR_RECOVERY_EXECUTION_EVIDENCE_SHA256,
    operationGeneration: G2B_CURRENT_M3_OPERATION_GENERATION,
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    finalExecutionCompositeSha256: sha256Canonical(composite),
    graphIdentity: runtimeCapability.graphIdentity,
    liveExecutorBound: true,
    liveExecutorSourceLockMatch: true,
    liveCoordinatorToExecutorBindingVerified: true,
    unboundRemoteCapabilities: 0,
    unboundProcessCapabilities: 0,
    recoveryAnchorRequired: true,
    newAnchorRequired: true,
    freshOpARequired: true,
    anchorMustBeVerifiedBeforePrestate: true,
    freshPrestateRequired: true,
    approvalConsumptionPoint: "FIRST_APPROVED_FRESH_REMOTE_PRESTATE_READ_BEGINS",
    prestateWriterIamPolicyReadsMax: budgets.prestateWriterIamPolicyReadsMax,
    prestateProjectIamReadsMax: budgets.prestateProjectIamReadsMax,
    prestatePhysicalRemoteReadsMax: budgets.prestatePhysicalRemoteReadsMax,
    mutationAttemptsMax: budgets.m3MutationAttemptsMax,
    poststateRequired: true,
    poststateWriterIamPolicyReadsMax: budgets.poststateWriterIamPolicyReadsMax,
    poststateProjectIamReadsMax: budgets.poststateProjectIamReadsMax,
    poststatePhysicalRemoteReadsMax: budgets.poststatePhysicalRemoteReadsMax,
    totalProjectIamReadsMax: budgets.totalProjectIamReadsMax,
    totalPhysicalRemoteReadsMax: budgets.totalPhysicalRemoteReadsMax,
    mutationProcessPhysicalProviderCallsMin: budgets.mutationProcessPhysicalProviderCallsMin,
    totalPhysicalProviderCallsMin: budgets.totalPhysicalProviderCallsMin,
    totalPhysicalProviderCallsMax: budgets.totalPhysicalProviderCallsMax,
    m3MutationReachable: false,
    retriesMax: budgets.retriesMax,
    rollbacksMax: budgets.rollbacksMax,
    secondMutationReachable: false,
    indeterminatePolicy: "SEPARATE_READ_ONLY_ANCHOR_BASED_RECOVERY_NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK",
    m4Allowed: false,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
    packetComplete: false,
  });
}

export function verifyG2BCurrentLiveApprovalPacket(packet, artifacts) {
  let expected;
  try { expected = buildG2BCurrentLiveApprovalPacket(artifacts); } catch { return Object.freeze({ ok: false, code: "CURRENT_LIVE_PACKET_ARTIFACTS_MISSING" }); }
  const exact = packet && typeof packet === "object"
    && Object.keys(packet).length === REQUIRED_KEYS.length
    && REQUIRED_KEYS.every((key) => Object.prototype.hasOwnProperty.call(packet, key) && packet[key] === expected[key]);
  return Object.freeze({ ok: exact, code: exact ? "CURRENT_LIVE_PACKET_FAIL_CLOSED" : "CURRENT_LIVE_PACKET_LOCK_MISMATCH" });
}
