import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  G2B_EXACT_PERMISSION,
  G2B_EXACT_PERMISSION_RESOURCE,
  buildG2BExactPermissionRequest,
  classifyG2BExactPermissionResponse,
} from "../authority-audit/g2bExactPermissionDiagnosticContract.mjs";
import { createG2BExactPermissionDiagnosticExecutor } from "../authority-audit/g2bExactPermissionDiagnosticExecutor.mjs";
import { createG2BExactPermissionAuthTransport } from "../authority-audit/g2bExactPermissionAuthTransport.mjs";

const exact = buildG2BExactPermissionRequest();
assert.deepEqual(exact, { resource: G2B_EXACT_PERMISSION_RESOURCE, permissions: [G2B_EXACT_PERMISSION] });
for (const input of [
  { resource: "projects/wrong/serviceAccounts/wrong", permissions: [G2B_EXACT_PERMISSION] },
  { permissions: ["iam.serviceAccounts.getIamPolicy"] },
  { permissions: [G2B_EXACT_PERMISSION, "iam.serviceAccounts.getIamPolicy"] },
  { permissions: ["iam.serviceAccounts.*"] },
]) assert.throws(() => buildG2BExactPermissionRequest(input));

for (const [response, result] of [
  [{ ok: true, httpStatusClass: "2XX", grantedPermissions: [G2B_EXACT_PERMISSION] }, "PERMISSION_PRESENT_CONFIRMED"],
  [{ ok: true, httpStatusClass: "2XX", grantedPermissions: [] }, "PERMISSION_ABSENT_CONFIRMED"],
  [{ ok: false, code: "DIAGNOSTIC_AUTH_FAILURE" }, "DIAGNOSTIC_AUTH_FAILURE"],
  [{ ok: false, code: "DIAGNOSTIC_REQUEST_FAILURE" }, "DIAGNOSTIC_REQUEST_FAILURE"],
  [{ ok: true, httpStatusClass: "2XX", grantedPermissions: "bad" }, "DIAGNOSTIC_PARSE_FAILURE"],
  [{ ok: true, httpStatusClass: "2XX", grantedPermissions: ["unexpected.permission"] }, "PRIVACY_GUARD_FAILURE"],
  [null, "UNEXPECTED_RESPONSE"],
]) assert.equal(classifyG2BExactPermissionResponse(response).result, result);

let fakeCalls = 0;
const executor = createG2BExactPermissionDiagnosticExecutor({
  transport: { executeOnce: async () => { fakeCalls += 1; return { ok: true, httpStatusClass: "2XX", grantedPermissions: [] }; } },
});
assert.equal((await executor.execute()).counters.testIamPermissionsCalls, 0);
const first = await executor.execute({ enabled: true });
assert.equal(first.result, "PERMISSION_ABSENT_CONFIRMED");
assert.equal(first.counters.testIamPermissionsCalls, 1);
assert.equal(fakeCalls, 1);
assert.equal((await executor.execute({ enabled: true })).counters.testIamPermissionsCalls, 0);
assert.equal(fakeCalls, 1);

let processCalls = 0;
const transport = createG2BExactPermissionAuthTransport({
  processRunner: async ({ args }) => {
    processCalls += 1;
    assert.equal(args.length, 3);
    const request = JSON.parse(Buffer.from(args[2], "base64").toString("utf8"));
    assert.deepEqual(request, exact);
    return {
      exitCode: 0,
      timedOut: false,
      spawnError: null,
      stdout: JSON.stringify({ schema: "myweb.g2b.exact-permission-transport.v3", ok: true, httpStatusClass: "2XX", grantedPermissions: [G2B_EXACT_PERMISSION] }),
      stderr: "",
    };
  },
});
assert.equal((await transport.executeOnce(exact)).ok, true);
assert.equal((await transport.executeOnce(exact)).ok, false);
assert.equal(processCalls, 1);

const leaking = createG2BExactPermissionAuthTransport({
  processRunner: async () => ({ exitCode: 0, timedOut: false, spawnError: null, stdout: "{}", stderr: "raw provider detail" }),
});
assert.equal((await leaking.executeOnce(exact)).code, "PRIVACY_GUARD_FAILURE");

const overridden = createG2BExactPermissionAuthTransport({
  environment: { ...process.env, CLOUDSDK_AUTH_ACCESS_TOKEN: "forbidden" },
  processRunner: async () => { throw new Error("must-not-run"); },
});
assert.equal((await overridden.executeOnce(exact)).code, "PRIVACY_GUARD_FAILURE");

const unavailableRuntime = createG2BExactPermissionAuthTransport({
  environment: { GCLOUD_PATH: "", LOCALAPPDATA: "", PATH: "" },
  processRunner: async () => { throw new Error("must-not-run"); },
});
const unavailableRuntimeResult = await unavailableRuntime.executeOnce(exact);
assert.equal(unavailableRuntimeResult.failureMetadata.localSetupSubstage, "NODE_RUNTIME_RESOLUTION");

