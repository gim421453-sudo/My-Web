import assert from "node:assert/strict";
import { classifyImpersonatedTokenProcessResult } from "../authority-audit/gcloudTokenOutputClassifier.mjs";

const token = "synthetic-valid-access-token-123456";
const warning = "WARNING: This command is using service account impersonation.\nAll API calls will be executed as [redacted-audit-principal].\n";
const classify = (overrides = {}) => classifyImpersonatedTokenProcessResult({
  exitCode: 0,
  stdout: token,
  stderr: "",
  timedOut: false,
  ...overrides,
});

const acceptedWarning = classify({ stderr: warning });
assert.equal(acceptedWarning.ok, false);
assert.equal(acceptedWarning.reason, "unknown-stderr");
assert.equal(acceptedWarning.diagnostic.classifierAccepted, "no");
assert.equal(acceptedWarning.diagnostic.providerAccepted, "not_reached");
assert.equal(acceptedWarning.diagnostic.stderrClassification, "UNKNOWN");
assert.equal(acceptedWarning.diagnostic.stderrLines.length, 3);
assert.equal(acceptedWarning.diagnostic.stderrLines[0].prefixCategory, "WARNING");
assert.equal(acceptedWarning.diagnostic.stderrLines[0].semanticCategory, "IMPERSONATION_NOTICE");
assert.equal(acceptedWarning.diagnostic.stderrLines[1].semanticCategory, "IMPERSONATION_NOTICE");
assert.equal(acceptedWarning.diagnostic.stderrLines[2].isBlank, true);
assert.equal(acceptedWarning.diagnostic.stderrDiagnosticLines[0].normalizedTemplateId, "LOCAL_GCLOUD_IMPERSONATION_TEMPLATE_01");
assert.equal(acceptedWarning.diagnostic.stderrDiagnosticLines[1].normalizedTemplateId, "LOCAL_GCLOUD_IMPERSONATION_TEMPLATE_02");
assert.equal(acceptedWarning.diagnostic.stderrDiagnosticLines[2].matchedRuleIds.includes("TERMINAL_BLANK_V1"), true);
assert.equal(acceptedWarning.diagnostic.stdoutPresent, true);
assert.equal(acceptedWarning.diagnostic.stdoutLineCount, 1);
assert.equal(acceptedWarning.diagnostic.stdoutTerminalNewlineKind, "NONE");
assert.equal(JSON.stringify(acceptedWarning.diagnostic).includes(token), false);

const acceptedEmptyStderr = classify();
assert.equal(acceptedEmptyStderr.ok, true);
assert.equal(acceptedEmptyStderr.diagnostic.stderrClassification, "EMPTY");
assert.equal(acceptedEmptyStderr.diagnostic.classifierReason, "EMPTY_STDERR_ACCEPTED");
assert.equal(acceptedEmptyStderr.diagnostic.stderrLines.length, 1);

const unknownStderr = classify({ stderr: "WARNING: unrelated warning" });
assert.equal(unknownStderr.reason, "unknown-stderr");
assert.equal(unknownStderr.diagnostic.stderrClassification, "UNKNOWN");
assert.equal(unknownStderr.diagnostic.classifierReason, "UNKNOWN_STDERR");
assert.equal(unknownStderr.diagnostic.stderrLines[0].prefixCategory, "WARNING");
assert.equal(unknownStderr.diagnostic.stderrLines[0].semanticCategory, "UNKNOWN");
assert.equal(unknownStderr.diagnostic.stderrDiagnosticLines[0].normalizedTemplateId, "UNKNOWN_TEMPLATE");

const nonzero = classify({ exitCode: 7, stderr: warning });
assert.equal(nonzero.reason, "nonzero-exit");
assert.equal(nonzero.diagnostic.classifierReason, "NONZERO_EXIT");

assert.equal(classify({ exitCode: 7, stderr: "permission denied" }).ok, false);

const empty = classify({ stdout: "" });
assert.equal(empty.reason, "invalid-token-output");
assert.equal(empty.diagnostic.stdoutPresent, false);
assert.equal(empty.diagnostic.stdoutCharCount, 0);
assert.equal(empty.diagnostic.classifierReason, "EMPTY_STDOUT");

const multiline = classify({ stdout: "one\ntwo", stderr: warning });
assert.equal(multiline.reason, "invalid-token-output");
assert.equal(multiline.diagnostic.stdoutLineCount, 2);
assert.equal(multiline.diagnostic.stdoutTerminalNewlineKind, "NONE");
assert.equal(multiline.diagnostic.classifierReason, "MULTILINE_STDOUT");

const malformed = classify({ stdout: "not a token", stderr: warning });
assert.equal(malformed.reason, "invalid-token-output");
assert.equal(malformed.diagnostic.classifierReason, "MALFORMED_TOKEN");

const lf = classify({ stdout: `${token}\n` });
assert.equal(lf.diagnostic.stdoutTerminalNewlineKind, "LF");
assert.equal(lf.diagnostic.stdoutLineCount, 2);
const crlf = classify({ stdout: `${token}\r\n` });
assert.equal(crlf.diagnostic.stdoutTerminalNewlineKind, "CRLF");
assert.equal(crlf.diagnostic.stdoutLineCount, 2);

const timeout = classify({ timedOut: true, stderr: warning });
assert.equal(timeout.reason, "timeout");
assert.equal(timeout.diagnostic.classifierReason, "TIMED_OUT");

const unsupported = classify({ operation: "generic-gcloud-command", stderr: warning });
assert.equal(unsupported.reason, "unsupported-operation");
assert.equal(unsupported.diagnostic.classifierReason, "UNSUPPORTED_OPERATION");

console.log("gcloud token stderr classifier local validation passed");
