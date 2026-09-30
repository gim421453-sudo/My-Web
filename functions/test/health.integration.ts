import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { VerifiedActorError } from "../src/auth/authErrors.js";
import {
  verifyActorFromRequest,
  type VerifiedActorOptions,
} from "../src/auth/verifiedActor.js";

const projectId = "demo-myweb-trusted-backend";
const functionsHost = String(process.env.FUNCTIONS_EMULATOR_HOST || "127.0.0.1:5002");
assert.match(functionsHost, /^(127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/);
const healthUrl = `http://${functionsHost}/${projectId}/us-central1/trustedBackendHealth`;
const authHost = String(process.env.FIREBASE_AUTH_EMULATOR_HOST || "");

assert.match(authHost, /^(127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/);

interface SignInResponse {
  idToken?: string;
}

async function signIn(email: string, password: string): Promise<string> {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fixture-api-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  assert.equal(response.ok, true, `Auth Emulator sign-in failed: ${response.status}`);
  const payload = await response.json() as SignInResponse;
  assert.equal(typeof payload.idToken, "string");
  assert.equal(Boolean(payload.idToken), true);
  return payload.idToken as string;
}

async function verifyWithEmulator(
  auth: Auth,
  token: string,
  options: VerifiedActorOptions = {},
  body: Record<string, unknown> = {},
) {
  return verifyActorFromRequest(
    { headers: { authorization: `Bearer ${token}` }, body },
    options,
    {
      getAuth: () => auth,
      createRequestId: () => `integration-${randomUUID()}`,
    },
  );
}

async function expectAuthCode(promise: Promise<unknown>, code: string): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.equal(error instanceof VerifiedActorError, true);
    assert.equal((error as VerifiedActorError).code, code);
    return true;
  });
}

const response = await fetch(healthUrl);
assert.equal(response.status, 200);
const payload = await response.json() as Record<string, unknown>;
assert.deepEqual(payload, {
  ok: true,
  mode: "emulator",
  demoProject: true,
  backendVersion: "tb01.0.0",
  securityContractVersion: "tb01",
});

const responseText = JSON.stringify(payload);
assert.equal(responseText.includes(projectId), false);
for (const forbidden of ["uid", "email", "token", "credential", "projectId", "FIREBASE_CONFIG"]) {
  assert.equal(responseText.includes(forbidden), false);
}

const integrationApp = initializeApp({ projectId }, `tb02-integration-${randomUUID()}`);
const auth = getAuth(integrationApp);
const suffix = randomUUID().replaceAll("-", "");
const password = `Fixture-${suffix.slice(0, 16)}!`;
let fixtureWriteCount = 0;

try {
  const unverifiedEmail = `tb02-unverified-${suffix}@example.invalid`;
  await auth.createUser({ email: unverifiedEmail, password, emailVerified: false });
  fixtureWriteCount += 1;
  const unverifiedToken = await signIn(unverifiedEmail, password);

  const valid = await verifyWithEmulator(
    auth,
    unverifiedToken,
    {},
    { uid: "client-supplied-ignored" },
  );
  assert.equal(valid.auth.tokenVerified, true);
  assert.equal(valid.auth.emailVerified, false);
  assert.equal(valid.authorizationStatus, "unresolved");
  for (const forbidden of ["systemOwner", "globalRole", "workspaceRole", "capabilities", "assignments"]) {
    assert.equal(forbidden in valid, false);
  }

  await expectAuthCode(
    verifyWithEmulator(auth, unverifiedToken, { requireEmailVerified: true }),
    "AUTH_EMAIL_UNVERIFIED",
  );

  const verifiedEmail = `tb02-verified-${suffix}@example.invalid`;
  await auth.createUser({ email: verifiedEmail, password, emailVerified: true });
  fixtureWriteCount += 1;
  const verifiedToken = await signIn(verifiedEmail, password);
  const strictVerified = await verifyWithEmulator(
    auth,
    verifiedToken,
    { requireEmailVerified: true },
  );
  assert.equal(strictVerified.auth.emailVerified, true);

  await expectAuthCode(
    verifyWithEmulator(auth, "malformed-fixture-token"),
    "AUTH_TOKEN_INVALID",
  );

  const disabledEmail = `tb02-disabled-${suffix}@example.invalid`;
  const disabledUser = await auth.createUser({ email: disabledEmail, password });
  fixtureWriteCount += 1;
  const disabledToken = await signIn(disabledEmail, password);
  await auth.updateUser(disabledUser.uid, { disabled: true });
  fixtureWriteCount += 1;
  await expectAuthCode(
    verifyWithEmulator(auth, disabledToken),
    "AUTH_ACCOUNT_DISABLED",
  );

  const missingEmail = `tb02-missing-${suffix}@example.invalid`;
  const missingUser = await auth.createUser({ email: missingEmail, password });
  fixtureWriteCount += 1;
  const missingToken = await signIn(missingEmail, password);
  await auth.deleteUser(missingUser.uid);
  fixtureWriteCount += 1;
  await expectAuthCode(
    verifyWithEmulator(auth, missingToken),
    "AUTH_USER_NOT_FOUND",
  );

  const revokedEmail = `tb02-revoked-${suffix}@example.invalid`;
  const revokedUser = await auth.createUser({ email: revokedEmail, password });
  fixtureWriteCount += 1;
  const revokedToken = await signIn(revokedEmail, password);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await auth.revokeRefreshTokens(revokedUser.uid);
  fixtureWriteCount += 1;
  await expectAuthCode(
    verifyWithEmulator(auth, revokedToken),
    "AUTH_TOKEN_REVOKED",
  );

  console.log(
    `TB-02 core integration passed: health, actor, malformed, disabled, email policy, revocation; `
    + `Auth fixture writes=${fixtureWriteCount}; Firestore reads=0; Firestore writes=0`,
  );
} finally {
  await deleteApp(integrationApp);
}
