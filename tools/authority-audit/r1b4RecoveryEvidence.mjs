import { createHash } from "node:crypto";

export const R1B4_RECOVERY_EVIDENCE_SCHEMA = "myweb.m3l2.r1b4.helper-v2-locked-recovery-evidence.v1";
const ALLOWED_STATES = ["ABSENT_PROVEN", "AMBIGUOUS"];
const SAFE_REASONS = [
  "COMPLETE_ETAG_ONLY_ZERO_BINDINGS",
  "COMPLETE_EXPLICIT_EMPTY_BINDINGS",
  "COMPLETE_NO_TARGET_ROLE",
];
const COUNTER_KEYS = [
  "cloudLoggingReads", "callerDiscoveryCalls", "projectIamReads", "testIamPermissionsCalls",
  "iamMutations", "m3Mutations", "m4Mutations", "accessTokenCalls", "firestoreCalls", "classWrites",
];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  return isPlainObject(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function validateR1B4RecoveryEvidence(payload) {
  if (!hasExactKeys(payload, [
    "schema", "r1b3hAttestationSha256", "r1b3hResultDocumentSha256", "r1c1CompositeSha256",
    "logicalProjectIdentity", "logicalWriterServiceAccountIdentity", "targetRole", "readSurface",
    "read", "parser", "helper", "recovery", "counters", "approval", "safety",
  ]) || payload.schema !== R1B4_RECOVERY_EVIDENCE_SCHEMA) return false;
  if (!["r1b3hAttestationSha256", "r1b3hResultDocumentSha256", "r1c1CompositeSha256"]
    .every((key) => isSha256(payload[key]))) return false;
  if (!["LOCKED_PROJECT_ID", "LOCKED_WRITER_SERVICE_ACCOUNT"].includes(payload.logicalProjectIdentity)
    || payload.logicalWriterServiceAccountIdentity !== "LOCKED_WRITER_SERVICE_ACCOUNT"
    || payload.targetRole !== "roles/iam.serviceAccountTokenCreator") return false;
  if (!hasExactKeys(payload.readSurface, ["identity", "argvLock", "externalCapabilityLock", "sdkPathContainment"])
    || payload.readSurface.identity !== "EXISTING_LOCKED_OP_C_SURFACE"
    || payload.readSurface.argvLock !== "MATCH"
    || payload.readSurface.externalCapabilityLock !== "MATCH"
    || payload.readSurface.sdkPathContainment !== "PASS") return false;
  if (!hasExactKeys(payload.read, ["count", "retryCount", "exitCode", "timedOut"])
    || !Number.isInteger(payload.read.count) || payload.read.count < 0
    || !Number.isInteger(payload.read.retryCount) || payload.read.retryCount < 0
    || !(Number.isInteger(payload.read.exitCode) || payload.read.exitCode === null)
    || typeof payload.read.timedOut !== "boolean") return false;
  if (!hasExactKeys(payload.parser, ["strictStatus"]) || typeof payload.parser.strictStatus !== "string") return false;
  if (!hasExactKeys(payload.helper, ["executionStatus", "result", "reasonId"])
    || payload.helper.executionStatus !== "PASS" || !ALLOWED_STATES.includes(payload.helper.result)
    || !SAFE_REASONS.includes(payload.helper.reasonId)) return false;
  if (!hasExactKeys(payload.recovery, ["identityIndependentState", "currentM3EffectiveState"])
    || !ALLOWED_STATES.includes(payload.recovery.identityIndependentState)
    || payload.recovery.currentM3EffectiveState !== payload.recovery.identityIndependentState) return false;
  if (!hasExactKeys(payload.counters, COUNTER_KEYS)
    || COUNTER_KEYS.some((key) => !Number.isInteger(payload.counters[key]) || payload.counters[key] < 0)) return false;
  if (!hasExactKeys(payload.approval, ["consumed", "reusable"])
    || typeof payload.approval.consumed !== "boolean" || typeof payload.approval.reusable !== "boolean") return false;
  if (!hasExactKeys(payload.safety, [
    "canReturnPresentProven", "memberValueInspectionUsed", "fingerprintFallbackUsed",
    "currentM3OutcomeClassifierSafety", "m3l2ApprovalReusable", "m3l2MutationBudget",
    "m3l2RetryAllowed", "m4Readiness", "m4Approval", "liveBudgetViolation",
  ]) || typeof payload.safety.canReturnPresentProven !== "boolean"
    || typeof payload.safety.memberValueInspectionUsed !== "boolean"
    || typeof payload.safety.fingerprintFallbackUsed !== "boolean"
    || typeof payload.safety.currentM3OutcomeClassifierSafety !== "string"
    || typeof payload.safety.m3l2ApprovalReusable !== "boolean"
    || typeof payload.safety.m3l2MutationBudget !== "string"
    || typeof payload.safety.m3l2RetryAllowed !== "boolean"
    || typeof payload.safety.m4Readiness !== "string"
    || typeof payload.safety.m4Approval !== "string"
    || typeof payload.safety.liveBudgetViolation !== "boolean") return false;
  return true;
}

function sortValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isPlainObject(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseR1B4RecoveryEvidence(text) {
  if (typeof text !== "string") return null;
  try {
    const payload = JSON.parse(text);
    return validateR1B4RecoveryEvidence(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function canonicalizeR1B4RecoveryEvidence(payload) {
  if (!validateR1B4RecoveryEvidence(payload)) throw new Error("invalid-r1b4-evidence");
  return JSON.stringify(sortValue(payload));
}

export function computeR1B4RecoveryEvidenceSha256(payload) {
  return createHash("sha256").update(canonicalizeR1B4RecoveryEvidence(payload), "utf8").digest("hex");
}

export function verifyR1B4RecoveryEvidence(payload) {
  if (!validateR1B4RecoveryEvidence(payload)) return Object.freeze({ ok: false, code: "INVALID_EVIDENCE" });
  const exact = payload.read.count === 1 && payload.read.retryCount === 0 && payload.read.exitCode === 0
    && payload.read.timedOut === false && payload.parser.strictStatus === "PASS"
    && payload.helper.executionStatus === "PASS" && payload.recovery.identityIndependentState === "ABSENT_PROVEN"
    && payload.recovery.currentM3EffectiveState === "ABSENT_PROVEN"
    && COUNTER_KEYS.every((key) => payload.counters[key] === 0)
    && payload.approval.consumed === true && payload.approval.reusable === false
    && payload.safety.canReturnPresentProven === false
    && payload.safety.memberValueInspectionUsed === false
    && payload.safety.fingerprintFallbackUsed === false
    && payload.safety.currentM3OutcomeClassifierSafety === "DEFECT_PROVEN"
    && payload.safety.m3l2ApprovalReusable === false
    && payload.safety.m3l2MutationBudget === "EXHAUSTED"
    && payload.safety.m3l2RetryAllowed === false
    && payload.safety.m4Readiness === "BLOCKED_M3_REQUIRED_BINDING_ABSENT"
    && payload.safety.m4Approval === "NOT_GRANTED"
    && payload.safety.liveBudgetViolation === false;
  return Object.freeze({ ok: exact, code: exact ? "PASS" : "SEMANTIC_MISMATCH", sha256: computeR1B4RecoveryEvidenceSha256(payload) });
}

export const R1B4_RECOVERY_EVIDENCE_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  filesystemWrite: false,
  rawIamMaterialPersisted: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
