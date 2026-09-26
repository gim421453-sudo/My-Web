import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTH_OVERRIDE_ENV_SURFACES,
  createSanitizedChildEnvironment,
  resolveLocalGcloudExecutable,
} from "./windowsGcloudProcessAdapter.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { validateG2BReusablePolicy } from "./g2bExplicitSetIamPolicyTransport.mjs";
import { authorizeG2BTransportOperation } from "./g2bCurrentRunExecutionIntent.mjs";

const HELPER = fileURLToPath(new URL("./g2b_explicit_set_iam_policy_transport.py", import.meta.url));
const SCHEMA = "myweb.g2b.explicit-set-iam-policy-transport.v2";
const MEMBER = /^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_FAILURE_STAGES = new Set(["BEFORE_HTTP_SEND", "DURING_HTTP_SEND", "AFTER_HTTP_RESPONSE"]);
const SAFE_HTTP_CLASSES = new Set(["UNKNOWN", "2XX", "3XX", "4XX", "5XX"]);
const SAFE_EXCEPTION_CLASSES = new Set([
  "NONE", "LOCAL_CREDENTIAL_FAILURE", "LOCAL_CLIENT_SETUP_FAILURE",
  "REMOTE_REQUEST_EXCEPTION", "RESPONSE_PARSE_FAILURE", "PRIVACY_GUARD_FAILURE",
]);
const SAFE_IDENTIFIERS = new Set(["NOT_AVAILABLE", "HTTP_200", "HTTP_400", "HTTP_401", "HTTP_403", "HTTP_404", "HTTP_409", "HTTP_412", "HTTP_429", "HTTP_500", "HTTP_502", "HTTP_503", "HTTP_504"]);
const SAFE_FAILURE_CLASSES = new Set(["TRANSPORT_EXEC_FAILED", "TRANSPORT_TIMEOUT", "TRANSPORT_SIGNALLED", "TRANSPORT_NONZERO_EXIT", "TRANSPORT_PROVIDER_NONZERO_EXIT", "TRANSPORT_EMPTY_STDOUT", "TRANSPORT_INVALID_JSON", "TRANSPORT_SCHEMA_INVALID", "TRANSPORT_RESOURCE_MISMATCH", "TRANSPORT_REQUEST_RESOURCE_MISMATCH", "TRANSPORT_RESOURCE_VALIDATION_FAILED", "TRANSPORT_PROVIDER_POLICY_SCHEMA_INVALID", "TRANSPORT_POLICY_SCHEMA_INVALID", "TRANSPORT_SERIALIZATION_FAILED", "TRANSPORT_HELPER_INPUT_INVALID", "TRANSPORT_HELPER_UNHANDLED_EXCEPTION", "TRANSPORT_HELPER_UNKNOWN", "TRANSPORT_HELPER_ARG_PARSE_FAILED", "TRANSPORT_HELPER_STDIN_EMPTY", "TRANSPORT_HELPER_STDIN_READ_FAILED", "TRANSPORT_HELPER_INPUT_JSON_PARSE_FAILED", "TRANSPORT_HELPER_INPUT_SCHEMA_FAILED", "TRANSPORT_HELPER_REQUIRED_FIELD_MISSING", "TRANSPORT_HELPER_FIELD_TYPE_INVALID", "TRANSPORT_HELPER_ENVIRONMENT_CONTRACT_FAILED", "TRANSPORT_HELPER_LOCAL_CLIENT_SETUP_FAILED", "TRANSPORT_HELPER_ENTRYPOINT_EXCEPTION", "TRANSPORT_HELPER_DIAGNOSTIC_STATE_INCONSISTENT", "TRANSPORT_PERMISSION_DENIED", "TRANSPORT_AUTH_FAILURE", "TRANSPORT_RATE_LIMIT", "TRANSPORT_SERVER_ERROR", "TRANSPORT_NETWORK_ERROR", "TRANSPORT_TRUNCATED_OUTPUT", "TRANSPORT_ENCODING_ERROR", "TRANSPORT_ETAG_MISSING", "TRANSPORT_POLICY_VERSION_MISSING", "TRANSPORT_AMBIGUOUS_RESPONSE", "TRANSPORT_UNKNOWN"]);
const MAX_TRANSPORT_OUTPUT_BYTES = 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const EXPECTED_IAM_RESOURCE = `projects/my-management-app-8a933/serviceAccounts/${G2B_TARGET_RESOURCE}`;
const READ_ENVELOPE_KEYS = new Set(["schema", "ok", "requestStarted", "remoteRequestStarted", "httpStatus", "prestateReadCompleted", "recoveryReadCompleted", "setAttempted", "requestMetadata", "providerMetadata", "serializationMetadata", "requestedPolicyVersion", "returnedPolicyVersion", "returnedPolicyVersionState", "returnedPolicyVersionValue", "versionSourceLayer", "versionDiagnostic", "responseFieldDiagnostic", "policy", "failureMetadata", "code", "failure", "transportLifecycle", "helperExecution"]);
const IAM_POLICY_KEYS = new Set(["etag", "version", "bindings", "auditConfigs", "resource"]);
const HELPER_FAILURES = new Set(["HELPER_INPUT_INVALID", "HELPER_RESOURCE_MISMATCH", "HELPER_REQUEST_BUILD_FAILED", "HELPER_REQUEST_NORMALIZATION_FAILED", "HELPER_PROVIDER_AUTH_FAILED", "HELPER_PROVIDER_PERMISSION_DENIED", "HELPER_PROVIDER_RATE_LIMIT", "HELPER_PROVIDER_SERVER_ERROR", "HELPER_PROVIDER_TIMEOUT", "HELPER_PROVIDER_NETWORK_ERROR", "HELPER_PROVIDER_RESPONSE_INVALID", "HELPER_POLICY_VERSION_MISSING", "HELPER_ETAG_MISSING", "HELPER_POLICY_SCHEMA_INVALID", "HELPER_SERIALIZATION_FAILED", "HELPER_POLICY_CANONICALIZATION_FAILED", "HELPER_POLICY_BINDING_NORMALIZATION_FAILED", "HELPER_POLICY_ETAG_NORMALIZATION_FAILED", "HELPER_POLICY_VERSION_NORMALIZATION_FAILED", "HELPER_JSON_SERIALIZATION_FAILED", "HELPER_SUCCESS_ENVELOPE_BUILD_FAILED", "HELPER_UNHANDLED_EXCEPTION", "HELPER_UNKNOWN", "HELPER_ARG_PARSE_FAILED", "HELPER_STDIN_EMPTY", "HELPER_STDIN_READ_FAILED", "HELPER_INPUT_JSON_PARSE_FAILED", "HELPER_INPUT_SCHEMA_FAILED", "HELPER_REQUIRED_FIELD_MISSING", "HELPER_FIELD_TYPE_INVALID", "HELPER_ENVIRONMENT_CONTRACT_FAILED", "HELPER_LOCAL_CLIENT_SETUP_FAILED", "HELPER_ENTRYPOINT_EXCEPTION", "HELPER_DIAGNOSTIC_STATE_INCONSISTENT"]);
const TRANSPORT_PHASES = new Set(["PHASE_01_INPUT_VALIDATION", "PHASE_02_CHILD_SPAWN_ATTEMPT", "PHASE_03_CHILD_STARTED", "PHASE_04_HELPER_INPUT_ACCEPTED", "PHASE_05_PROVIDER_REQUEST_PREPARED", "PHASE_06_PROVIDER_REQUEST_STARTED", "PHASE_07_PROVIDER_RESPONSE_RECEIVED", "PHASE_08_HELPER_SERIALIZATION", "PHASE_09_NODE_STDOUT_PARSE", "PHASE_10_SCHEMA_VALIDATION", "PHASE_11_CAS_CAPTURE"]);

const safeDigest = (value) => createHash("sha256").update(String(value || ""), "utf8").digest("hex");
const byteDigest = (value) => createHash("sha256").update(Buffer.isBuffer(value) ? value : Buffer.from(String(value || ""), "utf8")).digest("hex");
const SAFE_PROCESS_ENV_KEYS = Object.freeze(["SystemRoot", "WINDIR", "LOCALAPPDATA", "PATH", "PYTHONPATH", "CLOUDSDK_CONFIG"]);

function decodeOutput(value) {
  if (!Buffer.isBuffer(value)) return { text: String(value || ""), invalidUtf8: String(value || "").includes("\uFFFD") };
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(value), invalidUtf8: false }; }
  catch { return { text: "", invalidUtf8: true }; }
}

function classifyDiagnosticText(value) {
  const text = String(value || "").toLowerCase();
  if (/permission denied|permission_denied|forbidden|http[_ ]403/.test(text)) return { errorClass: "PERMISSION_DENIED", errorCode: "HTTP_403" };
  if (/unauthenticated|invalid credential|credential.*expired|http[_ ]401/.test(text)) return { errorClass: "AUTH_FAILURE", errorCode: "HTTP_401" };
  if (/rate.?limit|too many requests|resource_exhausted|http[_ ]429/.test(text)) return { errorClass: "RATE_LIMIT", errorCode: "HTTP_429" };
  if (/deadline exceeded|timed? ?out|timeout/.test(text)) return { errorClass: "TIMEOUT", errorCode: "TIMEOUT" };
  if (/not found|resource.*missing|http[_ ]404/.test(text)) return { errorClass: "RESOURCE_NOT_FOUND", errorCode: "HTTP_404" };
  if (/invalid argument|invalid_argument|bad request|http[_ ]400/.test(text)) return { errorClass: "INVALID_ARGUMENT", errorCode: "HTTP_400" };
  if (/http[_ ]5\d\d|internal server error|service unavailable/.test(text)) return { errorClass: "SERVER_ERROR", errorCode: "SERVER_ERROR" };
  if (/warning|deprecated|retrying/.test(text)) return { errorClass: "WARNING", errorCode: "WARNING" };
  return { errorClass: text ? "UNKNOWN" : "NONE", errorCode: text ? "UNCLASSIFIED" : "NONE" };
}

function providerStatus(parsed) {
  const raw = parsed?.failure?.httpStatus ?? parsed?.failureMetadata?.httpStatusCodeSafe ?? parsed?.httpStatus;
  return [200, 400, 401, 403, 404, 409, 412, 429, 500, 502, 503, 504].includes(raw) ? raw : null;
}

const VERSION_DIAGNOSTIC_KEYS = new Set(["versionFieldPresent", "versionRawType", "versionRawPrimitiveValue", "versionAllowedSet", "versionNormalizationResult", "versionNormalizationFailureReason", "versionSource"]);
function validVersionDiagnostic(value, { success = false } = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some((key) => !VERSION_DIAGNOSTIC_KEYS.has(key))
    || typeof value.versionFieldPresent !== "boolean"
    || !["MISSING", "NULL", "BOOLEAN", "INTEGER", "FLOAT", "STRING", "OTHER"].includes(value.versionRawType)) return false;
  const raw = value.versionRawPrimitiveValue;
  if (!(raw === null || (Number.isSafeInteger(raw) && Math.abs(raw) <= 1000)
    || (typeof raw === "string" && /^[0-9]{1,8}$/.test(raw)))) return false;
  if (!["VALID", "INVALID", "MISSING"].includes(value.versionNormalizationResult)
    || JSON.stringify(value.versionAllowedSet) !== "[0,1,3]"
    || !["NONE", "MISSING", "NULL", "BOOLEAN_NOT_INTEGER", "FLOAT_NOT_INTEGER", "STRING_COERCION_NOT_ALLOWED", "INTEGER_NOT_ALLOWED", "UNSUPPORTED_TYPE", "NOT_VERSION_FAILURE"].includes(value.versionNormalizationFailureReason)
    || !["MAPPING_KEY", "MESSAGE_TO_DICT", "MESSAGE_ATTRIBUTE", "MISSING"].includes(value.versionSource)) return false;
  return !success || (value.versionNormalizationResult === "VALID" && value.versionNormalizationFailureReason === "NONE"
    && (value.versionRawType !== "NULL" || value.versionSource === "MESSAGE_ATTRIBUTE"));
}

