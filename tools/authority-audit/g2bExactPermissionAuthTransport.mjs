import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTH_OVERRIDE_ENV_SURFACES,
  createSanitizedChildEnvironment,
  resolveLocalGcloudExecutable,
  runWindowsProcess,
} from "./windowsGcloudProcessAdapter.mjs";

const HELPER = fileURLToPath(new URL("./g2b_exact_permission_transport.py", import.meta.url));
const SAFE_CODES = new Set([
  "DIAGNOSTIC_AUTH_FAILURE",
  "DIAGNOSTIC_REQUEST_FAILURE",
  "DIAGNOSTIC_PARSE_FAILURE",
  "PRIVACY_GUARD_FAILURE",
]);
const SAFE_FAILURE_STAGES = new Set([
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
  "NOT_AVAILABLE", "HTTP_400", "HTTP_401", "HTTP_403", "HTTP_404", "HTTP_429", "HTTP_500", "HTTP_502", "HTTP_503", "HTTP_504",
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

function safeFailure(code, failureMetadata) {
  return Object.freeze({ ok: false, code, failureMetadata: Object.freeze(failureMetadata) });
}

function localFailure(code, failureStage, transportExceptionClassSafe, timeout = false, localSetupSubstage = "NODE_RUNTIME_RESOLUTION") {
  return safeFailure(code, {
    failureStage,
    httpStatusClass: "NONE",
    httpStatusCodeSafe: "NOT_OBSERVED",
    transportExceptionClassSafe,
    safeProviderErrorIdentifier: "NOT_AVAILABLE",
    timeout,
    localSetupSubstage,
  });
}

function parseFailureMetadata(parsed) {
  const metadata = parsed?.failureMetadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const { failureStage, httpStatusClass, httpStatusCodeSafe, transportExceptionClassSafe, safeProviderErrorIdentifier, timeout, localSetupSubstage } = metadata;
  if (!SAFE_FAILURE_STAGES.has(failureStage)
    || !SAFE_HTTP_STATUS_CLASSES.has(httpStatusClass)
    || !(httpStatusCodeSafe === "NOT_OBSERVED" || Number.isInteger(httpStatusCodeSafe))
    || !SAFE_EXCEPTION_CLASSES.has(transportExceptionClassSafe)
    || !SAFE_PROVIDER_IDENTIFIERS.has(safeProviderErrorIdentifier)
    || typeof timeout !== "boolean"
    || !SAFE_LOCAL_SETUP_SUBSTAGES.has(localSetupSubstage)) return null;
  return Object.freeze({ failureStage, httpStatusClass, httpStatusCodeSafe, transportExceptionClassSafe, safeProviderErrorIdentifier, timeout, localSetupSubstage });
}

export function resolveCloudSdkRuntime({ environment = process.env } = {}) {
  const gcloud = resolveLocalGcloudExecutable({ environment });
  if (!gcloud) return null;
  const sdkRoot = resolve(dirname(gcloud), "..");
  const python = join(sdkRoot, "platform", "bundledpython", "python.exe");
  return existsSync(python) && existsSync(HELPER)
    ? Object.freeze({ sdkRoot, python, helper: HELPER })
    : null;
}

function parseSafeOutput(result) {
  if (!result || result.timedOut) {
    return localFailure("DIAGNOSTIC_REQUEST_FAILURE", "PROCESS_OR_TRANSPORT_TERMINATION", "PROCESS_TIMEOUT", true);
  }
  if (result.spawnError || result.exitCode === null) {
    return localFailure("DIAGNOSTIC_REQUEST_FAILURE", "PROCESS_OR_TRANSPORT_TERMINATION", "PROCESS_SPAWN_FAILURE");
  }
  const stdout = String(result.stdout || "");
  if (Buffer.byteLength(stdout, "utf8") > 4096 || String(result.stderr || "").trim()) {
    return localFailure("PRIVACY_GUARD_FAILURE", "RESPONSE_HANDLING", "PRIVACY_GUARD_FAILURE");
  }
  let parsed;
  try { parsed = JSON.parse(stdout); } catch { return localFailure("DIAGNOSTIC_PARSE_FAILURE", "RESPONSE_HANDLING", "RESPONSE_PARSE_FAILURE"); }
  const keys = Object.keys(parsed || {}).sort();
  const allowedKeys = ["code", "failureMetadata", "grantedPermissions", "httpStatusClass", "ok", "schema"].sort();
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)
    || keys.some((key) => !allowedKeys.includes(key))) {
    return localFailure("PRIVACY_GUARD_FAILURE", "RESPONSE_HANDLING", "PRIVACY_GUARD_FAILURE");
  }
  if (parsed.ok === true) {
    if (parsed.schema !== "myweb.g2b.exact-permission-transport.v3"
      || parsed.httpStatusClass !== "2XX" || !Array.isArray(parsed.grantedPermissions)) {
      return localFailure("DIAGNOSTIC_PARSE_FAILURE", "RESPONSE_HANDLING", "RESPONSE_PARSE_FAILURE");
    }
    return Object.freeze({
      ok: true,
      httpStatusClass: "2XX",
      grantedPermissions: Object.freeze([...parsed.grantedPermissions]),
    });
  }
  if (parsed.schema !== "myweb.g2b.exact-permission-transport.v3") {
    return localFailure("DIAGNOSTIC_PARSE_FAILURE", "RESPONSE_HANDLING", "RESPONSE_PARSE_FAILURE");
  }
  const failureMetadata = parseFailureMetadata(parsed);
  if (!failureMetadata) return localFailure("DIAGNOSTIC_PARSE_FAILURE", "RESPONSE_HANDLING", "RESPONSE_PARSE_FAILURE");
  return safeFailure(SAFE_CODES.has(parsed.code) ? parsed.code : "DIAGNOSTIC_REQUEST_FAILURE", failureMetadata);
}

