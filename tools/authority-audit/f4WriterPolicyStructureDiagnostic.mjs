import { buildLogicalWriterPolicyReadCommand } from "./m3RuntimeCommandGraph.mjs";

const TARGET_ROLE = "roles/iam.serviceAccountTokenCreator";
const PARSE_STATUSES = Object.freeze({
  invalidInput: "INVALID_INPUT",
  empty: "EMPTY_STDOUT",
  jsonSyntax: "JSON_SYNTAX_FAILURE",
  topLevel: "UNEXPECTED_TOP_LEVEL_SHAPE",
  malformedPolicy: "MALFORMED_POLICY_FIELDS",
  parsed: "PARSED",
});

const ALLOWED_NORMALIZATIONS = Object.freeze([
  "UTF8_BOM_REMOVAL",
  "OUTER_UNICODE_WHITESPACE_TRIM",
]);

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function firstTokenClass(value) {
  if (value.length === 0) return "EMPTY";
  const first = value[0];
  if (first === "{") return "OBJECT_START";
  if (first === "[") return "ARRAY_START";
  return "OTHER";
}

function createPreparseMetadata(stdout) {
  const value = typeof stdout === "string" ? stdout : "";
  const withoutBom = value.charCodeAt(0) === 0xfeff ? value.slice(1) : value;
  const leadingWhitespacePresent = withoutBom.length > 0 && withoutBom[0] !== withoutBom.trimStart()[0];
  const trailingWhitespacePresent = value.length > 0 && value[value.length - 1] !== value.trimEnd().at(-1);
  return Object.freeze({
    stdoutByteCount: Buffer.byteLength(value, "utf8"),
    stdoutCharCount: value.length,
    stdoutLineCount: value.length === 0 ? 0 : value.split(/\r\n|\r|\n/).length,
    stdoutEmpty: value.length === 0,
    utf8BomPresent: value.charCodeAt(0) === 0xfeff,
    leadingWhitespacePresent,
    trailingWhitespacePresent,
    topLevelFirstTokenClass: firstTokenClass(value.replace(/^\ufeff/, "").trim()),
  });
}

function normalizeStdout(stdout) {
  let normalized = stdout;
  if (normalized.charCodeAt(0) === 0xfeff) {
    normalized = normalized.slice(1);
  }
  return normalized.trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function malformed(metadata) {
  return Object.freeze({
    ok: false,
    parseStatus: PARSE_STATUSES.malformedPolicy,
    safePreparseMetadata: metadata,
  });
}

function validateBinding(binding) {
  if (!isPlainObject(binding) || typeof binding.role !== "string") return false;
  if (!Array.isArray(binding.members) || binding.members.some((member) => typeof member !== "string")) {
    return false;
  }
  if (hasOwn(binding, "condition") && !isPlainObject(binding.condition)) return false;
  return true;
}

function boundedStructure(policy, bindings) {
  const targetBindings = bindings.filter((binding) => binding.role === TARGET_ROLE);
  const conditionalBindingCount = bindings.filter((binding) => hasOwn(binding, "condition")).length;
  return Object.freeze({
    policyVersion: hasOwn(policy, "version")
      ? (Number.isInteger(policy.version) ? policy.version : "UNRESOLVED")
      : "UNRESOLVED",
    etagPresent: hasOwn(policy, "etag")
      ? (typeof policy.etag === "string" && policy.etag.length > 0)
      : false,
    conditionalBindingCount,
    targetRoleBindingCount: targetBindings.length,
    targetMemberPresent: "UNRESOLVED",
  });
}

/**
 * Parses only the statically supported IAM Policy JSON shape for F4R1.
 * Source content is never returned, serialized, or included in errors.
 */
export function parseWriterSaIamPolicyForStructure(stdout) {
  if (typeof stdout !== "string") {
    return Object.freeze({
      ok: false,
      parseStatus: PARSE_STATUSES.invalidInput,
      safePreparseMetadata: Object.freeze({
        stdoutByteCount: 0,
        stdoutCharCount: 0,
        stdoutLineCount: 0,
        stdoutEmpty: true,
        utf8BomPresent: false,
        leadingWhitespacePresent: false,
        trailingWhitespacePresent: false,
        topLevelFirstTokenClass: "EMPTY",
      }),
    });
  }

  const safePreparseMetadata = createPreparseMetadata(stdout);
  if (safePreparseMetadata.stdoutEmpty) {
    return Object.freeze({
      ok: false,
      parseStatus: PARSE_STATUSES.empty,
      safePreparseMetadata,
    });
  }

  const normalized = normalizeStdout(stdout);
  if (normalized.length === 0) {
    return Object.freeze({
      ok: false,
      parseStatus: PARSE_STATUSES.empty,
      safePreparseMetadata,
    });
  }
  let parsed;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    return Object.freeze({
      ok: false,
      parseStatus: PARSE_STATUSES.jsonSyntax,
      safePreparseMetadata,
    });
  }

  if (!isPlainObject(parsed)) {
    return Object.freeze({
      ok: false,
      parseStatus: PARSE_STATUSES.topLevel,
      safePreparseMetadata,
    });
  }
  if (hasOwn(parsed, "version") && !Number.isInteger(parsed.version)) return malformed(safePreparseMetadata);
  if (hasOwn(parsed, "etag") && typeof parsed.etag !== "string") return malformed(safePreparseMetadata);

  const bindings = hasOwn(parsed, "bindings") ? parsed.bindings : [];
  if (!Array.isArray(bindings) || bindings.some((binding) => !validateBinding(binding))) {
    return malformed(safePreparseMetadata);
  }

  const structure = boundedStructure(parsed, bindings);
  return Object.freeze({
    ok: true,
    parseStatus: PARSE_STATUSES.parsed,
    safePreparseMetadata,
    structure,
  });
}

export function classifyWriterSaPolicyStructure(structure) {
  if (!isPlainObject(structure)) return "UNRESOLVED";
  if (structure.policyVersion === "UNRESOLVED" || structure.targetMemberPresent === "UNRESOLVED") {
    return "AMBIGUOUS";
  }
  if (structure.policyVersion !== 3 || structure.etagPresent !== true) return "INCOMPATIBLE";
  return "COMPATIBLE";
}

export function buildF4R1WriterPolicyReadRequest() {
  return Object.freeze({
    args: Object.freeze([...buildLogicalWriterPolicyReadCommand()]),
    readCount: 1,
    retryMax: 0,
    mutationCount: 0,
  });
}

export const F4R1_CONTRACT = Object.freeze({
  allowedPreParseNormalizations: ALLOWED_NORMALIZATIONS,
  outputFields: Object.freeze([
    "policyVersion",
    "etagPresent",
    "conditionalBindingCount",
    "targetRoleBindingCount",
    "targetMemberPresent",
  ]),
  stdoutStderrMerged: false,
  rawStdoutPersisted: false,
  rawPolicyReturned: false,
  wholeBindingSerialized: false,
  memberArraySerialized: false,
  conditionObjectSerialized: false,
  readMax: 1,
  retryMax: 0,
  mutationMax: 0,
});
