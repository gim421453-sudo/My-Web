import { createHash } from "node:crypto";

export const M3L3_LIVE_EVIDENCE_SCHEMA = "myweb.m3l3.post-identity-patch-live-execution.v1";
export const M3L3_BUDGET_VIOLATION_VERDICT = "P1_5_C2H2E3D_W1C_M3L3_LIVE_BUDGET_VIOLATION";

const COMPOSITE = "1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195";
const RESULT = "f0421acdaf1f9649b7314613a381c8c82072f84d70365c2e8c51b66876d16ac7";
const R1 = "82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9";
const R2 = "dd488891964eeac9427557b95c5cf46a42bb2f5969bbc6bcba6f55c176c79adc";
const ROOT_KEYS = [
  "approval", "budgetContract", "budgets", "finalVerdict", "forbiddenOperations",
  "g4r3hR2AttestationSha256", "g4r3r1AttestationSha256", "g4r3r2CompositeSha256",
  "g4r3r2ResultDocumentSha256", "identity", "m3FinalState", "m4", "mutation",
  "poststate", "prestate", "privacy", "schema", "tests",
];
const FORBIDDEN_KEY = /^(timestamp|createdAt|updatedAt|principal|member|email|uid|token|credential|absolutePath|rawArgv|rawEnvironment|rawPolicy|rawOutput|stdout|stderr|etag|conditionExpression)$/i;
const SENSITIVE_SCALAR = /(?:AIza[0-9A-Za-z_-]{20,}|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z]:[\\/](?:Users|Documents)[\\/]|(?:user|serviceAccount):[^\s]+@[^\s]+|--account=[^<\s][^\s]*)/i;

const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => plain(value) && Object.keys(value).length === keys.length
  && keys.every((key) => Object.hasOwn(value, key));

function noSensitiveMaterial(value) {
  if (Array.isArray(value)) return value.every(noSensitiveMaterial);
  if (typeof value === "string") return !SENSITIVE_SCALAR.test(value);
  if (!plain(value)) return true;
  return Object.entries(value).every(([key, child]) => !FORBIDDEN_KEY.test(key) && noSensitiveMaterial(child));
}

function allZero(value) {
  return plain(value) && Object.values(value).every((count) => count === 0);
}

function valid(payload) {
  if (!exactKeys(payload, ROOT_KEYS) || payload.schema !== M3L3_LIVE_EVIDENCE_SCHEMA || !noSensitiveMaterial(payload)) return false;
  if (payload.g4r3r2CompositeSha256 !== COMPOSITE || payload.g4r3r2ResultDocumentSha256 !== RESULT
    || payload.g4r3r1AttestationSha256 !== R1 || payload.g4r3hR2AttestationSha256 !== R2) return false;
  if (!exactKeys(payload.approval, ["consumed", "consumptionPoint", "granted", "reusable", "status"])
    || payload.approval.granted !== true || payload.approval.consumed !== false
    || payload.approval.consumptionPoint !== "FIRST_FRESH_EXACT_PRESTATE_REMOTE_IAM_READ"
    || payload.approval.reusable !== false || payload.approval.status !== "NOT_REACHED") return false;
  if (!exactKeys(payload.budgetContract, ["approvedProjectIamReadsMax", "compatible", "decision", "lockedCompositeProjectIamReadsMax", "requiredGraphProjectIamReadNodes"])
    || payload.budgetContract.lockedCompositeProjectIamReadsMax !== 2
    || payload.budgetContract.approvedProjectIamReadsMax !== 0
    || JSON.stringify(payload.budgetContract.requiredGraphProjectIamReadNodes) !== JSON.stringify(["OP_D_PRE", "OP_D_POST"])
    || payload.budgetContract.compatible !== false || payload.budgetContract.decision !== "ABORT_BEFORE_OP_A") return false;
  if (!exactKeys(payload.budgets, ["localIdentityDiscoveryUsed", "mutationAttemptsUsed", "poststateReadsUsed", "prestateReadsUsed", "retriesUsed"])
    || !allZero(payload.budgets)) return false;
  if (!exactKeys(payload.identity, ["discoveryResult", "exactContextEstablished", "rawIdentityPersisted"])
    || payload.identity.discoveryResult !== "NOT_EXECUTED_BUDGET_GATE_FAILURE"
    || payload.identity.exactContextEstablished !== false || payload.identity.rawIdentityPersisted !== false) return false;
  if (!exactKeys(payload.prestate, ["readsUsed", "result"]) || payload.prestate.readsUsed !== 0 || payload.prestate.result !== "NOT_EXECUTED") return false;
  if (!exactKeys(payload.mutation, ["attempted", "outcome", "retryCount", "rollbackCount", "secondMutationAttempted"])
    || payload.mutation.attempted !== false || payload.mutation.outcome !== "NOT_ATTEMPTED"
    || payload.mutation.retryCount !== 0 || payload.mutation.rollbackCount !== 0
    || payload.mutation.secondMutationAttempted !== false) return false;
  if (!exactKeys(payload.poststate, ["executed", "readsUsed", "required", "result"])
    || payload.poststate.required !== true || payload.poststate.executed !== false
    || payload.poststate.result !== "NOT_EXECUTED" || payload.poststate.readsUsed !== 0) return false;
  if (payload.m3FinalState !== "ABSENT_PROVEN_FRESH_PRESTATE_NOT_EXECUTED") return false;
  if (!exactKeys(payload.m4, ["approvalGranted", "mutations"]) || payload.m4.approvalGranted !== false || payload.m4.mutations !== 0) return false;
  if (!exactKeys(payload.forbiddenOperations, ["accessTokenCalls", "cloudLoggingReads", "deployments", "firestoreApiCalls", "projectIamMutations", "projectIamReads", "serviceAccountKeyOperations", "testIamPermissionsCalls"])
    || !allZero(payload.forbiddenOperations)) return false;
  if (!exactKeys(payload.privacy, ["configRootPersisted", "credentialPersisted", "rawIdentityPersisted", "rawIamPolicyPersisted", "rawProcessOutputPersisted", "tokenPersisted"])
    || Object.values(payload.privacy).some((value) => value !== false)) return false;
  if (!exactKeys(payload.tests, ["gcloudVersionHelpStatus", "safeAuthorityFilesPassed", "safeAuthorityFilesRun"])
    || payload.tests.safeAuthorityFilesRun !== 28 || payload.tests.safeAuthorityFilesPassed !== 28
    || payload.tests.gcloudVersionHelpStatus !== "NOT_RUN_BY_ZERO_GCLOUD_POLICY") return false;
  return payload.finalVerdict === M3L3_BUDGET_VIOLATION_VERDICT;
}

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

export function parseM3L3LiveEvidence(text) {
  if (typeof text !== "string") return null;
  try { const payload = JSON.parse(text); return valid(payload) ? payload : null; } catch { return null; }
}

export function canonicalizeM3L3LiveEvidence(payload) {
  if (!valid(payload)) throw new Error("invalid-m3l3-live-evidence");
  return JSON.stringify(sortValue(payload));
}

export function computeM3L3LiveEvidenceSha256(payload) {
  return createHash("sha256").update(canonicalizeM3L3LiveEvidence(payload), "utf8").digest("hex");
}

export function verifyM3L3LiveEvidence(payload) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_LIVE_EVIDENCE" });
  return Object.freeze({ ok: true, code: "LIVE_BUDGET_VIOLATION_FAIL_CLOSED", sha256: computeM3L3LiveEvidenceSha256(payload) });
}

export const M3L3_LIVE_EVIDENCE_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
