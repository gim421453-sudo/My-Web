import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { VerifiedActorError } from "../src/auth/authErrors.js";
import { createVerifiedActorProbeHandler } from "../src/auth/verifiedActorProbe.js";
import type { VerifiedActor } from "../src/auth/verifiedActor.js";

function actor(emailVerified = true): VerifiedActor {
  return {
    uid: "fixture-user",
    auth: {
      tokenVerified: true,
      authTime: 1,
      issuedAt: 1,
      expiresAt: 2,
      emailVerified,
      disabled: false,
      provider: "password",
      mfaEvidence: "absent",
    },
    authority: {
      uidSource: "firebase-auth",
      emailVerifiedSource: "firebase-auth",
      disabledSource: "firebase-auth",
      mfaSource: "firebase-auth-token",
    },
    request: { requestId: "fixture-request" },
    authorizationStatus: "unresolved",
  };
}

function responseFixture() {
  const state: { status: number; body: unknown } = { status: 0, body: null };
  const response = {
    status(status: number) {
      state.status = status;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
  } as unknown as Response;
  return { response, state };
}

function request(method = "POST") {
  return { method, headers: { authorization: "Bearer fixture-token" } } as Request;
}

test("probe returns only safe actor state", async () => {
  const { response, state } = responseFixture();
  await createVerifiedActorProbeHandler({}, async () => actor())(request(), response);
  assert.equal(state.status, 200);
  assert.deepEqual(state.body, {
    ok: true,
    actorVerified: true,
    emailVerified: true,
    accountEnabled: true,
    mfaEvidence: "absent",
    emulator: true,
  });
  const text = JSON.stringify(state.body);
  for (const forbidden of ["fixture-user", "fixture-token", "authTime", "provider"] ) {
    assert.equal(text.includes(forbidden), false);
  }
});

test("probe forwards the fixed email policy to the verifier", async () => {
  const { response } = responseFixture();
  let strict = false;
  await createVerifiedActorProbeHandler({ requireEmailVerified: true }, async (_request, options) => {
    strict = options.requireEmailVerified === true;
    return actor();
  })(request(), response);
  assert.equal(strict, true);
});

test("probe returns a safe typed denial", async () => {
  const { response, state } = responseFixture();
  const logs: unknown[] = [];
  await createVerifiedActorProbeHandler(
    {},
    async () => {
      throw new VerifiedActorError("AUTH_TOKEN_INVALID", "fixture-request");
    },
    (_label, entry) => logs.push(entry),
  )(request(), response);
  assert.equal(state.status, 401);
  assert.deepEqual(state.body, { ok: false, code: "AUTH_TOKEN_INVALID", requestId: "fixture-request" });
  assert.equal(logs.length, 1);
  assert.equal(JSON.stringify(logs).includes("fixture-token"), false);
});

test("probe rejects non-POST methods without invoking Auth", async () => {
  const { response, state } = responseFixture();
  let verifyCount = 0;
  await createVerifiedActorProbeHandler({}, async () => {
    verifyCount += 1;
    return actor();
  })(request("GET"), response);
  assert.equal(state.status, 405);
  assert.equal(verifyCount, 0);
});

test("unknown probe failures do not expose raw errors", async () => {
  const { response, state } = responseFixture();
  await createVerifiedActorProbeHandler(
    {},
    async () => {
      throw new Error("raw-token-like-fixture");
    },
    () => undefined,
  )(request(), response);
  assert.equal(state.status, 500);
  assert.equal(JSON.stringify(state.body).includes("raw-token-like-fixture"), false);
});
