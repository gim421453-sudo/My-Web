import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const M3L3_R2_EVIDENCE_SCHEMA = "myweb.m3l3.r2.safe-read-failure-recovery-result.v1";
export const M3L3_R2_READ_FAILURE_VERDICT = "P1_5_C2H2E3D_W1C_M3L3_R2_SAFE_PARSE_READ_FAILURE_STOP";

const SOURCE_LOCKS = Object.freeze([
  Object.freeze({ path: "tools/authority-audit/m3l3ReadFailureSafeDiagnostic.mjs", sha256: "ae597471b67f84d6412f63099057a5eb4b70f5a816697772984c0b48a809d3ee" }),
  Object.freeze({ path: "tools/authority-audit/m3l3ReadFailureDiagnosticExecutor.mjs", sha256: "dc8459cfb8501866396bdab4f35f2f68b694436c239bf34c81fe66000323815a" }),
  Object.freeze({ path: "tools/authority-audit-tests/m3l3ReadFailureDiagnosticExecutor.test.mjs", sha256: "16de005f898cc243f9b30d5b718779bd5028f855c6b32c5416daafefae856d8d" }),
  Object.freeze({ path: "tools/authority-audit/m3l3R2ApprovalPacketVerifier.mjs", sha256: "a09218c0183999a68ce1c342bd613fd2e2be54e1cedf76d93837d3797f5da439" }),
  Object.freeze({ path: "tools/authority-audit-tests/m3l3R2ApprovalPacketVerifier.test.mjs", sha256: "252cf0cdb14c8d723979b1a4ccc285f4c79dc4e7f6e7a209486b48c94af48dec" }),
]);

const FORBIDDEN_KEY = /^(principal|member|email|uid|token|credential|configRoot|absolutePath|rawArgv|rawEnvironment|rawPolicy|rawOutput|stdout|stderr|etag|conditionExpression)$/i;
const SENSITIVE_SCALAR = /(?:AIza[0-9A-Za-z_-]{20,}|Bearer\s+\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|[A-Za-z]:[\\/](?:Users|Documents)[\\/]|(?:user|serviceAccount):[^\s]+@[^\s]+|--account=[^<\s][^\s]*)/i;

const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function noSensitiveMaterial(value) {
  if (Array.isArray(value)) return value.every(noSensitiveMaterial);
  if (typeof value === "string") return !SENSITIVE_SCALAR.test(value);
  if (!plain(value)) return true;
  return Object.entries(value).every(([key, child]) => !FORBIDDEN_KEY.test(key) && noSensitiveMaterial(child));
}

function sortValue(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function exact(value, expected) {
  return JSON.stringify(sortValue(value)) === JSON.stringify(sortValue(expected));
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function buildM3L3R2RecoveryEvidence() {
  return {
    schema: M3L3_R2_EVIDENCE_SCHEMA,
    authority: {
      r1EvidenceSha256: "3cd19a1d6e03d63684e0bf7a7f42d0cc7f477fc0a985f94e4f51742bf7f4c20c",
      r1ResultDocumentSha256: "cce0636504186aea24c95fa88426f6de2f37a6f0acae697af82441f3808245f2",
      rf1Attestation: "a6adbddc5cfc112b070d0392d7dd6ef2680b3e1d16111bf82f10dbfc1bace7a9",
      r2ApprovalPacketSha256: "5ae22bdf0fcfb8d44e62eedda3a65c88f38282bb80d2dca90271012bd4b3d9f4",
    },
    sourceLocks: SOURCE_LOCKS.map((entry) => ({ ...entry })),
    previousState: "READ_FAILURE",
    r2Approval: {
      readOnly: true,
      remoteReadsMax: 1,
      retries: 0,
      mutations: 0,
      reusable: false,
      consumed: true,
      status: "CONSUMED_NON_REUSABLE",
    },
    identity: {
      discoveryUsed: 1,
      exactContextEstablished: true,
      rawIdentityPersisted: false,
    },
    remoteRead: {
      used: 1,
      started: true,
      writerSaGetIamPolicyReads: 1,
      projectIamReads: 0,
    },
    safeFailureDiagnostic: {
      failurePhase: "SAFE_PARSE",
      failureClass: "PARSE",
      outcome: "UNSUPPORTED_POLICY_SHAPE",
      exitCodeClass: "ZERO",
      timedOut: false,
      spawnErrorCode: "NONE",
      stdoutSizeBucket: "SMALL",
      stdoutLineCount: 4,
      stdoutParseResult: "UNSUPPORTED_POLICY_SHAPE",
      stderrSizeBucket: "ZERO",
      stderrLineCount: 0,
      stderrKnownRuleIds: ["TERMINAL_BLANK_V1"],
      stderrUnknownLineCount: 0,
    },
    recoveryResult: "READ_FAILURE",
    currentM3State: "READ_FAILURE",
    forbiddenOperationCounts: {
      iamMutations: 0,
      m3Mutations: 0,
      m4Mutations: 0,
      projectIamReads: 0,
      projectIamMutations: 0,
      accessTokenCalls: 0,
      writerImpersonationCalls: 0,
      firestoreCalls: 0,
      cloudLoggingReads: 0,
      testIamPermissionsCalls: 0,
      serviceAccountKeyOperations: 0,
      retries: 0,
      rollbacks: 0,
    },
    privacy: {
      exactIdentityPersisted: false,
      exactIamMemberPersisted: false,
      rawIamPolicyPersisted: false,
      rawProcessOutputPersisted: false,
      configRootPersisted: false,
      credentialPersisted: false,
      tokenPersisted: false,
      errorTextPersisted: false,
    },
    nextApproval: {
      required: true,
      type: "READ_ONLY",
      reason: "R2_SAFE_PARSE_FAILURE_REQUIRES_NEW_APPROVAL",
      automaticRetryAllowed: false,
    },
    finalVerdict: M3L3_R2_READ_FAILURE_VERDICT,
  };
}

function valid(payload) {
  return noSensitiveMaterial(payload) && exact(payload, buildM3L3R2RecoveryEvidence());
}

export function canonicalizeM3L3R2RecoveryEvidence(payload) {
  if (!valid(payload)) throw new Error("invalid-m3l3-r2-recovery-evidence");
  return JSON.stringify(sortValue(payload));
}

export function computeM3L3R2RecoveryEvidenceSha256(payload) {
  return createHash("sha256").update(canonicalizeM3L3R2RecoveryEvidence(payload), "utf8").digest("hex");
}

export function verifyM3L3R2RecoveryEvidence(payload, { repositoryRoot = process.cwd() } = {}) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_R2_RECOVERY_EVIDENCE" });
  for (const lock of SOURCE_LOCKS) {
    if (hashFile(resolve(repositoryRoot, lock.path)) !== lock.sha256) {
      return Object.freeze({ ok: false, code: "R2_SOURCE_LOCK_DRIFT" });
    }
  }
  return Object.freeze({
    ok: true,
    code: "R2_SAFE_PARSE_READ_FAILURE_RECORDED_FAIL_CLOSED",
    sha256: computeM3L3R2RecoveryEvidenceSha256(payload),
  });
}

export const M3L3_R2_EVIDENCE_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
