import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_RECOVERY_POSTEXEC_EVIDENCE_SCHEMA = "myweb.g2b.recovery-postexec-evidence.v1";
export const G2B_RECOVERY_POSTEXEC_RESULT_SCHEMA = "myweb.g2b.recovery-postexec-result.v1";

const TERMINAL_RESULTS = new Set([
  "RECOVERY_CONFIRMED_PRESENT",
  "RECOVERY_CONFIRMED_ABSENT",
  "RECOVERY_NOT_ESTABLISHED",
]);
const FINALIZATION_STATES = new Set(["LOCAL_FINALIZATION_COMPLETE", "PENDING_LOCAL_FINALIZATION"]);
const COUNTER_KEYS = Object.freeze([
  "recoveryServiceAccountIamPolicyReads",
  "totalPhysicalRemoteRecoveryCalls",
  "projectIamReads",
  "setIamPolicyCalls",
  "iamMutations",
  "retries",
  "secondRecoveryRead",
  "m4Mutations",
  "firestoreCalls",
  "credentialRefreshCalls",
  "testIamPermissionsCalls",
  "tokenGenerationCalls",
  "serviceAccountKeyOperations",
  "hiddenRemoteCalls",
]);
const JOURNAL_FIELDS = Object.freeze([
  "operationInstance",
  "parentInterruptedM3Generation",
  "phase",
  "approvalConsumed",
  "requestBoundaryEntered",
  "responseObserved",
  "httpStatusClass",
  "transportResult",
  "responseParseResult",
  "targetRoleEvaluationResult",
  "anchorComparisonResult",
  "classifierInputComplete",
  "terminalRecoveryResult",
]);
const SENSITIVE_VALUE = /(bearer\s+|ya29\.|access[_-]?token|refresh[_-]?token|authorization:|private[_-]?key)/i;

function defaultDirectory(environment) {
  const root = environment?.LOCALAPPDATA || environment?.APPDATA;
  return typeof root === "string" && root.trim()
    ? join(root, "MY-WEB", "authority-audit", "g2b-recovery-postexec-v1")
    : null;
}

function targetFingerprint(value) {
  return createHash("sha256").update(`g2b-recovery-target-v1:${value}`, "utf8").digest("hex");
}

function safeCounters(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("postexec-counters-invalid");
  const safe = {};
  for (const key of COUNTER_KEYS) {
    const number = value[key] ?? 0;
    if (!Number.isInteger(number) || number < 0 || number > 1) throw new Error("postexec-counter-out-of-range");
    safe[key] = number;
  }
  if (safe.recoveryServiceAccountIamPolicyReads > 1 || safe.totalPhysicalRemoteRecoveryCalls > 1
    || safe.setIamPolicyCalls !== 0 || safe.iamMutations !== 0 || safe.retries !== 0
    || safe.secondRecoveryRead !== 0 || safe.m4Mutations !== 0 || safe.firestoreCalls !== 0
    || safe.credentialRefreshCalls !== 0 || safe.testIamPermissionsCalls !== 0
    || safe.tokenGenerationCalls !== 0 || safe.serviceAccountKeyOperations !== 0
    || safe.hiddenRemoteCalls !== 0) throw new Error("postexec-counter-contract-violation");
  return Object.freeze(safe);
}

function terminalJournal(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)
    || record.parentInterruptedM3Generation !== G2B_INTERRUPTED_M3_GENERATION
    || record.phase !== "TERMINAL_CLASSIFICATION_COMPLETE"
    || !TERMINAL_RESULTS.has(record.terminalRecoveryResult)) throw new Error("terminal-journal-required");
  for (const field of JOURNAL_FIELDS) {
    if (!Object.hasOwn(record, field)) throw new Error("terminal-journal-shape-invalid");
  }
  privacy(record);
  return Object.freeze(Object.fromEntries(JOURNAL_FIELDS.map((field) => [field, record[field]])));
}

function privacy(value) {
  if (typeof value === "string" && SENSITIVE_VALUE.test(value)) throw new Error("privacy-sensitive-value-rejected");
  if (Array.isArray(value)) value.forEach(privacy);
  else if (value && typeof value === "object") Object.values(value).forEach(privacy);
  return true;
}

