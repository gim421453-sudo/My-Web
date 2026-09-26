import { analyzeStderrLines } from "./gcloudStderrDiagnosticAnalyzer.mjs";

const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{20,}$/;

function lineCount(value) {
  if (typeof value !== "string" || value.length === 0) return 0;
  return value.split(/\r\n|\n|\r/).length;
}

function terminalNewlineKind(value) {
  if (typeof value !== "string" || value.length === 0) return "NONE";
  if (value.endsWith("\r\n")) return "CRLF";
  if (value.endsWith("\n")) return "LF";
  if (value.endsWith("\r")) return "OTHER";
  return "NONE";
}

function structuralMetadata(value) {
  const present = typeof value === "string" && value.length > 0;
  return Object.freeze({
    present,
    charCount: typeof value === "string" ? value.length : null,
    lineCount: typeof value === "string" ? lineCount(value) : null,
    leadingWhitespace: present ? /^\s/.test(value) : false,
    trailingWhitespace: present ? /\s$/.test(value) : false,
    terminalNewlineKind: typeof value === "string" ? terminalNewlineKind(value) : "NOT_AVAILABLE",
  });
}

function stderrLineCategory(line) {
  const trimmed = line.trim();
  if (!trimmed) return Object.freeze({ prefixCategory: "EMPTY", semanticCategory: "UNKNOWN" });
  const prefixCategory = /^(WARNING|WARN)\b/i.test(trimmed)
    ? "WARNING"
    : /^(ERROR|ERR)\b/i.test(trimmed)
      ? "ERROR"
      : /^INFO\b/i.test(trimmed)
        ? "INFO"
        : "OTHER";
  const semanticCategory = /service account impersonation|all api calls will be executed as/i.test(trimmed)
    ? "IMPERSONATION_NOTICE"
    : /credential/i.test(trimmed)
      ? "CREDENTIAL_NOTICE"
      : /sdk|configuration/i.test(trimmed)
        ? "SDK_CONFIGURATION_NOTICE"
        : "UNKNOWN";
  return Object.freeze({ prefixCategory, semanticCategory });
}

function safeStderrLines(stderr) {
  if (typeof stderr !== "string") return Object.freeze([]);
  return Object.freeze(stderr.split(/\r\n|\n|\r/).map((line, index) => {
    const category = stderrLineCategory(line);
    return Object.freeze({
      index,
      charCount: line.length,
      isBlank: line.trim() === "",
      ...category,
    });
  }));
}

function processDiagnostic({
  processStarted,
  exitCode,
  timedOut,
  stdout,
  stderr,
  stderrClassification,
  classifierAccepted,
  classifierReason,
  providerAccepted = "not_reached",
  providerReason = "not_reached",
}) {
  const stdoutMeta = structuralMetadata(stdout);
  const stderrMeta = structuralMetadata(stderr);
  return Object.freeze({
    processStarted,
    exitCode: Number.isInteger(exitCode) ? exitCode : null,
    timedOut: timedOut === true,
    stdoutPresent: stdoutMeta.present,
    stdoutCharCount: stdoutMeta.charCount,
    stdoutLineCount: stdoutMeta.lineCount,
    stdoutLeadingWhitespace: stdoutMeta.leadingWhitespace,
    stdoutTrailingWhitespace: stdoutMeta.trailingWhitespace,
    stdoutTerminalNewlineKind: stdoutMeta.terminalNewlineKind,
    stderrPresent: stderrMeta.present,
    stderrCharCount: stderrMeta.charCount,
    stderrLineCount: stderrMeta.lineCount,
    stderrClassification,
    stderrLines: safeStderrLines(stderr),
    stderrDiagnosticLines: analyzeStderrLines(stderr),
    classifierAccepted,
    classifierReason,
    providerAccepted,
    providerReason,
  });
}

function validToken(stdout) {
  if (typeof stdout !== "string") return null;
  const token = stdout.trim();
  if (!token || token.includes("\n") || !TOKEN_PATTERN.test(token)) return null;
  return token;
}

function classifyStderr(stderr) {
  if (typeof stderr !== "string" || stderr.trim() === "") return "empty";
  return "unknown";
}

export function classifyImpersonatedTokenProcessResult({
  operation = "impersonated-access-token",
  exitCode,
  stdout,
  stderr,
  timedOut = false,
} = {}) {
  const processStarted = typeof exitCode === "number" || typeof stdout === "string" || typeof stderr === "string" || timedOut === true;
  if (operation !== "impersonated-access-token") {
    return Object.freeze({
      ok: false,
      reason: "unsupported-operation",
      diagnostic: processDiagnostic({
        processStarted,
        exitCode,
        timedOut,
        stdout,
        stderr,
        stderrClassification: classifyStderr(stderr).toUpperCase().replaceAll("-", "_"),
        classifierAccepted: "no",
        classifierReason: "UNSUPPORTED_OPERATION",
      }),
    });
  }
  const stderrClassification = classifyStderr(stderr).toUpperCase().replaceAll("-", "_");
  if (timedOut) return Object.freeze({
    ok: false,
    reason: "timeout",
    diagnostic: processDiagnostic({ processStarted, exitCode, timedOut, stdout, stderr, stderrClassification, classifierAccepted: "no", classifierReason: "TIMED_OUT" }),
  });
  if (exitCode !== 0) return Object.freeze({
    ok: false,
    reason: "nonzero-exit",
    diagnostic: processDiagnostic({ processStarted, exitCode, timedOut, stdout, stderr, stderrClassification, classifierAccepted: "no", classifierReason: "NONZERO_EXIT" }),
  });
  const token = validToken(stdout);
  if (!token) return Object.freeze({
    ok: false,
    reason: "invalid-token-output",
    diagnostic: processDiagnostic({
      processStarted,
      exitCode,
      timedOut,
      stdout,
      stderr,
      stderrClassification,
      classifierAccepted: "no",
      classifierReason: typeof stdout === "string" && stdout.length === 0 ? "EMPTY_STDOUT" : typeof stdout === "string" && (stdout.includes("\n") || stdout.includes("\r")) ? "MULTILINE_STDOUT" : "MALFORMED_TOKEN",
    }),
  });
  const stderrClass = classifyStderr(stderr);
  if (stderrClass === "unknown") return Object.freeze({
    ok: false,
    reason: "unknown-stderr",
    diagnostic: processDiagnostic({ processStarted, exitCode, timedOut, stdout, stderr, stderrClassification, classifierAccepted: "no", classifierReason: "UNKNOWN_STDERR" }),
  });
  return Object.freeze({
    ok: true,
    reason: stderrClass,
    token,
    diagnostic: processDiagnostic({
      processStarted,
      exitCode,
      timedOut,
      stdout,
      stderr,
      stderrClassification,
      classifierAccepted: "yes",
      classifierReason: "EMPTY_STDERR_ACCEPTED",
    }),
  });
}

export const KNOWN_BENIGN_IMPERSONATION_WARNING = "KNOWN_BENIGN_GCLOUD_IMPERSONATION_WARNING";
