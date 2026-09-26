import { sha256Canonical } from "./g2bM3CurrentLiveAttestation.mjs";
import { M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT } from "./m3RuntimeCommandGraph.mjs";
import { buildG2BM3RemoteCapabilityAccountingRepair } from "./g2bM3RemoteCapabilityAccountingRepair.mjs";
import {
  HISTORICAL_M3_OPERATION_GENERATION,
  LATEST_RECOVERY_ANCHOR_EVIDENCE_SHA256,
  LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256,
  LATEST_RECOVERY_RESULT_DOCUMENT_SHA256,
  V3_EXECUTION_EVIDENCE_SHA256,
  V3_RESULT_DOCUMENT_SHA256,
} from "./g2bM3ProspectiveSafetyAdjudication.mjs";

export const G2B_M3_PROSPECTIVE_REVIEW_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-PROSPECTIVE-SAFETY-REVIEW";

const REQUIRED_KEYS = Object.freeze([
  "schema", "stage", "supersedesEvidenceSha256", "historicalM3OperationGeneration",
  "historicalRootCauseInvestigationClosed", "historicalM3ProviderProcessRootCause",
  "historicalUnknownPreventsNewOperation", "currentBlockingSafetyProperty",
  "v3ExecutionEvidenceSha256", "v3ResultDocumentSha256", "latestRecoveryExecutionEvidenceSha256",
  "latestRecoveryResultDocumentSha256", "latestRecoveryAnchorEvidenceSha256",
  "newOperationIndependentOfHistoricalProcessResult", "freshPrestatePreventsDuplicateBinding",
  "freshPrestateFailClosed", "currentProcessStartObservable", "currentProcessExitObservable",
  "currentExitCodeCategoryObservable", "currentTimeoutObservable", "currentSignalObservable",
  "currentFailureStageObservable", "currentClassifierResultObservable",
  "futureIndeterminateStateFailsClosed", "newOperationCanBindCurrentAuthorizationState",
  "currentM3AuthPreconditionFailClosed", "readyToMutateBoundaryReached", "safetyProperties",
  "prospectiveNewM3SafetyAdjudicationReview", "newM3OperationReachable", "remoteOperations",
]);

const SAFETY_PROPERTIES = Object.freeze({
  S1_EXACT_TARGET: "PASS", S2_EXACT_ROLE: "PASS", S3_EXACT_MEMBER: "PASS", S4_CURRENT_PERMISSION: "PASS",
  S5_FRESH_PRESTATE: "PASS", S6_MUTATION_MAX1: "PASS", S7_RETRY0: "PASS", S8_SECOND_MUTATION0: "PASS",
  S9_ROLLBACK_MUTATION0: "PASS", S10_PROCESS_START_OBSERVABLE: "PASS", S11_PROCESS_EXIT_OBSERVABLE: "PASS",
  S12_TIMEOUT_OBSERVABLE: "PASS", S13_SIGNAL_OBSERVABLE: "PASS", S14_FAIL_CLOSED_CLASSIFIER: "PASS",
  S15_RECOVERY_BOUNDARY: "PASS", S16_M4_BLOCKED: "PASS", S17_FIRESTORE_BLOCKED: "PASS",
  S18_OLD_GENERATION_NONREUSABLE: "PASS", S19_OLD_PACKET_NONREUSABLE: "PASS", S20_CURRENT_SOURCE_LOCKABLE: "PASS",
  S21_REMOTE_CAPABILITY_ACCOUNTING: "PASS",
});

export function buildG2BM3ProspectiveSafetyReview() {
  const accountingRepair = buildG2BM3RemoteCapabilityAccountingRepair();
  return Object.freeze({
    schema: "myweb.g2b.m3.prospective-safety-review.v1",
    stage: G2B_M3_PROSPECTIVE_REVIEW_STAGE,
    supersedesEvidenceSha256: "26f3253be1d7ad2d84c9be0f219700562b858643ecf2f4d12bfd3c7d78d82334",
    historicalM3OperationGeneration: HISTORICAL_M3_OPERATION_GENERATION,
    historicalRootCauseInvestigationClosed: true,
    historicalM3ProviderProcessRootCause: "HISTORICAL_PROCESS_METADATA_INSUFFICIENT",
    historicalUnknownPreventsNewOperation: false,
    currentBlockingSafetyProperty: "M3_POST_ACCOUNTING_REATTESTATION_REQUIRED",
    v3ExecutionEvidenceSha256: V3_EXECUTION_EVIDENCE_SHA256,
    v3ResultDocumentSha256: V3_RESULT_DOCUMENT_SHA256,
    latestRecoveryExecutionEvidenceSha256: LATEST_RECOVERY_EXECUTION_EVIDENCE_SHA256,
    latestRecoveryResultDocumentSha256: LATEST_RECOVERY_RESULT_DOCUMENT_SHA256,
    latestRecoveryAnchorEvidenceSha256: LATEST_RECOVERY_ANCHOR_EVIDENCE_SHA256,
    newOperationIndependentOfHistoricalProcessResult: true,
    freshPrestatePreventsDuplicateBinding: true,
    freshPrestateFailClosed: true,
    currentProcessStartObservable: true,
    currentProcessExitObservable: true,
    currentExitCodeCategoryObservable: true,
    currentTimeoutObservable: true,
    currentSignalObservable: true,
    currentFailureStageObservable: true,
    currentClassifierResultObservable: true,
    futureIndeterminateStateFailsClosed: true,
    newOperationCanBindCurrentAuthorizationState: true,
    currentM3AuthPreconditionFailClosed: true,
    readyToMutateBoundaryReached: accountingRepair.prospectiveM3Reachable === true,
    safetyProperties: SAFETY_PROPERTIES,
    prospectiveNewM3SafetyAdjudicationReview: "BLOCKED",
    newM3OperationReachable: M3_REMOTE_CAPABILITY_ACCOUNTING_CONTRACT.prospectiveM3Reachable,
    remoteOperations: 0,
  });
}

export function verifyG2BM3ProspectiveSafetyReview(value) {
  const expected = buildG2BM3ProspectiveSafetyReview();
  const exact = value && typeof value === "object" && Object.keys(value).length === REQUIRED_KEYS.length
    && REQUIRED_KEYS.every((key) => key === "safetyProperties"
      ? sha256Canonical(value[key]) === sha256Canonical(expected[key])
      : value[key] === expected[key]);
  return Object.freeze({
    ok: exact && sha256Canonical(value) === sha256Canonical(expected),
    code: exact ? "G2B_M3_PROSPECTIVE_SAFETY_REVIEW_PASS" : "G2B_M3_PROSPECTIVE_SAFETY_REVIEW_LOCK_MISMATCH",
  });
}
