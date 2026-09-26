import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AUTHORITY_QUALIFICATION_MANIFEST } from "./authorityQualificationManifest.mjs";
import { classifyQualificationResult, sortQualificationEntries, summarizeQualificationResults, validateQualificationManifest } from "./runAuthorityQualification.mjs";

const root = mkdtempSync(join(tmpdir(), "myweb-authority-qualification-selftest-"));
try {
  const bytes = Buffer.from("classification fixture evidence\n");
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "README.md"), "fixture\n");
  writeFileSync(join(root, "docs", "replacement.mjs"), "replacement\n");
  writeFileSync(join(root, "docs", "classification.md"), bytes);
  const evidence = { path: "docs/classification.md", sha256: createHash("sha256").update(bytes).digest("hex"),
    currentPathIndependent: true, replacementTestIds: ["replacement-test"] };
  const entry = (overrides = {}) => ({ id: "unit", path: "README.md", executionCommand: [process.execPath, "README.md"],
    category: "CURRENT_SECURITY", productionReachability: "TEST_ONLY", qualificationRequired: true,
    expectedClassification: "MUST_PASS", classificationEvidence: null, environmentRequirement: "LOCAL_NODE", timeoutMs: 1000,
    ...overrides });
  const base = { status: "PASS", exitCode: 0, stdoutSha256: "a".repeat(64), stderrSha256: "b".repeat(64) };

  assert.equal(validateQualificationManifest(AUTHORITY_QUALIFICATION_MANIFEST).ok, true, "canonical manifest validates against repository files");
  const manifest = (qualificationId, entries) => ({ schemaVersion: 1, qualificationId,
    createdAt: "2026-09-26", updatedAt: "2026-09-26", entries });
  assert.equal(validateQualificationManifest(manifest("dup", [entry(), entry()]), { repositoryRoot: root }).code,
    "MANIFEST_DUPLICATE_OR_INVALID_ID");
  assert.equal(validateQualificationManifest(manifest("missing", [entry({ path: "absent.mjs" })]), { repositoryRoot: root }).code,
    "MANIFEST_FILE_MISSING");
  assert.equal(validateQualificationManifest(manifest("invalid-class", [entry({ expectedClassification: "GUESS" })]), { repositoryRoot: root }).code,
    "MANIFEST_METADATA_INVALID");
  assert.equal(validateQualificationManifest(manifest("invalid-evidence",
    [entry({ expectedClassification: "HISTORICAL_EXPECTED_FAILURE", classificationEvidence: { ...evidence, sha256: "0".repeat(64) } })]), { repositoryRoot: root }).code,
  "MANIFEST_CLASSIFICATION_EVIDENCE_INVALID");
  assert.equal(validateQualificationManifest(manifest("missing-replacement",
    [entry({ expectedClassification: "HISTORICAL_EXPECTED_FAILURE", classificationEvidence: evidence })]), { repositoryRoot: root }).code,
  "MANIFEST_CLASSIFICATION_EVIDENCE_INVALID");
  assert.equal(validateQualificationManifest(manifest("valid-replacement", [
    entry({ expectedClassification: "HISTORICAL_EXPECTED_FAILURE", classificationEvidence: evidence,
      expectedFailureSignature: { exitCode: 1, failureSummary: "SAFE_FAILURE" } }),
    entry({ id: "replacement-test", path: "docs/replacement.mjs", executionCommand: [process.execPath, "docs/replacement.mjs"] }),
  ]), { repositoryRoot: root }).ok, true);

  assert.equal(classifyQualificationResult(entry(), base), "PASS", "all MUST_PASS successes qualify");
  assert.equal(classifyQualificationResult(entry(), { ...base, status: "FAIL", exitCode: 1 }), "CURRENT_REGRESSION");
  const historical = entry({ expectedClassification: "HISTORICAL_EXPECTED_FAILURE", classificationEvidence: evidence,
    expectedFailureSignature: { exitCode: 1, failureSummary: "SAFE_FAILURE", stderrSha256: "b".repeat(64) } });
  const obsolete = entry({ expectedClassification: "OBSOLETE_EXPECTED_FAILURE", classificationEvidence: evidence,
    expectedFailureSignature: { exitCode: 2, failureSummary: "OBSOLETE_FAILURE" } });
  const staleFixture = entry({ expectedClassification: "STALE_TEST_FIXTURE", classificationEvidence: evidence,
    expectedFailureSignature: { exitCode: 1, failureSummary: "STALE_FIXTURE" } });
  assert.equal(classifyQualificationResult(historical, { ...base, status: "FAIL", exitCode: 1, failureSummary: "SAFE_FAILURE" }), "HISTORICAL_IMMUTABLE");
  assert.equal(classifyQualificationResult(obsolete, { ...base, status: "FAIL", exitCode: 2, failureSummary: "OBSOLETE_FAILURE" }), "OBSOLETE_CONTRACT");
  assert.equal(classifyQualificationResult(staleFixture, { ...base, status: "FAIL", exitCode: 1, failureSummary: "STALE_FIXTURE" }), "STALE_TEST_FIXTURE");
  assert.equal(classifyQualificationResult(entry(), { ...base, status: "ENVIRONMENT_BLOCKED", exitCode: null }), "ENVIRONMENT_BLOCKED");
  assert.equal(classifyQualificationResult(entry({ expectedClassification: "UNCLASSIFIED" }), { ...base, status: "FAIL", exitCode: 1 }), "UNCLASSIFIED");
  assert.equal(classifyQualificationResult(entry({ expectedClassification: "ENVIRONMENT_DEPENDENT" }), { ...base, status: "ENVIRONMENT_BLOCKED", exitCode: null }), "ENVIRONMENT_BLOCKED");
  assert.equal(classifyQualificationResult(historical, { ...base, status: "FAIL", exitCode: 1, failureSummary: "SAFE_FAILURE", stderrSha256: "c".repeat(64) }), "UNCLASSIFIED");
  assert.equal(classifyQualificationResult(historical, base), "UNCLASSIFIED_UNEXPECTED_PASS");

  const sorted = sortQualificationEntries([{ id: "z" }, { id: "a" }]);
  assert.deepEqual(sorted.map(({ id }) => id), ["a", "z"]);
  const summary = summarizeQualificationResults([entry()], [base], "f".repeat(64));
  assert.deepEqual({ total: summary.totalEntries, passed: summary.passedEntries, failed: summary.failedEntries,
    blocked: summary.environmentBlockedCount, unclassified: summary.unclassifiedCount, status: summary.finalStatus },
  { total: 1, passed: 1, failed: 0, blocked: 0, unclassified: 0, status: "PASS" });
  console.log(`Authority qualification runner self-tests passed; manifest entries=${AUTHORITY_QUALIFICATION_MANIFEST.entries.length}`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
