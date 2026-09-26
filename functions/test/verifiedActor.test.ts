import assert from "node:assert/strict";
import test from "node:test";
import type { DecodedIdToken, UserRecord } from "firebase-admin/auth";
import { VerifiedActorError } from "../src/auth/authErrors.js";
import {
  verifyActorFromRequest,
  type VerifiedActorAuth,
  type VerifiedActorDependencies,
} from "../src/auth/verifiedActor.js";

function decoded(overrides: Partial<DecodedIdToken> = {}): DecodedIdToken {
  return {
    uid: "token-user",
    sub: "token-user",
    aud: "demo-myweb-trusted-backend",
    iss: "https://securetoken.google.com/demo-myweb-trusted-backend",
    auth_time: 100,
    iat: 101,
    exp: 200,
    firebase: {
      identities: {},
      sign_in_provider: "password",
    },
    ...overrides,
  } as DecodedIdToken;
}

function user(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    uid: "token-user",
    disabled: false,
    emailVerified: false,
    ...overrides,
  } as UserRecord;
}

interface FixtureState {
  verifiedToken: string | null;
  checkRevoked: boolean | undefined;
  userLookupUid: string | null;
  getAuthCount: number;
}

function fixtureDependencies(
  decodedToken: DecodedIdToken = decoded(),
  userRecord: UserRecord = user(),
): { dependencies: VerifiedActorDependencies; state: FixtureState } {
  const state: FixtureState = {
    verifiedToken: null,
    checkRevoked: undefined,
    userLookupUid: null,
    getAuthCount: 0,
  };
  const auth: VerifiedActorAuth = {
    async verifyIdToken(token, checkRevoked) {
      state.verifiedToken = token;
      state.checkRevoked = checkRevoked;
      return decodedToken;
    },
    async getUser(uid) {
      state.userLookupUid = uid;
      return userRecord;
    },
  };
  return {
    state,
    dependencies: {
      getAuth() {
        state.getAuthCount += 1;
        return auth;
      },
      createRequestId: () => "fixture-request",
    },
  };
}

function request(body: unknown = undefined) {
  return {
    headers: { authorization: "Bearer fixture-token" },
    body,
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof VerifiedActorError
      && error.code === code
      && error.requestId === "fixture-request",
  );
}

test("valid token creates an authentication-only actor", async () => {
  const { dependencies } = fixtureDependencies(decoded(), user({ emailVerified: true }));
  const actor = await verifyActorFromRequest(request(), {}, dependencies);
  assert.equal(actor.uid, "token-user");
  assert.equal(actor.auth.tokenVerified, true);
  assert.equal(actor.auth.emailVerified, true);
  assert.equal(actor.auth.disabled, false);
  assert.equal(actor.authorizationStatus, "unresolved");
  assert.deepEqual(actor.authority, {
    uidSource: "firebase-auth",
    emailVerifiedSource: "firebase-auth",
    disabledSource: "firebase-auth",
    mfaSource: "firebase-auth-token",
  });
});

test("client body uid cannot replace token uid", async () => {
  const { dependencies, state } = fixtureDependencies();
  const actor = await verifyActorFromRequest(request({ uid: "client-user" }), {}, dependencies);
  assert.equal(actor.uid, "token-user");
  assert.equal(state.userLookupUid, "token-user");
});

test("only the Authorization token reaches verifyIdToken", async () => {
  const { dependencies, state } = fixtureDependencies();
  await verifyActorFromRequest({
    headers: { authorization: "Bearer header-token" },
    body: { token: "body-token" },
    query: { token: "query-token" },
  }, {}, dependencies);
  assert.equal(state.verifiedToken, "header-token");
});

test("revocation checking is enabled by default", async () => {
  const { dependencies, state } = fixtureDependencies();
  await verifyActorFromRequest(request(), {}, dependencies);
  assert.equal(state.checkRevoked, true);
});

test("unverified Auth user is observed when enforcement is off", async () => {
  const { dependencies } = fixtureDependencies(decoded(), user({ emailVerified: false }));
  const actor = await verifyActorFromRequest(request(), { requireEmailVerified: false }, dependencies);
  assert.equal(actor.auth.emailVerified, false);
});

