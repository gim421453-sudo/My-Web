import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createSanitizedChildEnvironment, runWindowsProcess } from "./windowsGcloudProcessAdapter.mjs";
import { resolveCloudSdkRuntime } from "./g2bExactPermissionAuthTransport.mjs";

const HELPER = fileURLToPath(new URL("./g2b_credential_refresh_transport.py", import.meta.url));

function localFailure(code, localSetupSubstage) {
  return Object.freeze({ ok: false, code, failureMetadata: Object.freeze({
    failureStage: "BEFORE_HTTP_SEND", localSetupSubstage,
    httpStatusClass: "NOT_OBSERVED", httpStatusCodeSafe: "NOT_OBSERVED",
    transportExceptionClassSafe: "LOCAL_CLIENT_SETUP_FAILURE",
    safeProviderErrorIdentifier: "NOT_AVAILABLE", timeout: false,
  }) });
}

function parse(result) {
  if (!result || result.timedOut) return Object.freeze({ ok: false, code: "REQUEST_FAILURE" });
  if (result.spawnError || result.exitCode === null) return Object.freeze({ ok: false, code: "LOCAL_SETUP_FAILURE" });
  if (String(result.stderr || "").trim() || Buffer.byteLength(String(result.stdout || ""), "utf8") > 4096) return Object.freeze({ ok: false, code: "PRIVACY_GUARD_FAILURE" });
  try {
    const value = JSON.parse(String(result.stdout || ""));
    if (value?.schema !== "myweb.g2b.credential-refresh-transport.v1") return Object.freeze({ ok: false, code: "PARSE_FAILURE" });
    return Object.freeze(value);
  } catch { return Object.freeze({ ok: false, code: "PARSE_FAILURE" }); }
}

export function createG2BCredentialRefreshTransport({ environment = process.env, processRunner = runWindowsProcess } = {}) {
  let consumed = false;
  async function invoke(mode) {
    const runtime = resolveCloudSdkRuntime({ environment });
    if (!runtime || !existsSync(HELPER)) return localFailure("LOCAL_SETUP_FAILURE", "NODE_RUNTIME_RESOLUTION");
    return parse(await processRunner({
      executable: runtime.python,
      args: [HELPER, runtime.sdkRoot, mode],
      timeoutMs: 10_000,
      captureMode: "memory",
      environment: createSanitizedChildEnvironment({ environment, configRoot: environment.CLOUDSDK_CONFIG }),
    }));
  }
  return Object.freeze({
    id: "g2b-cloud-sdk-user-credential-refresh-once-v1",
    probeFakeRefresh: async () => invoke("--fake-refresh-success"),
    refreshOnce: async ({ enabled = false } = {}) => {
      if (enabled !== true || consumed) return localFailure("LOCAL_SETUP_FAILURE", "APPROVAL_GATE");
      consumed = true;
      return invoke("--refresh-once");
    },
    snapshot: () => Object.freeze({ approvalConsumed: consumed }),
  });
}