const RESPONSE_FIELD_KEYS = new Set(["protobufVersionFieldPresent", "protobufVersionType", "protobufVersionValue",
  "apitoolsPolicyClassVerified", "apitoolsBindingsState", "apitoolsDirectEtagPresent", "apitoolsDirectEtagType", "apitoolsDirectEtagSha256",
  "apitoolsDirectVersionType", "apitoolsDirectVersionValue",
  "versionDirectPresent", "versionDirectType", "versionDirectValue",
  "versionDescriptorType", "versionHasPresence", "versionDefaultValue", "versionListedInListFields",
  "messageToDictVersionPresent", "messageToDictVersionType", "messageToDictVersionValue",
  "messageToDictDefaultsVersionPresent", "messageToDictDefaultsVersionType", "messageToDictDefaultsVersionValue", "etagPresent",
  "etagType", "etagSha256", "bindingsPresent", "bindingsCount", "conditionBindingCount", "conditionCount", "withcondMarkerCount",
  "conditionsPresent", "withcondRoleMarkerPresent"]);
function validResponseFieldDiagnostic(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).length !== RESPONSE_FIELD_KEYS.size
    || Object.keys(value).some((key) => !RESPONSE_FIELD_KEYS.has(key))) return false;
  for (const prefix of ["protobuf", "messageToDict"]) {
    if (typeof value[`${prefix}VersionFieldPresent`] !== "boolean" && prefix === "protobuf") return false;
    if (typeof value[`${prefix}VersionPresent`] !== "boolean" && prefix === "messageToDict") return false;
    if (!["MISSING", "NULL", "BOOLEAN", "INTEGER", "FLOAT", "STRING", "OTHER"].includes(value[`${prefix}VersionType`])) return false;
    const raw = value[`${prefix}VersionValue`];
    if (!(raw === null || typeof raw === "boolean" || Number.isSafeInteger(raw)
      || typeof raw === "string" && /^[0-9]{1,8}$/.test(raw))) return false;
  }
  if (!(value.versionDescriptorType === null || typeof value.versionDescriptorType === "string" || Number.isSafeInteger(value.versionDescriptorType))
    || !(value.versionHasPresence === null || typeof value.versionHasPresence === "boolean")
    || !(value.versionDefaultValue === null || Number.isSafeInteger(value.versionDefaultValue))
    || !(value.versionListedInListFields === null || typeof value.versionListedInListFields === "boolean")
    || typeof value.messageToDictDefaultsVersionPresent !== "boolean"
    || !["MISSING", "NULL", "BOOLEAN", "INTEGER", "FLOAT", "STRING", "OTHER"].includes(value.messageToDictDefaultsVersionType)) return false;
  if (typeof value.versionDirectPresent !== "boolean"
    || !["MISSING", "NULL", "BOOLEAN", "INTEGER", "FLOAT", "STRING", "OTHER"].includes(value.versionDirectType)) return false;
  const directRaw = value.versionDirectValue;
  if (!(directRaw === null || typeof directRaw === "boolean" || Number.isSafeInteger(directRaw)
    || typeof directRaw === "string" && /^[0-9]{1,8}$/.test(directRaw))) return false;
  if (value.apitoolsDirectVersionType !== value.versionDirectType
    || value.apitoolsDirectVersionValue !== value.versionDirectValue) return false;
  if (typeof value.apitoolsPolicyClassVerified !== "boolean"
    || !["UNSET", "PRESENT", "NOT_APITOOLS_POLICY", "MISSING", "INVALID"].includes(value.apitoolsBindingsState)
    || value.apitoolsPolicyClassVerified !== (value.apitoolsBindingsState !== "NOT_APITOOLS_POLICY")) return false;
  if (typeof value.apitoolsDirectEtagPresent !== "boolean"
    || !["MISSING", "NULL", "STRING", "BYTES", "OTHER"].includes(value.apitoolsDirectEtagType)
    || value.apitoolsDirectEtagPresent !== (value.apitoolsDirectEtagType !== "MISSING")
    || !(value.apitoolsDirectEtagSha256 === null || /^[0-9a-f]{64}$/.test(value.apitoolsDirectEtagSha256))) return false;
  const defaultsRaw = value.messageToDictDefaultsVersionValue;
  if (!(defaultsRaw === null || typeof defaultsRaw === "boolean" || Number.isSafeInteger(defaultsRaw)
    || typeof defaultsRaw === "string" && /^[0-9]{1,8}$/.test(defaultsRaw))) return false;
  return typeof value.etagPresent === "boolean" && ["STRING", "BYTES", "OTHER"].includes(value.etagType)
    && (value.etagSha256 === null || /^[0-9a-f]{64}$/.test(value.etagSha256))
    && typeof value.bindingsPresent === "boolean"
    && (value.bindingsCount === null || Number.isSafeInteger(value.bindingsCount) && value.bindingsCount >= 0)
    && (value.conditionBindingCount === null || Number.isSafeInteger(value.conditionBindingCount) && value.conditionBindingCount >= 0)
    && value.conditionCount === value.conditionBindingCount
    && (value.withcondMarkerCount === null || Number.isSafeInteger(value.withcondMarkerCount) && value.withcondMarkerCount >= 0)
    && value.withcondRoleMarkerPresent === (value.withcondMarkerCount > 0)
    && typeof value.conditionsPresent === "boolean" && typeof value.withcondRoleMarkerPresent === "boolean";
}

function appearsTruncated(text) {
  const value = String(text || "").trimEnd();
  return (value.startsWith("{") && !value.endsWith("}")) || (value.startsWith("[") && !value.endsWith("]"));
}

function readResponseIssue(parsed, expectedOperation) {
  if (expectedOperation !== "READ_GENERATION_BOUND_RECOVERY_POLICY" || parsed?.ok !== true) return null;
  if (!parsed.policy || typeof parsed.policy !== "object" || Array.isArray(parsed.policy)) return "TRANSPORT_SCHEMA_INVALID";
  const policy = parsed.policy;
  const provider = parsed.providerMetadata;
  const serialization = parsed.serializationMetadata;
  if (!provider || typeof provider !== "object" || Array.isArray(provider)
    || Object.keys(provider).some((key) => !["responseReceived", "httpStatus"].includes(key))
    || provider.responseReceived !== true || provider.httpStatus !== 200
    || !serialization || typeof serialization !== "object" || Array.isArray(serialization)
    || Object.keys(serialization).some((key) => !["policyObjectType", "canonicalizationStage", "serializationStage", "policyExtractionPath", "providerResponseShape"].includes(key))
    || !["DICT", "MAPPING", "MESSAGE", "OBJECT"].includes(serialization.policyObjectType)
    || serialization.canonicalizationStage !== "COMPLETE"
    || serialization.serializationStage !== "JSON_ENVELOPE_READY"
    || !["DIRECT_POLICY_MAPPING", "KNOWN_PROVIDER_WRAPPER_POLICY", "SDK_POLICY_MESSAGE"].includes(serialization.policyExtractionPath)
    || !validProviderResponseShape(serialization.providerResponseShape, serialization.policyExtractionPath)) return "TRANSPORT_SCHEMA_INVALID";
  if (policy.etag === undefined || policy.etag === null || policy.etag === "") return "TRANSPORT_ETAG_MISSING";
  if (policy.version === undefined || parsed.versionDiagnostic?.versionRawType === "MISSING") return "TRANSPORT_POLICY_VERSION_MISSING";
  const versionState = parsed.returnedPolicyVersionState;
  const versionValue = parsed.returnedPolicyVersionValue;
  const unset = versionState === "UNSET" && versionValue === null && policy.version === null
    && parsed.versionDiagnostic?.versionRawType === "NULL"
    && parsed.versionDiagnostic?.versionSource === "MESSAGE_ATTRIBUTE"
    && validResponseFieldDiagnostic(parsed.responseFieldDiagnostic)
    && parsed.responseFieldDiagnostic.versionDescriptorType === "INT32"
    && parsed.responseFieldDiagnostic.etagPresent === true
    && parsed.responseFieldDiagnostic.apitoolsPolicyClassVerified === true
    && parsed.responseFieldDiagnostic.apitoolsBindingsState === "UNSET"
    && parsed.responseFieldDiagnostic.bindingsCount === 0;
  const explicit = versionState === "EXPLICIT" && Number.isSafeInteger(versionValue)
    && [0, 1, 3].includes(versionValue) && policy.version === versionValue;
  if (!unset && !explicit) return "TRANSPORT_SCHEMA_INVALID";
  if (typeof policy.etag !== "string" || policy.etag.length > 512 || /[\s\u0000-\u001f\u007f]/.test(policy.etag)
    || parsed.requestedPolicyVersion !== 3 || parsed.returnedPolicyVersion !== versionValue
    || parsed.versionSourceLayer !== "PYTHON_MESSAGE_TO_DICT" || !validVersionDiagnostic(parsed.versionDiagnostic, { success: true })
    || parsed.versionDiagnostic.versionRawPrimitiveValue !== policy.version || !Array.isArray(policy.bindings)) return "TRANSPORT_SCHEMA_INVALID";
  const request = parsed.requestMetadata;
  if (!request || typeof request !== "object" || Array.isArray(request)
    || Object.keys(request).some((key) => !["approvedResourceFingerprint", "requestResourceFingerprint", "resourceValidatedBeforeDispatch", "requestPathFingerprint", "requestPathValidatedBeforeDispatch", "requestedPolicyVersion", "requestBodyOptionsVersionValidated"].includes(key))) return "TRANSPORT_REQUEST_RESOURCE_MISMATCH";
  if (!request || request.resourceValidatedBeforeDispatch !== true
    || request.requestPathValidatedBeforeDispatch !== true
    || request.requestedPolicyVersion !== 3 || request.requestBodyOptionsVersionValidated !== true
    || request.requestResourceFingerprint !== safeDigest(EXPECTED_IAM_RESOURCE)
    || request.approvedResourceFingerprint !== safeDigest(EXPECTED_IAM_RESOURCE)
    || request.requestPathFingerprint !== safeDigest(`v1/${EXPECTED_IAM_RESOURCE}:getIamPolicy`)) return "TRANSPORT_REQUEST_RESOURCE_MISMATCH";
  if (Object.keys(parsed).some((key) => !READ_ENVELOPE_KEYS.has(key))
    || Object.keys(policy).some((key) => !IAM_POLICY_KEYS.has(key))) return "TRANSPORT_AMBIGUOUS_RESPONSE";
  for (const binding of policy.bindings) {
    if (!binding || typeof binding !== "object" || Array.isArray(binding)
      || Object.keys(binding).some((key) => !["role", "members", "condition"].includes(key))
      || typeof binding.role !== "string" || !binding.role || !Array.isArray(binding.members)
      || !binding.members.every((member) => typeof member === "string" && MEMBER.test(member))) return "TRANSPORT_SCHEMA_INVALID";
    const condition = binding.condition;
    if (condition !== undefined && (!condition || typeof condition !== "object" || Array.isArray(condition)
      || Object.keys(condition).some((key) => !["expression", "title", "description", "location"].includes(key))
      || Object.values(condition).some((value) => typeof value !== "string"))) return "TRANSPORT_SCHEMA_INVALID";
  if (/_withcond_/i.test(binding.role) || (unset || versionValue < 3) && condition !== undefined) return "TRANSPORT_AMBIGUOUS_RESPONSE";
  }
  if (policy.auditConfigs !== undefined) {
    if (!Array.isArray(policy.auditConfigs)) return "TRANSPORT_SCHEMA_INVALID";
    for (const config of policy.auditConfigs) {
      if (!config || typeof config !== "object" || Array.isArray(config)
        || Object.keys(config).some((key) => !["service", "auditLogConfigs"].includes(key))
        || typeof config.service !== "string" || !Array.isArray(config.auditLogConfigs)) return "TRANSPORT_SCHEMA_INVALID";
      for (const entry of config.auditLogConfigs) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)
          || Object.keys(entry).some((key) => !["logType", "exemptedMembers"].includes(key))
          || typeof entry.logType !== "string") return "TRANSPORT_SCHEMA_INVALID";
        if (entry.exemptedMembers !== undefined && (!Array.isArray(entry.exemptedMembers)
          || !entry.exemptedMembers.every((member) => typeof member === "string" && MEMBER.test(member)))) return "TRANSPORT_SCHEMA_INVALID";
      }
    }
  }
  return null;
}

