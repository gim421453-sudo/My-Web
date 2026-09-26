import assert from "node:assert/strict";
import {
  analyzeStderrLine,
  analyzeStderrLines,
  classifySafeStderr,
} from "../authority-audit/gcloudStderrDiagnosticAnalyzer.mjs";

const known = analyzeStderrLines([
  "WARNING: This command is using service account impersonation.",
  "All API calls will be executed as [<AUDIT_SA>].",
  "",
].join("\n"));
assert.equal(known[0].normalizedTemplateId, "LOCAL_GCLOUD_IMPERSONATION_TEMPLATE_01");
assert.ok(known[0].matchedRuleIds.includes("GCLOUD_IMPERSONATION_NOTICE_V1"));
assert.equal(known[1].normalizedTemplateId, "LOCAL_GCLOUD_IMPERSONATION_TEMPLATE_02");
assert.ok(known[1].matchedRuleIds.includes("GCLOUD_IMPERSONATION_CONTINUATION_V1"));
assert.ok(known[2].matchedRuleIds.includes("TERMINAL_BLANK_V1"));

const unknown = analyzeStderrLine("WARNING: unrelated diagnostic 8742");
assert.equal(unknown.semanticCategory, "UNKNOWN");
assert.equal(unknown.normalizedTemplateId, "UNKNOWN_TEMPLATE");
assert.ok(unknown.normalizedFingerprint.startsWith("sha256:"));
assert.equal(unknown.matchedRuleIds.includes("WARNING_PREFIX_V1"), true);

const emailA = analyzeStderrLine("WARNING: account alpha@example.test cannot continue");
const emailB = analyzeStderrLine("WARNING: account beta@example.test cannot continue");
assert.equal(emailA.normalizedFingerprint, emailB.normalizedFingerprint);

const pathA = analyzeStderrLine("WARNING: failed at C:\\Users\\Alpha\\sdk\\bin");
const pathB = analyzeStderrLine("WARNING: failed at C:\\Users\\Beta\\sdk\\bin");
assert.equal(pathA.normalizedFingerprint, pathB.normalizedFingerprint);

const distinct = analyzeStderrLine("WARNING: credential expired");
assert.notEqual(unknown.normalizedFingerprint, distinct.normalizedFingerprint);

const serialized = JSON.stringify(unknown);
assert.equal(serialized.includes("unrelated diagnostic 8742"), false);
assert.equal(serialized.includes("<RAW_SENTINEL>"), false);

const failureMatrix = [
  ["permission denied", "ERROR: PERMISSION_DENIED: denied", "GCLOUD_AUTHORIZATION_ERROR"],
  ["unauthenticated", "ERROR: UNAUTHENTICATED: login required", "GCLOUD_AUTHENTICATION_ERROR"],
  ["invalid member", "ERROR: INVALID_ARGUMENT: invalid member", "GCLOUD_INVALID_ARGUMENT"],
  ["invalid role", "ERROR: INVALID_ARGUMENT: invalid role", "GCLOUD_INVALID_ARGUMENT"],
  ["target not found", "ERROR: NOT_FOUND: resource not found", "GCLOUD_RESOURCE_NOT_FOUND"],
  ["policy conflict", "ERROR: ABORTED: etag policy conflict", "GCLOUD_POLICY_CONFLICT"],
  ["precondition", "ERROR: FAILED_PRECONDITION: precondition failed", "GCLOUD_PRECONDITION_FAILURE"],
  ["provider 5xx", "ERROR: 503 backend error", "GCLOUD_PROVIDER_5XX"],
  ["transport", "ERROR: connection reset by peer", "GCLOUD_TRANSPORT_FAILURE"],
  ["usage", "usage: gcloud ... unrecognized arguments", "GCLOUD_COMMAND_USAGE_ERROR"],
  ["dependency", "ERROR: No module named cloud_sdk", "GCLOUD_LOCAL_DEPENDENCY_FAILURE"],
  ["unknown nonzero", "ERROR: opaque provider detail <RAW_SENTINEL>", "GCLOUD_ERROR_UNCLASSIFIED"],
  ["success", "", "NO_SAFE_ERROR_CLASS"],
];
for (const [name, stderr, expected] of failureMatrix) {
  const lines = analyzeStderrLines(stderr);
  assert.equal(classifySafeStderr(lines), expected, name);
  const output = JSON.stringify(lines);
  assert.equal(output.includes("<RAW_SENTINEL>"), false, `${name} raw stderr leak`);
}

console.log("gcloud stderr diagnostic analyzer local validation passed");
