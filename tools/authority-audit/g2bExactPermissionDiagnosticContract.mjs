import { G2B_TARGET_RESOURCE } from "./g2bRecoveryAnchor.mjs";

export const G2B_EXACT_PERMISSION = "iam.serviceAccounts.setIamPolicy";
export const G2B_EXACT_PERMISSION_RESOURCE =
  `projects/my-management-app-8a933/serviceAccounts/${G2B_TARGET_RESOURCE}`;
export const G2B_EXACT_PERMISSION_RESOURCE_ALIAS = "EXACT_G2B_WRITER_SERVICE_ACCOUNT";
export const G2B_PERMISSION_RESULT_DOMAIN = Object.freeze([
  "PERMISSION_PRESENT_CONFIRMED",
  "PERMISSION_ABSENT_CONFIRMED",
  "DIAGNOSTIC_REQUEST_FAILURE",
  "DIAGNOSTIC_AUTH_FAILURE",
  "DIAGNOSTIC_PARSE_FAILURE",
  "PRIVACY_GUARD_FAILURE",
  "UNEXPECTED_RESPONSE",
]);

export const G2B_SAFE_FAILURE_STAGES = Object.freeze([
  "BEFORE_HTTP_SEND",
  "DURING_HTTP_SEND",
  "AFTER_HTTP_RESPONSE",
  "RESPONSE_HANDLING",
  "PROCESS_OR_TRANSPORT_TERMINATION",
]);

const SAFE_HTTP_STATUS_CLASSES = new Set(["NONE", "UNKNOWN", "2XX", "3XX", "4XX", "5XX"]);
const SAFE_EXCEPTION_CLASSES = new Set([
  "NONE",
  "LOCAL_CREDENTIAL_FAILURE",
  "LOCAL_CLIENT_SETUP_FAILURE",
  "PROCESS_SPAWN_FAILURE",
  "PROCESS_TIMEOUT",
  "REMOTE_REQUEST_EXCEPTION",
  "RESPONSE_PARSE_FAILURE",
  "PRIVACY_GUARD_FAILURE",
]);
const SAFE_PROVIDER_IDENTIFIERS = new Set([
  "NOT_AVAILABLE",
  "HTTP_400",
  "HTTP_401",
  "HTTP_403",
  "HTTP_404",
  "HTTP_429",
  "HTTP_500",
  "HTTP_502",
  "HTTP_503",
  "HTTP_504",
]);
const SAFE_LOCAL_SETUP_SUBSTAGES = new Set([
  "NOT_APPLICABLE", "ARGV_VALIDATION", "ENVIRONMENT_PRIVACY_GUARD",
  "CLOUD_SDK_LAYOUT_VALIDATION", "REQUEST_DECODE", "REQUEST_VALIDATION",
  "SDK_IMPORTS", "CLOUD_SDK_CONFIGURATION", "CREDENTIAL_STORE_LOAD",
  "CLIENT_OR_REQUEST_CONSTRUCTION", "AUTH_OBJECT_CONSTRUCTION",
  "HTTP_CLIENT_CONSTRUCTION", "TIMEOUT_CONFIGURATION",
  "REQUEST_BODY_CONSTRUCTION", "REQUEST_OBJECT_CONSTRUCTION",
  "NODE_RUNTIME_RESOLUTION",
]);

export function buildG2BExactPermissionRequest({ resource = G2B_EXACT_PERMISSION_RESOURCE, permissions = [G2B_EXACT_PERMISSION] } = {}) {
  if (resource !== G2B_EXACT_PERMISSION_RESOURCE) throw new Error("exact-g2b-resource-required");
  if (!Array.isArray(permissions) || permissions.length !== 1 || permissions[0] !== G2B_EXACT_PERMISSION) {
    throw new Error("exact-single-permission-required");
  }
  return Object.freeze({ resource, permissions: Object.freeze([G2B_EXACT_PERMISSION]) });
}

function safeFailureMetadata(value) {
  const metadata = value?.failureMetadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return undefined;
  const { failureStage, httpStatusClass, httpStatusCodeSafe, transportExceptionClassSafe, safeProviderErrorIdentifier, timeout, localSetupSubstage } = metadata;
  if (!G2B_SAFE_FAILURE_STAGES.includes(failureStage)
    || !SAFE_HTTP_STATUS_CLASSES.has(httpStatusClass)
    || !(httpStatusCodeSafe === "NOT_OBSERVED" || Number.isInteger(httpStatusCodeSafe))
    || !SAFE_EXCEPTION_CLASSES.has(transportExceptionClassSafe)
    || !SAFE_PROVIDER_IDENTIFIERS.has(safeProviderErrorIdentifier)
    || typeof timeout !== "boolean"
    || !SAFE_LOCAL_SETUP_SUBSTAGES.has(localSetupSubstage)) return undefined;
  return Object.freeze({ failureStage, httpStatusClass, httpStatusCodeSafe, transportExceptionClassSafe, safeProviderErrorIdentifier, timeout, localSetupSubstage });
}

function safeTransportFailure(value) {
  const code = typeof value?.code === "string" ? value.code : "UNEXPECTED_RESPONSE";
  const result = new Set([
    "DIAGNOSTIC_AUTH_FAILURE",
    "DIAGNOSTIC_REQUEST_FAILURE",
    "DIAGNOSTIC_PARSE_FAILURE",
    "PRIVACY_GUARD_FAILURE",
  ]).has(code) ? code : "UNEXPECTED_RESPONSE";
  const failureMetadata = safeFailureMetadata(value);
  return Object.freeze({ result, ...(failureMetadata ? { failureMetadata } : {}) });
}

export function classifyG2BExactPermissionResponse(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return Object.freeze({ result: "UNEXPECTED_RESPONSE" });
  }
  if (value.ok !== true) return safeTransportFailure(value);
  if (value.httpStatusClass !== "2XX" || !Array.isArray(value.grantedPermissions)) {
    return Object.freeze({ result: "DIAGNOSTIC_PARSE_FAILURE" });
  }
  const unique = [...new Set(value.grantedPermissions)];
  if (unique.some((permission) => permission !== G2B_EXACT_PERMISSION)) {
    return Object.freeze({ result: "PRIVACY_GUARD_FAILURE" });
  }
  return Object.freeze({
    result: unique.includes(G2B_EXACT_PERMISSION)
      ? "PERMISSION_PRESENT_CONFIRMED"
      : "PERMISSION_ABSENT_CONFIRMED",
    testedPermission: G2B_EXACT_PERMISSION,
    targetAlias: G2B_EXACT_PERMISSION_RESOURCE_ALIAS,
  });
}

export const G2B_EXACT_PERMISSION_CONTRACT = Object.freeze({
  apiSurface: "iam.projects.serviceAccounts",
  apiMethod: "TestIamPermissions",
  mutationApiMethod: "SetIamPolicy",
  mutationPermission: G2B_EXACT_PERMISSION,
  resourceForm: "projects/{project}/serviceAccounts/{serviceAccountEmail}",
  requestField: "testIamPermissionsRequest.permissions",
  responseSemantics: "returned permissions are the granted subset of the requested permissions",
  permissionCount: 1,
});