function validProviderResponseShape(value, expectedPath) {
  const keys = ["providerResponseObjectType", "providerResponseIsMapping", "providerResponseIsMessageLike",
    "providerResponseObjectModule", "providerResponseObjectClass", "providerResponseWrapperType",
    "providerResponseTopLevelKeyCount", "providerResponseSafeTopLevelKeys", "unknownKeyCount",
    "hasRootVersion", "hasRootEtag", "hasRootBindings", "hasRootPolicy", "hasRootResponse",
    "hasRootResult", "hasRootData", "rootVersionType", "rootVersionPrimitiveValue",
    "nestedPolicyPresent", "nestedPolicyVersionPresent", "nestedPolicyVersionType",
    "policyExtractionPath", "policyExtractionResult", "extractedPolicyObjectType"];
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((key) => keys.includes(key))
    && value.policyExtractionPath === expectedPath
    && value.policyExtractionResult === "EXTRACTED"
    && ["MAPPING", "MESSAGE", "OBJECT"].includes(value.providerResponseObjectType)
    && typeof value.providerResponseObjectModule === "string"
    && /^[A-Za-z_][A-Za-z0-9_.]{0,255}$/.test(value.providerResponseObjectModule)
    && typeof value.providerResponseObjectClass === "string"
    && /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(value.providerResponseObjectClass)
    && ["DIRECT_POLICY", "KNOWN_PROVIDER_WRAPPER", "SDK_POLICY_MESSAGE"].includes(value.providerResponseWrapperType)
    && Number.isSafeInteger(value.providerResponseTopLevelKeyCount) && value.providerResponseTopLevelKeyCount >= 0
    && Number.isSafeInteger(value.unknownKeyCount) && value.unknownKeyCount >= 0
    && Array.isArray(value.providerResponseSafeTopLevelKeys)
    && value.providerResponseSafeTopLevelKeys.every((key) => ["version", "etag", "bindings", "auditConfigs", "audit_configs", "policy", "response", "result", "data", "error"].includes(key));
}

function validInputContractDiagnostic(value) {
  const fieldTypes = new Set(["NULL", "OBJECT", "ARRAY", "STRING", "BOOLEAN", "INTEGER", "FLOAT"]);
  const fields = new Set(["resource", "member", "account", "policy"]);
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((key) => ["argvCount", "argvShapeValid", "stdinEncoding", "stdinByteLength", "stdinBomPresent", "stdinNewlineKind", "stdinJsonParseSucceeded", "stdinSchemaValidationSucceeded", "helperInputObjectType", "helperInputKeyCount", "helperInputSafeKeys", "requiredFieldsPresent", "missingRequiredFields", "fieldTypeSummary", "environmentContractValid", "requestBuildState"].includes(key))
    && Number.isSafeInteger(value.argvCount) && value.argvCount >= 0
    && typeof value.argvShapeValid === "boolean"
    && value.stdinEncoding === "UTF8"
    && Number.isSafeInteger(value.stdinByteLength) && value.stdinByteLength >= 0
    && typeof value.stdinBomPresent === "boolean"
    && ["NONE", "LF", "CRLF", "CR"].includes(value.stdinNewlineKind)
    && typeof value.stdinJsonParseSucceeded === "boolean"
    && typeof value.stdinSchemaValidationSucceeded === "boolean"
    && ["NOT_PARSED", "OBJECT", "ARRAY", "STRING", "BOOLEAN", "INTEGER", "FLOAT", "NULL"].includes(value.helperInputObjectType)
    && Number.isSafeInteger(value.helperInputKeyCount) && value.helperInputKeyCount >= 0
    && Array.isArray(value.helperInputSafeKeys) && value.helperInputSafeKeys.every((key) => fields.has(key))
    && typeof value.requiredFieldsPresent === "boolean"
    && Array.isArray(value.missingRequiredFields) && value.missingRequiredFields.every((key) => fields.has(key))
    && value.fieldTypeSummary && typeof value.fieldTypeSummary === "object" && !Array.isArray(value.fieldTypeSummary)
    && Object.entries(value.fieldTypeSummary).every(([key, type]) => fields.has(key) && fieldTypes.has(type))
    && typeof value.environmentContractValid === "boolean"
    && typeof value.requestBuildState === "string" && /^[A-Z_]{1,48}$/.test(value.requestBuildState);
}

function mappedProviderFailure(parsed, status) {
  if (parsed?.ok !== false || typeof parsed.code !== "string") return null;
  const helperCode = parsed.failure?.code;
  const helperMapping = {
    HELPER_INPUT_INVALID: "TRANSPORT_HELPER_INPUT_INVALID",
    HELPER_RESOURCE_MISMATCH: "TRANSPORT_REQUEST_RESOURCE_MISMATCH",
    HELPER_REQUEST_BUILD_FAILED: "TRANSPORT_RESOURCE_VALIDATION_FAILED",
    HELPER_REQUEST_NORMALIZATION_FAILED: "TRANSPORT_RESOURCE_VALIDATION_FAILED",
    HELPER_PROVIDER_AUTH_FAILED: "TRANSPORT_AUTH_FAILURE",
    HELPER_PROVIDER_PERMISSION_DENIED: "TRANSPORT_PERMISSION_DENIED",
    HELPER_PROVIDER_RATE_LIMIT: "TRANSPORT_RATE_LIMIT",
    HELPER_PROVIDER_SERVER_ERROR: "TRANSPORT_SERVER_ERROR",
    HELPER_PROVIDER_TIMEOUT: "TRANSPORT_TIMEOUT",
    HELPER_PROVIDER_NETWORK_ERROR: "TRANSPORT_NETWORK_ERROR",
    HELPER_PROVIDER_RESPONSE_INVALID: "TRANSPORT_SCHEMA_INVALID",
    HELPER_POLICY_VERSION_MISSING: "TRANSPORT_POLICY_VERSION_MISSING",
    HELPER_ETAG_MISSING: "TRANSPORT_ETAG_MISSING",
    HELPER_POLICY_SCHEMA_INVALID: "TRANSPORT_POLICY_SCHEMA_INVALID",
    HELPER_SERIALIZATION_FAILED: "TRANSPORT_SERIALIZATION_FAILED",
    HELPER_POLICY_CANONICALIZATION_FAILED: "TRANSPORT_SERIALIZATION_FAILED",
    HELPER_POLICY_BINDING_NORMALIZATION_FAILED: "TRANSPORT_SERIALIZATION_FAILED",
    HELPER_POLICY_ETAG_NORMALIZATION_FAILED: "TRANSPORT_SERIALIZATION_FAILED",
    HELPER_POLICY_VERSION_NORMALIZATION_FAILED: "TRANSPORT_SERIALIZATION_FAILED",
    HELPER_JSON_SERIALIZATION_FAILED: "TRANSPORT_SERIALIZATION_FAILED",
    HELPER_SUCCESS_ENVELOPE_BUILD_FAILED: "TRANSPORT_SERIALIZATION_FAILED",
    HELPER_UNHANDLED_EXCEPTION: "TRANSPORT_HELPER_UNHANDLED_EXCEPTION",
    HELPER_ARG_PARSE_FAILED: "TRANSPORT_HELPER_ARG_PARSE_FAILED",
    HELPER_STDIN_EMPTY: "TRANSPORT_HELPER_STDIN_EMPTY",
    HELPER_STDIN_READ_FAILED: "TRANSPORT_HELPER_STDIN_READ_FAILED",
    HELPER_INPUT_JSON_PARSE_FAILED: "TRANSPORT_HELPER_INPUT_JSON_PARSE_FAILED",
    HELPER_INPUT_SCHEMA_FAILED: "TRANSPORT_HELPER_INPUT_SCHEMA_FAILED",
    HELPER_REQUIRED_FIELD_MISSING: "TRANSPORT_HELPER_REQUIRED_FIELD_MISSING",
    HELPER_FIELD_TYPE_INVALID: "TRANSPORT_HELPER_FIELD_TYPE_INVALID",
    HELPER_ENVIRONMENT_CONTRACT_FAILED: "TRANSPORT_HELPER_ENVIRONMENT_CONTRACT_FAILED",
    HELPER_LOCAL_CLIENT_SETUP_FAILED: "TRANSPORT_HELPER_LOCAL_CLIENT_SETUP_FAILED",
    HELPER_ENTRYPOINT_EXCEPTION: "TRANSPORT_HELPER_ENTRYPOINT_EXCEPTION",
    HELPER_DIAGNOSTIC_STATE_INCONSISTENT: "TRANSPORT_HELPER_DIAGNOSTIC_STATE_INCONSISTENT",
    HELPER_UNKNOWN: "TRANSPORT_HELPER_UNKNOWN",
  };
  if (HELPER_FAILURES.has(helperCode)) return helperMapping[helperCode];
  return ({
    REQUEST_RESOURCE_MISMATCH: "TRANSPORT_REQUEST_RESOURCE_MISMATCH",
    RESOURCE_VALIDATION_FAILED: "TRANSPORT_RESOURCE_VALIDATION_FAILED",
    PROVIDER_POLICY_SCHEMA_INVALID: "TRANSPORT_PROVIDER_POLICY_SCHEMA_INVALID",
    PROVIDER_POLICY_VERSION_MISSING: "TRANSPORT_POLICY_VERSION_MISSING",
    PROVIDER_POLICY_ETAG_MISSING: "TRANSPORT_ETAG_MISSING",
    PRESTATE_READ_FAILURE: status === 403 ? "TRANSPORT_PERMISSION_DENIED" : status === 401 ? "TRANSPORT_AUTH_FAILURE" : "TRANSPORT_PROVIDER_NONZERO_EXIT",
  })[parsed.code] || null;
}

function invalidStructuredFailure(parsed) {
  if (parsed?.ok !== false || parsed.failure === undefined) return false;
  const lifecycle = parsed.transportLifecycle;
  return !HELPER_FAILURES.has(parsed.failure?.code)
    || !TRANSPORT_PHASES.has(parsed.failure?.phase)
    || typeof parsed.failure?.providerRequestStarted !== "boolean"
    || typeof parsed.failure?.providerResponseReceived !== "boolean"
    || !(parsed.failure?.httpStatus === null || Number.isInteger(parsed.failure?.httpStatus))
    || !lifecycle || typeof lifecycle !== "object"
    || !(TRANSPORT_PHASES.has(lifecycle.lastCompletedPhase) || lifecycle.lastCompletedPhase === null && lifecycle.failedPhase === "PHASE_01_INPUT_VALIDATION")
    || !(lifecycle.failedPhase === null || TRANSPORT_PHASES.has(lifecycle.failedPhase))
    || typeof lifecycle.providerRequestPrepared !== "boolean"
    || typeof lifecycle.providerRequestStarted !== "boolean"
    || typeof lifecycle.providerResponseReceived !== "boolean"
    || typeof lifecycle.httpStatusKnown !== "boolean"
    || !(lifecycle.httpStatus === null || Number.isInteger(lifecycle.httpStatus))
    || !lifecycleIsConsistent(lifecycle, parsed.failure);
}

