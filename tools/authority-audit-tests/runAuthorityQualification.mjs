import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { AUTHORITY_QUALIFICATION_MANIFEST } from "./authorityQualificationManifest.mjs";

const CLASSIFICATIONS = new Set(["MUST_PASS", "HISTORICAL_EXPECTED_FAILURE", "OBSOLETE_EXPECTED_FAILURE", "ENVIRONMENT_DEPENDENT", "STALE_TEST_FIXTURE", "UNCLASSIFIED"]);
const CATEGORIES = new Set(["CURRENT_SECURITY", "CURRENT_BOOTSTRAP", "CURRENT_CAS", "CURRENT_TRANSPORT", "CURRENT_RESPONSE_PARSER"]);
const REACHABILITY = new Set(["CURRENT_PRODUCTION", "SHARED_COMPATIBILITY", "HISTORICAL_ONLY", "TEST_ONLY"]);
const ENVIRONMENTS = new Set(["LOCAL_NODE", "TRUSTED_PYTHON", "TRUSTED_WINDOWS_CURRENT_USER", "LOCAL_FIRESTORE_EMULATOR"]);
const SHA256 = /^[a-f0-9]{64}$/;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const safePath = (value) => typeof value === "string" && value.length > 0 && !value.startsWith("/")
  && !/^[a-z]:/i.test(value) && value.replace(/\\/g, "/").split("/").every((part) => part && part !== "." && part !== "..");

export function validateQualificationManifest(manifest, { repositoryRoot = process.cwd() } = {}) {
  if (!manifest || manifest.schemaVersion !== 1 || typeof manifest.qualificationId !== "string"
    || typeof manifest.createdAt !== "string" || typeof manifest.updatedAt !== "string"
    || !Array.isArray(manifest.entries) || manifest.entries.length === 0) return { ok: false, code: "MANIFEST_SCHEMA_INVALID" };
  const ids = new Set();
  const paths = new Set();
  const manifestIds = new Set(manifest.entries.map((entry) => entry?.id).filter((id) => typeof id === "string"));
  for (const entry of manifest.entries) {
    if (!entry || typeof entry.id !== "string" || !entry.id || ids.has(entry.id)) return { ok: false, code: "MANIFEST_DUPLICATE_OR_INVALID_ID" };
    if (!safePath(entry.path) || paths.has(entry.path)) return { ok: false, code: "MANIFEST_DUPLICATE_OR_INVALID_PATH" };
    if (!existsSync(resolve(repositoryRoot, entry.path))) return { ok: false, code: "MANIFEST_FILE_MISSING", entryId: entry.id };
    if (!Array.isArray(entry.executionCommand) || entry.executionCommand.length < 2
      || ![process.execPath, "python"].includes(entry.executionCommand[0])) return { ok: false, code: "MANIFEST_COMMAND_INVALID", entryId: entry.id };
    if (typeof entry.executionCommand[1] !== "string") return { ok: false, code: "MANIFEST_COMMAND_INVALID", entryId: entry.id };
    const commandTarget = entry.executionCommand[1].replace(/\\/g, "/");
    const expectedTarget = entry.path;
    const emulatorWrapper = entry.path.endsWith("authorityInventory.integration.mjs")
      && commandTarget === "tools/authority-audit-tests/run-emulator.mjs";
    if (commandTarget !== expectedTarget && !emulatorWrapper) return { ok: false, code: "MANIFEST_COMMAND_TARGET_MISMATCH", entryId: entry.id };
    if (!CATEGORIES.has(entry.category) || !REACHABILITY.has(entry.productionReachability)
      || !CLASSIFICATIONS.has(entry.expectedClassification) || !ENVIRONMENTS.has(entry.environmentRequirement)
      || entry.qualificationRequired !== true || !Number.isSafeInteger(entry.timeoutMs) || entry.timeoutMs < 1) {
      return { ok: false, code: "MANIFEST_METADATA_INVALID", entryId: entry.id };
    }
    if (!["MUST_PASS", "UNCLASSIFIED"].includes(entry.expectedClassification)) {
      const evidence = entry.classificationEvidence;
      if (!evidence || !safePath(evidence.path) || !SHA256.test(evidence.sha256 || "")
        || evidence.currentPathIndependent !== true || !Array.isArray(evidence.replacementTestIds)
        || evidence.replacementTestIds.length === 0 || !existsSync(resolve(repositoryRoot, evidence.path))
        || evidence.replacementTestIds.some((id) => !manifestIds.has(id)
          || manifest.entries.find((candidate) => candidate.id === id)?.expectedClassification !== "MUST_PASS")
        || !entry.expectedFailureSignature || !Number.isInteger(entry.expectedFailureSignature.exitCode)
        || typeof entry.expectedFailureSignature.failureSummary !== "string"
        || digest(readFileSync(resolve(repositoryRoot, evidence.path))) !== evidence.sha256) {
        return { ok: false, code: "MANIFEST_CLASSIFICATION_EVIDENCE_INVALID", entryId: entry.id };
      }
    }
    ids.add(entry.id);
    paths.add(entry.path);
  }
  return { ok: true, entryCount: manifest.entries.length };
}