const metadata = ({ status = "NOT_OBSERVED", statusClass = "NONE", provider = "NOT_AVAILABLE", stage = "AFTER_HTTP_RESPONSE", exceptionClass = "REMOTE_REQUEST_EXCEPTION", timeout = false, localSetupSubstage = "NOT_APPLICABLE" } = {}) => ({
  failureStage: stage,
  httpStatusClass: statusClass,
  httpStatusCodeSafe: status,
  transportExceptionClassSafe: exceptionClass,
  safeProviderErrorIdentifier: provider,
  timeout,
  localSetupSubstage,
});
for (const [code, failureMetadata, expected] of [
  ["DIAGNOSTIC_AUTH_FAILURE", metadata({ status: 401, statusClass: "4XX", provider: "HTTP_401" }), "DIAGNOSTIC_AUTH_FAILURE"],
  ["DIAGNOSTIC_AUTH_FAILURE", metadata({ status: 403, statusClass: "4XX", provider: "HTTP_403" }), "DIAGNOSTIC_AUTH_FAILURE"],
  ["DIAGNOSTIC_REQUEST_FAILURE", metadata({ status: 400, statusClass: "4XX", provider: "HTTP_400" }), "DIAGNOSTIC_REQUEST_FAILURE"],
  ["DIAGNOSTIC_REQUEST_FAILURE", metadata({ status: 404, statusClass: "4XX", provider: "HTTP_404" }), "DIAGNOSTIC_REQUEST_FAILURE"],
  ["DIAGNOSTIC_REQUEST_FAILURE", metadata({ status: 429, statusClass: "4XX", provider: "HTTP_429" }), "DIAGNOSTIC_REQUEST_FAILURE"],
  ["DIAGNOSTIC_REQUEST_FAILURE", metadata({ status: 500, statusClass: "5XX", provider: "HTTP_500" }), "DIAGNOSTIC_REQUEST_FAILURE"],
]) {
  const fixtureTransport = createG2BExactPermissionAuthTransport({
    processRunner: async () => ({
      exitCode: 2,
      timedOut: false,
      spawnError: null,
      stdout: JSON.stringify({ schema: "myweb.g2b.exact-permission-transport.v3", ok: false, code, failureMetadata }),
      stderr: "",
    }),
  });
  const response = await fixtureTransport.executeOnce(exact);
  assert.equal(classifyG2BExactPermissionResponse(response).result, expected);
  assert.deepEqual(response.failureMetadata, failureMetadata);
}

const narrowedSetupFailure = metadata({
  stage: "BEFORE_HTTP_SEND",
  exceptionClass: "LOCAL_CLIENT_SETUP_FAILURE",
  localSetupSubstage: "HTTP_CLIENT_CONSTRUCTION",
});
assert.deepEqual(
  classifyG2BExactPermissionResponse({
    ok: false,
    code: "DIAGNOSTIC_REQUEST_FAILURE",
    failureMetadata: narrowedSetupFailure,
  }),
  { result: "DIAGNOSTIC_REQUEST_FAILURE", failureMetadata: narrowedSetupFailure },
);

const timeoutTransport = createG2BExactPermissionAuthTransport({
  processRunner: async () => ({ exitCode: null, timedOut: true, spawnError: { code: "ETIMEDOUT" }, stdout: "", stderr: "" }),
});
const timeoutResponse = await timeoutTransport.executeOnce(exact);
assert.equal(classifyG2BExactPermissionResponse(timeoutResponse).result, "DIAGNOSTIC_REQUEST_FAILURE");
assert.equal(timeoutResponse.failureMetadata.timeout, true);

const networkTransport = createG2BExactPermissionAuthTransport({
  processRunner: async () => ({ exitCode: null, timedOut: false, spawnError: { code: "ECONNRESET" }, stdout: "", stderr: "" }),
});
assert.equal(classifyG2BExactPermissionResponse(await networkTransport.executeOnce(exact)).result, "DIAGNOSTIC_REQUEST_FAILURE");

const sendPhaseTransport = createG2BExactPermissionAuthTransport({
  processRunner: async () => ({
    exitCode: 2,
    timedOut: false,
    spawnError: null,
    stdout: JSON.stringify({ schema: "myweb.g2b.exact-permission-transport.v3", ok: false, code: "DIAGNOSTIC_REQUEST_FAILURE", failureMetadata: metadata({ stage: "DURING_HTTP_SEND" }) }),
    stderr: "",
  }),
});
assert.equal((await sendPhaseTransport.executeOnce(exact)).failureMetadata.failureStage, "DURING_HTTP_SEND");

let probeArgs;
const readyProbeTransport = createG2BExactPermissionAuthTransport({
  processRunner: async ({ args }) => {
    probeArgs = args;
    return { exitCode: 0, timedOut: false, spawnError: null, stdout: JSON.stringify({ schema: "myweb.g2b.exact-permission-transport.v3", readyToSend: true }), stderr: "" };
  },
});
assert.equal((await readyProbeTransport.probeReadyToSend(exact)).ready, true);
assert.equal(probeArgs.at(-1), "--ready-to-send-only");

const malformedTransport = createG2BExactPermissionAuthTransport({
  processRunner: async () => ({ exitCode: 0, timedOut: false, spawnError: null, stdout: "", stderr: "" }),
});
assert.equal(classifyG2BExactPermissionResponse(await malformedTransport.executeOnce(exact)).result, "DIAGNOSTIC_PARSE_FAILURE");

const helperSource = readFileSync("tools/authority-audit/g2b_exact_permission_transport.py", "utf8");
assert.match(helperSource, /prevent_refresh=True/);
assert.match(helperSource, /allow_account_impersonation=False/);
assert.match(helperSource, /credential\.refresh = refresh_blocked/);
assert.match(helperSource, /credential_requests\.RequestWrapper\(\)\.WrapCredentials/);
assert.match(helperSource, /core_requests\.GetApitoolsRequests/);
assert.match(helperSource, /--local-construction-trace/);
assert.match(helperSource, /client\.num_retries = 0/);
assert.match(helperSource, /projects_serviceAccounts\.TestIamPermissions\(request\)/);
assert.match(helperSource, /failureMetadata/);
assert.match(helperSource, /localSetupSubstage/);
assert.match(helperSource, /ready-to-send-only/);
assert.match(helperSource, /third_party/);
assert.match(helperSource, /safe_status/);
assert.doesNotMatch(helperSource, /print-access-token|generateAccessToken|serviceAccounts\.keys/i);

console.log("G2B exact permission executor local fixtures passed; remote operations=0");