function lifecycleIsConsistent(lifecycle, failure) {
  if (!lifecycle || !failure || failure.phase !== lifecycle.failedPhase
    || (lifecycle.lastCompletedPhase === null && lifecycle.failedPhase !== "PHASE_01_INPUT_VALIDATION")) return false;
  const phases = [...TRANSPORT_PHASES];
  if (lifecycle.lastCompletedPhase !== null
    && phases.indexOf(lifecycle.lastCompletedPhase) >= phases.indexOf(lifecycle.failedPhase)) return false;
  if (lifecycle.providerResponseReceived && !lifecycle.providerRequestStarted) return false;
  if (lifecycle.httpStatusKnown !== Number.isInteger(lifecycle.httpStatus)) return false;
  if (failure.providerRequestStarted !== lifecycle.providerRequestStarted
    || failure.providerResponseReceived !== lifecycle.providerResponseReceived
    || failure.httpStatus !== lifecycle.httpStatus) return false;
  return true;
}

function validHelperExecution(value, parsed) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.schemaVersion !== "myweb.g2b.helper-execution.v1"
    || typeof value.success !== "boolean"
    || !(TRANSPORT_PHASES.has(value.lastCompletedPhase) || value.lastCompletedPhase === null)
    || !(TRANSPORT_PHASES.has(value.failedPhase) || value.failedPhase === null)
    || !(value.failureCode === null || typeof value.failureCode === "string" && /^[A-Z0-9_-]{1,96}$/.test(value.failureCode))
    || ["requestBuilt", "providerRequestPrepared", "providerRequestStarted", "providerResponseReceived", "policyExtracted", "requestMetadataAvailable"]
      .some((key) => typeof value[key] !== "boolean")
    || !value.safeDiagnostics || typeof value.safeDiagnostics !== "object" || Array.isArray(value.safeDiagnostics)) return false;
  if (value.success !== (parsed?.ok === true)
    || value.providerRequestStarted !== (parsed?.transportLifecycle?.providerRequestStarted === true)
    || value.providerResponseReceived !== (parsed?.transportLifecycle?.providerResponseReceived === true)
    || value.providerRequestPrepared !== (parsed?.transportLifecycle?.providerRequestPrepared === true)
    || (!value.success && (value.failureCode === null || value.failureCode !== parsed?.failure?.helperCode))
    || (!value.requestBuilt && (value.providerRequestPrepared || value.providerRequestStarted
      || value.providerResponseReceived || value.policyExtracted || value.requestMetadataAvailable))
    || (value.requestBuilt && !value.providerRequestPrepared)
    || (value.providerRequestStarted && !value.providerRequestPrepared)
    || (value.providerResponseReceived && !value.providerRequestStarted)
    || (value.policyExtracted && !value.providerResponseReceived)
    || (value.requestMetadataAvailable && !value.requestBuilt)
    || (!value.success && value.failedPhase === null)
    || (value.success && (value.failureCode !== null || value.failedPhase !== null))) return false;
  return true;
}

function normalizedProviderPolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)) return policy;
  const { resource: _nonAuthoritativeResponseResource, ...normalized } = policy;
  return normalized;
}

function failureClassFor({ timedOut, signal, spawnError, truncated, encodingError, exitCode, stdout, stderr, parsed, parseSucceeded, schemaValid, resourceValid, expectedOperation }) {
  if (timedOut) return "TRANSPORT_TIMEOUT";
  if (signal) return "TRANSPORT_SIGNALLED";
  if (truncated) return "TRANSPORT_TRUNCATED_OUTPUT";
  if (spawnError || (exitCode === null && !timedOut)) return "TRANSPORT_EXEC_FAILED";
  if (encodingError) return "TRANSPORT_ENCODING_ERROR";
  if (invalidStructuredFailure(parsed)) return "TRANSPORT_SCHEMA_INVALID";
  const status = providerStatus(parsed);
  const mappedFailure = mappedProviderFailure(parsed, status);
  if (mappedFailure) return mappedFailure;
  if (status === 403) return "TRANSPORT_PERMISSION_DENIED";
  if (status === 401) return "TRANSPORT_AUTH_FAILURE";
  if (status === 429) return "TRANSPORT_RATE_LIMIT";
  if ([500, 502, 503, 504].includes(status)) return "TRANSPORT_SERVER_ERROR";
  if (status === 404) return "TRANSPORT_RESOURCE_MISMATCH";
  const issue = readResponseIssue(parsed, expectedOperation);
  if (issue) return issue;
  if (resourceValid === false) return "TRANSPORT_REQUEST_RESOURCE_MISMATCH";
  const diagnostic = classifyDiagnosticText(`${stdout}\n${stderr}`);
  if (diagnostic.errorClass === "PERMISSION_DENIED") return "TRANSPORT_PERMISSION_DENIED";
  if (diagnostic.errorClass === "AUTH_FAILURE") return "TRANSPORT_AUTH_FAILURE";
  if (diagnostic.errorClass === "RATE_LIMIT") return "TRANSPORT_RATE_LIMIT";
  if (diagnostic.errorClass === "TIMEOUT") return "TRANSPORT_TIMEOUT";
  if (diagnostic.errorClass === "SERVER_ERROR") return "TRANSPORT_SERVER_ERROR";
  if (exitCode !== 0 && exitCode !== null) return "TRANSPORT_PROVIDER_NONZERO_EXIT";
  if (!String(stdout || "").trim()) return "TRANSPORT_EMPTY_STDOUT";
  if (!parseSucceeded) {
    if (appearsTruncated(stdout)) return "TRANSPORT_TRUNCATED_OUTPUT";
    if (String(stdout).includes("{") && !String(stdout).trimStart().startsWith("{")) return "TRANSPORT_AMBIGUOUS_RESPONSE";
    return "TRANSPORT_INVALID_JSON";
  }
  if (!schemaValid) return "TRANSPORT_SCHEMA_INVALID";
  if (exitCode === 0 && parsed?.ok === true && issue === null) return "NONE";
  return "TRANSPORT_UNKNOWN";
}

function inferredLastCompletedPhase(result, childStarted, parseSucceeded, schemaValid) {
  if (!result?.spawnAttempted) return "PHASE_01_INPUT_VALIDATION";
  if (!childStarted) return "PHASE_02_CHILD_SPAWN_ATTEMPT";
  if (parseSucceeded && schemaValid) return "PHASE_10_SCHEMA_VALIDATION";
  if (parseSucceeded) return "PHASE_09_NODE_STDOUT_PARSE";
  return "PHASE_03_CHILD_STARTED";
}

function previousTransportPhase(phase) {
  const phases = [...TRANSPORT_PHASES];
  const index = phases.indexOf(phase);
  return index > 0 ? phases[index - 1] : null;
}

function timedOutOrSignalPhase(result, childStarted, parseSucceeded, schemaValid, lifecycle) {
  if (TRANSPORT_PHASES.has(lifecycle?.failedPhase)) return lifecycle.failedPhase;
  if (!result?.spawnAttempted) return "PHASE_01_INPUT_VALIDATION";
  if (!childStarted) return "PHASE_02_CHILD_SPAWN_ATTEMPT";
  if (result?.timedOut === true || result?.signal) {
    return lifecycle?.providerRequestStarted === true ? "PHASE_06_PROVIDER_REQUEST_STARTED" : "PHASE_03_CHILD_STARTED";
  }
  if (childStarted && !String(result?.stdout || "").trim()) return "PHASE_04_HELPER_INPUT_ACCEPTED";
  if (!parseSucceeded) return "PHASE_09_NODE_STDOUT_PARSE";
  if (!schemaValid) return "PHASE_10_SCHEMA_VALIDATION";
  return "PHASE_11_CAS_CAPTURE";
}

function metadataUnknownReason({ spawnError, timedOut, signal, parsed, parseSucceeded, schemaValid, childStarted, failureClass }) {
  if (spawnError?.code) return `SPAWN_${String(spawnError.code).replace(/[^A-Z0-9_]/gi, "_").toUpperCase().slice(0, 32)}`;
  if (!childStarted) return "CHILD_START_NOT_CONFIRMED";
  if (timedOut) return "PROCESS_TIMEOUT";
  if (signal) return "PROCESS_SIGNALLED";
  if (!parseSucceeded) return "HELPER_OUTPUT_NOT_PARSEABLE";
  if (!schemaValid) return "HELPER_SCHEMA_NOT_VALID";
  if (parsed?.ok === false && !parsed?.failure) return "LEGACY_FAILURE_ENVELOPE_WITHOUT_PHASE_DETAILS";
  return failureClass === "TRANSPORT_UNKNOWN" ? "NO_SAFE_FAILURE_RULE_MATCHED" : "NOT_UNKNOWN";
}

