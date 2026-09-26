import { createHash } from "node:crypto";

export const G4_ATTESTATION_SCHEMA = "myweb.m3l2.g4.fail-closed-outcome-classifier.v1";

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

function isSafePath(value) {
  return typeof value === "string" && /^(tools|docs)\/[A-Za-z0-9._/-]+$/.test(value)
    && !value.includes("..") && !/^[A-Za-z]:|^\/|^\\/.test(value);
}

function validateLocks(value) {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => hasExactKeys(entry, ["path", "sha256"])
    && isSafePath(entry.path) && isSha256(entry.sha256));
}

function validate(payload) {
  if (!hasExactKeys(payload, [
    "schema", "r1b4EvidenceSha256", "r1b4ResultDocumentSha256", "r1b4Verdict", "currentM3State",
    "historicalClassifierDefect", "preG4RuntimeLocks", "postG4RuntimeLocks", "testLocks",
    "classifierSemantics", "runtimeInvariants", "privacy", "futureAuthority",
  ]) || payload.schema !== G4_ATTESTATION_SCHEMA) return false;
  if (!["r1b4EvidenceSha256", "r1b4ResultDocumentSha256"].every((key) => isSha256(payload[key]))) return false;
  if (payload.r1b4Verdict !== "P1_5_C2H2E3D_W1C_M3L2_R1B4_TARGET_ROLE_ABSENCE_PROVEN"
    || payload.currentM3State !== "ABSENT_PROVEN" || payload.historicalClassifierDefect !== "INDETERMINATE") return false;
  if (!validateLocks(payload.preG4RuntimeLocks) || !validateLocks(payload.postG4RuntimeLocks) || !validateLocks(payload.testLocks)) return false;
  const semantics = payload.classifierSemantics;
  if (!hasExactKeys(semantics, [
    "unknownNonzeroClassification", "errorPrefixV1ProvesRemoteNonApplication", "timeoutAfterMutationStart",
    "unknownMutationResultDefault", "confirmedFailureStandard", "confirmedFailureRuleIds",
    "successSemantics", "historicalM3L2ForensicOverride",
  ]) || Object.values(semantics).some((value) => Array.isArray(value) ? value.some((v) => typeof v !== "string") : typeof value !== "string")) return false;
  const invariants = payload.runtimeInvariants;
  if (!hasExactKeys(invariants, ["automaticMutationRetryAdded", "automaticRollbackAdded", "externalCommandSurfaceChanged", "opEArgvChanged", "opCArgvChanged"])
    || Object.values(invariants).some((value) => typeof value !== "boolean")) return false;
  const privacy = payload.privacy;
  if (!hasExactKeys(privacy, ["rawPolicyPersisted", "rawStdoutPersisted", "rawStderrPersisted", "memberIdentityPersisted", "etagPersisted", "conditionPersisted", "tokenPersisted", "personalPathPersisted"])
    || Object.values(privacy).some((value) => value !== false)) return false;
  const authority = payload.futureAuthority;
  if (!hasExactKeys(authority, ["historicalRg2cReusable", "historicalG2R1Reusable", "freshRuntimeReattestationRequired", "newMutationCompositeRequired", "newLiveApprovalRequired"])
    || Object.values(authority).some((value) => typeof value !== "boolean")) return false;
  return true;
}

function sortValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isPlainObject(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseG4Attestation(text) {
  if (typeof text !== "string") return null;
  try {
    const payload = JSON.parse(text);
    return validate(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function canonicalizeG4Attestation(payload) {
  if (!validate(payload)) throw new Error("invalid-g4-attestation");
  return JSON.stringify(sortValue(payload));
}

export function computeG4AttestationSha256(payload) {
  return createHash("sha256").update(canonicalizeG4Attestation(payload), "utf8").digest("hex");
}

export function verifyG4Attestation(payload) {
  if (!validate(payload)) return Object.freeze({ ok: false, code: "INVALID_ATTESTATION" });
  const s = payload.classifierSemantics;
  const i = payload.runtimeInvariants;
  const a = payload.futureAuthority;
  const semanticMatch = s.unknownNonzeroClassification === "INDETERMINATE"
    && s.errorPrefixV1ProvesRemoteNonApplication === "no"
    && s.timeoutAfterMutationStart === "INDETERMINATE"
    && s.unknownMutationResultDefault === "INDETERMINATE"
    && s.confirmedFailureStandard === "REMOTE_NON_APPLICATION_PROVEN_BY_CLOSED_RULE"
    && s.confirmedFailureRuleIds.length === 0
    && s.successSemantics === "EXIT_0_NORMAL_RESPONSE_CONFIRMED_SUCCESS"
    && s.historicalM3L2ForensicOverride === "INDETERMINATE"
    && i.automaticMutationRetryAdded === false && i.automaticRollbackAdded === false
    && i.externalCommandSurfaceChanged === false && i.opEArgvChanged === false && i.opCArgvChanged === false
    && a.historicalRg2cReusable === false && a.historicalG2R1Reusable === false
    && a.freshRuntimeReattestationRequired === true && a.newMutationCompositeRequired === true
    && a.newLiveApprovalRequired === true;
  return Object.freeze({ ok: semanticMatch, code: semanticMatch ? "PASS" : "SEMANTIC_MISMATCH", sha256: computeG4AttestationSha256(payload) });
}

export const G4_ATTESTATION_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  filesystemWrite: false,
  rawCloudDataPersisted: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