function parseReadyOutput(result) {
  if (!result || result.timedOut || result.spawnError || result.exitCode === null) return Object.freeze({ ready: false });
  if (String(result.stderr || "").trim()) return Object.freeze({ ready: false });
  try {
    const value = JSON.parse(String(result.stdout || ""));
    return Object.freeze({ ready: value?.schema === "myweb.g2b.exact-permission-transport.v3" && value?.readyToSend === true });
  } catch { return Object.freeze({ ready: false }); }
}

export function createG2BExactPermissionAuthTransport({ environment = process.env, processRunner = runWindowsProcess } = {}) {
  let calls = 0;
  return Object.freeze({
    id: "g2b-cloud-sdk-cached-credential-test-iam-permissions-v3",
    executeOnce: async (request) => {
      if (calls > 0) return localFailure("DIAGNOSTIC_REQUEST_FAILURE", "BEFORE_HTTP_SEND", "LOCAL_CLIENT_SETUP_FAILURE");
      calls += 1;
      if (AUTH_OVERRIDE_ENV_SURFACES.some((key) => environment[key])) {
        return localFailure("PRIVACY_GUARD_FAILURE", "BEFORE_HTTP_SEND", "PRIVACY_GUARD_FAILURE");
      }
      const runtime = resolveCloudSdkRuntime({ environment });
      if (!runtime) return localFailure("DIAGNOSTIC_REQUEST_FAILURE", "BEFORE_HTTP_SEND", "LOCAL_CLIENT_SETUP_FAILURE");
      const payload = Buffer.from(JSON.stringify(request), "utf8").toString("base64");
      const childEnvironment = createSanitizedChildEnvironment({ environment, configRoot: environment.CLOUDSDK_CONFIG });
      let result;
      try {
        result = await processRunner({
          executable: runtime.python,
          args: [runtime.helper, runtime.sdkRoot, payload],
          timeoutMs: 10_000,
          captureMode: "memory",
          environment: childEnvironment,
        });
      } catch {
        return localFailure("DIAGNOSTIC_REQUEST_FAILURE", "PROCESS_OR_TRANSPORT_TERMINATION", "PROCESS_SPAWN_FAILURE");
      }
      return parseSafeOutput(result);
    },
    probeReadyToSend: async (request) => {
      if (AUTH_OVERRIDE_ENV_SURFACES.some((key) => environment[key])) return Object.freeze({ ready: false });
      const runtime = resolveCloudSdkRuntime({ environment });
      if (!runtime) return Object.freeze({ ready: false });
      const payload = Buffer.from(JSON.stringify(request), "utf8").toString("base64");
      try {
        return parseReadyOutput(await processRunner({
          executable: runtime.python,
          args: [runtime.helper, runtime.sdkRoot, payload, "--ready-to-send-only"],
          timeoutMs: 10_000,
          captureMode: "memory",
          environment: createSanitizedChildEnvironment({ environment, configRoot: environment.CLOUDSDK_CONFIG }),
        }));
      } catch { return Object.freeze({ ready: false }); }
    },
    snapshot: () => Object.freeze({ calls }),
  });
}

export const G2B_EXACT_PERMISSION_AUTH_TRANSPORT_CONTRACT = Object.freeze({
  cachedCredentialOnly: true,
  credentialRefreshBlocked: true,
  impersonationBlocked: true,
  accessTokenOutput: false,
  rawCredentialOutput: false,
  rawPrincipalOutput: false,
  rawResponseOutput: false,
  retries: 0,
  maxRemoteCalls: 1,
});
