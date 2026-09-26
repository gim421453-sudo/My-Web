import { analyzeStderrLines } from "./gcloudStderrDiagnosticAnalyzer.mjs";

const ALLOWED_RULE_IDS = new Set([
  "GCLOUD_IMPERSONATION_NOTICE_V1",
  "GCLOUD_IMPERSONATION_CONTINUATION_V1",
  "GCLOUD_CREDENTIAL_NOTICE_V1",
  "GCLOUD_CONFIGURATION_NOTICE_V1",
  "WARNING_PREFIX_V1",
  "ERROR_PREFIX_V1",
  "TERMINAL_BLANK_V1",
]);

function byteBucket(value) {
  const count = Buffer.byteLength(typeof value === "string" ? value : "", "utf8");
  if (count === 0) return "EMPTY";
  if (count <= 255) return "B001_255";
  if (count <= 4095) return "B256_4095";
  if (count <= 65535) return "B4096_65535";
  return "B65536_PLUS";
}

function lineCount(value) {
  if (typeof value !== "string" || value.length === 0) return 0;
  return value.split(/\r\n|\n|\r/).length;
}

function policyShape(stdout) {
  if (typeof stdout !== "string" || stdout.length === 0) return "EMPTY_OUTPUT";
  try {
    const parsed = JSON.parse(stdout);
    return parsed && typeof parsed === "object" && Array.isArray(parsed.bindings)
      ? "POLICY_PARSEABLE"
      : "UNSUPPORTED_POLICY_SHAPE";
  } catch {
    return "MALFORMED_JSON";
  }
}

function safeSpawnCode(value) {
  return ["EACCES", "ENOENT", "EPERM", "ETIMEDOUT"].includes(value) ? value : value ? "OTHER" : "NONE";
}

export function projectSafeWriterPolicyReadDiagnostic(processResult) {
  const result = processResult && typeof processResult === "object" ? processResult : {};
  const lines = analyzeStderrLines(typeof result.stderr === "string" ? result.stderr : "");
  const knownRuleIds = [...new Set(lines.flatMap((line) => line.matchedRuleIds)
    .filter((ruleId) => ALLOWED_RULE_IDS.has(ruleId)))].sort();
  const unknownLineCount = lines.filter((line) => !line.isBlank && line.semanticCategory === "UNKNOWN").length;
  const parseResult = policyShape(result.stdout);
  const timedOut = result.timedOut === true;
  const spawnErrorCode = safeSpawnCode(result.spawnError?.code);
  const exitCodeKind = result.exitCode === 0 ? "ZERO" : Number.isInteger(result.exitCode) ? "NONZERO" : "UNAVAILABLE";
  const outcome = timedOut
    ? "TIMED_OUT"
    : spawnErrorCode !== "NONE"
      ? "SPAWN_FAILURE"
      : exitCodeKind === "NONZERO"
        ? "NONZERO_EXIT"
        : exitCodeKind === "UNAVAILABLE"
          ? "NO_EXIT_STATUS"
          : parseResult;

  return Object.freeze({
    outcome,
    exitCodeKind,
    timedOut,
    spawnErrorCode,
    outputByteBucket: byteBucket(result.stdout),
    outputLineCount: lineCount(result.stdout),
    outputParseResult: parseResult,
    errorByteBucket: byteBucket(result.stderr),
    errorLineCount: lineCount(result.stderr),
    errorKnownRuleIds: Object.freeze(knownRuleIds),
    errorUnknownLineCount: unknownLineCount,
  });
}

export const M3L3_READ_FAILURE_DIAGNOSTIC_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  rawOutputReturned: false,
  normalizedLineReturned: false,
  normalizedFingerprintReturned: false,
  exactIdentityReturned: false,
  policyReturned: false,
});