function evidenceFrom({ journalRecord, counters, preliveCredentialState, anchorVerificationState }) {
  const journal = terminalJournal(journalRecord);
  if (preliveCredentialState !== "FRESH" || anchorVerificationState !== "VERIFIED") throw new Error("postexec-precondition-invalid");
  const evidence = Object.freeze({
    schema: G2B_RECOVERY_POSTEXEC_EVIDENCE_SCHEMA,
    operationInstance: journal.operationInstance,
    parentInterruptedM3Generation: journal.parentInterruptedM3Generation,
    targetResourceFingerprint: targetFingerprint(journalRecord.targetResource),
    targetRole: journalRecord.targetRole,
    approvalConsumptionState: journal.approvalConsumed ? "CONSUMED" : "NOT_CONSUMED",
    requestBoundaryState: journal.requestBoundaryEntered ? "ENTERED" : "NOT_ENTERED",
    physicalCallAccounting: safeCounters(counters),
    httpResponseObserved: journal.responseObserved,
    httpStatusClass: journal.httpStatusClass,
    transportResultClass: journal.transportResult,
    responseParseResult: journal.responseParseResult,
    targetRoleEvaluationResult: journal.targetRoleEvaluationResult,
    anchorComparisonResult: journal.anchorComparisonResult,
    classifierInputComplete: journal.classifierInputComplete,
    terminalRecoveryResult: journal.terminalRecoveryResult,
    currentExactBindingClassification: journal.terminalRecoveryResult === "RECOVERY_CONFIRMED_PRESENT" ? "PRESENT" : journal.terminalRecoveryResult === "RECOVERY_CONFIRMED_ABSENT" ? "ABSENT" : "NOT_ESTABLISHED",
    credentialPreliveClassification: preliveCredentialState,
    anchorVerificationClassification: anchorVerificationState,
    privacy: Object.freeze({
      rawPolicyPersisted: false,
      rawMemberPersisted: false,
      rawPrincipalPersisted: false,
      rawAccessTokenPersisted: false,
      rawRefreshTokenPersisted: false,
      rawCredentialPersisted: false,
      rawAuthorizationHeaderPersisted: false,
      rawRequestBodyPersisted: false,
      rawResponseBodyPersisted: false,
      rawStdoutPersisted: false,
      rawStderrPersisted: false,
      rawDpapiSecretPersisted: false,
    }),
  });
  privacy(evidence);
  return evidence;
}

function resultFrom(evidence) {
  const result = Object.freeze({
    schema: G2B_RECOVERY_POSTEXEC_RESULT_SCHEMA,
    operationInstance: evidence.operationInstance,
    parentInterruptedM3Generation: evidence.parentInterruptedM3Generation,
    terminalJournalState: "TERMINAL_CLASSIFICATION_COMPLETE",
    terminalRecoveryResult: evidence.terminalRecoveryResult,
    exactBindingClassification: evidence.currentExactBindingClassification,
    approvalConsumptionState: evidence.approvalConsumptionState,
    physicalCallAccounting: evidence.physicalCallAccounting,
    executionEvidenceCanonicalSha256: sha256Canonical(evidence),
    failurePhase: evidence.terminalRecoveryResult === "RECOVERY_NOT_ESTABLISHED" ? evidence.transportResultClass : "NONE",
    prohibitedOperationCounters: Object.freeze({
      setIamPolicyCalls: evidence.physicalCallAccounting.setIamPolicyCalls,
      iamMutations: evidence.physicalCallAccounting.iamMutations,
      retries: evidence.physicalCallAccounting.retries,
      secondRecoveryRead: evidence.physicalCallAccounting.secondRecoveryRead,
      m4Mutations: evidence.physicalCallAccounting.m4Mutations,
      firestoreCalls: evidence.physicalCallAccounting.firestoreCalls,
      credentialRefreshCalls: evidence.physicalCallAccounting.credentialRefreshCalls,
    }),
  });
  privacy(result);
  return result;
}