export function classifyQualificationResult(entry, result) {
  if (result.status === "ENVIRONMENT_BLOCKED" || result.failureSummary === "ERROR_AUTHORITY_AUDIT_EMULATOR_PREFLIGHT_FAILED") return "ENVIRONMENT_BLOCKED";
  if (result.status === "PASS") {
    return ["MUST_PASS", "ENVIRONMENT_DEPENDENT", "UNCLASSIFIED"].includes(entry.expectedClassification)
      ? "PASS" : "UNCLASSIFIED_UNEXPECTED_PASS";
  }
  if (entry.expectedClassification === "UNCLASSIFIED") return "UNCLASSIFIED";
  if (entry.expectedClassification === "ENVIRONMENT_DEPENDENT") return "UNCLASSIFIED";
  if (entry.expectedClassification === "MUST_PASS") return "CURRENT_REGRESSION";
  const evidence = entry.classificationEvidence;
  const expected = entry.expectedFailureSignature;
  const matched = evidence && expected && result.exitCode === expected.exitCode
    && result.failureSummary === expected.failureSummary
    && (!expected.stdoutSha256 || result.stdoutSha256 === expected.stdoutSha256)
    && (!expected.stderrSha256 || result.stderrSha256 === expected.stderrSha256);
  if (!matched) return "UNCLASSIFIED";
  if (entry.expectedClassification === "HISTORICAL_EXPECTED_FAILURE") return "HISTORICAL_IMMUTABLE";
  if (entry.expectedClassification === "OBSOLETE_EXPECTED_FAILURE") return "OBSOLETE_CONTRACT";
  if (entry.expectedClassification === "STALE_TEST_FIXTURE") return "STALE_TEST_FIXTURE";
  return "UNCLASSIFIED";
}

export function summarizeQualificationResults(entries, results, sourceFingerprint = null) {
  const classified = results.map((result, index) => ({ ...result,
    classification: classifyQualificationResult(entries[index], result) }));
  const count = (predicate) => classified.filter(predicate).length;
  const historicalClassified = count((item) => item.classification === "HISTORICAL_IMMUTABLE");
  const obsoleteClassified = count((item) => item.classification === "OBSOLETE_CONTRACT");
  const staleFixtureCount = count((item) => item.classification === "STALE_TEST_FIXTURE");
  const currentRegressionCount = count((item) => item.classification === "CURRENT_REGRESSION");
  const environmentBlockedCount = count((item) => item.classification === "ENVIRONMENT_BLOCKED");
  const unclassifiedCount = count((item) => item.classification.startsWith("UNCLASSIFIED"));
  const passedEntries = count((item) => item.status === "PASS");
  const failedEntries = classified.length - passedEntries - environmentBlockedCount;
  return Object.freeze({ schemaVersion: 1, qualificationId: AUTHORITY_QUALIFICATION_MANIFEST.qualificationId,
    sourceFingerprint, totalEntries: classified.length, passedEntries, failedEntries,
    historicalClassified, obsoleteClassified, staleFixtureCount, currentRegressionCount, environmentBlockedCount, unclassifiedCount,
    unresolvedCount: unclassifiedCount,
    newUnclassifiedFailures: unclassifiedCount,
    entries: Object.freeze(classified),
    finalStatus: currentRegressionCount === 0 && environmentBlockedCount === 0 && unclassifiedCount === 0 ? "PASS" : "BLOCK" });
}

