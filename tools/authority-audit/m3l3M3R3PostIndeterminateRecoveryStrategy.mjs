import { createHash } from "node:crypto";

export const M3_R3_RECOVERY_STRATEGY_SCHEMA = "myweb.m3l3.m3-r3.post-indeterminate-recovery-strategy.v1";

const SHA256 = /^[a-f0-9]{64}$/;
const EXPECTED_EVIDENCE = "a70acc78ca206c7725dee76008575d68dd0da154f39bd90b3c43b8b3b46a3955";
const EXPECTED_RESULT = "09288b56747d55111d484fa6279a85e60ba8c1c7760317c0af66a74c9a5f20f6";
const RESULT_DOMAIN = Object.freeze([
  "PRESENT_CONFIRMED",
  "MEMBER_ABSENT_CONFIRMED",
  "AMBIGUOUS",
  "AUDIT_EVENT_NOT_UNIQUELY_IDENTIFIABLE",
  "AUDIT_READ_FAILURE",
  "IAM_READ_FAILURE",
  "POLICY_PARSE_FAILURE",
  "PRIVACY_GUARD_FAILURE",
]);

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function exact(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function hasExactKeys(value, keys) {
  return plain(value) && Object.keys(value).length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function valid(payload) {
  if (!hasExactKeys(payload, [
    "schema", "authority", "terminalState", "pathA", "pathB", "futureDefect", "safety",
  ]) || payload.schema !== M3_R3_RECOVERY_STRATEGY_SCHEMA) return false;
  if (!hasExactKeys(payload.authority, ["executionEvidenceSha256", "resultDocumentSha256"])
    || payload.authority.executionEvidenceSha256 !== EXPECTED_EVIDENCE
    || payload.authority.resultDocumentSha256 !== EXPECTED_RESULT) return false;
  if (!hasExactKeys(payload.terminalState, ["state", "prestate", "mutationAttempts", "mutationOutcome", "poststate"])
    || payload.terminalState.state !== "INDETERMINATE_AFTER_SINGLE_MUTATION_ATTEMPT"
    || payload.terminalState.prestate !== "TARGET_MEMBER_ABSENT"
    || payload.terminalState.mutationAttempts !== 1
    || payload.terminalState.mutationOutcome !== "INDETERMINATE"
    || payload.terminalState.poststate !== "NOT_RUN") return false;
  if (!hasExactKeys(payload.pathA, [
    "verdict", "prestateTargetRoleCardinalityProof", "prestatePolicyStructureDigest", "externalConcurrentWriterRuledOut", "reason",
  ]) || payload.pathA.verdict !== "MEMBER_INDEPENDENT_RECOVERY_NOT_PROVABLE"
    || payload.pathA.prestateTargetRoleCardinalityProof !== false
    || payload.pathA.prestatePolicyStructureDigest !== false
    || payload.pathA.externalConcurrentWriterRuledOut !== false
    || payload.pathA.reason !== "MEMBER_ABSENCE_DOES_NOT_PROVE_ROLE_ABSENCE_OR_MUTATION_OUTCOME") return false;
  if (!hasExactKeys(payload.pathB, [
    "verdict", "auditEventTheoreticallySupported", "timeWindowRecoverable", "resourceAnchorRecoverable", "methodAnchorRecoverable", "exactMemberRecoverable", "reason", "resultDomain",
  ]) || payload.pathB.verdict !== "NOT_ELIGIBLE"
    || payload.pathB.auditEventTheoreticallySupported !== "UNRESOLVED"
    || payload.pathB.timeWindowRecoverable !== false
    || payload.pathB.resourceAnchorRecoverable !== true
    || payload.pathB.methodAnchorRecoverable !== true
    || payload.pathB.exactMemberRecoverable !== "UNRESOLVED"
    || payload.pathB.reason !== "NO_PERSISTED_BOUNDED_TIME_WINDOW_OR_EXACT_EVENT_SCHEMA"
    || !exact(payload.pathB.resultDomain, RESULT_DOMAIN)) return false;
  if (!hasExactKeys(payload.futureDefect, ["id", "historicalSessionRetrofitAllowed", "minimumAnchorRequirement"])
    || payload.futureDefect.id !== "POST_MUTATION_RECOVERY_IDENTITY_ANCHOR_MISSING"
    || payload.futureDefect.historicalSessionRetrofitAllowed !== false
    || payload.futureDefect.minimumAnchorRequirement !== "PROTECTED_AUTHORIZATION_GRADE_EQUALITY_ANCHOR_NOT_DISPLAY_FINGERPRINT") return false;
  if (!hasExactKeys(payload.safety, [
    "opARemoteCalls", "iamReads", "iamMutations", "m3Mutations", "m4Mutations", "firestoreCalls", "tokenCalls", "loggingReads", "testIamPermissionsCalls", "serviceAccountKeyOperations", "secondMutationAllowed", "m4Allowed",
  ]) || Object.entries(payload.safety).some(([key, value]) => ["secondMutationAllowed", "m4Allowed"].includes(key) ? value !== false : value !== 0)) return false;
  return true;
}

export function buildM3R3PostIndeterminateRecoveryStrategy() {
  return Object.freeze({
    schema: M3_R3_RECOVERY_STRATEGY_SCHEMA,
    authority: { executionEvidenceSha256: EXPECTED_EVIDENCE, resultDocumentSha256: EXPECTED_RESULT },
    terminalState: {
      state: "INDETERMINATE_AFTER_SINGLE_MUTATION_ATTEMPT",
      prestate: "TARGET_MEMBER_ABSENT",
      mutationAttempts: 1,
      mutationOutcome: "INDETERMINATE",
      poststate: "NOT_RUN",
    },
    pathA: {
      verdict: "MEMBER_INDEPENDENT_RECOVERY_NOT_PROVABLE",
      prestateTargetRoleCardinalityProof: false,
      prestatePolicyStructureDigest: false,
      externalConcurrentWriterRuledOut: false,
      reason: "MEMBER_ABSENCE_DOES_NOT_PROVE_ROLE_ABSENCE_OR_MUTATION_OUTCOME",
    },
    pathB: {
      verdict: "NOT_ELIGIBLE",
      auditEventTheoreticallySupported: "UNRESOLVED",
      timeWindowRecoverable: false,
      resourceAnchorRecoverable: true,
      methodAnchorRecoverable: true,
      exactMemberRecoverable: "UNRESOLVED",
      reason: "NO_PERSISTED_BOUNDED_TIME_WINDOW_OR_EXACT_EVENT_SCHEMA",
      resultDomain: RESULT_DOMAIN,
    },
    futureDefect: {
      id: "POST_MUTATION_RECOVERY_IDENTITY_ANCHOR_MISSING",
      historicalSessionRetrofitAllowed: false,
      minimumAnchorRequirement: "PROTECTED_AUTHORIZATION_GRADE_EQUALITY_ANCHOR_NOT_DISPLAY_FINGERPRINT",
    },
    safety: {
      opARemoteCalls: 0, iamReads: 0, iamMutations: 0, m3Mutations: 0, m4Mutations: 0,
      firestoreCalls: 0, tokenCalls: 0, loggingReads: 0, testIamPermissionsCalls: 0,
      serviceAccountKeyOperations: 0, secondMutationAllowed: false, m4Allowed: false,
    },
  });
}

export function canonicalizeM3R3PostIndeterminateRecoveryStrategy(payload) {
  if (!valid(payload)) throw new Error("invalid-post-indeterminate-recovery-strategy");
  return JSON.stringify(stable(payload));
}

export function computeM3R3PostIndeterminateRecoveryStrategySha256(payload) {
  return createHash("sha256").update(canonicalizeM3R3PostIndeterminateRecoveryStrategy(payload), "utf8").digest("hex");
}

export function verifyM3R3PostIndeterminateRecoveryStrategy(payload) {
  return valid(payload)
    ? Object.freeze({ ok: true, code: "BLOCKED_NO_AUTHORIZATION_GRADE_RECOVERY_PATH", sha256: computeM3R3PostIndeterminateRecoveryStrategySha256(payload) })
    : Object.freeze({ ok: false, code: "INVALID_POST_INDETERMINATE_RECOVERY_STRATEGY" });
}

export const M3_R3_POST_INDETERMINATE_RECOVERY_STRATEGY_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  filesystemWrite: false,
  rawIdentityPersistence: false,
  rawMemberPersistence: false,
  displayFingerprintAuthority: false,
});
