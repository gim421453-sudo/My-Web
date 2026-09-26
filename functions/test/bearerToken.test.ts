import assert from "node:assert/strict";
import test from "node:test";
import { VerifiedActorError } from "../src/auth/authErrors.js";
import { extractBearerToken, type BearerTokenRequest } from "../src/auth/bearerToken.js";

const requestId = "fixture-request";

function expectCode(request: BearerTokenRequest, code: string) {
  assert.throws(
    () => extractBearerToken(request, requestId),
    (error: unknown) => error instanceof VerifiedActorError
      && error.code === code
      && error.requestId === requestId,
  );
}

test("missing Authorization header is denied", () => {
  expectCode({ headers: {} }, "AUTH_HEADER_MISSING");
});

test("empty Authorization header is denied", () => {
  expectCode({ headers: { authorization: "" } }, "AUTH_HEADER_MALFORMED");
});

test("Basic authorization is denied", () => {
  expectCode({ headers: { authorization: "Basic fixture" } }, "AUTH_HEADER_MALFORMED");
});

test("Bearer without a token is denied", () => {
  expectCode({ headers: { authorization: "Bearer" } }, "AUTH_HEADER_MALFORMED");
});

test("multiple Bearer tokens are denied", () => {
  expectCode({ headers: { authorization: "Bearer first second" } }, "AUTH_HEADER_MALFORMED");
});

test("comma-joined Authorization values are denied", () => {
  expectCode({ headers: { authorization: "Bearer first,Bearer second" } }, "AUTH_HEADER_MALFORMED");
});

test("an array Authorization header is denied", () => {
  expectCode({ headers: { authorization: ["Bearer first", "Bearer second"] } }, "AUTH_HEADER_MALFORMED");
});

test("a single Bearer token is extracted", () => {
  assert.equal(extractBearerToken({ headers: { authorization: "Bearer fixture-token" } }, requestId), "fixture-token");
});

test("query body cookie and custom token values are ignored", () => {
  expectCode({
    headers: { "x-token": "fixture" },
    query: { token: "fixture" },
    body: { token: "fixture" },
    cookies: { token: "fixture" },
  }, "AUTH_HEADER_MISSING");
});

test("Bearer parsing is scheme-case insensitive without exposing the token", () => {
  assert.equal(extractBearerToken({ headers: { authorization: "bearer fixture-token" } }, requestId), "fixture-token");
});
