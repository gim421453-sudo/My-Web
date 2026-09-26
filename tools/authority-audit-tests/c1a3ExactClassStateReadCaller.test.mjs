import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  C1A3_CALLER_CONTRACT,
  computeActiveCallerFingerprint,
  createImpersonatedAccessTokenProvider,
  discoverActiveCaller,
  runC1A3CorrectedExactClassStateRead,
} from "../authority-audit/c1a3ExactClassStateReadCaller.mjs";
import { EXACT_CLASS_READ_CONTRACT } from "../authority-audit/exactClassStateRead.mjs";

const syntheticToken = "synthetic-c1a3-token-never-returned";
const resource = "projects/my-management-app-8a933/databases/%28default%29/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5";
const validFields = {
  schemaVersion: { integerValue: "1" },
  version: { integerValue: "1" },
  workspaceId: { stringValue: EXACT_CLASS_READ_CONTRACT.workspaceId },
  classId: { stringValue: EXACT_CLASS_READ_CONTRACT.classId },
  status: { stringValue: "active" },
  source: { stringValue: "manual_admin" },
  createdAt: { timestampValue: "2026-08-24T00:00:00Z" },
  updatedAt: { timestampValue: "2026-08-24T00:00:00Z" },
  createdBy: { stringValue: "audit-fixture" },
  displayName: { stringValue: "2학년 5반" },
  schoolYear: { stringValue: "2026" },
  grade: { stringValue: "2" },
};

assert.equal(computeActiveCallerFingerprint(" User@Example.com "), "b4c9a289323b");
const discovered = await discoverActiveCaller({
  executable: "synthetic-gcloud.cmd",
  runProcess: ({ args }) => {
    assert.deepEqual(args, C1A3_CALLER_CONTRACT.activeCallerCommand);
    return { exitCode: 0, timedOut: false, stdout: "User@Example.com\n", stderr: "" };
  },
});
assert.deepEqual(discovered, { ok: true, activeCallerCount: 1, activeCallerFingerprint: "b4c9a289323b" });
assert.equal(JSON.stringify(discovered).includes("User@Example.com"), false);

let tokenProcessCalls = 0;
const tokenProvider = createImpersonatedAccessTokenProvider({
  executable: "synthetic-gcloud.cmd",
  runProcess: ({ args }) => {
    tokenProcessCalls += 1;
    assert.deepEqual(args, C1A3_CALLER_CONTRACT.tokenCommand);
    return {
      exitCode: 0,
      timedOut: false,
      stdout: syntheticToken,
      stderr: "WARNING: This command is using service account impersonation.\nAll API calls will be executed as [redacted-audit-principal].\n",
    };
  },
});
const tokenResult = await tokenProvider();
assert.equal(tokenResult.ok, false);
assert.equal(tokenProcessCalls, 1);
assert.equal(tokenResult.code, "TOKEN_GENERATION_FAILED");
assert.equal(tokenResult.tokenPipelineDiagnostic.classifierAccepted, "no");
assert.equal(tokenResult.tokenPipelineDiagnostic.providerAccepted, "no");
assert.equal(tokenResult.tokenPipelineDiagnostic.providerReason, "CLASSIFIER_REJECTED");
assert.equal(JSON.stringify(tokenResult.tokenPipelineDiagnostic).includes(syntheticToken), false);

const active = () => ({ ok: true, activeCallerCount: 1, activeCallerFingerprint: "5e6692dda08c" });
const syntheticAcceptedDiagnostic = Object.freeze({
  processStarted: true,
  exitCode: 0,
  timedOut: false,
  stdoutPresent: true,
  stdoutCharCount: syntheticToken.length,
  stdoutLineCount: 1,
  stdoutLeadingWhitespace: false,
  stdoutTrailingWhitespace: false,
  stdoutTerminalNewlineKind: "NONE",
  stderrPresent: false,
  stderrCharCount: 0,
  stderrLineCount: 0,
  stderrClassification: "EMPTY",
  classifierAccepted: "yes",
  classifierReason: "ACCEPTED",
  providerAccepted: "yes",
  providerReason: "ACCEPTED",
});
const fakeHttp = async (url, authorization) => {
  assert.equal(url.includes("owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1"), true);
  assert.equal(authorization, `Bearer ${syntheticToken}`);
  return { statusCode: 404, body: { error: { status: "NOT_FOUND" } } };
};
const absent = await runC1A3CorrectedExactClassStateRead({
  activeCallerProvider: active,
  tokenProvider: async () => ({ ok: true, token: syntheticToken, tokenPipelineDiagnostic: syntheticAcceptedDiagnostic }),
  httpGet: fakeHttp,
});
assert.equal(absent.targetState, "ABSENT");
assert.deepEqual(absent.counters, { activeCallerDiscoveryCalls: 1, tokenCalls: 1, httpCalls: 1, retries: 0, writes: 0 });
assert.equal(JSON.stringify(absent).includes(syntheticToken), false);
assert.equal(absent.tokenPipelineDiagnostic.providerAccepted, "yes");

