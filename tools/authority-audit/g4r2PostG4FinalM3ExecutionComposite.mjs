import { createHash } from "node:crypto";

export const G4R2_ATTESTATION_SCHEMA = "myweb.m3l2.g4r2.post-g4-final-m3-execution-composite.v1";
const SHA256 = /^[a-f0-9]{64}$/;
const REQUIRED_KEYS = [
  "schema", "g4AttestationSha256", "g4ResultDocumentSha256", "g4r1AttestationSha256",
  "g4r1ResultDocumentSha256", "r1b4EvidenceSha256", "r1b4ResultDocumentSha256",
  "currentRuntimeLocks", "testLocks", "runtimeGraph", "externalCapabilities", "sdkIdentity",
  "commandSurfaces", "writerTarget", "targetRole", "concurrencyContract", "prestate", "mutation",
  "classifier", "poststate", "forbiddenReachability", "privacy", "futureLiveBudget",
  "futureExecutionSequence", "approvalConsumption", "historicalAuthorityStatus", "futureAuthority",
];
const FORBIDDEN_KEY = /timestamp|absolute|principal|member|email|uid|workspace|stderr|stdout/i;

const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const exactKeys = (v, keys) => plain(v) && Object.keys(v).length === keys.length
  && keys.every((k) => Object.prototype.hasOwnProperty.call(v, k));
const safePath = (v) => typeof v === "string" && /^(tools|docs|lib)\/[A-Za-z0-9._/-]+$/.test(v)
  && !v.includes("..") && !/^[A-Za-z]:|^[/\\]/.test(v);
const noForbiddenKeys = (v) => Array.isArray(v) ? v.every(noForbiddenKeys) : !plain(v) || Object.entries(v).every(([k, x]) => !FORBIDDEN_KEY.test(k) && noForbiddenKeys(x));
const locks = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => exactKeys(x, ["path", "sha256"]) && safePath(x.path) && SHA256.test(x.sha256));

