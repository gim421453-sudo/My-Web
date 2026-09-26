import { createHash } from "node:crypto";

export const M3L3_CORRECTED_LIVE_EVIDENCE_SCHEMA = "myweb.m3l3.corrected-project-iam-budget-live-execution.v2";
export const M3L3_CORRECTED_LIVE_BLOCKED_VERDICT = "P1_5_C2H2E3D_W1C_M3L3_BLOCKED";

const EXPECTED = Object.freeze({
  composite: "1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195",
  compositeResult: "f0421acdaf1f9649b7314613a381c8c82072f84d70365c2e8c51b66876d16ac7",
  runtime: "82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9",
  implementation: "dd488891964eeac9427557b95c5cf46a42bb2f5969bbc6bcba6f55c176c79adc",
  reconciliation: "eba97da43c4199ec2fcce04badae447e7a9a92f598d52a2e09dca969ab45a473",
});

const COUNTER_MAXIMA = Object.freeze({
  localIdentityDiscovery: 1,
  remoteIamPrestateReads: 5,
  iamMutationAttempts: 1,
  remoteIamPoststateReads: 2,
  projectIamReads: 2,
});
const APPROVAL_BUDGET = Object.freeze({
  localIdentityDiscoveryMax: 1,
  remoteIamPrestateReadsMax: 5,
  iamMutationAttemptsMax: 1,
  remoteIamPoststateReadsMax: 2,
  projectIamReadsMax: 2,
  retriesMax: 0,
  cloudLoggingReadsMax: 0,
  testIamPermissionsMax: 0,
  accessTokenCallsMax: 0,
  firestoreCallsMax: 0,
  m4MutationsMax: 0,
  serviceAccountKeyOperationsMax: 0,
});

const FORBIDDEN_KEY = /^(timestamp|createdAt|updatedAt|principal|member|email|uid|token|credential|absolutePath|configRoot|rawArgv|rawEnvironment|rawPolicy|rawOutput|stdout|stderr|etag|conditionExpression)$/i;
const SENSITIVE_SCALAR = /(?:AIza[0-9A-Za-z_-]{20,}|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z]:[\\/](?:Users|Documents)[\\/]|(?:user|serviceAccount):[^\s]+@[^\s]+|--account=[^<\s][^\s]*)/i;

const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => plain(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));

function noSensitiveMaterial(value) {
  if (Array.isArray(value)) return value.every(noSensitiveMaterial);
  if (typeof value === "string") return !SENSITIVE_SCALAR.test(value);
  if (!plain(value)) return true;
  return Object.entries(value).every(([key, child]) => !FORBIDDEN_KEY.test(key) && noSensitiveMaterial(child));
}

function validUnknownCounter(value, max) {
  return exactKeys(value, ["known", "max", "min"])
    && value.known === false
    && value.min === 0
    && value.max === max;
}

function allZero(value) {
  return plain(value) && Object.values(value).every((count) => count === 0);
}