export function writeCanonicalJsonAtomically(path, value) {
  const bytes = `${canonicalJson(value)}\n`;
  if (existsSync(path)) {
    const existing = JSON.parse(readFileSync(path, "utf8"));
    if (canonicalJson(existing) !== canonicalJson(value)) throw new Error("postexec-artifact-conflict");
    return Object.freeze({ idempotent: true });
  }
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(temporary, "wx", 0o600);
    writeSync(fd, bytes, undefined, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temporary, path);
    const reread = JSON.parse(readFileSync(path, "utf8"));
    if (canonicalJson(reread) !== canonicalJson(value)) throw new Error("postexec-artifact-reread-failed");
    return Object.freeze({ idempotent: false });
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function createG2BRecoveryPostExecutionEvidenceWriter({ directory = defaultDirectory(process.env), writeArtifact = writeCanonicalJsonAtomically } = {}) {
  if (typeof directory !== "string" || !directory.trim() || typeof writeArtifact !== "function") throw new Error("postexec-writer-configuration-invalid");
  const evidencePathFor = (operationInstance) => join(directory, `${operationInstance}.execution-evidence.json`);
  const resultPathFor = (operationInstance) => join(directory, `${operationInstance}.result.json`);
  const load = (path) => {
    if (!existsSync(path)) return null;
    try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
  };
  const verify = (operationInstance) => {
    const evidence = load(evidencePathFor(operationInstance));
    const result = load(resultPathFor(operationInstance));
    if (!evidence || !result) return Object.freeze({ ok: false, code: "POSTEXEC_ARTIFACT_MISSING" });
    try {
      privacy(evidence); privacy(result);
      const resultExpected = resultFrom(evidence);
      const ok = canonicalJson(result) === canonicalJson(resultExpected)
        && /^[a-f0-9]{64}$/.test(sha256Canonical(evidence));
      return Object.freeze({ ok, code: ok ? "POSTEXEC_ARTIFACTS_VERIFIED" : "POSTEXEC_ARTIFACT_VERIFICATION_FAILED", evidence, result });
    } catch { return Object.freeze({ ok: false, code: "POSTEXEC_ARTIFACT_VERIFICATION_FAILED" }); }
  };
  const finalize = ({ journalRecord, counters, preliveCredentialState = "FRESH", anchorVerificationState = "VERIFIED" } = {}) => {
    let evidence;
    try { evidence = evidenceFrom({ journalRecord, counters, preliveCredentialState, anchorVerificationState }); }
    catch { return Object.freeze({ ok: false, finalizationState: "PENDING_LOCAL_FINALIZATION", code: "POSTEXEC_EVIDENCE_INPUT_INVALID", remoteOperations: 0 }); }
    try { writeArtifact(evidencePathFor(evidence.operationInstance), evidence); }
    catch { return Object.freeze({ ok: false, finalizationState: "PENDING_LOCAL_FINALIZATION", code: "POSTEXEC_EVIDENCE_PERSISTENCE_FAILURE", remoteOperations: 0 }); }
    const result = resultFrom(evidence);
    try { writeArtifact(resultPathFor(evidence.operationInstance), result); }
    catch { return Object.freeze({ ok: false, finalizationState: "PENDING_LOCAL_FINALIZATION", code: "POSTEXEC_RESULT_PERSISTENCE_FAILURE", executionEvidenceCanonicalSha256: sha256Canonical(evidence), remoteOperations: 0 }); }
    const verified = verify(evidence.operationInstance);
    return Object.freeze({
      ok: verified.ok,
      finalizationState: verified.ok ? "LOCAL_FINALIZATION_COMPLETE" : "PENDING_LOCAL_FINALIZATION",
      code: verified.code,
      executionEvidenceCanonicalSha256: sha256Canonical(evidence),
      independentlyRecomputedExecutionEvidenceCanonicalSha256: sha256Canonical(verified.evidence || evidence),
      resultDocumentCanonicalSha256: sha256Canonical(result),
      remoteOperations: 0,
    });
  };
  return Object.freeze({
    directory,
    evidencePathFor,
    resultPathFor,
    finalize,
    resume({ operationInstance, journal, counters, preliveCredentialState = "FRESH", anchorVerificationState = "VERIFIED" } = {}) {
      const loaded = journal?.load?.(operationInstance);
      if (loaded?.state !== "READY") return Object.freeze({ ok: false, finalizationState: "PENDING_LOCAL_FINALIZATION", code: "POSTEXEC_TERMINAL_JOURNAL_UNAVAILABLE", remoteOperations: 0 });
      return finalize({ journalRecord: loaded.record, counters, preliveCredentialState, anchorVerificationState });
    },
    verify,
  });
}

export const G2B_RECOVERY_POSTEXEC_EVIDENCE_CONTRACT = Object.freeze({
  terminalJournalPersistedBeforeEvidenceWriter: true,
  evidenceWriterCanChangeTerminalResult: false,
  resultWriterCanChangeTerminalResult: false,
  localFinalizationResumeSupported: true,
  localFinalizationRemoteCalls: 0,
  localFinalizationCanReplayIamRead: false,
  remoteReadRetryDueToEvidenceFailure: false,
  evidenceWriteAtomicOrCanonicalDurable: true,
  resultWriteAtomicOrCanonicalDurable: true,
  finalizationStates: Object.freeze([...FINALIZATION_STATES]),
});
