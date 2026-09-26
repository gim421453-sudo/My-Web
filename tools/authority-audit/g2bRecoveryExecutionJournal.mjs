import { existsSync, mkdirSync, openSync, readFileSync, renameSync, closeSync, fsyncSync, writeSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";

export const G2B_RECOVERY_EXECUTION_JOURNAL_SCHEMA = "myweb.g2b.recovery-execution-journal.v2";

const UUID = /^[0-9a-f-]{36}$/;
const PHASES = new Set([
  "PREPARED", "APPROVAL_CONSUMED", "REQUEST_STARTED_RESPONSE_UNKNOWN", "PROVIDER_FAILURE_OBSERVED",
  "RESPONSE_OBSERVED_PARSE_PENDING", "PARSE_FAILED", "ANCHOR_COMPARISON_PENDING",
  "ANCHOR_COMPARISON_COMPLETE", "TERMINAL_CLASSIFICATION_COMPLETE",
]);
const HTTP_CLASSES = new Set(["UNKNOWN", "2XX", "3XX", "4XX", "5XX"]);
const TRANSPORT_RESULTS = new Set([
  "NOT_STARTED", "RESPONSE_UNKNOWN", "SUCCESS", "PROVIDER_FAILURE", "TRANSPORT_TIMEOUT",
  "TRANSPORT_FAILURE", "PROCESS_INTERRUPTION", "LOCAL_FAILURE", "OTHER_FAILURE",
]);
const PARSE_RESULTS = new Set(["NOT_ATTEMPTED", "PENDING", "SUCCESS", "MALFORMED", "UNEXPECTED_SHAPE"]);
const ROLE_RESULTS = new Set(["NOT_ATTEMPTED", "PENDING", "ROLE_PRESENT", "ROLE_ABSENT", "AMBIGUOUS"]);
const ANCHOR_RESULTS = new Set(["NOT_ATTEMPTED", "PENDING", "MATCH_PRESENT", "NO_MATCH", "AMBIGUOUS", "INVALID"]);
const TERMINAL_RESULTS = new Set([null, "RECOVERY_CONFIRMED_PRESENT", "RECOVERY_CONFIRMED_ABSENT", "RECOVERY_NOT_ESTABLISHED"]);

function defaultDirectory(environment) {
  const root = environment?.LOCALAPPDATA || environment?.APPDATA;
  return typeof root === "string" && root.trim()
    ? join(root, "MY-WEB", "authority-audit", "g2b-recovery-execution-journal-v2")
    : null;
}

function safeRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === 18
    && ["schema", "operationInstance", "parentInterruptedM3Generation", "targetResource", "targetRole", "phase",
      "approvalConsumed", "requestBoundaryEntered", "responseObserved", "httpStatusClass", "transportResult",
      "responseParseResult", "targetRoleEvaluationResult", "anchorComparisonResult", "classifierInputComplete",
      "terminalRecoveryResult", "createdAt", "updatedAt"].every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => !/raw|policy|member|principal|credential|token|stdout|stderr|etag/i.test(key))
    && value.schema === G2B_RECOVERY_EXECUTION_JOURNAL_SCHEMA
    && UUID.test(value.operationInstance)
    && value.parentInterruptedM3Generation === G2B_INTERRUPTED_M3_GENERATION
    && value.targetResource === G2B_TARGET_RESOURCE && value.targetRole === G2B_TARGET_ROLE
    && PHASES.has(value.phase) && typeof value.approvalConsumed === "boolean"
    && typeof value.requestBoundaryEntered === "boolean" && typeof value.responseObserved === "boolean"
    && HTTP_CLASSES.has(value.httpStatusClass) && TRANSPORT_RESULTS.has(value.transportResult)
    && PARSE_RESULTS.has(value.responseParseResult) && ROLE_RESULTS.has(value.targetRoleEvaluationResult)
    && ANCHOR_RESULTS.has(value.anchorComparisonResult) && typeof value.classifierInputComplete === "boolean"
    && TERMINAL_RESULTS.has(value.terminalRecoveryResult)
    && typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt))
    && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt));
}

function atomicWrite(path, record) {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeSync(fd, JSON.stringify(record));
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temporary, path);
    const reread = JSON.parse(readFileSync(path, "utf8"));
    if (!safeRecord(reread) || reread.operationInstance !== record.operationInstance || reread.phase !== record.phase) {
      throw new Error("recovery-journal-reread-failed");
    }
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

