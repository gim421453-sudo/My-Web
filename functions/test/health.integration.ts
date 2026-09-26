import assert from "node:assert/strict";

const projectId = "demo-myweb-trusted-backend";
const healthUrl = `http://127.0.0.1:5002/${projectId}/us-central1/trustedBackendHealth`;

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

const firestoreResponse = await fetch(
  `http://127.0.0.1:8084/v1/projects/${projectId}/databases/(default)/documents/tb01WriteProbe?pageSize=1`,
  { headers: { authorization: "Bearer owner" } },
);
assert.equal(firestoreResponse.ok, true, `Firestore Emulator read failed: ${firestoreResponse.status}`);
const firestorePayload = await firestoreResponse.json() as { documents?: unknown[] };
assert.equal(Array.isArray(firestorePayload.documents) ? firestorePayload.documents.length : 0, 0);

const authResponse = await fetch(
  `http://127.0.0.1:9098/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:query`,
  {
    method: "POST",
    headers: {
      authorization: "Bearer owner",
      "content-type": "application/json",
    },
    body: JSON.stringify({ returnUserInfo: true, maxResults: 1 }),
  },
);
assert.equal(authResponse.ok, true, `Auth Emulator read failed: ${authResponse.status}`);
const authPayload = await authResponse.json() as { users?: unknown[] };
assert.equal(Array.isArray(authPayload.users) ? authPayload.users.length : 0, 0);

console.log("TB-01 health integration passed: HTTP 200, Firestore writes 0, Auth writes 0");
