import { randomUUID, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import {
  buildG2BCurrentFinalExecutionComposite,
  buildG2BCurrentImplementationAttestation,
  buildG2BCurrentRuntimeCapabilityAttestation,
  sha256Canonical,
} from "./g2bM3CurrentLiveAttestation.mjs";
import { buildG2BM3ProspectiveSafetyReview, G2B_M3_PROSPECTIVE_REVIEW_STAGE } from "./g2bM3ProspectiveSafetyReview.mjs";
import {
  LATEST_RECOVERY_ANCHOR_EVIDENCE_SHA256,
  LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256,
  LATEST_RECOVERY_RESULT_DOCUMENT_SHA256,
  V3_EXECUTION_EVIDENCE_SHA256,
  V3_RESULT_DOCUMENT_SHA256,
} from "./g2bM3ProspectiveSafetyAdjudication.mjs";

export const G2B_M3_NEW_GENERATION_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-NEW-GENERATION-LOCAL-PREPARATION";
const PREPARATION_SOURCE_PATH = "tools/authority-audit/g2bM3NewGenerationAuthorityPreparation.mjs";
const REVIEW_SOURCE_PATH = "tools/authority-audit/g2bM3ProspectiveSafetyReview.mjs";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function sourceHash(repositoryRoot, path) {
  return createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex");
}

function validGeneration(value) {
  return typeof value === "string" && UUID.test(value);
}

export function allocateG2BM3NewOperationGeneration() {
  return randomUUID();
}

export function buildG2BM3NewGenerationAuthorityPreparation({
  operationGeneration = allocateG2BM3NewOperationGeneration(),
  repositoryRoot = process.cwd(),
} = {}) {
  const review = buildG2BM3ProspectiveSafetyReview();
  if (review.prospectiveNewM3SafetyAdjudicationReview !== "PASS" || !review.newM3OperationReachable || !validGeneration(operationGeneration)) {
    throw new Error("new-generation-preconditions-not-satisfied");
  }
  const baseImplementation = buildG2BCurrentImplementationAttestation({ repositoryRoot });
  const sourceLockManifest = Object.freeze({
    schema: "myweb.g2b.new-generation.source-lock-manifest.v1",
    stage: G2B_M3_NEW_GENERATION_STAGE,
    operationGeneration,
    sourceLocks: Object.freeze([...baseImplementation.sourceLocks, Object.freeze({ path: REVIEW_SOURCE_PATH, sha256: sourceHash(repositoryRoot, REVIEW_SOURCE_PATH) }), Object.freeze({ path: PREPARATION_SOURCE_PATH, sha256: sourceHash(repositoryRoot, PREPARATION_SOURCE_PATH) })]),
  });
  const implementation = Object.freeze({
    ...baseImplementation,
    schema: "myweb.g2b.new-generation.implementation-attestation.v1",
    stage: G2B_M3_NEW_GENERATION_STAGE,
    operationGeneration,
    sourceLocks: sourceLockManifest.sourceLocks,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
  });
  const baseRuntime = buildG2BCurrentRuntimeCapabilityAttestation({ operationGeneration });
  const runtimeCapability = Object.freeze({
    ...baseRuntime,
    schema: "myweb.g2b.new-generation.runtime-capability-attestation.v1",
    stage: G2B_M3_NEW_GENERATION_STAGE,
  });
  const baseComposite = buildG2BCurrentFinalExecutionComposite({ implementation, runtimeCapability });
  const composite = Object.freeze({
    ...baseComposite,
    schema: "myweb.g2b.new-generation.final-execution-composite.v1",
    stage: G2B_M3_NEW_GENERATION_STAGE,
    operationGeneration,
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    prospectiveSafetyReviewSha256: sha256Canonical(review),
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
  });
  const budgets = runtimeCapability.budgets;
  const packet = Object.freeze({
    schema: "myweb.g2b.new-generation.approval-packet.v1",
    stage: G2B_M3_NEW_GENERATION_STAGE,
    type: "M3_MUTATION_NEW_OPERATION",
    purpose: "one new, independently bounded G2B M3 operation after a fresh exact prestate",
    operationGeneration,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    targetResourceBoundToOperationGeneration: true,
    targetResourceBoundToApprovalPacket: true,
    targetRoleBoundToOperationGeneration: true,
    targetRoleBoundToApprovalPacket: true,
    legacyG1TargetReachability: 0,
    currentMemberDerivationBound: true,
    prestateMemberDerivationEqualsMutationMemberDerivation: true,
    memberTypeClass: "CANONICAL_IAM_MEMBER_USER_OR_SERVICE_ACCOUNT",
    memberFormatValid: true,
    rawMemberPersisted: false,
    rawPrincipalPersisted: false,
    opAPurpose: "LOCAL_ACTIVE_CALLER_DISCOVERY",
    opARemote: false,
    opARequiredForCurrentMemberDerivation: true,
    opARequiredBeforePrestate: true,
    opACallsMax: 1,
    remoteOperationOrder: "OP_A_LOCAL_IDENTITY_DISCOVERY -> OP_C_PRE_FRESH_PRESTATE_READ -> OP_E_CONDITIONAL_MUTATION -> OP_C_POST_AFTER_CONFIRMED_SUCCESS",
    firstRemoteOperation: "OP_C_PRE_FRESH_PRESTATE_READ",
    prospectiveSafetyReviewStage: G2B_M3_PROSPECTIVE_REVIEW_STAGE,
    prospectiveSafetyReviewSha256: sha256Canonical(review),
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    finalExecutionCompositeSha256: sha256Canonical(composite),
    graphIdentity: runtimeCapability.graphIdentity,
    approvalConsumptionPoint: "FIRST_APPROVED_FRESH_REMOTE_PRESTATE_READ_BEGINS",
    firstRemoteOperationCannotOccurBeforeApprovalConsumption: true,
    approvalConsumptionPointMatchesActualFirstRemoteOperation: true,
    freshPrestateRequired: true,
    prestateResource: "EXACT_G2B_WRITER_SERVICE_ACCOUNT",
    prestateRole: G2B_TARGET_ROLE,
    prestateMember: "CURRENT_DERIVED_MEMBER",
    prestateWriterIamPolicyReadsMax: budgets.prestateWriterIamPolicyReadsMax,
    poststateWriterIamPolicyReadsMax: budgets.poststateWriterIamPolicyReadsMax,
    projectIamReadsMax: budgets.totalProjectIamReadsMax,
    totalPhysicalRemoteReadsMax: budgets.totalPhysicalRemoteReadsMax,
    totalPhysicalRemoteCallsMax: 3,
    totalRemoteCallsIfPrestatePresent: 1,
    totalRemoteCallsIfPrestateAbsentAndMutationSuccess: 3,
    totalRemoteCallsIfPrestateAbsentAndMutationIndeterminate: 2,
    mutationAttemptsMax: budgets.m3MutationAttemptsMax,
    retriesMax: budgets.retriesMax,
    rollbacksMax: budgets.rollbacksMax,
    secondMutationReachable: false,
    poststateReadReachableAfterConfirmedSuccess: true,
    poststateReadReachableAfterConfirmedFailure: false,
    poststateReadReachableAfterIndeterminate: false,
    recoveryReadRequiresSeparateApproval: true,
    indeterminatePolicy: "SEPARATE_READ_ONLY_RECOVERY_NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK",
    preexistingBindingPolicy: "MUTATION_0_STOP_RECONCILE",
    prestateFailurePolicy: "MUTATION_0_STOP",
    m4Allowed: false,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
    v3ExecutionEvidenceSha256: V3_EXECUTION_EVIDENCE_SHA256,
    v3ResultDocumentSha256: V3_RESULT_DOCUMENT_SHA256,
    currentRequiredPermission: "iam.serviceAccounts.setIamPolicy",
    currentPermissionState: "PRESENT_CONFIRMED",
    latestRecoveryExecutionEvidenceSha256: LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256,
    latestRecoveryResultDocumentSha256: LATEST_RECOVERY_RESULT_DOCUMENT_SHA256,
    latestRecoveryAnchorEvidenceSha256: LATEST_RECOVERY_ANCHOR_EVIDENCE_SHA256,
    processObservability: Object.freeze({ processStartState: true, childProcessStartState: true, processExitObserved: true, exitCodeCategory: true, timeout: true, signalCategory: true, safeProcessErrorClass: true, safeProviderErrorIdentifier: true, safeFailureStage: true, parserResult: true, classifierResult: true, mutationStarted: true }),
    packetComplete: true,
    safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ review, sourceLockManifest, implementation, runtimeCapability, composite, packet });
}

export function verifyG2BM3NewGenerationAuthorityPreparation(value, { repositoryRoot = process.cwd() } = {}) {
  const generation = value?.packet?.operationGeneration;
  if (!validGeneration(generation) || generation === "ac1c8343-5837-4a75-ad55-c93ac320f937") {
    return Object.freeze({ ok: false, code: "NEW_GENERATION_INVALID" });
  }
  try {
    const expected = buildG2BM3NewGenerationAuthorityPreparation({ operationGeneration: generation, repositoryRoot });
    const actual = JSON.stringify(value);
    return Object.freeze({ ok: actual === JSON.stringify(expected), code: actual === JSON.stringify(expected) ? "NEW_GENERATION_AUTHORITY_PREPARATION_MATCH" : "NEW_GENERATION_AUTHORITY_PREPARATION_MISMATCH" });
  } catch {
    return Object.freeze({ ok: false, code: "NEW_GENERATION_AUTHORITY_PREPARATION_INVALID" });
  }
}
