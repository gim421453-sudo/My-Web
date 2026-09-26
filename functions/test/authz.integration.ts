import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  buildWorkspaceAuthorizationContextWithOwnerOverride,
} from "../src/authz/authorizationContext.js";
import { requireGlobalSystemOwner, requireWorkspaceRole } from "../src/authz/policies.js";
import { resolveSystemOwner } from "../src/authz/systemOwnerResolver.js";
import { resolveWorkspaceMembership } from "../src/authz/workspaceMembershipResolver.js";
import { verifyActorFromRequest } from "../src/auth/verifiedActor.js";
import {
  createAdminAuthorityDocumentReader,
  getTrustedAdminFirestore,
} from "../src/runtime/adminFirestore.js";

const projectId = "demo-myweb-trusted-backend";
const authHost = String(process.env.FIREBASE_AUTH_EMULATOR_HOST || "");
assert.match(authHost, /^(127\.0\.0\.1|localhost):[1-9][0-9]{0,4}$/);

async function signIn(email: string, password: string): Promise<string> {
  const response = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  assert.equal(response.status, 200);
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(typeof payload.idToken, "string");
  return payload.idToken as string;
}

const suffix = randomUUID();
const app = initializeApp({ projectId }, `tb03-authz-${suffix}`);
const auth = getAuth(app);
const firestore = getTrustedAdminFirestore().firestore;
const uid = `fixture-authz-${suffix}`;
const email = `fixture-authz-${suffix}@example.invalid`;
const password = "fixture-password-123";
const workspaceId = `fixture-workspace-${suffix}`;
let authFixtureWrites = 0;
let firestoreFixtureWrites = 0;
let resolverReads = 0;

try {
  await auth.createUser({ uid, email, password, emailVerified: true });
  authFixtureWrites += 1;
  const token = await signIn(email, password);
  const actor = await verifyActorFromRequest(
    { headers: { authorization: `Bearer ${token}` } },
    {},
    {
      getAuth: () => auth,
      createRequestId: () => "fixture-authz-request",
    },
  );

  await firestore.doc(`systemOwners/${uid}`).set({
    schemaVersion: 1,
    status: "active",
    source: "system_bootstrap",
  });
  firestoreFixtureWrites += 1;
  await firestore.doc(`workspaces/${workspaceId}/members/${uid}`).set({
    schemaVersion: 1,
    uid,
    workspaceId,
    role: "manager",
    status: "active",
    disabled: false,
    active: true,
    source: "system_bootstrap",
  });
  firestoreFixtureWrites += 1;

  const adminReader = createAdminAuthorityDocumentReader(firestore);
  const reader = Object.freeze({
    async getDocument(pathSegments: readonly string[]) {
      resolverReads += 1;
      return adminReader.getDocument(pathSegments);
    },
  });

  assert.equal((await resolveSystemOwner(actor, { reader })).state, "ACTIVE");
  assert.equal(
    (await resolveWorkspaceMembership(actor, workspaceId, { reader })).state,
    "ACTIVE",
  );
  const context = await buildWorkspaceAuthorizationContextWithOwnerOverride(
    actor,
    "fixture.authz",
    workspaceId,
    { reader },
  );
  assert.doesNotThrow(() => requireGlobalSystemOwner(context));
  assert.doesNotThrow(() => requireWorkspaceRole(context, ["manager"]));
  assert.equal(context.capability.resolution, "unresolved");
  assert.equal(context.assignment.resolution, "unresolved");
  assert.equal(resolverReads, 4);

  console.log(
    `TB-03 authorization integration passed; Auth fixture writes=${authFixtureWrites}; `
    + `Firestore fixture writes=${firestoreFixtureWrites}; resolver reads=${resolverReads}; business writes=0`,
  );
} finally {
  await deleteApp(app);
}
