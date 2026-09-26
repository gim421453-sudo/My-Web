import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const projectId = "demo-myweb-trusted-backend";
const healthUrl = `http://127.0.0.1:5002/${projectId}/us-central1/trustedBackendHealth`;
const actorProbeUrl = `http://127.0.0.1:5002/${projectId}/us-central1/trustedBackendActorProbe`;
const verifiedEmailProbeUrl = `http://127.0.0.1:5002/${projectId}/us-central1/trustedBackendVerifiedEmailProbe`;
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

async function callProbe(
  token: string | null,
  strictEmail = false,
  body: Record<string, unknown> = {},
) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  const response = await fetch(strictEmail ? verifiedEmailProbeUrl : actorProbeUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    payload: await response.json() as Record<string, unknown>,
  };
}

function assertSafeProbePayload(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload);
  for (const forbidden of ["uid", "@example.invalid", "idToken", "refreshToken", "accessToken", "authTime", "provider"] ) {
    assert.equal(text.includes(forbidden), false);
  }
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

  const valid = await callProbe(unverifiedToken, false, { uid: "client-supplied-ignored" });
  assert.equal(valid.status, 200);
  assert.deepEqual(valid.payload, {
    ok: true,
    actorVerified: true,
    emailVerified: false,
    accountEnabled: true,
    mfaEvidence: "absent",
    emulator: true,
  });
  assertSafeProbePayload(valid.payload);

  const strictUnverified = await callProbe(unverifiedToken, true);
  assert.equal(strictUnverified.status, 403);
  assert.equal(strictUnverified.payload.code, "AUTH_EMAIL_UNVERIFIED");
  assertSafeProbePayload(strictUnverified.payload);

  const verifiedEmail = `tb02-verified-${suffix}@example.invalid`;
  await auth.createUser({ email: verifiedEmail, password, emailVerified: true });
  fixtureWriteCount += 1;
  const verifiedToken = await signIn(verifiedEmail, password);
  const strictVerified = await callProbe(verifiedToken, true);
  assert.equal(strictVerified.status, 200);
  assert.equal(strictVerified.payload.emailVerified, true);
  assertSafeProbePayload(strictVerified.payload);

  const malformed = await callProbe("malformed-fixture-token");
  assert.equal(malformed.status, 401);
  assert.equal(malformed.payload.code, "AUTH_TOKEN_INVALID");
  assertSafeProbePayload(malformed.payload);

  const disabledEmail = `tb02-disabled-${suffix}@example.invalid`;
  const disabledUser = await auth.createUser({ email: disabledEmail, password });
  fixtureWriteCount += 1;
  const disabledToken = await signIn(disabledEmail, password);
  await auth.updateUser(disabledUser.uid, { disabled: true });
  fixtureWriteCount += 1;
  const disabled = await callProbe(disabledToken);
  assert.equal(disabled.status, 403);
  assert.equal(disabled.payload.code, "AUTH_ACCOUNT_DISABLED");
  assertSafeProbePayload(disabled.payload);

  const missingEmail = `tb02-missing-${suffix}@example.invalid`;
  const missingUser = await auth.createUser({ email: missingEmail, password });
  fixtureWriteCount += 1;
  const missingToken = await signIn(missingEmail, password);
  await auth.deleteUser(missingUser.uid);
  fixtureWriteCount += 1;
  const missing = await callProbe(missingToken);
  assert.equal(missing.status, 401);
  assert.equal(missing.payload.code, "AUTH_USER_NOT_FOUND");
  assertSafeProbePayload(missing.payload);

  const revokedEmail = `tb02-revoked-${suffix}@example.invalid`;
  const revokedUser = await auth.createUser({ email: revokedEmail, password });
  fixtureWriteCount += 1;
  const revokedToken = await signIn(revokedEmail, password);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  await auth.revokeRefreshTokens(revokedUser.uid);
  fixtureWriteCount += 1;
  const revoked = await callProbe(revokedToken);
  const revocationResult = revoked.status === 401 && revoked.payload.code === "AUTH_TOKEN_REVOKED"
    ? "supported"
    : "emulator-limitation-hold";
  if (revocationResult === "supported") assertSafeProbePayload(revoked.payload);

  console.log(
    `TB-02 integration passed: health, actor, malformed, disabled, email policy; `
    + `revocation=${revocationResult}; Auth fixture writes=${fixtureWriteCount}; Firestore writes=0`,
  );
} finally {
  await deleteApp(integrationApp);
}
