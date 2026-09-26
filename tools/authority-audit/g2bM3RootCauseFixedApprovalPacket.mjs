import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import {
  buildG2BCurrentFinalExecutionComposite,
  buildG2BCurrentImplementationAttestation,
  buildG2BCurrentRuntimeCapabilityAttestation,
  sha256Canonical,
} from "./g2bM3CurrentLiveAttestation.mjs";
import { M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT } from "./m3RuntimeCommandGraph.mjs";

export const G2B_ROOT_CAUSE_FIXED_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-ROOT-CAUSE-FIXED-LIVE";
export const G2B_ROOT_CAUSE_FIXED_OPERATION_GENERATION = "323af4e6-f1c6-4766-bc9f-39608dba78dc";
export const LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256 = "6cc8123cd11ba84c9fb4d4026f8c5f47c065f344c8ba648ec71414cd2b4a83d3";
export const LATEST_RECOVERY_RESULT_DOCUMENT_SHA256 = "b156e2700bf1a7c5ea680ce44d10b8fd9344cfbe5dc898a44614964d35bbf77f";
export const LATEST_RECOVERY_ANCHOR_EVIDENCE_SHA256 = "83f45eacb03f2b98d00a34413ddd71174532e30385f7f9c843b2c301fca28cc3";
export const LATEST_RECOVERY_PRIVACY_EVIDENCE_SHA256 = "1c4acb8634f0eb805c29d9a7dca22a6c887bb36181127d10e8f5a96d482451f6";
const ROOT_PACKET_VERIFIER_PATH = "tools/authority-audit/g2bM3RootCauseFixedApprovalPacket.mjs";

function withFreshOperation(value) {
  return Object.freeze({
    ...value,
    schema: value.schema.replace(".current-live.", ".root-cause-fixed."),
    stage: G2B_ROOT_CAUSE_FIXED_STAGE,
    operationGeneration: G2B_ROOT_CAUSE_FIXED_OPERATION_GENERATION,
  });
}

export function buildG2BRootCauseFixedAttestations({ repositoryRoot = process.cwd() } = {}) {
  const currentImplementation = buildG2BCurrentImplementationAttestation({ repositoryRoot });
  const implementation = Object.freeze({
    ...withFreshOperation(currentImplementation),
    sourceLocks: Object.freeze([
      ...currentImplementation.sourceLocks,
      Object.freeze({
        path: ROOT_PACKET_VERIFIER_PATH,
        sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, ROOT_PACKET_VERIFIER_PATH))).digest("hex"),
      }),
    ]),
  });
  const runtimeCapability = withFreshOperation(buildG2BCurrentRuntimeCapabilityAttestation({ operationGeneration: G2B_ROOT_CAUSE_FIXED_OPERATION_GENERATION }));
  const currentComposite = buildG2BCurrentFinalExecutionComposite({ implementation, runtimeCapability });
  const composite = Object.freeze({
    ...currentComposite,
    schema: "myweb.g2b.root-cause-fixed.final-execution-composite.v1",
    stage: G2B_ROOT_CAUSE_FIXED_STAGE,
    operationGeneration: G2B_ROOT_CAUSE_FIXED_OPERATION_GENERATION,
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    historicalGuards: Object.freeze({
      g1: "DISABLED_CONFIRMED_FROZEN",
      priorG2BOperations: "RECOVERED_MEMBER_ABSENT_NON_REUSABLE",
      legacyWriterSurface: "CONTAINED_AND_NOT_REACHABLE_FROM_CURRENT_G2B_EXECUTOR",
    }),
  });
  return Object.freeze({ implementation, runtimeCapability, composite });
}

