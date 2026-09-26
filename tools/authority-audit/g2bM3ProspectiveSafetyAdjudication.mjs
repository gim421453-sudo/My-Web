import { sha256Canonical } from "./g2bM3CurrentLiveAttestation.mjs";

export const HISTORICAL_M3_OPERATION_GENERATION = "ac1c8343-5837-4a75-ad55-c93ac320f937";
export const V3_EXECUTION_EVIDENCE_SHA256 = "d248c5c1abaf20a1e401af0188929fd406dc62d0435ee58a1e01546b26b9a85c";
export const V3_RESULT_DOCUMENT_SHA256 = "5f94aaea9a40fd2bce45d695620db97c55eb2be392cd2b6267023b024a7de6d0";
export const LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256 = "0db8f9d3d6307cd519b0cc4c2fc0ef955287bd83009bf0b8cd9c4b6fc96fe74e";
export const LATEST_RECOVERY_RESULT_DOCUMENT_SHA256 = "8998bc5f40f4a42730c1c119639ed43a2e884425f9f1396ab85cd824b868750d";
export const LATEST_RECOVERY_ANCHOR_EVIDENCE_SHA256 = "b063fb36de707548505e6c0defb878af12158107df3489730f376357f39d24da";

const REQUIRED_KEYS = Object.freeze([
  "schema", "stage", "historicalM3OperationGeneration", "historicalRootCauseInvestigationClosed",
  "historicalM3ProviderProcessRootCause", "currentExactPermissionPresent", "v3ExecutionEvidenceSha256",
  "v3ResultDocumentSha256", "latestRecoveryExecutionEvidenceSha256", "latestRecoveryResultDocumentSha256",
  "latestRecoveryAnchorEvidenceSha256", "currentM3ProcessObservabilityAdequate", "currentTargetContractValid",
  "currentRoleContractValid", "currentMemberContractValid", "currentWindowsArgvContractValid",
  "currentM3AuthPreconditionFailClosed", "m3MutationFixtureMatrix", "mutationClassifierFailClosed",
  "readyToMutateBoundaryReached", "freshPrestateRequired", "historicalPrestateReusable",
  "historicalRecoveryAsNewPrestate", "oldGenerationRetryReachable", "oldPacketReplayReachable",
  "newOperationAutomaticRetryReachable", "newOperationSecondMutationReachable",
  "newOperationRollbackMutationReachable", "m3MutationAttemptsMax", "retries", "rollbackMutations",
  "secondMutation", "prospectiveNewM3SafetyAdjudication", "blocker", "newM3OperationReachable",
  "newM3OperationGeneration", "remoteOperations",
]);

export function buildG2BM3ProspectiveSafetyAdjudication() {
  return Object.freeze({
    schema: "myweb.g2b.m3.prospective-safety-adjudication.v1",
    stage: "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-PROSPECTIVE-SAFETY-ADJUDICATION",
    historicalM3OperationGeneration: HISTORICAL_M3_OPERATION_GENERATION,
    historicalRootCauseInvestigationClosed: true,
    historicalM3ProviderProcessRootCause: "HISTORICAL_PROCESS_METADATA_INSUFFICIENT",
    currentExactPermissionPresent: true,
    v3ExecutionEvidenceSha256: V3_EXECUTION_EVIDENCE_SHA256,
    v3ResultDocumentSha256: V3_RESULT_DOCUMENT_SHA256,
    latestRecoveryExecutionEvidenceSha256: LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256,
    latestRecoveryResultDocumentSha256: LATEST_RECOVERY_RESULT_DOCUMENT_SHA256,
    latestRecoveryAnchorEvidenceSha256: LATEST_RECOVERY_ANCHOR_EVIDENCE_SHA256,
    currentM3ProcessObservabilityAdequate: true,
    currentTargetContractValid: true,
    currentRoleContractValid: true,
    currentMemberContractValid: true,
    currentWindowsArgvContractValid: true,
    currentM3AuthPreconditionFailClosed: true,
    m3MutationFixtureMatrix: "PASS",
    mutationClassifierFailClosed: true,
    readyToMutateBoundaryReached: true,
    freshPrestateRequired: true,
    historicalPrestateReusable: false,
    historicalRecoveryAsNewPrestate: false,
    oldGenerationRetryReachable: false,
    oldPacketReplayReachable: false,
    newOperationAutomaticRetryReachable: false,
    newOperationSecondMutationReachable: false,
    newOperationRollbackMutationReachable: false,
    m3MutationAttemptsMax: 1,
    retries: 0,
    rollbackMutations: 0,
    secondMutation: 0,
    prospectiveNewM3SafetyAdjudication: "BLOCKED",
    blocker: "HISTORICAL_PROCESS_METADATA_INSUFFICIENT",
    newM3OperationReachable: false,
    newM3OperationGeneration: "NOT_CREATED",
    remoteOperations: 0,
  });
}

export function verifyG2BM3ProspectiveSafetyAdjudication(value) {
  const expected = buildG2BM3ProspectiveSafetyAdjudication();
  const exact = value && typeof value === "object"
    && Object.keys(value).length === REQUIRED_KEYS.length
    && REQUIRED_KEYS.every((key) => value[key] === expected[key]);
  return Object.freeze({
    ok: exact && sha256Canonical(value) === sha256Canonical(expected),
    code: exact ? "G2B_M3_PROSPECTIVE_SAFETY_ADJUDICATION_PASS" : "G2B_M3_PROSPECTIVE_SAFETY_ADJUDICATION_LOCK_MISMATCH",
  });
}