export function classifyG2BTransportResult(result, { expectedOperation, now = () => new Date().toISOString() } = {}) {
  const decodedStdout = decodeOutput(result?.stdout);
  const decodedStderr = decodeOutput(result?.stderr);
  const stdout = decodedStdout.text;
  const stderr = decodedStderr.text;
  const normalized = stdout.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  let parsed;
  let parseSucceeded = false;
  try { parsed = JSON.parse(normalized.trim()); parseSucceeded = true; } catch { parsed = null; }
  let schemaValid = parsed?.schema === SCHEMA && parsed && typeof parsed === "object" && !Array.isArray(parsed);
  const failureEnvelopeValid = parsed?.ok === false && HELPER_FAILURES.has(parsed?.failure?.code)
    && TRANSPORT_PHASES.has(parsed?.failure?.phase)
    && typeof parsed.failure.providerRequestStarted === "boolean"
    && typeof parsed.failure.providerResponseReceived === "boolean"
    && (parsed.failure.httpStatus === null || Number.isInteger(parsed.failure.httpStatus));
  const parsedLifecycle = parsed?.transportLifecycle;
  const parsedLifecycleValid = parsedLifecycle && typeof parsedLifecycle === "object"
    && (TRANSPORT_PHASES.has(parsedLifecycle.lastCompletedPhase) || parsedLifecycle.lastCompletedPhase === null && parsedLifecycle.failedPhase === "PHASE_01_INPUT_VALIDATION")
    && (parsedLifecycle.failedPhase === null || TRANSPORT_PHASES.has(parsedLifecycle.failedPhase))
    && typeof parsedLifecycle.providerRequestPrepared === "boolean"
    && typeof parsedLifecycle.providerRequestStarted === "boolean"
    && typeof parsedLifecycle.providerResponseReceived === "boolean"
    && typeof parsedLifecycle.httpStatusKnown === "boolean"
    && (parsedLifecycle.httpStatus === null || Number.isInteger(parsedLifecycle.httpStatus))
    && lifecycleIsConsistent(parsedLifecycle, parsed.failure);
  if (schemaValid && parsed.ok === false && parsed.failure !== undefined && (!failureEnvelopeValid || !parsedLifecycleValid)) schemaValid = false;
  if (schemaValid && expectedOperation === "READ_GENERATION_BOUND_RECOVERY_POLICY" && parsed.ok === true) {
    schemaValid = parsed.requestStarted === true && parsed.recoveryReadCompleted === true && parsed.setAttempted === false
      && (parsed.remoteRequestStarted === undefined || parsed.remoteRequestStarted === parsed.requestStarted)
      && parsed.policy && typeof parsed.policy === "object" && !Array.isArray(parsed.policy)
      && ((parsed.returnedPolicyVersionState === "UNSET" && parsed.returnedPolicyVersionValue === null && parsed.policy.version === null)
        || parsed.returnedPolicyVersionState === "EXPLICIT" && Number.isSafeInteger(parsed.returnedPolicyVersionValue)
          && [0, 1, 3].includes(parsed.returnedPolicyVersionValue) && parsed.policy.version === parsed.returnedPolicyVersionValue)
      && parsed.requestedPolicyVersion === 3 && parsed.returnedPolicyVersion === parsed.returnedPolicyVersionValue
      && validVersionDiagnostic(parsed.versionDiagnostic, { success: true })
      && parsed.versionSourceLayer === "PYTHON_MESSAGE_TO_DICT"
      && typeof parsed.policy.etag === "string" && parsed.policy.etag.length > 0
      && Array.isArray(parsed.policy.bindings)
      && parsed.requestMetadata && typeof parsed.requestMetadata === "object" && !Array.isArray(parsed.requestMetadata);
  }
  const responseIssue = readResponseIssue(parsed, expectedOperation);
  if (schemaValid && responseIssue) schemaValid = false;
  const requestMetadata = parsed?.requestMetadata;
  const resourceValid = !schemaValid || (expectedOperation === "READ_GENERATION_BOUND_RECOVERY_POLICY" && !requestMetadata)
    ? null : expectedOperation === "READ_GENERATION_BOUND_RECOVERY_POLICY"
    ? requestMetadata?.resourceValidatedBeforeDispatch === true
      && requestMetadata?.requestPathValidatedBeforeDispatch === true
      && requestMetadata?.requestResourceFingerprint === safeDigest(EXPECTED_IAM_RESOURCE)
      && requestMetadata?.approvedResourceFingerprint === safeDigest(EXPECTED_IAM_RESOURCE)
      && requestMetadata?.requestPathFingerprint === safeDigest(`v1/${EXPECTED_IAM_RESOURCE}:getIamPolicy`)
    : parsed?.iamResource === undefined || parsed?.iamResource === EXPECTED_IAM_RESOURCE;
  const status = providerStatus(parsed);
  const diagnostic = classifyDiagnosticText(`${stderr}\n${parsed?.code || ""}`);
  const stdoutByteLength = Buffer.isBuffer(result?.stdout) ? result.stdout.byteLength : Buffer.byteLength(stdout, "utf8");
  const stderrByteLength = Buffer.isBuffer(result?.stderr) ? result.stderr.byteLength : Buffer.byteLength(stderr, "utf8");
  const truncated = result?.truncated === true || result?.spawnError?.code === "ENOBUFS"
    || stdoutByteLength > MAX_TRANSPORT_OUTPUT_BYTES || stderrByteLength > MAX_TRANSPORT_OUTPUT_BYTES;
  const stdoutTruncated = result?.stdoutTruncated === true || stdoutByteLength > MAX_TRANSPORT_OUTPUT_BYTES;
  const stderrTruncated = result?.stderrTruncated === true || stderrByteLength > MAX_TRANSPORT_OUTPUT_BYTES;
  const encodingError = decodedStdout.invalidUtf8 || decodedStderr.invalidUtf8;
  const spawnCode = result?.spawnError?.code;
  const childStarted = typeof result?.childProcessStarted === "boolean" ? result.childProcessStarted
    : typeof result?.childPidPresent === "boolean" ? result.childPidPresent
    : result?.spawnError == null && (Number.isInteger(result?.exitCode) || result?.timedOut === true || typeof result?.signal === "string");
  const helperLifecycle = parsed?.transportLifecycle;
  const lifecycleShapeValid = helperLifecycle && typeof helperLifecycle === "object"
    && (TRANSPORT_PHASES.has(helperLifecycle.lastCompletedPhase) || helperLifecycle.lastCompletedPhase === null && helperLifecycle.failedPhase === "PHASE_01_INPUT_VALIDATION")
    && (helperLifecycle.failedPhase === null || TRANSPORT_PHASES.has(helperLifecycle.failedPhase))
    && typeof helperLifecycle.providerRequestPrepared === "boolean"
    && typeof helperLifecycle.providerRequestStarted === "boolean"
    && typeof helperLifecycle.providerResponseReceived === "boolean"
    && typeof helperLifecycle.httpStatusKnown === "boolean"
    && (helperLifecycle.httpStatus === null || Number.isInteger(helperLifecycle.httpStatus))
    && (parsed?.ok !== false || lifecycleIsConsistent(helperLifecycle, parsed?.failure));
  const providerRequestStarted = typeof parsed?.failure?.providerRequestStarted === "boolean"
    ? parsed.failure.providerRequestStarted
    : typeof helperLifecycle?.providerRequestStarted === "boolean" ? helperLifecycle.providerRequestStarted
    : typeof parsed?.remoteRequestStarted === "boolean" ? parsed.remoteRequestStarted
    : typeof parsed?.requestStarted === "boolean" ? parsed.requestStarted : null;
  const providerResponseReceived = typeof parsed?.failure?.providerResponseReceived === "boolean"
    ? parsed.failure.providerResponseReceived
    : typeof helperLifecycle?.providerResponseReceived === "boolean" ? helperLifecycle.providerResponseReceived
    : Number.isInteger(status) && providerRequestStarted === true;
  const classifiedFailure = failureClassFor({
    timedOut: result?.timedOut === true, signal: result?.signal || null, spawnError: result?.spawnError || null,
    truncated, encodingError, exitCode: result?.exitCode ?? null, stdout, stderr, parsed, parseSucceeded, schemaValid, resourceValid, expectedOperation,
  });
  const transportFailureClass = spawnCode || !childStarted ? "SPAWN_FAILED"
    : result?.timedOut === true ? "HELPER_TIMEOUT"
    : result?.signal ? "HELPER_SIGNALLED"
    : !String(stdout || "").trim() ? "HELPER_NO_OUTPUT"
    : !parseSucceeded ? "HELPER_INVALID_ENVELOPE"
    : parsed?.schema !== SCHEMA ? "HELPER_PROTOCOL_VERSION_MISMATCH"
    : parsed?.ok === false && parsed?.requestStarted === false ? "HELPER_INPUT_REJECTED"
    : parsed?.ok === false && parsed?.requestStarted === true ? "PROVIDER_REQUEST_FAILURE"
    : schemaValid ? "NONE" : "HELPER_INVALID_ENVELOPE";
  const failedPhase = classifiedFailure === "NONE" ? null : timedOutOrSignalPhase(result, childStarted, parseSucceeded, schemaValid, helperLifecycle);
  const unknownReason = metadataUnknownReason({ spawnError: result?.spawnError, timedOut: result?.timedOut === true,
    signal: result?.signal, parsed, parseSucceeded, schemaValid, childStarted, failureClass: failureClassFor({
      timedOut: result?.timedOut === true, signal: result?.signal || null, spawnError: result?.spawnError || null,
      truncated, encodingError, exitCode: result?.exitCode ?? null, stdout, stderr, parsed, parseSucceeded, schemaValid, resourceValid, expectedOperation,
    }) });
  const metadata = Object.freeze({
    failureClass: classifiedFailure,
    transportFailureClass,
    exitCode: Number.isInteger(result?.exitCode) ? result.exitCode : null,
    signal: typeof result?.signal === "string" ? result.signal : null,
    timedOut: result?.timedOut === true,
    stdoutPresent: Buffer.byteLength(stdout, "utf8") > 0,
    stderrPresent: Buffer.byteLength(stderr, "utf8") > 0,
    spawnAttempted: result?.spawnAttempted !== false,
    transportStage: typeof result?.transportStage === "string" && /^[A-Z0-9_]{1,48}$/.test(result.transportStage) ? result.transportStage : null,
    spawnReturned: typeof result?.spawnReturned === "boolean" ? result.spawnReturned : null,
    childPidPresent: typeof result?.childPidPresent === "boolean" ? result.childPidPresent : null,
    spawnErrorCode: typeof spawnCode === "string" && /^[A-Z0-9_]{1,32}$/.test(spawnCode) ? spawnCode : null,
    spawnErrorName: typeof result?.spawnError?.name === "string" && /^[A-Za-z0-9_]{1,48}$/.test(result.spawnError.name) ? result.spawnError.name : null,
    spawnErrorErrno: typeof result?.spawnError?.errno === "string" || Number.isSafeInteger(result?.spawnError?.errno) ? result.spawnError.errno : null,
    spawnErrorSyscall: typeof result?.spawnError?.syscall === "string" && /^[A-Za-z0-9_]{1,48}$/.test(result.spawnError.syscall) ? result.spawnError.syscall : null,
    childStarted,
    executableBasename: typeof result?.executableBasename === "string" && /^[A-Za-z0-9._-]{1,80}$/.test(result.executableBasename) ? result.executableBasename : null,
    executablePathSha256: SHA256.test(result?.executablePathSha256 || "") ? result.executablePathSha256 : null,
    helperPathSha256: SHA256.test(result?.helperPathSha256 || "") ? result.helperPathSha256 : null,
    cwdSha256: SHA256.test(result?.cwdSha256 || "") ? result.cwdSha256 : null,
    argvCount: Number.isSafeInteger(result?.argvCount) ? result.argvCount : null,
    argvSha256: SHA256.test(result?.argvSha256 || "") ? result.argvSha256 : null,
    envKeyCount: Number.isSafeInteger(result?.envKeyCount) ? result.envKeyCount : null,
    safeEnvPresence: result?.safeEnvPresence && typeof result.safeEnvPresence === "object"
      ? Object.freeze(Object.fromEntries(SAFE_PROCESS_ENV_KEYS.map((key) => [key, result.safeEnvPresence[key] === true]))) : null,
    protocolEnvelopePresent: Boolean(parsed && typeof parsed === "object"),
    protocolEnvelopeType: parsed === null ? "NONE" : Array.isArray(parsed) ? "ARRAY" : typeof parsed === "object" ? "OBJECT" : typeof parsed,
    helperStartedMarker: TRANSPORT_PHASES.has(parsed?.transportLifecycle?.lastCompletedPhase)
      || TRANSPORT_PHASES.has(parsed?.transportLifecycle?.failedPhase),
    providerDispatchMarker: parsed?.transportLifecycle?.providerRequestStarted === true || parsed?.requestStarted === true,
    stdinEncoding: result?.stdinEncoding === "UTF8" ? "UTF8" : null,
    stdinWriteAttempted: typeof result?.stdinWriteAttempted === "boolean" ? result.stdinWriteAttempted : null,
    stdinByteLength: Number.isSafeInteger(result?.stdinByteLength) ? result.stdinByteLength : null,
    stdinWritten: typeof result?.stdinWritten === "boolean" ? result.stdinWritten : null,
    stdinBomPresent: typeof result?.stdinBomPresent === "boolean" ? result.stdinBomPresent : null,
    stdinNewlineKind: ["NONE", "LF", "CRLF", "CR"].includes(result?.stdinNewlineKind) ? result.stdinNewlineKind : null,
    stdinWriteCompleted: typeof result?.stdinWriteCompleted === "boolean" ? result.stdinWriteCompleted : null,
    stdinClosed: typeof result?.stdinClosed === "boolean" ? result.stdinClosed : null,
    stdoutByteLength,
    stderrByteLength,
    stdoutTruncated,
    stderrTruncated,
    stdoutDigest: byteDigest(result?.stdout ?? stdout),
    stderrDigest: byteDigest(result?.stderr ?? stderr),
    stdoutSha256: byteDigest(result?.stdout ?? stdout),
    stderrSha256: byteDigest(result?.stderr ?? stderr),
    transportType: "CHILD_PROCESS",
    targetResourceDigest: safeDigest(EXPECTED_IAM_RESOURCE),
    jsonParseSucceeded: parseSucceeded,
    schemaValidationSucceeded: schemaValid,
    resourceValidationSucceeded: resourceValid,
    errorClass: diagnostic.errorClass,
    errorCode: spawnCode === "ENOBUFS" ? "OUTPUT_BUFFER_EXCEEDED" : encodingError ? "INVALID_UTF8_REPLACEMENT" : diagnostic.errorCode,
    httpStatus: status,
    timestamp: now(),
    requestStarted: typeof parsed?.remoteRequestStarted === "boolean" ? parsed.remoteRequestStarted
      : typeof parsed?.requestStarted === "boolean" ? parsed.requestStarted : null,
    transportLifecycle: "G2B_TRANSPORT_LIFECYCLE_V1",
    lastCompletedPhase: parseSucceeded && schemaValid && parsed?.ok === true ? "PHASE_10_SCHEMA_VALIDATION"
      : lifecycleShapeValid ? helperLifecycle.lastCompletedPhase
      : TRANSPORT_PHASES.has(helperLifecycle?.failedPhase)
        ? previousTransportPhase(helperLifecycle.failedPhase)
        : inferredLastCompletedPhase(result, childStarted, parseSucceeded, schemaValid),
    failedPhase,
    providerRequestPrepared: helperLifecycle?.providerRequestPrepared === true,
    providerRequestStarted,
    providerResponseReceived,
    httpStatusKnown: Number.isInteger(status),
    httpStatus: Number.isInteger(status) ? status : null,
    helperFailureCode: typeof parsed?.helperExecution?.failureCode === "string" ? parsed.helperExecution.failureCode
      : typeof parsed?.failure?.helperCode === "string" && /^[A-Z0-9_-]{1,96}$/.test(parsed.failure.helperCode)
        ? parsed.failure.helperCode : HELPER_FAILURES.has(parsed?.failure?.code) ? parsed.failure.code : null,
    helperExecution: validHelperExecution(parsed?.helperExecution, parsed) ? Object.freeze({ ...parsed.helperExecution,
      safeDiagnostics: Object.freeze({ ...parsed.helperExecution.safeDiagnostics }) }) : null,
    nodeFailureClass: classifiedFailure,
    unknownReason,
    resourceValidationState: resourceValid === true ? "MATCH" : resourceValid === false ? "MISMATCH" : "UNKNOWN",
    policyParseState: !parseSucceeded ? "INVALID_OR_EMPTY" : !parsed?.policy ? "NOT_PRESENT" : schemaValid ? "VALID" : "INVALID",
    etagState: typeof parsed?.policy?.etag === "string" && parsed.policy.etag.length > 0 ? "PRESENT" : "UNKNOWN",
    policyVersionState: [0, 1, 3].includes(parsed?.policy?.version) ? "PRESENT" : "UNKNOWN",
    versionDiagnostic: validVersionDiagnostic(parsed?.versionDiagnostic) ? Object.freeze({ ...parsed.versionDiagnostic }) : null,
    failureVersionDiagnostic: validVersionDiagnostic(parsed?.failureMetadata?.versionDiagnostic) ? Object.freeze({ ...parsed.failureMetadata.versionDiagnostic }) : null,
    responseFieldDiagnostic: validResponseFieldDiagnostic(parsed?.responseFieldDiagnostic) ? Object.freeze({ ...parsed.responseFieldDiagnostic })
      : validResponseFieldDiagnostic(parsed?.failureMetadata?.responseFieldDiagnostic)
        ? Object.freeze({ ...parsed.failureMetadata.responseFieldDiagnostic }) : null,
    inputContract: validInputContractDiagnostic(parsed?.failureMetadata?.inputContract)
      ? Object.freeze({ ...parsed.failureMetadata.inputContract,
        helperInputSafeKeys: Object.freeze([...parsed.failureMetadata.inputContract.helperInputSafeKeys]),
        missingRequiredFields: Object.freeze([...parsed.failureMetadata.inputContract.missingRequiredFields]),
        fieldTypeSummary: Object.freeze({ ...parsed.failureMetadata.inputContract.fieldTypeSummary }) }) : null,
    policyExtractionPath: ["DIRECT_POLICY_MAPPING", "KNOWN_PROVIDER_WRAPPER_POLICY", "SDK_POLICY_MESSAGE"].includes(parsed?.serializationMetadata?.policyExtractionPath)
      ? parsed.serializationMetadata.policyExtractionPath
      : ["DIRECT_POLICY_MAPPING", "KNOWN_PROVIDER_WRAPPER_POLICY", "SDK_POLICY_MESSAGE", "UNKNOWN_WRAPPER_OR_NON_POLICY_MAPPING", "NOT_ESTABLISHED"].includes(parsed?.failureMetadata?.policyExtractionPath)
        ? parsed.failureMetadata.policyExtractionPath : null,
    providerResponseObjectType: ["MAPPING", "MESSAGE", "OBJECT", "NONE", "LIST", "TUPLE", "STR", "INT", "FLOAT", "BOOL"].includes(parsed?.serializationMetadata?.providerResponseShape?.providerResponseObjectType)
      ? parsed.serializationMetadata.providerResponseShape.providerResponseObjectType
      : ["MAPPING", "MESSAGE", "OBJECT", "NONE", "LIST", "TUPLE", "STR", "INT", "FLOAT", "BOOL"].includes(parsed?.failureMetadata?.providerResponseShape?.providerResponseObjectType)
        ? parsed.failureMetadata.providerResponseShape.providerResponseObjectType : null,
    helperFailureEnvelopeValid: failureEnvelopeValid,
    lifecycleShapeValid: Boolean(lifecycleShapeValid),
  });
  return Object.freeze({ metadata, parsed: schemaValid ? parsed : null, outputWithinLimit: !truncated });
}
const LOCAL_RECORD_OPERATIONS = new Set([
  "LOCAL_CACHED_CREDENTIAL_READINESS",
  "DIRECT_CONTEXT_CREDENTIAL_REFRESH_READY",
  "DIRECT_CONTEXT_CREDENTIAL_REFRESH",
  "DIRECT_CONTEXT_PERMISSION_READY",
  "TEST_DIRECT_CONTEXT_EXACT_PERMISSION",
]);

