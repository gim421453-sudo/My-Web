import { createHash } from "node:crypto";

const AUDIT_SERVICE_ACCOUNT = "myweb-authority-audit-reader@my-management-app-8a933.iam.gserviceaccount.com";

const RULES = Object.freeze({
  impersonationNotice: "GCLOUD_IMPERSONATION_NOTICE_V1",
  impersonationContinuation: "GCLOUD_IMPERSONATION_CONTINUATION_V1",
  credentialNotice: "GCLOUD_CREDENTIAL_NOTICE_V1",
  configurationNotice: "GCLOUD_CONFIGURATION_NOTICE_V1",
  warningPrefix: "WARNING_PREFIX_V1",
  errorPrefix: "ERROR_PREFIX_V1",
  commandUsage: "GCLOUD_COMMAND_USAGE_ERROR_V1",
  authentication: "GCLOUD_AUTHENTICATION_ERROR_V1",
  authorization: "GCLOUD_AUTHORIZATION_ERROR_V1",
  invalidArgument: "GCLOUD_INVALID_ARGUMENT_V1",
  resourceNotFound: "GCLOUD_RESOURCE_NOT_FOUND_V1",
  policyConflict: "GCLOUD_POLICY_CONFLICT_V1",
  precondition: "GCLOUD_PRECONDITION_FAILURE_V1",
  provider5xx: "GCLOUD_PROVIDER_5XX_V1",
  transport: "GCLOUD_TRANSPORT_FAILURE_V1",
  configuration: "GCLOUD_CONFIGURATION_CONTEXT_FAILURE_V1",
  localDependency: "GCLOUD_LOCAL_DEPENDENCY_FAILURE_V1",
  terminalBlank: "TERMINAL_BLANK_V1",
});

const TEMPLATES = Object.freeze({
  impersonationNotice: "LOCAL_GCLOUD_IMPERSONATION_TEMPLATE_01",
  impersonationContinuation: "LOCAL_GCLOUD_IMPERSONATION_TEMPLATE_02",
});

function normalizeDynamicValues(line) {
  return line
    .replaceAll(AUDIT_SERVICE_ACCOUNT, "<AUDIT_SA>")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "<EMAIL>")
    .replace(/(?:[A-Z]:[\\/]|\\\\|\/)(?:[^\s\\/]+[\\/])*[^\s]+/gi, "<PATH>")
    .replace(/https?:\/\/[^\s]+/gi, "<URL>")
    .replace(/\b(?:projects\/)?[a-z][a-z0-9-]{5,}-[a-z0-9-]{3,}\b/gi, "<PROJECT_ID>")
    .replace(/\b\d{10,}\b/g, "<NUMBER>")
    .replace(/\b\d{4}-\d{2}-\d{2}T[^\s]+\b/g, "<TIMESTAMP>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "<UUID>")
    .replace(/\b[0-9a-f]{32,}\b/gi, "<HEX>")
    .replace(/\s+/g, " ")
    .trim();
}

function fingerprint(normalizedLine) {
  return `sha256:${createHash("sha256").update(normalizedLine, "utf8").digest("hex")}`;
}

function classifyPrefix(trimmed) {
  if (/^(WARNING|WARN)\b/i.test(trimmed)) return "WARNING";
  if (/^(ERROR|ERR)\b/i.test(trimmed)) return "ERROR";
  if (/^INFO\b/i.test(trimmed)) return "INFO";
  return "OTHER";
}

function matchRuleIds(trimmed, isBlank) {
  const ids = [];
  if (isBlank) {
    ids.push(RULES.terminalBlank);
    return ids;
  }
  if (/^WARNING:\s*This command is using service account impersonation\./i.test(trimmed)) {
    ids.push(RULES.impersonationNotice);
  }
  if (/^All API calls will be executed as \[[^\]\r\n]+\]\.$/i.test(trimmed)) {
    ids.push(RULES.impersonationContinuation);
  }
  if (/credential/i.test(trimmed)) ids.push(RULES.credentialNotice);
  if (/\b(?:sdk|configuration)\b/i.test(trimmed)) ids.push(RULES.configurationNotice);
  if (/^(WARNING|WARN)\b/i.test(trimmed)) ids.push(RULES.warningPrefix);
  if (/^(ERROR|ERR)\b/i.test(trimmed)) ids.push(RULES.errorPrefix);
  const explicitError = /^(?:ERROR|ERR)\b/i.test(trimmed)
    || /^\s*(?:PERMISSION_DENIED|UNAUTHENTICATED|INVALID_ARGUMENT|NOT_FOUND|ABORTED|FAILED_PRECONDITION)\b/i.test(trimmed);
  if (/(?:usage:|unrecognized arguments|the following arguments are required|invalid choice)/i.test(trimmed)) ids.push(RULES.commandUsage);
  if (explicitError && /(?:unauthenticated|invalid_grant|please run .*auth login|reauthenticate)/i.test(trimmed)) ids.push(RULES.authentication);
  if (explicitError && /(?:permission[_ -]?denied|insufficient permissions?|does not have permission)/i.test(trimmed)) ids.push(RULES.authorization);
  if (explicitError && /(?:invalid[_ -]?argument|invalid argument)/i.test(trimmed)) ids.push(RULES.invalidArgument);
  if (explicitError && /(?:not[_ -]?found|resource .* not found)/i.test(trimmed)) ids.push(RULES.resourceNotFound);
  if (explicitError && /(?:aborted|etag|policy .* conflict|concurrent .* policy)/i.test(trimmed)) ids.push(RULES.policyConflict);
  if (explicitError && /(?:failed[_ -]?precondition|precondition failed)/i.test(trimmed)) ids.push(RULES.precondition);
  if (explicitError && /(?:\b5\d\d\b|internal server error|backend error|service unavailable)/i.test(trimmed)) ids.push(RULES.provider5xx);
  if (explicitError && /(?:network (?:is )?unreachable|connection (?:reset|refused)|name resolution|dns|tls|ssl|proxy error)/i.test(trimmed)) ids.push(RULES.transport);
  if (explicitError && /(?:configuration .* not found|unknown configuration)/i.test(trimmed)) ids.push(RULES.configuration);
  if (explicitError && /(?:no module named|importerror|module not found|python .* not found)/i.test(trimmed)) ids.push(RULES.localDependency);
  return ids;
}