function valid(payload) {
  if (!plain(payload) || payload.schema !== M3L3_CORRECTED_LIVE_EVIDENCE_SCHEMA || !noSensitiveMaterial(payload)) return false;
  if (payload.g4r3r2CompositeSha256 !== EXPECTED.composite
    || payload.g4r3r2ResultDocumentSha256 !== EXPECTED.compositeResult
    || payload.g4r3r1AttestationSha256 !== EXPECTED.runtime
    || payload.g4r3hR2AttestationSha256 !== EXPECTED.implementation
    || payload.b1ReconciliationAttestationSha256 !== EXPECTED.reconciliation) return false;

  if (!exactKeys(payload.previousStoppedApproval, ["consumed", "reusable"])
    || payload.previousStoppedApproval.consumed !== false
    || payload.previousStoppedApproval.reusable !== false) return false;

  if (!exactKeys(payload.newApprovalBudget, [
    "accessTokenCallsMax", "cloudLoggingReadsMax", "firestoreCallsMax", "iamMutationAttemptsMax",
    "localIdentityDiscoveryMax", "m4MutationsMax", "projectIamReadsMax", "remoteIamPoststateReadsMax",
    "remoteIamPrestateReadsMax", "retriesMax", "serviceAccountKeyOperationsMax", "testIamPermissionsMax",
  ])) return false;
  if (Object.entries(APPROVAL_BUDGET).some(([key, value]) => payload.newApprovalBudget[key] !== value)) return false;

  if (JSON.stringify(payload.allowedProjectIamReadNodes) !== JSON.stringify(["OP_D_PRE", "OP_D_POST"])) return false;
  if (JSON.stringify(payload.crossBudgetClassification) !== JSON.stringify({
    OP_D_PRE: ["remoteIamPrestateRead", "projectIamRead"],
    OP_D_POST: ["remoteIamPoststateRead", "projectIamRead"],
  })) return false;

  if (!exactKeys(payload.actualUsage, [
    "evidenceAvailability", "iamMutationAttempts", "localIdentityDiscovery", "projectIamReadNodes",
    "projectIamReads", "remoteIamPoststateReads", "remoteIamPrestateReads",
  ])) return false;
  if (payload.actualUsage.evidenceAvailability !== "UNRECOVERABLE_AFTER_RUNTIME_RETURN_BEFORE_SAFE_OUTPUT") return false;
  for (const [key, max] of Object.entries(COUNTER_MAXIMA)) {
    if (!validUnknownCounter(payload.actualUsage[key], max)) return false;
  }
  if (!exactKeys(payload.actualUsage.projectIamReadNodes, ["OP_D_POST", "OP_D_PRE"])) return false;
  for (const node of ["OP_D_PRE", "OP_D_POST"]) {
    const usage = payload.actualUsage.projectIamReadNodes[node];
    if (!exactKeys(usage, ["known", "maxExecutions", "minExecutions", "physicalCallsPerExecution"])
      || usage.known !== false || usage.minExecutions !== 0 || usage.maxExecutions !== 1
      || usage.physicalCallsPerExecution !== 1) return false;
  }

  if (!exactKeys(payload.approvalConsumption, ["consumed", "reason", "reusable", "status"])
    || payload.approvalConsumption.consumed !== true
    || payload.approvalConsumption.reusable !== false
    || payload.approvalConsumption.status !== "CONSUMED_NON_REUSABLE"
    || payload.approvalConsumption.reason !== "FAIL_CLOSED_AFTER_APPROVED_RUNTIME_SESSION_STARTED") return false;

  if (!exactKeys(payload.executionFailure, ["category", "code", "remoteRecoveryPerformed", "runtimeAwaitCompleted", "safeResultEmitted"])
    || payload.executionFailure.category !== "LOCAL_RESULT_SERIALIZATION_FAILURE"
    || payload.executionFailure.code !== "SAFE_OUTPUT_FIELD_NAME_REFERENCE_ERROR"
    || payload.executionFailure.runtimeAwaitCompleted !== true
    || payload.executionFailure.safeResultEmitted !== false
    || payload.executionFailure.remoteRecoveryPerformed !== false) return false;

  if (payload.prestateResult !== "UNKNOWN_NOT_RECOVERED"
    || payload.mutationOutcome !== "UNKNOWN_NOT_RECOVERED"
    || payload.poststateResult !== "UNKNOWN_NOT_RECOVERED"
    || payload.finalM3State !== "NOT_ESTABLISHED_RESULT_UNAVAILABLE") return false;

  if (!exactKeys(payload.safetyClaims, [
    "m4MutationOccurred", "poststateAfterIndeterminateReachable", "prestatePresentAutoAdoptReachable",
    "projectIamReadOutsideAllowlistReachable", "secondMutationReachable",
  ]) || Object.values(payload.safetyClaims).some((value) => value !== false)) return false;

  if (!exactKeys(payload.forbiddenOperationCounts, [
    "accessTokenCalls", "cloudLoggingReads", "firestoreCalls", "m4Mutations", "projectIamMutations",
    "retries", "rollbacks", "serviceAccountKeyOperations", "testIamPermissionsCalls",
  ]) || !allZero(payload.forbiddenOperationCounts)) return false;

  if (!exactKeys(payload.privacy, [
    "configRootPersisted", "credentialPersisted", "exactIdentityPersisted", "rawIamPolicyPersisted",
    "rawProcessOutputPersisted", "tokenPersisted",
  ]) || Object.values(payload.privacy).some((value) => value !== false)) return false;

  if (!exactKeys(payload.tests, ["gcloudVersionHelpStatus", "safeAuthorityFilesPassed", "safeAuthorityFilesRun"])
    || payload.tests.safeAuthorityFilesRun !== 31
    || payload.tests.safeAuthorityFilesPassed !== 31
    || payload.tests.gcloudVersionHelpStatus !== "NOT_RUN_BY_ZERO_GCLOUD_POLICY") return false;

  return payload.finalVerdict === M3L3_CORRECTED_LIVE_BLOCKED_VERDICT;
}

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseM3L3CorrectedLiveEvidence(text) {
  if (typeof text !== "string") return null;
  try {
    const payload = JSON.parse(text);
    return valid(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function canonicalizeM3L3CorrectedLiveEvidence(payload) {
  if (!valid(payload)) throw new Error("invalid-m3l3-corrected-live-evidence");
  return JSON.stringify(sortValue(payload));
}

export function computeM3L3CorrectedLiveEvidenceSha256(payload) {
  return createHash("sha256").update(canonicalizeM3L3CorrectedLiveEvidence(payload), "utf8").digest("hex");
}

export function verifyM3L3CorrectedLiveEvidence(payload) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_CORRECTED_LIVE_EVIDENCE" });
  return Object.freeze({
    ok: true,
    code: "LIVE_RESULT_UNAVAILABLE_FAIL_CLOSED",
    sha256: computeM3L3CorrectedLiveEvidenceSha256(payload),
  });
}

export const M3L3_CORRECTED_LIVE_EVIDENCE_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