function validate(p) {
  if (!exactKeys(p, REQUIRED_KEYS) || p.schema !== G4R2_ATTESTATION_SCHEMA || !noForbiddenKeys(p)) return false;
  if (["g4AttestationSha256", "g4ResultDocumentSha256", "g4r1AttestationSha256", "g4r1ResultDocumentSha256", "r1b4EvidenceSha256", "r1b4ResultDocumentSha256"].some((k) => !SHA256.test(p[k]))) return false;
  if (!locks(p.currentRuntimeLocks) || !locks(p.testLocks)) return false;
  const g = p.runtimeGraph;
  if (!exactKeys(g, ["nodeCount", "edgeCount", "graphIdentity", "mutationOperation", "mutationMax", "retryMax", "rollbackAdded", "freshPrestateRequired"])
    || g.nodeCount !== 9 || g.edgeCount !== 10 || !Array.isArray(g.graphIdentity) || g.graphIdentity.length !== 9
    || g.mutationOperation !== "OP_E" || g.mutationMax !== 1 || g.retryMax !== 0 || g.rollbackAdded !== false || g.freshPrestateRequired !== true) return false;
  if (!Array.isArray(p.externalCapabilities) || p.externalCapabilities.length !== 15
    || p.externalCapabilities.some((x) => !exactKeys(x, ["id", "nodeIds", "relativePath", "sha256"])
      || !Array.isArray(x.nodeIds) || !safePath(x.relativePath) || !SHA256.test(x.sha256))) return false;
  if (!exactKeys(p.sdkIdentity, ["version", "versionSha256", "launcherSha256", "pathContainment", "identityMatch"])
    || p.sdkIdentity.version !== "580.0.0" || !SHA256.test(p.sdkIdentity.versionSha256)
    || !SHA256.test(p.sdkIdentity.launcherSha256) || p.sdkIdentity.pathContainment !== "PASS" || p.sdkIdentity.identityMatch !== "yes") return false;
  const surfaces = p.commandSurfaces;
  if (!exactKeys(surfaces, ["opA", "opB", "opC", "opD", "opE", "opEArgvChanged", "opCArgvChanged", "overallChanged"])
    || Object.values(surfaces).some((v, i) => i < 5 ? typeof v !== "string" : v !== false)) return false;
  if (p.writerTarget !== "LOCKED_WRITER_SERVICE_ACCOUNT" || p.targetRole !== "roles/iam.serviceAccountTokenCreator") return false;
  if (!exactKeys(p.concurrencyContract, ["etagPreserved", "casReadModifySet", "changedFromG4R1"]) || Object.values(p.concurrencyContract).some((v, i) => i < 2 ? v !== true : v !== false)) return false;
  const pre = p.prestate;
  if (!exactKeys(pre, ["freshRequired", "r1b4ReusableAsFreshPrestate", "allowedStates", "identityContract", "failureBehavior"])
    || pre.freshRequired !== true || pre.r1b4ReusableAsFreshPrestate !== false
    || JSON.stringify(pre.allowedStates) !== JSON.stringify(["ALREADY_PRESENT", "ABSENT", "AMBIGUOUS", "READ_FAILURE", "TIMEOUT", "PARSE_FAILURE", "IDENTITY_UNCERTAINTY"])
    || pre.identityContract !== "UNRESOLVED_OLD_FINGERPRINT_ONLY" || pre.failureBehavior !== "NO_MUTATION_FAIL_CLOSED") return false;
  const mut = p.mutation;
  if (!exactKeys(mut, ["maxAttempts", "retries", "rollback", "secondMutationReachable"])
    || mut.maxAttempts !== 1 || mut.retries !== 0 || mut.rollback !== 0 || mut.secondMutationReachable !== false) return false;
  const c = p.classifier;
  if (!exactKeys(c, ["unknownNonzero", "errorPrefixV1ProvesRemoteNonApplication", "timeoutAfterMutationStart", "unknownResultDefault", "confirmedFailureRules", "notAttemptedSemantics", "successSemantics"])
    || c.unknownNonzero !== "INDETERMINATE" || c.errorPrefixV1ProvesRemoteNonApplication !== "no"
    || c.timeoutAfterMutationStart !== "INDETERMINATE" || c.unknownResultDefault !== "INDETERMINATE"
    || c.confirmedFailureRules.length !== 0 || c.notAttemptedSemantics !== "NOT_ATTEMPTED" || c.successSemantics !== "EXIT_0_NORMAL_RESPONSE_CONFIRMED_SUCCESS") return false;
  const post = p.poststate;
  if (!exactKeys(post, ["required", "exactReadScope", "failureBehavior"]) || post.required !== true
    || post.exactReadScope !== "OP_C_POST_AND_OP_D_POST_EXACT_LOCKED_SCOPE" || post.failureBehavior !== "NO_COMPLETION_ON_AMBIGUITY") return false;
  if (!exactKeys(p.forbiddenReachability, ["m4", "firestore", "tokenGeneration", "writerImpersonation", "serviceAccountKey", "cloudLogging", "projectIamMutation"])
    || Object.values(p.forbiddenReachability).some((v) => v !== false)) return false;
  if (!exactKeys(p.privacy, ["rawIdentity", "rawPolicy", "rawToken", "rawProcessOutput", "etagValue", "conditionExpression", "personalPath"])
    || Object.values(p.privacy).some((v) => v !== false)) return false;
  if (!plain(p.futureLiveBudget) || Object.keys(p.futureLiveBudget).length < 10 || Object.values(p.futureLiveBudget).some((v) => !Number.isInteger(v) || v < 0)) return false;
  if (!Array.isArray(p.futureExecutionSequence) || p.futureExecutionSequence.length < 4
    || p.approvalConsumption !== "WHEN_FRESH_PRESTATE_READ_BEGINS") return false;
  if (!exactKeys(p.historicalAuthorityStatus, ["rg2c", "g2r1", "m3l2ApprovalReusable", "r1b4ApprovalReusable"])
    || p.historicalAuthorityStatus.rg2c !== "HISTORICAL_ONLY_FOR_PRE_G4_RUNTIME" || p.historicalAuthorityStatus.g2r1 !== "HISTORICAL_ONLY_FOR_PRE_G4_RUNTIME"
    || p.historicalAuthorityStatus.m3l2ApprovalReusable !== false || p.historicalAuthorityStatus.r1b4ApprovalReusable !== false) return false;
  if (!exactKeys(p.futureAuthority, ["m3l3LiveApprovalGranted", "m4ApprovalGranted"]) || p.futureAuthority.m3l3LiveApprovalGranted !== false || p.futureAuthority.m4ApprovalGranted !== false) return false;
  return true;
}

function sortValue(v) {
  if (v === null || typeof v === "string" || typeof v === "boolean") return v;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (Array.isArray(v)) return v.map(sortValue);
  if (!plain(v)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortValue(v[k])]));
}

export function parseG4R2Composite(text) {
  if (typeof text !== "string") return null;
  try { const p = JSON.parse(text); return validate(p) ? p : null; } catch { return null; }
}
export function canonicalizeG4R2Composite(p) { if (!validate(p)) throw new Error("invalid-g4r2-composite"); return JSON.stringify(sortValue(p)); }
export function computeG4R2CompositeSha256(p) { return createHash("sha256").update(canonicalizeG4R2Composite(p), "utf8").digest("hex"); }
export function verifyG4R2Composite(p) {
  if (!validate(p)) return Object.freeze({ ok: false, code: "INVALID_COMPOSITE" });
  const blocked = p.prestate.identityContract === "UNRESOLVED_OLD_FINGERPRINT_ONLY";
  return Object.freeze({ ok: !blocked, code: blocked ? "FRESH_PRESTATE_IDENTITY_CONTRACT_UNRESOLVED" : "PASS", sha256: computeG4R2CompositeSha256(p) });
}
export const G4R2_COMPOSITE_CONTRACT = Object.freeze({ networkAccess: false, processSpawn: false, filesystemWrite: false, productionAccess: false, canonicalization: "recursive-lexicographic-json-utf8-sha256" });