test("unverified Auth user is denied when enforcement is on", async () => {
  const { dependencies } = fixtureDependencies(decoded(), user({ emailVerified: false }));
  await expectCode(
    verifyActorFromRequest(request(), { requireEmailVerified: true }, dependencies),
    "AUTH_EMAIL_UNVERIFIED",
  );
});

test("verified Auth user passes strict email policy", async () => {
  const { dependencies } = fixtureDependencies(decoded(), user({ emailVerified: true }));
  const actor = await verifyActorFromRequest(request(), { requireEmailVerified: true }, dependencies);
  assert.equal(actor.auth.emailVerified, true);
});

test("disabled Auth user is denied", async () => {
  const { dependencies } = fixtureDependencies(decoded(), user({ disabled: true }));
  await expectCode(verifyActorFromRequest(request(), {}, dependencies), "AUTH_ACCOUNT_DISABLED");
});

test("missing Auth user is denied", async () => {
  const { dependencies } = fixtureDependencies();
  const original = dependencies.getAuth;
  dependencies.getAuth = () => ({
    ...original(),
    getUser: async () => {
      throw { code: "auth/user-not-found" };
    },
  });
  await expectCode(verifyActorFromRequest(request(), {}, dependencies), "AUTH_USER_NOT_FOUND");
});

test("MFA second-factor token evidence is present", async () => {
  const { dependencies } = fixtureDependencies(decoded({
    firebase: {
      identities: {},
      sign_in_provider: "password",
      sign_in_second_factor: "phone",
    },
  }));
  assert.equal((await verifyActorFromRequest(request(), {}, dependencies)).auth.mfaEvidence, "present");
});

test("known Firebase token without second factor reports absent", async () => {
  const { dependencies } = fixtureDependencies();
  assert.equal((await verifyActorFromRequest(request(), {}, dependencies)).auth.mfaEvidence, "absent");
});

test("missing Firebase token metadata reports unknown MFA evidence", async () => {
  const { dependencies } = fixtureDependencies(decoded({ firebase: undefined as never }));
  assert.equal((await verifyActorFromRequest(request(), {}, dependencies)).auth.mfaEvidence, "unknown");
});

test("auth time issued time and expiry are preserved as numbers", async () => {
  const { dependencies } = fixtureDependencies(decoded({ auth_time: 10, iat: 20, exp: 30 }));
  const actor = await verifyActorFromRequest(request(), {}, dependencies);
  assert.equal(actor.auth.authTime, 10);
  assert.equal(actor.auth.issuedAt, 20);
  assert.equal(actor.auth.expiresAt, 30);
});

test("invalid time metadata is represented as null", async () => {
  const { dependencies } = fixtureDependencies(decoded({ auth_time: Number.NaN, iat: Number.NaN, exp: Number.NaN }));
  const actor = await verifyActorFromRequest(request(), {}, dependencies);
  assert.equal(actor.auth.authTime, null);
  assert.equal(actor.auth.issuedAt, null);
  assert.equal(actor.auth.expiresAt, null);
});

test("provider comes from verified Firebase token metadata", async () => {
  const { dependencies } = fixtureDependencies(decoded({
    firebase: { identities: {}, sign_in_provider: "google.com" },
  }));
  assert.equal((await verifyActorFromRequest(request(), {}, dependencies)).auth.provider, "google.com");
});

test("VerifiedActor contains no authorization authority fields", async () => {
  const { dependencies } = fixtureDependencies();
  const text = JSON.stringify(await verifyActorFromRequest(request(), {}, dependencies));
  for (const forbidden of ["systemOwner", "globalRole", "workspaceRole", "capabilities", "assignments", "identityVerified"] ) {
    assert.equal(text.includes(forbidden), false);
  }
});

test("request IDs are server-generated through the dependency boundary", async () => {
  const { dependencies } = fixtureDependencies();
  dependencies.createRequestId = () => "server-generated-request";
  const actor = await verifyActorFromRequest(request({ requestId: "client-request" }), {}, dependencies);
  assert.equal(actor.request.requestId, "server-generated-request");
});

test("invalid SDK token errors remain safely classified", async () => {
  const { dependencies } = fixtureDependencies();
  dependencies.getAuth = () => ({
    verifyIdToken: async () => {
      throw { code: "auth/invalid-id-token", message: "fixture-token" };
    },
    getUser: async () => user(),
  });
  await expectCode(verifyActorFromRequest(request(), {}, dependencies), "AUTH_TOKEN_INVALID");
});