function localFailure(code, extra = {}) {
  return Object.freeze({ ok: false, code, requestStarted: false, physicalCalls: 0, ...extra });
}

function containsForbiddenOutput(value, { allowPolicy = false } = {}) {
  if (Array.isArray(value)) return value.some(containsForbiddenOutput);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => key === "policy"
    ? !allowPolicy
    : /^(?:etag|member|account|token|credential|stdout|stderr)$/i.test(key)
      || containsForbiddenOutput(child, { allowPolicy: false }));
}

function validFailureMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && SAFE_FAILURE_STAGES.has(value.failureStage)
    && SAFE_HTTP_CLASSES.has(value.httpStatusClass)
    && (value.httpStatusCodeSafe === "NOT_OBSERVED" || Number.isInteger(value.httpStatusCodeSafe))
    && SAFE_IDENTIFIERS.has(value.safeProviderErrorIdentifier)
    && SAFE_EXCEPTION_CLASSES.has(value.transportExceptionClassSafe)
    && (value.inputContract === undefined || validInputContractDiagnostic(value.inputContract))
    && (value.versionDiagnostic === undefined || validVersionDiagnostic(value.versionDiagnostic))
    && (value.responseFieldDiagnostic === undefined || validResponseFieldDiagnostic(value.responseFieldDiagnostic))
    && (value.policyExtractionPath === undefined || ["DIRECT_POLICY_MAPPING", "KNOWN_PROVIDER_WRAPPER_POLICY", "SDK_POLICY_MESSAGE", "UNKNOWN_WRAPPER_OR_NON_POLICY_MAPPING", "NOT_ESTABLISHED"].includes(value.policyExtractionPath))
    && (value.providerResponseShape === undefined || value.providerResponseShape && typeof value.providerResponseShape === "object" && !Array.isArray(value.providerResponseShape));
}

/** Executes a local Python binary with a payload on stdin, never argv. */
export function runG2BExplicitSetPythonProcess({
  executable,
  args = [],
  input = "",
  timeoutMs = 10_000,
  environment = process.env,
  processHost = spawnSync,
} = {}) {
  if (process.platform !== "win32" || typeof executable !== "string" || !Array.isArray(args)
    || args.some((value) => typeof value !== "string") || typeof input !== "string") {
    throw new Error("invalid-windows-python-process-request");
  }
  const helperPath = typeof args[0] === "string" && isAbsolute(args[0]) ? resolve(args[0]) : null;
  const cwd = helperPath ? dirname(helperPath) : process.cwd();
  const envKeys = Object.keys(environment || {});
  let result;
  try {
    result = processHost(executable, args, {
    encoding: null, input, windowsHide: true, shell: false, timeout: timeoutMs, cwd,
    maxBuffer: 2 * 1024 * 1024, env: environment,
  });
  } catch (error) {
    result = { status: null, signal: null, stdout: Buffer.alloc(0), stderr: Buffer.alloc(0), error };
  }
  const childPidPresent = Number.isSafeInteger(result?.pid) && result.pid > 0;
  const childProcessStarted = childPidPresent
    || Number.isInteger(result?.status)
    || typeof result?.signal === "string"
    || result?.error?.code === "ETIMEDOUT"
    || result?.error?.code === "ENOBUFS";
  const pathDigest = (value) => safeDigest(resolve(value || ""));
  const spawnError = result?.error ? {
    code: typeof result.error.code === "string" ? result.error.code : null,
    name: typeof result.error.name === "string" ? result.error.name : "Error",
    errno: typeof result.error.errno === "string" || Number.isSafeInteger(result.error.errno) ? result.error.errno : null,
    syscall: typeof result.error.syscall === "string"
      ? (["spawn", "spawnSync", "execFile", "execFileSync"].includes(result.error.syscall.split(/[\s\\/]/, 1)[0])
        ? result.error.syscall.split(/[\s\\/]/, 1)[0] : "OTHER") : null,
  } : null;
  return Object.freeze({
    transportStage: "NODE_SPAWN_SYNC_RETURNED",
    spawnAttempted: true,
    spawnReturned: true,
    childPidPresent,
    executableBasename: basename(executable),
    executablePathSha256: pathDigest(executable),
    helperPathSha256: args.length > 0 ? pathDigest(args[0]) : null,
    cwdSha256: pathDigest(cwd),
    argvCount: args.length,
    argvSha256: safeDigest(JSON.stringify(args)),
    envKeyCount: envKeys.length,
    safeEnvPresence: Object.freeze(Object.fromEntries(SAFE_PROCESS_ENV_KEYS.map((key) => [key, Object.hasOwn(environment || {}, key)]))),
    exitCode: typeof result.status === "number" ? result.status : null,
    timedOut: result.error?.code === "ETIMEDOUT",
    signal: typeof result.signal === "string" ? result.signal : null,
    spawnError,
    childProcessStarted,
    stdinEncoding: "UTF8",
    stdinWriteAttempted: true,
    stdinByteLength: Buffer.byteLength(input, "utf8"),
    stdinWritten: !result.error && typeof result.status === "number",
    stdinBomPresent: input.startsWith("\uFEFF"),
    stdinNewlineKind: input.includes("\r\n") ? "CRLF" : input.includes("\r") ? "CR" : input.includes("\n") ? "LF" : "NONE",
    stdinWriteCompleted: !result.error && typeof result.status === "number",
    stdinClosed: !result.error && typeof result.status === "number",
    stdout: Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || ""),
    stderr: Buffer.isBuffer(result.stderr) ? result.stderr : Buffer.from(result.stderr || ""),
    stdoutTruncated: result.error?.code === "ENOBUFS",
    stderrTruncated: result.error?.code === "ENOBUFS",
  });
}