const equivalent = await runC1A3CorrectedExactClassStateRead({
  activeCallerProvider: active,
  tokenProvider: async () => ({ ok: true, token: syntheticToken, tokenPipelineDiagnostic: syntheticAcceptedDiagnostic }),
  httpGet: async () => ({ statusCode: 200, body: { name: resource, fields: validFields } }),
});
assert.equal(equivalent.targetState, "PRESENT_EQUIVALENT");
assert.equal(equivalent.counters.tokenCalls, 1);
assert.equal(equivalent.tokenPipelineDiagnostic.providerAccepted, "yes");

for (const caller of [
  { activeCallerCount: 0, activeCallerFingerprint: null },
  { activeCallerCount: 2, activeCallerFingerprint: null },
  { activeCallerCount: 1, activeCallerFingerprint: "wrong" },
]) {
  let tokenCalls = 0;
  let httpCalls = 0;
  const result = await runC1A3CorrectedExactClassStateRead({
    activeCallerProvider: async () => ({ ok: true, ...caller }),
    tokenProvider: async () => { tokenCalls += 1; return syntheticToken; },
    httpGet: async () => { httpCalls += 1; return { statusCode: 404, body: { error: { status: "NOT_FOUND" } } }; },
  });
  assert.equal(result.targetState, "CALLER_IDENTITY_MISMATCH");
  assert.equal(tokenCalls, 0);
  assert.equal(httpCalls, 0);
}

let discoveryCalls = 0;
let tokenCalls = 0;
let httpCalls = 0;
const staticMismatch = await runC1A3CorrectedExactClassStateRead({
  contract: { ...EXACT_CLASS_READ_CONTRACT, planId: "wrong-plan" },
  activeCallerProvider: async () => { discoveryCalls += 1; return active(); },
  tokenProvider: async () => { tokenCalls += 1; return syntheticToken; },
  httpGet: async () => { httpCalls += 1; return { statusCode: 404, body: { error: { status: "NOT_FOUND" } } }; },
});
assert.equal(staticMismatch.targetState, "STATIC_IDENTITY_MISMATCH");
assert.equal(discoveryCalls, 0);
assert.equal(tokenCalls, 0);
assert.equal(httpCalls, 0);

for (const processResult of [
  { exitCode: 0, timedOut: false, stdout: syntheticToken, stderr: "unknown warning" },
  { exitCode: 7, timedOut: false, stdout: syntheticToken, stderr: "" },
  { exitCode: 0, timedOut: false, stdout: "", stderr: "" },
  { exitCode: 0, timedOut: false, stdout: "one\ntwo", stderr: "" },
  { exitCode: null, timedOut: true, stdout: "", stderr: "" },
]) {
  let httpCount = 0;
  const provider = createImpersonatedAccessTokenProvider({ executable: "synthetic-gcloud.cmd", runProcess: () => processResult });
  const result = await runC1A3CorrectedExactClassStateRead({
    activeCallerProvider: active,
    tokenProvider: provider,
    httpGet: async () => { httpCount += 1; return { statusCode: 200, body: { name: resource, fields: validFields } }; },
  });
  assert.equal(result.reason, "token-provider-rejected");
  assert.equal(result.counters.tokenCalls, 1);
  assert.equal(httpCount, 0);
  assert.equal(result.tokenPipelineDiagnostic.providerAccepted, "no");
  assert.equal(result.tokenPipelineDiagnostic.providerReason, "CLASSIFIER_REJECTED");
  assert.equal(JSON.stringify(result.tokenPipelineDiagnostic).includes(syntheticToken), false);
}

for (const response of [401, 403, 429, 500]) {
  const result = await runC1A3CorrectedExactClassStateRead({
    activeCallerProvider: active,
    tokenProvider: async () => syntheticToken,
    httpGet: async () => ({ statusCode: response, body: "{}" }),
  });
  assert.equal(result.counters.tokenCalls, 1);
  assert.equal(result.counters.httpCalls, 1);
  assert.equal(result.counters.retries, 0);
}

for (const error of [{ code: "ETIMEDOUT" }, { code: "ECONNRESET" }]) {
  const result = await runC1A3CorrectedExactClassStateRead({
    activeCallerProvider: active,
    tokenProvider: async () => syntheticToken,
    httpGet: async () => { throw error; },
  });
  assert.equal(result.targetState, "STATE_READ_INCONCLUSIVE");
  assert.equal(result.counters.tokenCalls, 1);
  assert.equal(result.counters.httpCalls, 1);
  assert.equal(result.counters.retries, 0);
}

const source = readFileSync(new URL("../authority-audit/c1a3ExactClassStateReadCaller.mjs", import.meta.url), "utf8");
assert.equal(/console\.(log|error)|export\s+(?:async\s+)?function\s+(?:create|update|delete|commit|batchWrite)\b|\b(?:RunQuery|BatchGet|ListDocuments|ListCollectionIds)\b/i.test(source), false);
assert.equal(JSON.stringify(equivalent).includes("Authorization"), false);

console.log("C1A3 dormant caller and active-caller gate local validation passed");