export function buildG2BRootCauseFixedApprovalPacket({ implementation, runtimeCapability, composite } = {}) {
  if (!implementation || !runtimeCapability || !composite) throw new Error("root-cause-fixed-attestations-required");
  const budgets = runtimeCapability.budgets;
  return Object.freeze({
    stage: G2B_ROOT_CAUSE_FIXED_STAGE,
    type: "M3_MUTATION_AFTER_PROVEN_TARGET_FIX",
    status: "SUPERSEDED_REMOTE_CAPABILITY_ACCOUNTING_REPAIR_REQUIRED",
    purpose: "one separately approved G2B M3 operation after local target-surface correction and independent recovery of prior operations",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    priorRecoveryResult: "MEMBER_ABSENT_CONFIRMED",
    priorRecoveryExecutionEvidenceSha256: LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256,
    priorRecoveryResultDocumentSha256: LATEST_RECOVERY_RESULT_DOCUMENT_SHA256,
    priorRecoveryAnchorEvidenceSha256: LATEST_RECOVERY_ANCHOR_EVIDENCE_SHA256,
    priorRecoveryPrivacyEvidenceSha256: LATEST_RECOVERY_PRIVACY_EVIDENCE_SHA256,
    operationGeneration: G2B_ROOT_CAUSE_FIXED_OPERATION_GENERATION,
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    finalExecutionCompositeSha256: sha256Canonical(composite),
    graphIdentity: runtimeCapability.graphIdentity,
    targetResourceCrossArtifactMatch: true,
    targetBoundExecutorVerified: true,
    liveExecutorBound: true,
    liveExecutorSourceLockMatch: true,
    g2bTargetBoundBuilderSourceLockMatch: true,
    currentLiveChainSourceLocksMatch: true,
    allRequiredLocalLocksMatch: true,
    legacyWriterSurfaceReachableFromCurrentExecutor: false,
    recoveryAnchorRequired: true,
    newAnchorRequired: true,
    freshOpARequired: true,
    anchorMustBeVerifiedBeforePrestate: true,
    freshPrestateRequired: true,
    approvalConsumptionPoint: "FIRST_APPROVED_FRESH_REMOTE_PRESTATE_READ_BEGINS",
    prestateWriterIamPolicyReadsMax: budgets.prestateWriterIamPolicyReadsMax,
    prestateProjectIamReadsMax: budgets.prestateProjectIamReadsMax,
    prestatePhysicalRemoteReadsMax: budgets.prestatePhysicalRemoteReadsMax,
    mutationTargetExactLiteralBound: true,
    legacyTargetMutationReachability: 0,
    poststateRequired: true,
    poststateWriterIamPolicyReadsMax: budgets.poststateWriterIamPolicyReadsMax,
    poststateProjectIamReadsMax: budgets.poststateProjectIamReadsMax,
    poststatePhysicalRemoteReadsMax: budgets.poststatePhysicalRemoteReadsMax,
    mutationAttemptsMax: budgets.m3MutationAttemptsMax,
    totalProjectIamReadsMax: budgets.totalProjectIamReadsMax,
    totalPhysicalRemoteReadsMax: budgets.totalPhysicalRemoteReadsMax,
    totalPhysicalProviderCallsMin: budgets.totalPhysicalProviderCallsMin,
    totalPhysicalProviderCallsMax: budgets.totalPhysicalProviderCallsMax,
    mutationProcessInternalGetIamPolicy: M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.mutationProcessInternalGetIamPolicy,
    mutationProcessInternalSetIamPolicy: M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.mutationProcessInternalSetIamPolicy,
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
    packetReproducible: true,
    safeToContinueWithoutApproval: false,
  });
}

export function verifyG2BRootCauseFixedPacket(packet, artifacts) {
  let expected;
  try { expected = buildG2BRootCauseFixedApprovalPacket(artifacts); } catch { return Object.freeze({ ok: false, code: "ROOT_CAUSE_FIXED_ARTIFACTS_MISSING" }); }
  const ok = JSON.stringify(packet) === JSON.stringify(expected);
  return Object.freeze({ ok, code: ok ? "ROOT_CAUSE_FIXED_PACKET_MATCH" : "ROOT_CAUSE_FIXED_PACKET_MISMATCH" });
}
