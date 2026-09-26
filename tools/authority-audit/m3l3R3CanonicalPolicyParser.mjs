const TARGET_ROLE = "roles/iam.serviceAccountTokenCreator";
const MAX_STDOUT_BYTES = 1024 * 1024;

export const R3_POLICY_PARSE_STATUS = Object.freeze({
  parsed: "PARSED_CANONICAL_POLICY",
  invalidInput: "INVALID_INPUT",
  empty: "EMPTY_OUTPUT",
  jsonSyntax: "JSON_SYNTAX_FAILURE",
  topLevel: "UNEXPECTED_TOP_LEVEL_SHAPE",
  root: "UNSUPPORTED_POLICY_ROOT",
  fields: "MALFORMED_POLICY_FIELDS",
});

export const R3_POLICY_RESULTS = Object.freeze([
  "PRESENT_CONFIRMED",
  "ZERO_BINDINGS_ABSENT",
  "MEMBER_ABSENT",
  "AMBIGUOUS",
  "READ_FAILURE",
]);

const ROOT_KEYS = Object.freeze(["version", "etag", "bindings", "auditConfigs"]);
const BINDING_KEYS = Object.freeze(["role", "members", "condition"]);
const CONDITION_KEYS = Object.freeze(["expression", "title", "description", "location"]);
const AUDIT_CONFIG_KEYS = Object.freeze(["service", "auditLogConfigs"]);
const AUDIT_LOG_CONFIG_KEYS = Object.freeze(["logType", "exemptedMembers"]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasOnlyKeys(value, keys) {
  return isPlainObject(value) && Object.keys(value).every((key) => keys.includes(key));
}

function isSafeString(value, { min = 1, max = 1024 } = {}) {
  return typeof value === "string" && value.length >= min && value.length <= max
    && value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
}

function isRole(value) {
  return isSafeString(value, { max: 512 })
    && /^(?:roles\/[A-Za-z0-9._-]+|projects\/[A-Za-z0-9._-]+\/roles\/[A-Za-z0-9._-]+|organizations\/[0-9]+\/roles\/[A-Za-z0-9._-]+)$/.test(value);
}

function isMember(value) {
  return isSafeString(value, { max: 1024 }) && !/\s/.test(value);
}

function validateCondition(value) {
  if (!hasOnlyKeys(value, CONDITION_KEYS) || !isSafeString(value.expression, { max: 8192 })) return false;
  return ["title", "description", "location"].every((key) => !hasOwn(value, key)
    || isSafeString(value[key], { min: 0, max: 4096 }));
}

function validateBinding(value, version) {
  if (!hasOnlyKeys(value, BINDING_KEYS) || !isRole(value.role) || !Array.isArray(value.members)
    || value.members.length === 0 || value.members.some((member) => !isMember(member))) return false;
  if (!hasOwn(value, "condition")) return true;
  return version === 3 && validateCondition(value.condition);
}

function validateAuditConfig(value) {
  if (!hasOnlyKeys(value, AUDIT_CONFIG_KEYS) || !isSafeString(value.service, { max: 512 })
    || !Array.isArray(value.auditLogConfigs) || value.auditLogConfigs.length === 0) return false;
  return value.auditLogConfigs.every((entry) => hasOnlyKeys(entry, AUDIT_LOG_CONFIG_KEYS)
    && isSafeString(entry.logType, { max: 128 })
    && (!hasOwn(entry, "exemptedMembers") || (Array.isArray(entry.exemptedMembers)
      && entry.exemptedMembers.every((member) => isMember(member)))));
}

function safeFailure(parseStatus) {
  return Object.freeze({ ok: false, parseStatus });
}

function normalize(stdout) {
  return stdout.charCodeAt(0) === 0xfeff ? stdout.slice(1).trim() : stdout.trim();
}

/**
 * Strict, local-only IAM Policy JSON projection. It intentionally returns no
 * source object, member, etag, condition, or raw process output.
 */
function parseCanonicalWriterPolicySource(stdout) {
  if (typeof stdout !== "string" || Buffer.byteLength(stdout, "utf8") > MAX_STDOUT_BYTES) {
    return safeFailure(R3_POLICY_PARSE_STATUS.invalidInput);
  }
  const text = normalize(stdout);
  if (text.length === 0) return safeFailure(R3_POLICY_PARSE_STATUS.empty);

  let policy;
  try {
    policy = JSON.parse(text);
  } catch {
    return safeFailure(R3_POLICY_PARSE_STATUS.jsonSyntax);
  }
  if (!isPlainObject(policy)) return safeFailure(R3_POLICY_PARSE_STATUS.topLevel);
  if (!hasOnlyKeys(policy, ROOT_KEYS) || !hasOwn(policy, "etag")
    || !isSafeString(policy.etag, { max: 4096 })) return safeFailure(R3_POLICY_PARSE_STATUS.root);

  const version = hasOwn(policy, "version") ? policy.version : 0;
  if (!Number.isInteger(version) || ![0, 1, 3].includes(version)) {
    return safeFailure(R3_POLICY_PARSE_STATUS.fields);
  }
  const bindingsFieldState = hasOwn(policy, "bindings") ? "EXPLICIT_ARRAY" : "OMITTED_AS_EMPTY";
  const bindings = hasOwn(policy, "bindings") ? policy.bindings : [];
  if (!Array.isArray(bindings) || bindings.some((binding) => !validateBinding(binding, version))) {
    return safeFailure(R3_POLICY_PARSE_STATUS.fields);
  }
  if (hasOwn(policy, "auditConfigs") && (!Array.isArray(policy.auditConfigs)
    || policy.auditConfigs.some((entry) => !validateAuditConfig(entry)))) {
    return safeFailure(R3_POLICY_PARSE_STATUS.fields);
  }

  const targetBindings = bindings.filter((binding) => binding.role === TARGET_ROLE);
  return Object.freeze({
    ok: true,
    parseStatus: R3_POLICY_PARSE_STATUS.parsed,
    canonical: Object.freeze({
      policyVersion: version,
      etagPresent: true,
      bindingsFieldState,
      targetRoleBindingCount: targetBindings.length,
      targetRoleHasConditionalBinding: targetBindings.some((binding) => hasOwn(binding, "condition")),
    }),
    bindings,
  });
}

export function parseCanonicalWriterPolicy(stdout) {
  const parsed = parseCanonicalWriterPolicySource(stdout);
  return parsed.ok
    ? Object.freeze({ ok: true, parseStatus: parsed.parseStatus, canonical: parsed.canonical })
    : parsed;
}

export function classifyCanonicalWriterPolicy(stdout, exactIamMember) {
  const parsedPolicy = parseCanonicalWriterPolicySource(stdout);
  if (!parsedPolicy.ok || !Array.isArray(parsedPolicy.bindings) || !isMember(exactIamMember)) {
    return "READ_FAILURE";
  }
  const targetBindings = parsedPolicy.bindings.filter((binding) => binding.role === TARGET_ROLE);
  if (targetBindings.length === 0) return "ZERO_BINDINGS_ABSENT";
  if (targetBindings.some((binding) => hasOwn(binding, "condition"))) return "AMBIGUOUS";
  const occurrences = targetBindings.flatMap((binding) => binding.members)
    .filter((member) => member === exactIamMember).length;
  if (occurrences === 1) return "PRESENT_CONFIRMED";
  return occurrences === 0 ? "MEMBER_ABSENT" : "AMBIGUOUS";
}

export function projectCanonicalWriterPolicyResult(stdout, exactIamMember) {
  const parsedPolicy = parseCanonicalWriterPolicy(stdout);
  const state = classifyCanonicalWriterPolicy(stdout, exactIamMember);
  return Object.freeze({
    state,
    parseStatus: parsedPolicy.parseStatus,
    canonical: parsedPolicy.ok ? parsedPolicy.canonical : null,
  });
}

/**
 * Evaluates target-role members inside the strict parser boundary. Candidate
 * member strings never appear in the returned projection.
 */
export function evaluateCanonicalWriterPolicyMembers(stdout, evaluateMember) {
  if (typeof evaluateMember !== "function") return Object.freeze({ ok: false, state: "PRIVACY_GUARD_FAILURE" });
  const parsedPolicy = parseCanonicalWriterPolicySource(stdout);
  if (!parsedPolicy.ok || !Array.isArray(parsedPolicy.bindings)) {
    return Object.freeze({ ok: false, state: "POLICY_PARSE_FAILURE", parseStatus: parsedPolicy.parseStatus });
  }
  const targetBindings = parsedPolicy.bindings.filter((binding) => binding.role === TARGET_ROLE);
  if (targetBindings.some((binding) => hasOwn(binding, "condition"))) {
    return Object.freeze({ ok: true, state: "AMBIGUOUS", semanticMatchCount: "UNKNOWN" });
  }
  let matches = 0;
  try {
    for (const member of targetBindings.flatMap((binding) => binding.members)) {
      if (evaluateMember(member) === true) matches += 1;
    }
  } catch {
    return Object.freeze({ ok: false, state: "PRIVACY_GUARD_FAILURE" });
  }
  return Object.freeze({
    ok: true,
    state: matches === 1 ? "PRESENT_CONFIRMED" : matches === 0 ? "MEMBER_ABSENT_CONFIRMED" : "AMBIGUOUS",
    semanticMatchCount: matches === 0 ? "ZERO" : matches === 1 ? "ONE" : "MULTIPLE",
  });
}

export const M3L3_R3_CANONICAL_POLICY_PARSER_CONTRACT = Object.freeze({
  localEvidence: Object.freeze([
    "google.iam.v1.Policy.bindings is repeated",
    "local proto3 JSON serializer omits empty repeated arrays",
  ]),
  omittedBindingsRule: "VALID_ETAG_POLICY_ONLY",
  genericEmptyObject: "REJECTED",
  allowedRootFields: ROOT_KEYS,
  rawPolicyReturned: false,
  rawMembersReturned: false,
  rawEtagReturned: false,
  rawConditionsReturned: false,
  processSpawn: false,
  networkAccess: false,
});
