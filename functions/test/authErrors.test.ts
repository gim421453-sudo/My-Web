import assert from "node:assert/strict";
import test from "node:test";
import {
  logSafeAuthFailure,
  normalizeVerifiedActorError,
  safeAuthErrorBody,
  VerifiedActorError,
} from "../src/auth/authErrors.js";
import { TrustedBackendGuardError } from "../src/runtime/emulatorGuard.js";

const requestId = "fixture-request";

test("expired Firebase token maps to the safe expired code", () => {
  assert.equal(normalizeVerifiedActorError({ code: "auth/id-token-expired" }, requestId).code, "AUTH_TOKEN_EXPIRED");
});

test("revoked Firebase token maps to the safe revoked code", () => {
  assert.equal(normalizeVerifiedActorError({ code: "auth/id-token-revoked" }, requestId).code, "AUTH_TOKEN_REVOKED");
});

test("missing and disabled Firebase users map separately", () => {
  assert.equal(normalizeVerifiedActorError({ code: "auth/user-not-found" }, requestId).code, "AUTH_USER_NOT_FOUND");
  assert.equal(normalizeVerifiedActorError({ code: "auth/user-disabled" }, requestId).code, "AUTH_ACCOUNT_DISABLED");
});

test("invalid Firebase token errors do not expose SDK details", () => {
  const error = normalizeVerifiedActorError({ code: "auth/invalid-id-token", message: "raw fixture" }, requestId);
  assert.deepEqual(safeAuthErrorBody(error), { ok: false, code: "AUTH_TOKEN_INVALID", requestId });
  assert.equal(JSON.stringify(safeAuthErrorBody(error)).includes("raw fixture"), false);
});

test("Auth Emulator guard failure has a dedicated safe code", () => {
  const error = normalizeVerifiedActorError(new TrustedBackendGuardError("TB_AUTH_EMULATOR_REQUIRED"), requestId);
  assert.equal(error.code, "AUTH_EMULATOR_REQUIRED");
  assert.equal(error.httpStatus, 500);
});

test("other runtime guard failures become invalid context", () => {
  const error = normalizeVerifiedActorError(new TrustedBackendGuardError("TB_PROJECT_ID_NOT_DEMO"), requestId);
  assert.equal(error.code, "AUTH_CONTEXT_INVALID");
});

test("safe auth logs contain only correlation metadata", () => {
  let captured = "";
  logSafeAuthFailure(
    new VerifiedActorError("AUTH_TOKEN_INVALID", requestId),
    (label, entry) => {
      captured = JSON.stringify({ label, entry });
    },
  );
  assert.equal(captured.includes(requestId), true);
  assert.equal(captured.includes("AUTH_TOKEN_INVALID"), true);
  for (const forbidden of ["Bearer", "fixture-token", "email", "uid", "credential"]) {
    assert.equal(captured.includes(forbidden), false);
  }
});