function initialRecord(operationInstance, now) {
  return Object.freeze({
    schema: G2B_RECOVERY_EXECUTION_JOURNAL_SCHEMA,
    operationInstance,
    parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    phase: "PREPARED",
    approvalConsumed: false,
    requestBoundaryEntered: false,
    responseObserved: false,
    httpStatusClass: "UNKNOWN",
    transportResult: "NOT_STARTED",
    responseParseResult: "NOT_ATTEMPTED",
    targetRoleEvaluationResult: "NOT_ATTEMPTED",
    anchorComparisonResult: "NOT_ATTEMPTED",
    classifierInputComplete: false,
    terminalRecoveryResult: null,
    createdAt: now,
    updatedAt: now,
  });
}

function allowedTransition(record, next) {
  const transitions = {
    PREPARED: ["APPROVAL_CONSUMED"],
    APPROVAL_CONSUMED: ["REQUEST_STARTED_RESPONSE_UNKNOWN"],
    REQUEST_STARTED_RESPONSE_UNKNOWN: ["PROVIDER_FAILURE_OBSERVED", "RESPONSE_OBSERVED_PARSE_PENDING"],
    RESPONSE_OBSERVED_PARSE_PENDING: ["PARSE_FAILED", "ANCHOR_COMPARISON_PENDING"],
    ANCHOR_COMPARISON_PENDING: ["ANCHOR_COMPARISON_COMPLETE"],
    ANCHOR_COMPARISON_COMPLETE: ["TERMINAL_CLASSIFICATION_COMPLETE"],
    PROVIDER_FAILURE_OBSERVED: ["TERMINAL_CLASSIFICATION_COMPLETE"],
    PARSE_FAILED: ["TERMINAL_CLASSIFICATION_COMPLETE"],
  };
  return transitions[record.phase]?.includes(next.phase) === true;
}

export function createG2BRecoveryExecutionJournal({ directory = defaultDirectory(process.env), now = () => new Date().toISOString() } = {}) {
  if (typeof directory !== "string" || !directory.trim()) throw new Error("recovery-journal-directory-required");
  const pathFor = (operationInstance) => join(directory, `${operationInstance}.json`);
  const load = (operationInstance) => {
    if (!UUID.test(operationInstance) || !existsSync(pathFor(operationInstance))) return Object.freeze({ state: "MISSING" });
    try {
      const record = JSON.parse(readFileSync(pathFor(operationInstance), "utf8"));
      return safeRecord(record) ? Object.freeze({ state: "READY", record: Object.freeze(record) }) : Object.freeze({ state: "INVALID" });
    } catch { return Object.freeze({ state: "INVALID" }); }
  };
  return Object.freeze({
    directory,
    pathFor,
    load,
    initialize(operationInstance) {
      const existing = load(operationInstance);
      if (existing.state === "READY") return Object.freeze({ ok: true, code: "RECOVERY_JOURNAL_ALREADY_PREPARED", record: existing.record });
      if (existing.state !== "MISSING") return Object.freeze({ ok: false, code: "RECOVERY_JOURNAL_INVALID" });
      const record = initialRecord(operationInstance, now());
      try { atomicWrite(pathFor(operationInstance), record); return Object.freeze({ ok: true, code: "RECOVERY_JOURNAL_PREPARED", record }); }
      catch { return Object.freeze({ ok: false, code: "RECOVERY_JOURNAL_PERSISTENCE_FAILURE" }); }
    },
    transition(operationInstance, patch) {
      const current = load(operationInstance);
      if (current.state !== "READY" || !patch || typeof patch !== "object" || Array.isArray(patch)) {
        return Object.freeze({ ok: false, code: "RECOVERY_JOURNAL_TRANSITION_BLOCKED" });
      }
      const next = Object.freeze({ ...current.record, ...patch, updatedAt: now() });
      if (!safeRecord(next) || !allowedTransition(current.record, next)) {
        return Object.freeze({ ok: false, code: "RECOVERY_JOURNAL_TRANSITION_BLOCKED" });
      }
      try { atomicWrite(pathFor(operationInstance), next); return Object.freeze({ ok: true, record: next }); }
      catch { return Object.freeze({ ok: false, code: "RECOVERY_JOURNAL_PERSISTENCE_FAILURE" }); }
    },
  });
}

export const G2B_RECOVERY_EXECUTION_JOURNAL_CONTRACT = Object.freeze({
  durableBeforeRemoteBoundary: true,
  rereadAfterEveryWrite: true,
  interruptionStates: Object.freeze([...PHASES]),
  rawPolicyPersisted: false,
  rawMemberPersisted: false,
  rawPrincipalPersisted: false,
  rawCredentialPersisted: false,
  rawTokenPersisted: false,
});