function sanitizedEnvironment(source) {
  const allow = ["PATH", "SystemRoot", "WINDIR", "LOCALAPPDATA", "USERPROFILE", "APPDATA", "HOME", "TEMP", "TMP",
    "PROCESSOR_ARCHITECTURE", "USERNAME", "USERDOMAIN", "COMPUTERNAME", "HOMEDRIVE", "HOMEPATH", "OS", "PATHEXT"];
  const env = Object.fromEntries(allow.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
  env.CI = "true";
  env.G2B_QUALIFICATION_REMOTE_CALLS = "0";
  return env;
}

function safeFailureSummary(stdout, stderr) {
  const combined = `${Buffer.isBuffer(stdout) ? stdout.toString("utf8") : stdout || ""}\n${Buffer.isBuffer(stderr) ? stderr.toString("utf8") : stderr || ""}`;
  if (/Could not start Firestore Emulator, port taken/i.test(combined)) return "ERROR_AUTHORITY_AUDIT_EMULATOR_PORT_CONFLICT";
  const assertion = combined.match(/AssertionError(?: \[([A-Z0-9_]+)\])?/);
  const location = combined.match(/([A-Za-z0-9_.-]+\.mjs):(\d+):\d+/);
  const named = combined.match(/^\s*(?:not ok|FAIL|failed)\s*[-:]?\s*([A-Za-z0-9 ._/-]{1,100})\s*$/im);
  const coded = combined.match(/(?:Error|failureCode|code)\s*[:=]\s*["']?([A-Z][A-Z0-9_-]{2,95})/);
  if (assertion) return `${assertion[1] || "ASSERTION"}${location ? `_LINE_${location[2]}` : ""}`;
  if (named) return `TEST_${named[1].trim().replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 72)}`;
  if (coded) return `ERROR_${coded[1]}`;
  return "NONZERO_EXIT_WITHOUT_SAFE_SUMMARY";
}

export function sortQualificationEntries(entries) {
  return [...entries].sort((a, b) => a.id.localeCompare(b.id, "en"));
}

function runEntry(entry, repositoryRoot) {
  const [command, ...args] = entry.executionCommand;
  const started = Date.now();
  let result;
  try {
    result = spawnSyncImpl(command, args, { cwd: repositoryRoot, env: sanitizedEnvironment(process.env),
      windowsHide: true, shell: false, timeout: entry.timeoutMs, maxBuffer: 8 * 1024 * 1024 });
  } catch (error) {
    const status = ["EPERM", "EACCES", "ENOENT"].includes(error?.code) ? "ENVIRONMENT_BLOCKED" : "FAIL";
    const stdout = Buffer.alloc(0);
    const stderr = Buffer.alloc(0);
    return { id: entry.id, path: entry.path, status, exitCode: null, signal: null,
      errorCode: typeof error?.code === "string" ? error.code : "UNKNOWN",
      failureSummary: `SPAWN_${typeof error?.code === "string" ? error.code : "UNKNOWN"}`,
      durationMs: Date.now() - started, stdoutBytes: 0, stderrBytes: 0,
      stdoutSha256: digest(stdout), stderrSha256: digest(stderr) };
  }
  const stdout = Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || "");
  const stderr = Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr || "");
  const errorCode = result.error?.code || null;
  const summary = result.status === 0 ? null : safeFailureSummary(stdout, stderr);
  const status = ["EPERM", "EACCES", "ENOENT"].includes(errorCode)
    || summary === "ERROR_AUTHORITY_AUDIT_EMULATOR_PORT_CONFLICT" ? "ENVIRONMENT_BLOCKED"
    : result.status === 0 ? "PASS" : "FAIL";
  return { id: entry.id, path: entry.path, status,
    exitCode: Number.isInteger(result.status) ? result.status : null,
    signal: result.signal || null, errorCode,
    failureSummary: status === "PASS" ? null : summary,
    durationMs: Date.now() - started, stdoutBytes: stdout.byteLength, stderrBytes: stderr.byteLength,
    stdoutSha256: digest(stdout), stderrSha256: digest(stderr) };
}

let spawnSyncImpl;

export async function runAuthorityQualification({ manifest = AUTHORITY_QUALIFICATION_MANIFEST,
  repositoryRoot = process.cwd(), sourceFingerprint = null, entryIds = null } = {}) {
  const validation = validateQualificationManifest(manifest, { repositoryRoot });
  if (!validation.ok) return { finalStatus: "BLOCK", validation };
  const { spawnSync } = await import("node:child_process");
  spawnSyncImpl = spawnSync;
  const selectedEntries = entryIds === null ? manifest.entries : manifest.entries.filter((entry) => entryIds.includes(entry.id));
  if (selectedEntries.length === 0 || entryIds !== null && selectedEntries.length !== entryIds.length) {
    return { finalStatus: "BLOCK", validation: { ok: false, code: "ENTRY_SELECTION_INVALID" } };
  }
  const entries = sortQualificationEntries(selectedEntries);
  const results = entries.map((entry) => runEntry(entry, repositoryRoot));
  let currentFingerprint = sourceFingerprint;
  if (currentFingerprint === null) {
    const source = await import("../authority-audit/g2bCanonicalSourceFingerprint.mjs");
    const sourceEntries = source.currentG2BCasSourceEntries({ repositoryRoot });
    currentFingerprint = source.computeCanonicalSourceFingerprint(sourceEntries);
  }
  return summarizeQualificationResults(entries, results, currentFingerprint);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const onlyIndex = process.argv.indexOf("--only");
  const entryIds = onlyIndex >= 0 ? (process.argv[onlyIndex + 1] || "").split(",").filter(Boolean) : null;
  const result = await runAuthorityQualification({ entryIds });
  const report = process.argv.includes("--compact") ? {
    ...Object.fromEntries(Object.entries(result).filter(([key]) => key !== "entries")),
    failures: result.entries.filter((entry) => entry.status !== "PASS").map((entry) => ({
      id: entry.id, path: entry.path, status: entry.status, exitCode: entry.exitCode,
      errorCode: entry.errorCode, failureSummary: entry.failureSummary, classification: entry.classification,
    })),
  } : result;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (result.finalStatus !== "PASS") process.exitCode = 1;
}
