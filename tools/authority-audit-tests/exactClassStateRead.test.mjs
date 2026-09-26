import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EXACT_CLASS_READ_CONTRACT,
  buildExactClassGetDocumentUrl,
  buildExactClassResource,
  runExactClassStateReadOnce,
} from "../authority-audit/exactClassStateRead.mjs";

const syntheticToken = "synthetic-token-never-returned";
const resource = buildExactClassResource();

function typed(fields) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => {
    if (Number.isSafeInteger(value)) return [key, { integerValue: String(value) }];
    if (key === "createdAt" || key === "updatedAt") return [key, { timestampValue: value }];
    return [key, { stringValue: value }];
  }));
}

function validBody(overrides = {}) {
  return {
    name: resource,
    fields: typed({
      schemaVersion: 1,
      version: 1,
      workspaceId: EXACT_CLASS_READ_CONTRACT.workspaceId,
      classId: EXACT_CLASS_READ_CONTRACT.classId,
      status: "active",
      source: "manual_admin",
      createdAt: "2026-08-24T00:00:00Z",
      updatedAt: "2026-08-24T00:00:00Z",
      createdBy: "audit-fixture",
      displayName: "2학년 5반",
      schoolYear: "2026",
      grade: "2",
      ...overrides,
    }),
  };
}

async function execute(response, options = {}) {
  let tokenCalls = 0;
  let httpCalls = 0;
  let observed = null;
  const result = await runExactClassStateReadOnce({
    tokenProvider: async () => { tokenCalls += 1; return syntheticToken; },
    httpGet: async (url, authorization) => {
      httpCalls += 1;
      observed = { url, authorization };
      return typeof response === "function" ? response() : response;
    },
    ...options,
  });
  return { result, tokenCalls, httpCalls, observed };
}

const success = await execute({ statusCode: 200, body: validBody() });
assert.equal(success.result.targetState, "PRESENT_EQUIVALENT");
assert.equal(success.result.counters.tokenCalls, 1);
assert.equal(success.result.counters.httpCalls, 1);
assert.equal(success.result.counters.retries, 0);
assert.equal(success.result.counters.writes, 0);
assert.equal(success.tokenCalls, 1);
assert.equal(success.httpCalls, 1);
assert.equal(success.observed.authorization, `Bearer ${syntheticToken}`);
const url = new URL(success.observed.url);
assert.equal(url.pathname, "/v1/projects/my-management-app-8a933/databases/%28default%29/documents/workspaces/owner_ws_RAOf0oP1TegBjP1xV8wqwr04Vax1/classRegistry/class_2026_g2_c5");
assert.deepEqual(url.searchParams.getAll("mask.fieldPaths"), [...EXACT_CLASS_READ_CONTRACT.fieldMask]);
assert.equal(JSON.stringify(success.result).includes(syntheticToken), false);

const absent = await execute({ statusCode: 404, body: { error: { status: "NOT_FOUND" } } });
assert.equal(absent.result.targetState, "ABSENT");
assert.equal(absent.result.casState, "MISSING");
assert.equal(absent.result.createStatePrerequisiteConfirmed, true);
assert.equal(absent.httpCalls, 1);

const conflict = await execute({ statusCode: 200, body: validBody({ displayName: "2학년 6반" }) });
assert.equal(conflict.result.targetState, "PRESENT_CONFLICT");
assert.deepEqual(conflict.result.conflicts, ["displayName"]);

for (const bad of [
  { name: "wrong-resource", body: { ...validBody(), name: `${resource}-other` } },
  { name: "unsupported-schema", body: validBody({ schemaVersion: 2 }) },
  { name: "missing-cas", body: { ...validBody(), fields: (() => { const fields = typed(validBody().fields); delete fields.version; return fields; })() } },
  { name: "invalid-status", body: validBody({ status: "pending" }) },
  { name: "malformed-typed-value", body: { ...validBody(), fields: { ...validBody().fields, grade: { booleanValue: true } } } },
]) {
  const outcome = await execute({ statusCode: 200, body: bad.body });
  assert.equal(outcome.result.targetState, bad.name === "wrong-resource" ? "STATE_READ_UNEXPECTED_RESPONSE_ABORT" : "PRESENT_SCHEMA_OR_STATE_REVIEW_REQUIRED", bad.name);
  assert.equal(outcome.httpCalls, 1, bad.name);
}

for (const [status, expected] of [[401, "STATE_READ_AUTHENTICATION_FAILED"], [403, "STATE_READ_PERMISSION_DENIED"], [429, "STATE_READ_INCONCLUSIVE"], [500, "STATE_READ_INCONCLUSIVE"]]) {
  const outcome = await execute({ statusCode: status, body: "{}" });
  assert.equal(outcome.result.targetState, expected);
  assert.equal(outcome.httpCalls, 1);
  assert.equal(outcome.tokenCalls, 1);
}

const redirect = await execute({ statusCode: 302, redirected: true, body: "" });
assert.equal(redirect.result.targetState, "STATE_READ_UNEXPECTED_RESPONSE_ABORT");

for (const providerResult of [
  { ok: false, reason: "unknown-stderr" },
  { ok: false, reason: "nonzero-exit" },
  { ok: false, reason: "invalid-token-output" },
  { ok: false, reason: "timeout" },
]) {
  let httpCalls = 0;
  const result = await runExactClassStateReadOnce({
    tokenProvider: async () => providerResult,
    httpGet: async () => { httpCalls += 1; return { statusCode: 200, body: validBody() }; },
  });
  assert.equal(result.reason, "token-provider-rejected");
  assert.equal(result.counters.tokenCalls, 1);
  assert.equal(httpCalls, 0);
}

for (const [label, mutate] of [
  ["workspace", (contract) => ({ ...contract, workspaceId: "other-workspace" })],
  ["class", (contract) => ({ ...contract, classId: "other-class" })],
  ["plan", (contract) => ({ ...contract, planId: "other-plan" })],
  ["fingerprint", (contract) => ({ ...contract, sourceFingerprint: "sha256-c14n-v1:other" })],
  ["mask", (contract) => ({ ...contract, fieldMask: [...contract.fieldMask, "extra"] })],
]) {
  let tokenCalls = 0;
  const result = await runExactClassStateReadOnce({
    contract: mutate(EXACT_CLASS_READ_CONTRACT),
    tokenProvider: async () => { tokenCalls += 1; return syntheticToken; },
    httpGet: async () => ({ statusCode: 200, body: validBody() }),
  });
  assert.equal(result.counters.tokenCalls, 0, `${label} must fail before token`);
  assert.equal(tokenCalls, 0, `${label} provider must not run`);
  assert.match(result.reason, /CONTRACT_MISMATCH|FIELD_MASK_MISMATCH/);
}

for (const [label, error] of [["timeout", { code: "ETIMEDOUT" }], ["network", { code: "ECONNRESET" }]]) {
  const outcome = await execute(async () => { throw error; });
  assert.equal(outcome.result.targetState, "STATE_READ_INCONCLUSIVE", label);
  assert.equal(outcome.result.counters.retries, 0, label);
  assert.equal(outcome.httpCalls, 1, label);
}

const noWriteSurface = readFileSync(new URL("../authority-audit/exactClassStateRead.mjs", import.meta.url), "utf8");
assert.equal(/export[^\n]*(create|update|delete|commit|batchWrite)/i.test(noWriteSurface), false);

console.log("exact class state read executor local validation passed");
