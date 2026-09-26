import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const M3L3_R1_EVIDENCE_SCHEMA = "myweb.m3l3.r1.read-only-recovery-result.v1";
export const M3L3_R1_READ_FAILURE_VERDICT = "P1_5_C2H2E3D_W1C_M3L3_R1_READ_FAILURE_STOP";

const SOURCE_LOCKS = Object.freeze([
  Object.freeze({
    path: "tools/authority-audit/m3l3PostFailureRecoveryExecutor.mjs",
    sha256: "197b71bf79bb9dc884e6da6f2ea13f3e76ab7c41943b1be4f95117908975212c",
  }),
  Object.freeze({
    path: "tools/authority-audit-tests/m3l3PostFailureRecoveryExecutor.test.mjs",
    sha256: "290e08f394ac78849cb21f9adb3f51a22fe69bceceecedadb8726a55f07068a7",
  }),
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

export function buildM3L3R1RecoveryEvidence() {
  return {
    schema: M3L3_R1_EVIDENCE_SCHEMA,
    authority: {
      rf1Attestation: "a6adbddc5cfc112b070d0392d7dd6ef2680b3e1d16111bf82f10dbfc1bace7a9",
      recoveryPlan: "0e5156bdc9040f541c36e22892621ae1a48c9019fc1d060cd6ae2dbcdd0cc501",
      g4r3r2Composite: "1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195",
    },
    sourceLocks: SOURCE_LOCKS.map((entry) => ({ ...entry })),
    previousM3l3State: "UNKNOWN_AFTER_CONSUMED_M3L3_SESSION",
    approval: {
      type: "READ_ONLY",
      maxRemoteReads: 1,
      consumed: true,
      status: "CONSUMED_NON_REUSABLE",
      retries: 0,
      mutations: 0,
      reusable: false,
    },
    identity: {
      discoveryUsed: 1,
      exactContextEstablished: true,
      rawIdentityPersisted: false,
    },
    remoteRead: {
      writerSaGetIamPolicyReads: 1,
      projectIamReads: 0,
      result: "READ_FAILURE",
    },
    recoveryResult: "READ_FAILURE",
    m3CurrentState: "READ_FAILURE",
    forbiddenOperationCounts: {
      iamMutations: 0,
      m3Mutations: 0,
      m4Mutations: 0,
      projectIamReads: 0,
      projectIamMutations: 0,
      accessTokenCalls: 0,
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
    },
    nextApproval: {
      required: true,
      type: "READ_ONLY",
      reason: "SAFE_READ_FAILURE_DIAGNOSTIC_REQUIRES_NEW_APPROVAL",
      automaticRetryAllowed: false,
    },
    finalVerdict: M3L3_R1_READ_FAILURE_VERDICT,
  };
}

function valid(payload) {
  return noSensitiveMaterial(payload) && exact(payload, buildM3L3R1RecoveryEvidence());
}

export function canonicalizeM3L3R1RecoveryEvidence(payload) {
  if (!valid(payload)) throw new Error("invalid-m3l3-r1-recovery-evidence");
  return JSON.stringify(sortValue(payload));
}

export function computeM3L3R1RecoveryEvidenceSha256(payload) {
  return createHash("sha256").update(canonicalizeM3L3R1RecoveryEvidence(payload), "utf8").digest("hex");
}

export function verifyM3L3R1RecoveryEvidence(payload, { repositoryRoot = process.cwd() } = {}) {
  if (!valid(payload)) return Object.freeze({ ok: false, code: "INVALID_R1_RECOVERY_EVIDENCE" });
  for (const lock of SOURCE_LOCKS) {
    if (hashFile(resolve(repositoryRoot, lock.path)) !== lock.sha256) {
      return Object.freeze({ ok: false, code: "R1_EXECUTOR_SOURCE_LOCK_DRIFT" });
    }
  }
  return Object.freeze({
    ok: true,
    code: "R1_READ_FAILURE_RECORDED_FAIL_CLOSED",
    sha256: computeM3L3R1RecoveryEvidenceSha256(payload),
  });
}

export const M3L3_R1_EVIDENCE_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});
