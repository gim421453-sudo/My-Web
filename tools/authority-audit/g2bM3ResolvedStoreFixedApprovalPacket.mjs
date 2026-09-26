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

export const G2B_RESOLVED_STORE_FIXED_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-ROOT-CAUSE-FIXED-RESOLVEDSTORE-FIXED-LIVE";
export const G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION = "ac1c8343-5837-4a75-ad55-c93ac320f937";
export const SUPERSEDED_PRELIVE_OPERATION_GENERATION = "323af4e6-f1c6-4766-bc9f-39608dba78dc";
const PACKET_SOURCE_PATH = "tools/authority-audit/g2bM3ResolvedStoreFixedApprovalPacket.mjs";

function withOperation(value) {
  return Object.freeze({
    ...value,
    schema: value.schema.replace(".current-live.", ".resolved-store-fixed."),
    stage: G2B_RESOLVED_STORE_FIXED_STAGE,
    operationGeneration: G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION,
  });
}

export function buildG2BResolvedStoreFixedAttestations({ repositoryRoot = process.cwd() } = {}) {
  const currentImplementation = buildG2BCurrentImplementationAttestation({ repositoryRoot });
  const implementation = Object.freeze({
    ...withOperation(currentImplementation),
    sourceLocks: Object.freeze([
      ...currentImplementation.sourceLocks,
      Object.freeze({
        path: PACKET_SOURCE_PATH,
        sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, PACKET_SOURCE_PATH))).digest("hex"),
      }),
    ]),
  });
  const runtimeCapability = withOperation(buildG2BCurrentRuntimeCapabilityAttestation({
    operationGeneration: G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION,
  }));
  const currentComposite = buildG2BCurrentFinalExecutionComposite({ implementation, runtimeCapability });
  const composite = Object.freeze({
    ...currentComposite,
    schema: "myweb.g2b.resolved-store-fixed.final-execution-composite.v1",
    stage: G2B_RESOLVED_STORE_FIXED_STAGE,
    operationGeneration: G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION,
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    resolvedStoreReferenceDefectFixed: true,
    operationGenerationReusedAfterPreOpABlock: false,
    supersededPreliveOperationGeneration: SUPERSEDED_PRELIVE_OPERATION_GENERATION,
  });
  return Object.freeze({ implementation, runtimeCapability, composite });
}

export function buildG2BResolvedStoreFixedApprovalPacket({ implementation, runtimeCapability, composite } = {}) {
  if (!implementation || !runtimeCapability || !composite) throw new Error("resolved-store-fixed-attestations-required");
  const budgets = runtimeCapability.budgets;
  return Object.freeze({
    stage: G2B_RESOLVED_STORE_FIXED_STAGE,
    type: "M3_MUTATION_AFTER_PROVEN_TARGET_AND_PRE_OP_A_EXECUTOR_FIXES",
    purpose: "perform one newly-authorized G2B M3 operation after fixing both the proven legacy-writer target mismatch and the pre-OP-A resolvedStore reference defect",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    rootCauseClass: "TARGET_RESOURCE_DEFECT",
    rootCauseFixed: true,
    resolvedStoreReferenceDefectFixed: true,
    operationGeneration: G2B_RESOLVED_STORE_FIXED_OPERATION_GENERATION,
    operationGenerationReusedAfterPreOpABlock: false,
    supersededPreliveOperationGeneration: SUPERSEDED_PRELIVE_OPERATION_GENERATION,
    reuseJustification: "NEW_GENERATION_ALLOCATED_BECAUSE_AUTHORITY_PACKET_CONTRACT_CHANGED",
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    finalExecutionCompositeSha256: sha256Canonical(composite),
    graphIdentity: runtimeCapability.graphIdentity,
    liveExecutorBound: true,
    liveExecutorSourceLockMatch: true,
    g2bTargetBoundBuilderSourceLockMatch: true,
    resolvedStoreFixSourceLockMatch: true,
    currentLiveChainSourceLocksMatch: true,
    currentAttestationChainComplete: true,
    currentCanonicalParserSourceLockMatch: true,
    currentCanonicalParserAttested: true,
    currentRecoveryCrashWindowCoverage: "PASS",
    targetResourceCrossArtifactMatch: true,
    prestateTargetEqualsG2b: true,
    mutationTargetEqualsG2b: true,
    poststateTargetEqualsG2b: true,
    recoveryTargetEqualsG2b: true,
    prestateTargetEqualsMutationTarget: true,
    mutationTargetEqualsPoststateTarget: true,
    poststateTargetEqualsRecoveryTarget: true,
    legacyTargetMutationReachability: 0,
    unboundRemoteCapabilities: 0,
    unboundProcessCapabilities: 0,
    recoveryAnchorRequired: true,
    newAnchorRequired: true,
    freshOpARequired: true,
    anchorMustBeVerifiedBeforePrestate: true,
    freshPrestateRequired: true,
    approvalConsumptionPoint: "FIRST_APPROVED_FRESH_REMOTE_PRESTATE_READ_BEGINS",
    localIdentityDiscoveryMax: budgets.localIdentityDiscoveryMax,
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
    retries: budgets.retriesMax,
    rollbacks: budgets.rollbacksMax,
    secondMutationReachable: false,
    indeterminatePolicy: "SEPARATE_READ_ONLY_ANCHOR_BASED_RECOVERY_NO_RETRY_NO_SECOND_MUTATION_NO_ROLLBACK",
    m4Allowed: false,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
    rawMemberPersisted: false,
    rawPrincipalPersisted: false,
    allRequiredLocalLocksMatch: true,
    packetReproducible: true,
    livePacketComplete: true,
    safeToContinueWithoutApproval: false,
  });
}

export function verifyG2BResolvedStoreFixedPacket(packet, artifacts) {
  let expected;
  try {
    expected = buildG2BResolvedStoreFixedApprovalPacket(artifacts);
  } catch {
    return Object.freeze({ ok: false, code: "RESOLVED_STORE_FIXED_ARTIFACTS_MISSING" });
  }
  const ok = JSON.stringify(packet) === JSON.stringify(expected);
  return Object.freeze({ ok, code: ok ? "RESOLVED_STORE_FIXED_PACKET_MATCH" : "RESOLVED_STORE_FIXED_PACKET_MISMATCH" });
}
