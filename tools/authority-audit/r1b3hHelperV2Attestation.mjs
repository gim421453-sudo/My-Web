import { createHash } from "node:crypto";

export const R1B3H_HELPER_V2_ATTESTATION_SCHEMA = "myweb.m3l2.r1b3h.helper-v2-attestation.v1";
const TARGET_ROLE = "roles/iam.serviceAccountTokenCreator";
const RESULT_DOMAIN = Object.freeze(["ABSENT_PROVEN", "AMBIGUOUS"]);
const ABSENT_REASON_ALLOWLIST = Object.freeze([
  "COMPLETE_ETAG_ONLY_ZERO_BINDINGS",
  "COMPLETE_EXPLICIT_EMPTY_BINDINGS",
  "COMPLETE_NO_TARGET_ROLE",
]);
const BUDGET_KEYS = Object.freeze([
  "writerSaIamPolicyReadsMax", "retriesMax", "cloudLoggingReadsMax", "activeCallerDiscoveryMax",
  "projectIamReadsMax", "testIamPermissionsMax", "iamMutationsMax", "m3MutationsMax",
  "m4MutationsMax", "accessTokenCallsMax", "firestoreCallsMax",
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

function validateBudget(value) {
  return hasExactKeys(value, BUDGET_KEYS)
    && BUDGET_KEYS.every((key) => Number.isInteger(value[key]) && value[key] >= 0);
}

function validatePrivacy(value) {
  const keys = [
    "rawCallerPersisted", "rawIamPolicyPersisted", "iamMemberIdentitiesPersisted", "rawStdoutPersisted",
    "rawStderrPersisted", "etagValuePersisted", "conditionExpressionPersisted", "tokenPersisted",
  ];
  return hasExactKeys(value, keys) && keys.every((key) => value[key] === false);
}

function validatePayload(payload) {
  if (!hasExactKeys(payload, [
    "schema", "r1c1CompositeSha256", "r1b2R2ResultDocumentSha256", "r1b3dSourceDocumentSha256",
    "r1b3dVerdict", "helperV1Sha256", "helperV2", "helperV2Test", "serviceAccountPolicySemantics",
    "helperV2Semantics", "futureR1B4Surface", "futureR1B4Budget", "privacy", "currentSafetyState",
  ]) || payload.schema !== R1B3H_HELPER_V2_ATTESTATION_SCHEMA) return false;
  if (!["r1c1CompositeSha256", "r1b2R2ResultDocumentSha256", "r1b3dSourceDocumentSha256", "helperV1Sha256"]
    .every((key) => isSha256(payload[key]))) return false;
  if (typeof payload.r1b3dVerdict !== "string") return false;
  if (!hasExactKeys(payload.helperV2, ["path", "sha256", "purity"])
    || !isSafeRelativePath(payload.helperV2.path) || !isSha256(payload.helperV2.sha256)
    || payload.helperV2.purity !== "PASS") return false;
  if (!hasExactKeys(payload.helperV2Test, ["path", "sha256"])
    || !isSafeRelativePath(payload.helperV2Test.path) || !isSha256(payload.helperV2Test.sha256)) return false;

  const service = payload.serviceAccountPolicySemantics;
  if (!hasExactKeys(service, [
    "opCSurface", "outputCompleteness", "localOutputCanDropNonemptyBindings", "etagOnlySemantic",
    "etagStructuralPredicate", "missingVersionEtageOnlySemantics", "version1ExplicitEmptyBindings",
    "version3ExplicitEmptyBindings", "conditionalRoleRepresentationSafety",
  ]) || Object.values(service).some((value) => typeof value !== "string")) return false;
  const semantics = payload.helperV2Semantics;
  if (!hasExactKeys(semantics, [
    "resultDomain", "canReturnPresentProven", "failClosedDefault", "emptyObjectResult", "etagOnlyResult",
    "bindingsMissingAndEtagMissingResult", "targetRole", "targetRoleMatchMode", "memberInspectionRequired",
    "fingerprintMatchingUsed", "absentReasonAllowlist",
  ]) || !Array.isArray(semantics.resultDomain) || semantics.resultDomain.some((value) => typeof value !== "string")
    || semantics.resultDomain.includes("PRESENT_PROVEN")
    || semantics.canReturnPresentProven !== false || typeof semantics.failClosedDefault !== "string"
    || typeof semantics.emptyObjectResult !== "string" || typeof semantics.etagOnlyResult !== "string"
    || typeof semantics.bindingsMissingAndEtagMissingResult !== "string" || typeof semantics.targetRole !== "string"
    || typeof semantics.targetRoleMatchMode !== "string" || semantics.memberInspectionRequired !== false
    || semantics.fingerprintMatchingUsed !== false || !Array.isArray(semantics.absentReasonAllowlist)
    || semantics.absentReasonAllowlist.some((value) => typeof value !== "string")) return false;
  if (typeof payload.futureR1B4Surface !== "string") return false;
  if (!validateBudget(payload.futureR1B4Budget) || !validatePrivacy(payload.privacy)) return false;
  if (!hasExactKeys(payload.currentSafetyState, [
    "currentM3EffectiveState", "currentM3OutcomeClassifierSafety", "m3l2ApprovalReusable",
    "m3l2MutationBudget", "m3l2RetryAllowed", "m4Readiness", "m4Approval",
  ]) || payload.currentSafetyState.currentM3EffectiveState !== "INDETERMINATE"
    || payload.currentSafetyState.currentM3OutcomeClassifierSafety !== "DEFECT_PROVEN"
    || payload.currentSafetyState.m3l2ApprovalReusable !== false
    || payload.currentSafetyState.m3l2MutationBudget !== "EXHAUSTED"
    || payload.currentSafetyState.m3l2RetryAllowed !== false
    || payload.currentSafetyState.m4Readiness !== "BLOCKED"
    || payload.currentSafetyState.m4Approval !== "NOT_GRANTED") return false;
  return true;
}

function sortValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isPlainObject(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseR1B3HHelperV2Attestation(text) {
  if (typeof text !== "string") return null;
  try {
    const payload = JSON.parse(text);
    return validatePayload(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function canonicalizeR1B3HHelperV2Attestation(payload) {
  if (!validatePayload(payload)) throw new Error("invalid-r1b3h-payload");
  return JSON.stringify(sortValue(payload));
}

export function computeR1B3HHelperV2AttestationSha256(payload) {
  return createHash("sha256")
    .update(canonicalizeR1B3HHelperV2Attestation(payload), "utf8")
    .digest("hex");
}

export function verifyR1B3HHelperV2Attestation(payload) {
  if (!validatePayload(payload)) return Object.freeze({ ok: false, code: "INVALID_PAYLOAD" });
  const service = payload.serviceAccountPolicySemantics;
  const semantics = payload.helperV2Semantics;
  const semanticMatch = payload.r1b3dVerdict === "R1B3D_SEMANTICS_RESOLVED"
    && service.opCSurface === "EXACT_MATCH"
    && service.outputCompleteness === "STRUCTURED_JSON_NO_FIELD_SUPPRESSION"
    && service.localOutputCanDropNonemptyBindings === "PROVEN_NO"
    && service.etagOnlySemantic === "ZERO_ROLE_BINDINGS"
    && service.etagStructuralPredicate === "own etag property; string; non-empty"
    && service.missingVersionEtageOnlySemantics === "SAFE"
    && service.version1ExplicitEmptyBindings === "ABSENT_SAFE"
    && service.version3ExplicitEmptyBindings === "ABSENT_SAFE"
    && service.conditionalRoleRepresentationSafety === "VERSION3_OBJECT_CONDITION_ONLY"
    && JSON.stringify(semantics.resultDomain) === JSON.stringify(RESULT_DOMAIN)
    && semantics.canReturnPresentProven === false
    && semantics.failClosedDefault === "AMBIGUOUS"
    && semantics.emptyObjectResult === "AMBIGUOUS"
    && semantics.etagOnlyResult === "ABSENT_PROVEN"
    && semantics.bindingsMissingAndEtagMissingResult === "AMBIGUOUS"
    && semantics.targetRole === TARGET_ROLE
    && semantics.targetRoleMatchMode === "EXACT_STRING"
    && semantics.memberInspectionRequired === false
    && semantics.fingerprintMatchingUsed === false
    && JSON.stringify(semantics.absentReasonAllowlist) === JSON.stringify(ABSENT_REASON_ALLOWLIST)
    && payload.futureR1B4Surface === "EXISTING_LOCKED_OP_C_SURFACE";
  return Object.freeze({
    ok: semanticMatch,
    code: semanticMatch ? "PASS" : "SEMANTIC_MISMATCH",
    sha256: computeR1B3HHelperV2AttestationSha256(payload),
  });
}

export const R1B3H_HELPER_V2_ATTESTATION_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  filesystemWrite: false,
  credentialAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
