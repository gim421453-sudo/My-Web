import { createHash } from "node:crypto";

export const R1C1_RECOVERY_COMPOSITE_SCHEMA = "myweb.m3l2.r1c1.recovery-composite.v1";

const TARGET_ROLE = "roles/iam.serviceAccountTokenCreator";
const RESULT_DOMAIN = Object.freeze(["ABSENT_PROVEN", "AMBIGUOUS"]);
const BUDGET_KEYS = Object.freeze([
  "writerSaIamPolicyReadsMax", "cloudLoggingReadsMax", "activeCallerDiscoveryMax",
  "projectIamReadsMax", "testIamPermissionsMax", "iamMutationsMax", "m3MutationsMax",
  "m4MutationsMax", "accessTokenCallsMax", "firestoreCallsMax", "retriesMax",
]);

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

function isSafeRelativePath(value) {
  return typeof value === "string"
    && /^(docs|tools)\/[A-Za-z0-9._/-]+$/.test(value)
    && !value.includes("..")
    && !/^[A-Za-z]:|^\/|^\\/.test(value);
}

function isSafeLabel(value) {
  return typeof value === "string" && /^[A-Z0-9_-]+$/.test(value);
}

function validateLocks(value, root) {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((entry) => hasExactKeys(entry, ["path", "sha256", "role"])
    && isSafeRelativePath(entry.path)
    && isSha256(entry.sha256)
    && isSafeLabel(entry.role)
    && entry.path.startsWith(root));
}

function validateBudget(value) {
  if (!hasExactKeys(value, BUDGET_KEYS)) return false;
  return BUDGET_KEYS.every((key) => Number.isInteger(value[key]) && value[key] >= 0);
}

function validatePayload(payload) {
  if (!hasExactKeys(payload, [
    "schema", "legacyR1B1", "sourceDocumentLocks", "runtimeLocks", "helper", "helperTest",
    "recoverySemantics", "logicalProof", "futureReadSurface", "futureLiveBudget", "privacy",
    "currentSafetyState",
  ])) return false;
  if (payload.schema !== R1C1_RECOVERY_COMPOSITE_SCHEMA) return false;
  if (!hasExactKeys(payload.legacyR1B1, ["hash", "status", "usedAsCurrentAuthority"])
    || !isSha256(payload.legacyR1B1.hash)
    || payload.legacyR1B1.status !== "HISTORICAL_UNREPRODUCIBLE_REFERENCE"
    || payload.legacyR1B1.usedAsCurrentAuthority !== false) return false;
  if (!validateLocks(payload.sourceDocumentLocks, "docs/") || !validateLocks(payload.runtimeLocks, "tools/")) {
    return false;
  }
  if (!hasExactKeys(payload.helper, ["path", "sha256", "purity"])
    || !isSafeRelativePath(payload.helper.path) || !isSha256(payload.helper.sha256)
    || payload.helper.purity !== "PASS") return false;
  if (!hasExactKeys(payload.helperTest, ["path", "sha256"])
    || !isSafeRelativePath(payload.helperTest.path) || !isSha256(payload.helperTest.sha256)) return false;

  const semantics = payload.recoverySemantics;
  if (!hasExactKeys(semantics, [
    "resultDomain", "failClosedDefault", "emptyObjectResult", "missingBindingsResult",
    "completeEmptyBindingsResult", "targetRole", "targetRoleMatchMode", "targetRolePresentResult",
    "memberInspectionRequired", "fingerprintMatchingUsed", "malformedDefaultsToAbsent",
    "collapsedProjectionCanProveAbsence",
  ]) || !Array.isArray(semantics.resultDomain)
    || semantics.resultDomain.length !== 2
    || semantics.resultDomain.some((value) => typeof value !== "string")) return false;

  if (!hasExactKeys(payload.logicalProof, [
    "zeroTargetRoleBindingsImpliesAbsent", "nonzeroTargetRoleBindingsImpliesPresent",
  ]) || typeof payload.logicalProof.zeroTargetRoleBindingsImpliesAbsent !== "boolean"
    || typeof payload.logicalProof.nonzeroTargetRoleBindingsImpliesPresent !== "boolean") return false;
  if (!hasExactKeys(payload.futureReadSurface, [
    "identity", "argvLockStatus", "externalCapabilityLockStatus", "sdkPathContainment",
  ]) || Object.values(payload.futureReadSurface).some((value) => typeof value !== "string")) return false;
  if (!validateBudget(payload.futureLiveBudget)) return false;
  if (!hasExactKeys(payload.privacy, [
    "rawCallerPersisted", "rawIamPolicyPersisted", "iamMemberIdentitiesPersisted", "rawStdoutPersisted",
    "rawStderrPersisted", "etagValuePersisted", "conditionExpressionPersisted", "tokenPersisted",
  ]) || Object.values(payload.privacy).some((value) => value !== false)) return false;
  if (!hasExactKeys(payload.currentSafetyState, [
    "currentM3EffectiveState", "currentM3OutcomeClassifierSafety", "m3l2ApprovalReusable",
    "m3l2MutationBudget", "m3l2RetryAllowed", "m4Readiness", "m4Approval",
  ]) || typeof payload.currentSafetyState.currentM3EffectiveState !== "string"
    || typeof payload.currentSafetyState.currentM3OutcomeClassifierSafety !== "string"
    || typeof payload.currentSafetyState.m3l2MutationBudget !== "string"
    || typeof payload.currentSafetyState.m4Readiness !== "string"
    || typeof payload.currentSafetyState.m4Approval !== "string"
    || payload.currentSafetyState.m3l2ApprovalReusable !== false
    || payload.currentSafetyState.m3l2RetryAllowed !== false) return false;
  return true;
}

function sortValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isPlainObject(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseR1C1RecoveryComposite(text) {
  if (typeof text !== "string") return null;
  try {
    const payload = JSON.parse(text);
    return validatePayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function canonicalizeR1C1RecoveryComposite(payload) {
  if (!validatePayload(payload)) throw new Error("invalid-r1c1-payload");
  return JSON.stringify(sortValue(payload));
}

export function computeR1C1RecoveryCompositeSha256(payload) {
  return createHash("sha256").update(canonicalizeR1C1RecoveryComposite(payload), "utf8").digest("hex");
}

export function verifyR1C1RecoveryComposite(payload) {
  if (!validatePayload(payload)) return Object.freeze({ ok: false, code: "INVALID_PAYLOAD" });
  const semantics = payload.recoverySemantics;
  const semanticsMatch = JSON.stringify(semantics.resultDomain) === JSON.stringify(RESULT_DOMAIN)
    && semantics.failClosedDefault === "AMBIGUOUS"
    && semantics.emptyObjectResult === "AMBIGUOUS"
    && semantics.missingBindingsResult === "AMBIGUOUS"
    && semantics.completeEmptyBindingsResult === "ABSENT_PROVEN"
    && semantics.targetRole === TARGET_ROLE
    && semantics.targetRoleMatchMode === "EXACT_STRING"
    && semantics.targetRolePresentResult === "AMBIGUOUS"
    && semantics.memberInspectionRequired === false
    && semantics.fingerprintMatchingUsed === false
    && semantics.malformedDefaultsToAbsent === false
    && semantics.collapsedProjectionCanProveAbsence === false;
  const proofMatch = payload.logicalProof.zeroTargetRoleBindingsImpliesAbsent === true
    && payload.logicalProof.nonzeroTargetRoleBindingsImpliesPresent === false;
  const surfaceMatch = payload.futureReadSurface.identity === "EXISTING_LOCKED_OP_C_SURFACE"
    && payload.futureReadSurface.argvLockStatus === "MATCH"
    && payload.futureReadSurface.externalCapabilityLockStatus === "MATCH"
    && payload.futureReadSurface.sdkPathContainment === "PASS";
  return Object.freeze({
    ok: semanticsMatch && proofMatch && surfaceMatch,
    code: semanticsMatch && proofMatch && surfaceMatch ? "PASS" : "SEMANTIC_MISMATCH",
    sha256: computeR1C1RecoveryCompositeSha256(payload),
  });
}

export const R1C1_RECOVERY_COMPOSITE_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  filesystemWrite: false,
  credentialAccess: false,
  legacyHashTargeting: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
