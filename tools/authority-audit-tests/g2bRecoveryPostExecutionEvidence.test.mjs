import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { createG2BRecoveryExecutionJournal } from "../authority-audit/g2bRecoveryExecutionJournal.mjs";
import { createG2BRecoveryPostExecutionEvidenceWriter } from "../authority-audit/g2bRecoveryPostExecutionEvidence.mjs";

const root = mkdtempSync(join(tmpdir(), "g2b-postexec-"));
const operation = randomUUID();
const counters = Object.freeze({ recoveryServiceAccountIamPolicyReads: 1, totalPhysicalRemoteRecoveryCalls: 1 });
const journal = createG2BRecoveryExecutionJournal({ directory: join(root, "journal"), now: () => "2026-09-14T00:00:00.000Z" });

function terminal(result = "RECOVERY_CONFIRMED_ABSENT") {
  assert.equal(journal.initialize(operation).ok, true);
  assert.equal(journal.transition(operation, { phase: "APPROVAL_CONSUMED", approvalConsumed: true }).ok, true);
  assert.equal(journal.transition(operation, { phase: "REQUEST_STARTED_RESPONSE_UNKNOWN", requestBoundaryEntered: true, transportResult: "RESPONSE_UNKNOWN" }).ok, true);
  assert.equal(journal.transition(operation, { phase: "RESPONSE_OBSERVED_PARSE_PENDING", responseObserved: true, httpStatusClass: "2XX", transportResult: "SUCCESS", responseParseResult: "PENDING" }).ok, true);
  assert.equal(journal.transition(operation, { phase: "ANCHOR_COMPARISON_PENDING", responseParseResult: "SUCCESS", targetRoleEvaluationResult: "PENDING", anchorComparisonResult: "PENDING" }).ok, true);
  assert.equal(journal.transition(operation, { phase: "ANCHOR_COMPARISON_COMPLETE", targetRoleEvaluationResult: result === "RECOVERY_CONFIRMED_PRESENT" ? "ROLE_PRESENT" : "ROLE_ABSENT", anchorComparisonResult: result === "RECOVERY_CONFIRMED_PRESENT" ? "MATCH_PRESENT" : "NO_MATCH", classifierInputComplete: true }).ok, true);
  assert.equal(journal.transition(operation, { phase: "TERMINAL_CLASSIFICATION_COMPLETE", terminalRecoveryResult: result }).ok, true);
}

try {
  terminal();
  const writer = createG2BRecoveryPostExecutionEvidenceWriter({ directory: join(root, "artifacts") });
  const first = writer.resume({ operationInstance: operation, journal, counters });
  assert.equal(first.ok, true);
  assert.equal(first.executionEvidenceCanonicalSha256, first.independentlyRecomputedExecutionEvidenceCanonicalSha256);
  assert.equal(writer.verify(operation).ok, true);
  assert.equal(writer.resume({ operationInstance: operation, journal, counters }).ok, true);

  const resultPath = writer.resultPathFor(operation);
  const originalResult = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(resultPath, "utf8")));
  originalResult.terminalRecoveryResult = "RECOVERY_CONFIRMED_PRESENT";
  writeFileSync(resultPath, JSON.stringify(originalResult));
  assert.equal(writer.verify(operation).ok, false);
  writeFileSync(resultPath, JSON.stringify({
    schema: "myweb.g2b.recovery-postexec-result.v1",
    operationInstance: operation,
    parentInterruptedM3Generation: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981",
    terminalJournalState: "TERMINAL_CLASSIFICATION_COMPLETE",
    terminalRecoveryResult: "RECOVERY_CONFIRMED_ABSENT",
    exactBindingClassification: "ABSENT",
    approvalConsumptionState: "CONSUMED",
    physicalCallAccounting: { recoveryServiceAccountIamPolicyReads: 1, totalPhysicalRemoteRecoveryCalls: 1, projectIamReads: 0, setIamPolicyCalls: 0, iamMutations: 0, retries: 0, secondRecoveryRead: 0, m4Mutations: 0, firestoreCalls: 0, credentialRefreshCalls: 0, testIamPermissionsCalls: 0, tokenGenerationCalls: 0, serviceAccountKeyOperations: 0, hiddenRemoteCalls: 0 },
    executionEvidenceCanonicalSha256: first.executionEvidenceCanonicalSha256,
    failurePhase: "NONE",
    prohibitedOperationCounters: { setIamPolicyCalls: 0, iamMutations: 0, retries: 0, secondRecoveryRead: 0, m4Mutations: 0, firestoreCalls: 0, credentialRefreshCalls: 0 },
  }));
  assert.equal(writer.verify(operation).ok, true);

  const evidencePath = writer.evidencePathFor(operation);
  const original = JSON.parse(await import("node:fs/promises").then(({ readFile }) => readFile(evidencePath, "utf8")));
  original.terminalRecoveryResult = "RECOVERY_CONFIRMED_PRESENT";
  writeFileSync(evidencePath, JSON.stringify(original));
  assert.equal(writer.verify(operation).ok, false);

  const failedWriter = createG2BRecoveryPostExecutionEvidenceWriter({ directory: join(root, "failure"), writeArtifact: () => { throw new Error("fixture-write-failure"); } });
  const failed = failedWriter.resume({ operationInstance: operation, journal, counters });
  assert.equal(failed.finalizationState, "PENDING_LOCAL_FINALIZATION");
  assert.equal(failed.remoteOperations, 0);

  const incomplete = createG2BRecoveryPostExecutionEvidenceWriter({ directory: join(root, "resume"), writeArtifact: (path, value) => {
    if (path.endsWith(".result.json")) throw new Error("fixture-result-interruption");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(value));
  } });
  assert.equal(incomplete.resume({ operationInstance: operation, journal, counters }).finalizationState, "PENDING_LOCAL_FINALIZATION");
  const resumed = createG2BRecoveryPostExecutionEvidenceWriter({ directory: join(root, "resume") });
  assert.equal(resumed.resume({ operationInstance: operation, journal, counters }).ok, true);
  assert.equal(resumed.verify(operation).ok, true);
  const sensitive = writer.finalize({ journalRecord: { ...journal.load(operation).record, ignored: "Bearer fixture-only-secret" }, counters });
  assert.equal(sensitive.code, "POSTEXEC_EVIDENCE_INPUT_INVALID");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("G2B post-execution evidence/result finalization matrix passed; fake terminal journals only; remote operations=0");