export function resolveG2BExplicitSetIamPolicyRuntime({ environment = process.env } = {}) {
  const gcloud = resolveLocalGcloudExecutable({ environment });
  if (!gcloud) return null;
  const sdkRoot = resolve(dirname(gcloud), "..");
  const python = join(sdkRoot, "platform", "bundledpython", "python.exe");
  const isRegularFile = (path) => {
    try { return existsSync(path) && statSync(path).isFile(); } catch { return false; }
  };
  return isRegularFile(python) && isRegularFile(HELPER) ? Object.freeze({ sdkRoot, python, helper: HELPER }) : null;
}

export function parseG2BExplicitTransportResult(result, expectedOperation) {
  const classified = classifyG2BTransportResult(result, { expectedOperation });
  const { metadata } = classified;
  const parsed = classified.parsed;
  const invalidClass = metadata.failureClass;
  if (metadata.stdoutByteLength > MAX_TRANSPORT_OUTPUT_BYTES) {
    return localFailure("TRANSPORT_TRUNCATED_OUTPUT", { failureEvidence: Object.freeze({ ...metadata, failureClass: "TRANSPORT_TRUNCATED_OUTPUT", errorClass: "OUTPUT_LIMIT" }) });
  }
  if (parsed?.ok === false && validFailureMetadata(parsed.failureMetadata) && typeof parsed.code === "string"
    && typeof parsed.requestStarted === "boolean" && typeof parsed.prestateReadCompleted === "boolean"
    && (parsed.remoteRequestStarted === undefined || parsed.remoteRequestStarted === parsed.requestStarted)
    && typeof parsed.setAttempted === "boolean") {
    const helperExecution = validHelperExecution(parsed.helperExecution, parsed) ? Object.freeze({ ...parsed.helperExecution,
      safeDiagnostics: Object.freeze({ ...parsed.helperExecution.safeDiagnostics }) }) : null;
    const providerStarted = helperExecution?.providerRequestStarted ?? parsed.requestStarted;
    return Object.freeze({ ok: false, code: mappedProviderFailure(parsed, providerStatus(parsed)) || "TRANSPORT_PROVIDER_NONZERO_EXIT",
      helperFailureCode: helperExecution?.failureCode || parsed.failure?.helperCode || parsed.code,
      helperExecution, requestMetadata: parsed.requestMetadata && typeof parsed.requestMetadata === "object"
        ? Object.freeze({ ...parsed.requestMetadata }) : null,
      requestStarted: providerStarted,
      prestateReadCompleted: parsed.prestateReadCompleted, setAttempted: parsed.setAttempted,
      physicalCalls: providerStarted === true ? 1 : 0,
      childProcessStarted: result?.childProcessStarted === true,
      failureMetadata: Object.freeze({ ...parsed.failureMetadata }), failureEvidence: Object.freeze({ ...metadata, failureClass: failureClassFor({ timedOut: false, signal: null, spawnError: null, truncated: metadata.failureClass === "TRANSPORT_TRUNCATED_OUTPUT", encodingError: metadata.failureClass === "TRANSPORT_ENCODING_ERROR", exitCode: result?.exitCode, stdout: result?.stdout, stderr: result?.stderr, parsed, parseSucceeded: true, schemaValid: true, resourceValid: true, expectedOperation }) }) });
  }
  if (invalidClass !== "NONE" && invalidClass !== "TRANSPORT_UNKNOWN") return localFailure(invalidClass, { childProcessStarted: result?.childProcessStarted === true, failureEvidence: metadata });
  if (result?.exitCode !== 0) return localFailure("TRANSPORT_PROVIDER_NONZERO_EXIT", { childProcessStarted: result?.childProcessStarted === true, failureEvidence: Object.freeze({ ...metadata, failureClass: "TRANSPORT_PROVIDER_NONZERO_EXIT" }) });
  if (!parsed) return localFailure("TRANSPORT_SCHEMA_INVALID", { childProcessStarted: result?.childProcessStarted === true, failureEvidence: Object.freeze({ ...metadata, failureClass: "TRANSPORT_SCHEMA_INVALID" }) });
  const allowsPolicy = expectedOperation === "READ_PRESTATE_POLICY" || expectedOperation === "READ_GENERATION_BOUND_RECOVERY_POLICY";
  if (containsForbiddenOutput(parsed, { allowPolicy: allowsPolicy })) {
    return localFailure("DIRECT_TRANSPORT_PRIVACY_GUARD", { childProcessStarted: result?.childProcessStarted === true, failureEvidence: Object.freeze({ ...metadata, failureClass: "TRANSPORT_SCHEMA_INVALID", errorClass: "PRIVACY_GUARD" }) });
  }
  const common = parsed.ok === true && parsed.requestStarted === true && parsed.httpStatus === 200
    && parsed.prestateReadCompleted === true && typeof parsed.setAttempted === "boolean";
  if (expectedOperation === "LOCAL_CACHED_CREDENTIAL_READINESS") {
    const states = new Set([
      "CACHED_CREDENTIAL_READY_CONFIRMED", "CACHED_CREDENTIAL_EXPIRED_CONFIRMED",
      "CACHED_CREDENTIAL_TOO_CLOSE_TO_EXPIRY", "CACHED_CREDENTIAL_MISSING",
      "CACHED_CREDENTIAL_METADATA_INVALID",
    ]);
    if (parsed.ok === true && parsed.requestStarted === false
      && parsed.configuredIdentityContextResolved === true
      && parsed.credentialStoreRecordResolved === true
      && parsed.credentialObjectLoad === "PASS"
      && typeof parsed.cachedAccessTokenPresent === "boolean"
      && typeof parsed.credentialExpiryMetadataPresent === "boolean"
      && typeof parsed.credentialExpiryParseValid === "boolean"
      && ["FRESH", "EXPIRED", "TOO_CLOSE_TO_EXPIRY", "UNKNOWN"].includes(parsed.credentialExpiryRelativeState)
      && states.has(parsed.readinessState)
      && parsed.freshnessMarginSeconds === 120
      && parsed.credentialRecordMatchesConfiguredContext === true
      && parsed.credentialRecordMatchesDirectMutationAuthContext === true
      && parsed.credentialRecordMatchesDirectDiagnosticAuthContext === true
      && parsed.refreshMethodInvocations === 0 && parsed.networkRequests === 0
      && parsed.tokenEndpointCalls === 0 && parsed.metadataRequests === 0) {
      return Object.freeze({ ok: true, state: parsed.readinessState,
        cachedAccessTokenPresent: parsed.cachedAccessTokenPresent,
        credentialExpiryMetadataPresent: parsed.credentialExpiryMetadataPresent,
        credentialExpiryParseValid: parsed.credentialExpiryParseValid,
        credentialExpiryRelativeState: parsed.credentialExpiryRelativeState,
        freshnessMarginSeconds: parsed.freshnessMarginSeconds,
        configuredIdentityContextResolved: true, credentialStoreRecordResolved: true,
        credentialObjectLoad: "PASS", physicalCalls: 0 });
    }
    return localFailure("LOCAL_CREDENTIAL_READINESS_PARSE_FAILURE");
  }
  if (expectedOperation === "DIRECT_CONTEXT_CREDENTIAL_REFRESH_READY") {
    if (parsed.ok === true && parsed.readyToSend === true && parsed.requestStarted === false
      && parsed.configuredIdentityContextResolved === true && parsed.credentialStoreRecordResolved === true
      && parsed.refreshTokenLocallyAvailable === true
      && parsed.refreshRequestCanBeConstructedWithoutNetwork === true
      && parsed.tokenEndpointContractLocallyResolved === true
      && parsed.credentialRecordMatchesConfiguredContext === true
      && parsed.credentialRecordMatchesDirectMutationAuthContext === true
      && parsed.credentialRecordMatchesDirectDiagnosticAuthContext === true
      && parsed.physicalCalls === 0 && parsed.automaticRetries === 0
      && parsed.networkRequests === 0 && parsed.tokenEndpointCalls === 0 && parsed.metadataRequests === 0) {
      return Object.freeze({ ok: true, state: "REFRESH_READY_TO_SEND", physicalCalls: 0 });
    }
    return localFailure("DIRECT_CONTEXT_REFRESH_NOT_READY");
  }
  if (expectedOperation === "DIRECT_CONTEXT_CREDENTIAL_REFRESH") {
    if (parsed.ok === true && parsed.requestStarted === true && parsed.httpStatus === 200
      && parsed.refreshState === "REFRESH_SUCCESS_CONFIRMED" && parsed.credentialStoreUpdated === true
      && parsed.physicalCalls === 1 && parsed.automaticRetries === 0) {
      return Object.freeze({ ok: true, state: "REFRESH_SUCCESS_CONFIRMED", physicalCalls: 1 });
    }
    return localFailure("DIRECT_CONTEXT_REFRESH_PARSE_FAILURE");
  }
  if (expectedOperation === "DIRECT_CONTEXT_PERMISSION_READY") {
    if (parsed.ok === true && parsed.readyToSend === true && parsed.requestStarted === false
      && parsed.permissionCountRequested === 1) return Object.freeze({ ok: true, state: "READY_TO_SEND", physicalCalls: 0 });
    return localFailure("DIRECT_TRANSPORT_PARSE_FAILURE");
  }
  if (expectedOperation === "TEST_DIRECT_CONTEXT_EXACT_PERMISSION") {
    if (parsed.ok === true && parsed.requestStarted === true && parsed.httpStatus === 200
      && parsed.permissionCountRequested === 1 && (parsed.permissionCountReturned === 0 || parsed.permissionCountReturned === 1)
      && (parsed.permissionState === "PRESENT" || parsed.permissionState === "ABSENT")) {
      return Object.freeze({ ok: true, state: parsed.permissionState === "PRESENT" ? "PERMISSION_PRESENT_CONFIRMED" : "PERMISSION_ABSENT_CONFIRMED", physicalCalls: 1 });
    }
    return localFailure("DIRECT_TRANSPORT_PARSE_FAILURE");
  }
  if (!common) return localFailure("DIRECT_TRANSPORT_PARSE_FAILURE");
  if (expectedOperation === "READ_PRESTATE_POLICY" && parsed.setAttempted === false
    && (parsed.memberState === "PRESENT" || parsed.memberState === "ABSENT")
    && validateG2BReusablePolicy(parsed.policy, { returnedPolicyVersionState: parsed.returnedPolicyVersionState
      || (Number.isSafeInteger(parsed.policy?.version) ? "EXPLICIT" : undefined) }).ok) {
    return Object.freeze({
      ok: true,
      state: parsed.memberState,
      policy: structuredClone(normalizedProviderPolicy(parsed.policy)),
      returnedPolicyVersionState: parsed.returnedPolicyVersionState
        || (Number.isSafeInteger(parsed.policy?.version) ? "EXPLICIT" : undefined),
      physicalCalls: 1,
      safeTransportMetadata: Object.freeze({
        requestStarted: true,
        httpStatusClass: "2XX",
        httpStatusCodeSafe: 200,
        providerResult: "SUCCESS",
      }),
    });
  }
  if (expectedOperation === "READ_GENERATION_BOUND_RECOVERY_POLICY"
    && parsed.setAttempted === false && parsed.recoveryReadCompleted === true
    && readResponseIssue(parsed, expectedOperation) === null
    && parsed.policy && typeof parsed.policy === "object" && !Array.isArray(parsed.policy)
    && ((parsed.returnedPolicyVersionState === "UNSET" && parsed.returnedPolicyVersionValue === null && parsed.policy.version === null)
      || parsed.returnedPolicyVersionState === "EXPLICIT" && Number.isSafeInteger(parsed.returnedPolicyVersionValue)
        && [0, 1, 3].includes(parsed.returnedPolicyVersionValue) && parsed.policy.version === parsed.returnedPolicyVersionValue)
    && parsed.requestedPolicyVersion === 3 && parsed.returnedPolicyVersion === parsed.returnedPolicyVersionValue
    && parsed.versionSourceLayer === "PYTHON_MESSAGE_TO_DICT"
    && typeof parsed.policy.etag === "string" && parsed.policy.etag.length > 0
    && Array.isArray(parsed.policy.bindings)) {
    return Object.freeze({
      ok: true,
      state: "RECOVERY_POLICY_RECEIVED",
      policy: structuredClone(normalizedProviderPolicy(parsed.policy)),
      requestedPolicyVersion: parsed.requestedPolicyVersion,
      returnedPolicyVersion: parsed.returnedPolicyVersion,
      returnedPolicyVersionState: parsed.returnedPolicyVersionState,
      returnedPolicyVersionValue: parsed.returnedPolicyVersionValue,
      versionSourceLayer: parsed.versionSourceLayer,
      requestMetadata: Object.freeze({ ...parsed.requestMetadata }),
      helperExecution: validHelperExecution(parsed.helperExecution, parsed) ? Object.freeze({ ...parsed.helperExecution,
        safeDiagnostics: Object.freeze({ ...parsed.helperExecution.safeDiagnostics }) }) : null,
      providerMetadata: Object.freeze({ ...parsed.providerMetadata }),
      serializationMetadata: Object.freeze({ ...parsed.serializationMetadata }),
      responseFieldDiagnostic: Object.freeze({ ...parsed.responseFieldDiagnostic }),
      safeTransportMetadata: Object.freeze({ ...metadata, failureClass: "NONE", errorClass: metadata.stderrPresent ? "WARNING_OR_DIAGNOSTIC" : "NONE", errorCode: metadata.stderrPresent ? "NONEMPTY_STDERR" : "NONE", resourceValidationSucceeded: true }),
      requestStarted: parsed.requestStarted === true,
      transportLifecycle: parsed.transportLifecycle ? Object.freeze({ ...parsed.transportLifecycle }) : null,
      requestedPolicyVersion: parsed.requestedPolicyVersion,
      returnedPolicyVersion: parsed.returnedPolicyVersion,
      returnedPolicyVersionState: parsed.returnedPolicyVersionState,
      returnedPolicyVersionValue: parsed.returnedPolicyVersionValue,
      versionSourceLayer: parsed.versionSourceLayer,
      physicalCalls: 1,
    });
  }
  if (expectedOperation === "READ_GENERATION_BOUND_RECOVERY_POLICY") {
    return localFailure("TRANSPORT_SCHEMA_INVALID", { failureEvidence: Object.freeze({ ...metadata, failureClass: "TRANSPORT_SCHEMA_INVALID" }) });
  }
  if (expectedOperation === "SET_FROM_PRESTATE_POLICY") {
    if (parsed.setAttempted === true && parsed.responseValid === true && parsed.mutationState === "SET_CONFIRMED_SUCCESS") {
      return Object.freeze({ ok: true, state: "SET_CONFIRMED_SUCCESS", physicalCalls: 1 });
    }
    if (parsed.setAttempted === false && parsed.memberState === "PRESENT" && parsed.mutationState === "PRESTATE_MEMBER_PRESENT_NO_SET") {
      return Object.freeze({ ok: true, state: "PRESTATE_MEMBER_PRESENT_NO_SET", physicalCalls: 1 });
    }
  }
  if (expectedOperation === "READ_EXACT_G2B_MEMBER" && parsed.setAttempted === false
    && (parsed.memberState === "PRESENT" || parsed.memberState === "ABSENT")) {
    return Object.freeze({ ok: true, state: parsed.memberState, physicalCalls: 1 });
  }
  return localFailure("DIRECT_TRANSPORT_PARSE_FAILURE");
}

