import { createHash } from "node:crypto";

export const G4R1_ATTESTATION_SCHEMA = "myweb.m3l2.g4r1.post-g4-runtime-capability-attestation.v1";

const REQUIRED_KEYS = [
  "schema", "g4AttestationSha256", "g4ResultDocumentSha256", "r1b4EvidenceSha256",
  "r1b4ResultDocumentSha256", "g4Verdict", "currentM3State", "postG4RuntimeLocks",
  "g4TestLocks", "runtimeGraph", "classifier", "externalCapabilities", "commandSurface",
  "pathContainment", "forbiddenReachability", "privacy", "futureAuthority",
];

const FORBIDDEN_KEY_PATTERN = /timestamp|absolute|principal|member|email|uid|workspace|stderr|stdout/i;
const SHA256 = /^[a-f0-9]{64}$/;

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return plain(value) && Object.keys(value).length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function safeRelativePath(value) {
  return typeof value === "string" && /^(tools|docs|lib)\/[A-Za-z0-9._/-]+$/.test(value)
    && !value.includes("..") && !/^[A-Za-z]:|^[/\\]/.test(value);
}

function containsForbiddenKey(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!plain(value)) return false;
  return Object.entries(value).some(([key, child]) => FORBIDDEN_KEY_PATTERN.test(key)
    || containsForbiddenKey(child));
}

function validateLocks(value) {
  return Array.isArray(value) && value.length > 0 && value.every((entry) => exactKeys(entry, ["path", "sha256"])
    && safeRelativePath(entry.path) && SHA256.test(entry.sha256));
}

function validate(payload) {
  if (!exactKeys(payload, REQUIRED_KEYS) || payload.schema !== G4R1_ATTESTATION_SCHEMA) return false;
  if (containsForbiddenKey(payload)) return false;
  if (!["g4AttestationSha256", "g4ResultDocumentSha256", "r1b4EvidenceSha256", "r1b4ResultDocumentSha256"]
    .every((key) => SHA256.test(payload[key]))) return false;
  if (payload.g4Verdict !== "P1_5_C2H2E3D_W1C_M3L2_G4_FAIL_CLOSED_OUTCOME_CLASSIFIER_CORRECTION_PASS_G4R1_REQUIRED"
    || payload.currentM3State !== "ABSENT_PROVEN") return false;
  if (!validateLocks(payload.postG4RuntimeLocks) || !validateLocks(payload.g4TestLocks)) return false;
  const graph = payload.runtimeGraph;
  if (!exactKeys(graph, ["nodeCount", "edgeCount", "graphIdentity", "mutationOperation", "mutationMax", "retryMax", "rollbackAdded", "freshPrestateRequired"])
    || graph.nodeCount !== 9 || graph.edgeCount !== 10 || !Array.isArray(graph.graphIdentity)
    || graph.graphIdentity.length !== 9 || graph.mutationOperation !== "OP_E"
    || graph.mutationMax !== 1 || graph.retryMax !== 0 || graph.rollbackAdded !== false
    || graph.freshPrestateRequired !== true) return false;
  const classifier = payload.classifier;
  if (!exactKeys(classifier, ["unknownNonzero", "errorPrefixV1ProvesRemoteNonApplication", "timeoutAfterMutationStart", "unknownResultDefault", "confirmedFailureRules", "successSemantics"])
    || classifier.unknownNonzero !== "INDETERMINATE"
    || classifier.errorPrefixV1ProvesRemoteNonApplication !== "no"
    || classifier.timeoutAfterMutationStart !== "INDETERMINATE"
    || classifier.unknownResultDefault !== "INDETERMINATE"
    || !Array.isArray(classifier.confirmedFailureRules) || classifier.confirmedFailureRules.length !== 0
    || classifier.successSemantics !== "EXIT_0_NORMAL_RESPONSE_CONFIRMED_SUCCESS") return false;
  if (!Array.isArray(payload.externalCapabilities) || payload.externalCapabilities.length !== 15
    || payload.externalCapabilities.some((entry) => !exactKeys(entry, ["id", "nodeIds", "relativePath", "sha256"])
      || !Array.isArray(entry.nodeIds) || !safeRelativePath(entry.relativePath) || !SHA256.test(entry.sha256))) return false;
  const surface = payload.commandSurface;
  if (!exactKeys(surface, ["opA", "opB", "opC", "opD", "opE", "opEArgvChanged", "opCArgvChanged", "overallChanged"])
    || Object.values(surface).some((value, index) => index < 5 ? typeof value !== "string" : value !== false)) return false;
  const containment = payload.pathContainment;
  if (!exactKeys(containment, ["sdkPathContainment", "sdkIdentityMatch", "serviceAccountJsonKeyPath"])
    || containment.sdkPathContainment !== "PASS" || containment.sdkIdentityMatch !== "yes"
    || containment.serviceAccountJsonKeyPath !== "ABSENT") return false;
  const forbidden = payload.forbiddenReachability;
  if (!exactKeys(forbidden, ["m4", "firestore", "tokenGeneration", "writerImpersonation", "serviceAccountKey", "cloudLogging"])
    || Object.values(forbidden).some((value) => value !== false)) return false;
  const privacy = payload.privacy;
  if (!exactKeys(privacy, ["rawIdentity", "rawPolicy", "rawToken", "rawPath", "rawProcessOutput"])
    || Object.values(privacy).some((value) => value !== false)) return false;
  const future = payload.futureAuthority;
  if (!exactKeys(future, ["historicalRg2cReusable", "historicalG2r1Reusable", "freshFinalCompositeRequired", "newM3ApprovalRequired"])
    || future.historicalRg2cReusable !== false || future.historicalG2r1Reusable !== false
    || future.freshFinalCompositeRequired !== true || future.newM3ApprovalRequired !== true) return false;
  return true;
}

function sortValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(sortValue);
  if (!plain(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseG4R1Attestation(text) {
  if (typeof text !== "string") return null;
  try {
    const payload = JSON.parse(text);
    return validate(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function canonicalizeG4R1Attestation(payload) {
  if (!validate(payload)) throw new Error("invalid-g4r1-attestation");
  return JSON.stringify(sortValue(payload));
}

export function computeG4R1AttestationSha256(payload) {
  return createHash("sha256").update(canonicalizeG4R1Attestation(payload), "utf8").digest("hex");
}

export function verifyG4R1Attestation(payload) {
  if (!validate(payload)) return Object.freeze({ ok: false, code: "INVALID_ATTESTATION" });
  return Object.freeze({ ok: true, code: "PASS", sha256: computeG4R1AttestationSha256(payload) });
}

export const G4R1_ATTESTATION_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  filesystemWrite: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