const ERROR_CLASS_PRECEDENCE = Object.freeze([
  [RULES.commandUsage, "GCLOUD_COMMAND_USAGE_ERROR"],
  [RULES.authentication, "GCLOUD_AUTHENTICATION_ERROR"],
  [RULES.authorization, "GCLOUD_AUTHORIZATION_ERROR"],
  [RULES.invalidArgument, "GCLOUD_INVALID_ARGUMENT"],
  [RULES.resourceNotFound, "GCLOUD_RESOURCE_NOT_FOUND"],
  [RULES.policyConflict, "GCLOUD_POLICY_CONFLICT"],
  [RULES.precondition, "GCLOUD_PRECONDITION_FAILURE"],
  [RULES.provider5xx, "GCLOUD_PROVIDER_5XX"],
  [RULES.transport, "GCLOUD_TRANSPORT_FAILURE"],
  [RULES.configuration, "GCLOUD_CONFIGURATION_CONTEXT_FAILURE"],
  [RULES.localDependency, "GCLOUD_LOCAL_DEPENDENCY_FAILURE"],
]);

export function classifySafeStderr(lines) {
  const ids = new Set(Array.isArray(lines) ? lines.flatMap((line) => line?.matchedRuleIds || []) : []);
  for (const [ruleId, safeClass] of ERROR_CLASS_PRECEDENCE) {
    if (ids.has(ruleId)) return safeClass;
  }
  return ids.has(RULES.errorPrefix) ? "GCLOUD_ERROR_UNCLASSIFIED" : "NO_SAFE_ERROR_CLASS";
}

function templateId(trimmed) {
  if (/^WARNING:\s*This command is using service account impersonation\.$/i.test(trimmed)) {
    return TEMPLATES.impersonationNotice;
  }
  if (/^All API calls will be executed as \[[^\]\r\n]+\]\.$/i.test(trimmed)) {
    return TEMPLATES.impersonationContinuation;
  }
  return "UNKNOWN_TEMPLATE";
}

export function analyzeStderrLine(line, index = 0) {
  const value = typeof line === "string" ? line : "";
  const trimmed = value.trim();
  const isBlank = trimmed === "";
  const normalized = isBlank ? "" : normalizeDynamicValues(trimmed);
  const semanticCategory = isBlank
    ? "UNKNOWN"
    : /service account impersonation|all api calls will be executed as/i.test(trimmed)
      ? "IMPERSONATION_NOTICE"
      : /credential/i.test(trimmed)
        ? "CREDENTIAL_NOTICE"
        : /sdk|configuration/i.test(trimmed)
          ? "SDK_CONFIGURATION_NOTICE"
          : "UNKNOWN";
  return Object.freeze({
    index,
    charCount: value.length,
    isBlank,
    prefixCategory: isBlank ? "EMPTY" : classifyPrefix(trimmed),
    semanticCategory,
    matchedRuleIds: Object.freeze(matchRuleIds(trimmed, isBlank)),
    normalizedTemplateId: isBlank ? "UNKNOWN_TEMPLATE" : templateId(trimmed),
    normalizedFingerprint: fingerprint(normalized),
  });
}

export function analyzeStderrLines(stderr) {
  if (typeof stderr !== "string") return Object.freeze([]);
  return Object.freeze(stderr.split(/\r\n|\n|\r/).map((line, index) => analyzeStderrLine(line, index)));
}

export const STDERR_DIAGNOSTIC_RULE_IDS = RULES;
export const STDERR_DIAGNOSTIC_TEMPLATE_IDS = TEMPLATES;
export const STDERR_DIAGNOSTIC_CONTRACT = Object.freeze({
  resultCanOverrideAcceptance: false,
  ruleMatchCanAcceptToken: false,
  templateMatchCanAcceptToken: false,
  fingerprintCanAcceptToken: false,
  normalization: "privacy-normalized-line-utf8-sha256",
  safeErrorClasses: Object.freeze(ERROR_CLASS_PRECEDENCE.map(([, safeClass]) => safeClass)),
});