/**
 * This is deliberately unbound to the live executor. A later re-attestation
 * must opt in before the direct transport is reachable from any M3 action.
 */
export function createG2BExplicitSetIamPolicyAuthTransport({
  enabled = false,
  executionEnvelope: defaultExecutionEnvelope,
  environment = process.env,
  processRunner = runG2BExplicitSetPythonProcess,
} = {}) {
  let mutationCalls = 0;
  let poststateCalls = 0;
  let diagnosticCalls = 0;
  let refreshCalls = 0;
  let recoveryReadCalls = 0;
  let confirmedSet = false;
  let lastPrestatePolicyJson = null;
  let lastPrestateVersionState = null;
  const invoke = async (operation, { account, member, policy, policyVersionState, targetResource = G2B_TARGET_RESOURCE, targetRole = G2B_TARGET_ROLE, executionEnvelope } = {}) => {
    if (enabled !== true) return localFailure("EXPLICIT_DIRECT_TRANSPORT_DISABLED");
    executionEnvelope ||= defaultExecutionEnvelope;
    if (!LOCAL_RECORD_OPERATIONS.has(operation)) {
      const authorization = authorizeG2BTransportOperation(executionEnvelope, operation);
      if (!authorization.ok) return localFailure(authorization.code);
    }
    if (targetResource !== G2B_TARGET_RESOURCE || targetRole !== G2B_TARGET_ROLE
      || (!LOCAL_RECORD_OPERATIONS.has(operation)
        && (!ACCOUNT.test(account || "") || !MEMBER.test(member || "")))) {
      return localFailure("EXACT_G2B_TARGET_BINDING_REQUIRED");
    }
    if (AUTH_OVERRIDE_ENV_SURFACES.some((key) => environment[key])) return localFailure("DIRECT_TRANSPORT_PRIVACY_GUARD");
    const runtime = resolveG2BExplicitSetIamPolicyRuntime({ environment });
    if (!runtime) return localFailure("DIRECT_TRANSPORT_RUNTIME_UNAVAILABLE");
    const payload = JSON.stringify(LOCAL_RECORD_OPERATIONS.has(operation)
      ? { resource: `projects/my-management-app-8a933/serviceAccounts/${targetResource}` }
      : operation === "SET_FROM_PRESTATE_POLICY"
      ? { resource: `projects/my-management-app-8a933/serviceAccounts/${targetResource}`, member, account, policy,
        policyVersionState }
      : { resource: `projects/my-management-app-8a933/serviceAccounts/${targetResource}`, member, account });
    let result;
    try {
      result = await processRunner({ executable: runtime.python, args: [runtime.helper, runtime.sdkRoot, operation], input: payload,
        timeoutMs: 10_000, environment: createSanitizedChildEnvironment({ environment, configRoot: environment.CLOUDSDK_CONFIG }) });
    } catch { return localFailure("DIRECT_TRANSPORT_PROCESS_FAILURE"); }
    const parsed = parseG2BExplicitTransportResult(result, operation);
    const childProcessStarted = typeof result.childProcessStarted === "boolean" ? result.childProcessStarted
      : typeof result.childPidPresent === "boolean" ? result.childPidPresent
      : result.spawnError == null && (Number.isInteger(result.exitCode) || result.timedOut === true || typeof result.signal === "string");
    return Object.freeze({ ...parsed, childProcessStarted });
  };
  return Object.freeze({
    id: "g2b-explicit-direct-set-iam-policy-cached-credential-v2",
    readFreshPrestate: async (request) => {
      if (mutationCalls > 0) return localFailure("DIRECT_MUTATION_CALL_BUDGET_EXHAUSTED");
      mutationCalls += 1;
      const result = await invoke("READ_PRESTATE_POLICY", request);
      if (!result.ok) mutationCalls -= 1;
      else {
        lastPrestatePolicyJson = JSON.stringify(result.policy);
        lastPrestateVersionState = result.returnedPolicyVersionState;
      }
      return result;
    },
    readGenerationBoundRecoveryPolicy: async (request) => {
      if (recoveryReadCalls > 0) return localFailure("GENERATION_BOUND_RECOVERY_READ_BUDGET_EXHAUSTED");
      recoveryReadCalls += 1;
      const result = await invoke("READ_GENERATION_BOUND_RECOVERY_POLICY", request);
      if (result?.requestStarted === false && result.physicalCalls === 0) recoveryReadCalls -= 1;
      return result;
    },
    setFromFreshPrestate: async ({ policy, returnedPolicyVersionState, ...request } = {}) => {
      if (confirmedSet || mutationCalls !== 1) return localFailure("DIRECT_MUTATION_CALL_BUDGET_EXHAUSTED");
      if (typeof lastPrestatePolicyJson !== "string" || JSON.stringify(policy) !== lastPrestatePolicyJson) {
        return localFailure("FRESH_PRESTATE_POLICY_MISMATCH");
      }
      const versionState = returnedPolicyVersionState || lastPrestateVersionState
        || (Number.isSafeInteger(policy?.version) ? "EXPLICIT" : undefined);
      if (versionState !== lastPrestateVersionState) return localFailure("FRESH_PRESTATE_VERSION_STATE_MISMATCH");
      if (!validateG2BReusablePolicy(policy, { returnedPolicyVersionState: versionState }).ok) return localFailure("PRESTATE_POLICY_UNSUPPORTED_OR_MALFORMED");
      const result = await invoke("SET_FROM_PRESTATE_POLICY", { ...request, policy, policyVersionState: versionState });
      confirmedSet = result.ok && result.state === "SET_CONFIRMED_SUCCESS";
      return result;
    },
    readPostSuccessExactMember: async (request) => {
      if (!confirmedSet || poststateCalls > 0) return localFailure("POSTSTATE_NOT_REACHABLE");
      poststateCalls += 1;
      return invoke("READ_EXACT_G2B_MEMBER", request);
    },
    readLocalCachedCredentialReadiness: async () => invoke("LOCAL_CACHED_CREDENTIAL_READINESS"),
    prepareDirectContextCredentialRefresh: async () => invoke("DIRECT_CONTEXT_CREDENTIAL_REFRESH_READY"),
    executeDirectContextCredentialRefresh: async (executionEnvelope) => {
      if (refreshCalls > 0) return localFailure("DIRECT_CONTEXT_REFRESH_CALL_BUDGET_EXHAUSTED");
      refreshCalls += 1;
      return invoke("DIRECT_CONTEXT_CREDENTIAL_REFRESH", { executionEnvelope });
    },
    prepareDirectContextPermissionDiagnostic: async () => invoke("DIRECT_CONTEXT_PERMISSION_READY"),
    executeDirectContextPermissionDiagnostic: async (request = {}) => {
      if (diagnosticCalls > 0) return localFailure("DIRECT_CONTEXT_DIAGNOSTIC_CALL_BUDGET_EXHAUSTED");
      diagnosticCalls += 1;
      return invoke("TEST_DIRECT_CONTEXT_EXACT_PERMISSION", { executionEnvelope: request.executionEnvelope || request });
    },
    snapshot: () => Object.freeze({ mutationCalls, poststateCalls, diagnosticCalls, refreshCalls, recoveryReadCalls, confirmedSet }),
  });
}

export const G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT = Object.freeze({
  rawPolicyCrossesProcessBoundary: true,
  rawPolicyPersisted: false,
  requestPayloadVia: "STDIN_MEMORY_ONLY",
  requestPayloadFields: "resource|member|account",
  cachedCredentialOnly: true,
  credentialRefreshBlocked: true,
  tokenGenerationAllowed: false,
  implicitRefreshReachable: false,
  retries: 0,
  mutationProcessCallsMax: 1,
  poststateProcessCallsMax: 1,
  physicalProviderCallsMax: 3,
  oldGcloudFallbackReachable: false,
  liveExecutorBound: true,
  directContextPermissionDiagnosticBound: true,
  directContextPermissionDiagnosticCallsMax: 1,
  directContextCredentialRefreshBound: true,
  directContextCredentialRefreshCallsMax: 1,
  generationBoundRecoveryReadCallsMax: 1,
  recoveryResponseUsesMutationPolicyValidator: false,
  recoveryKnownHttpSuccessStatusProjected: true,
});
