import assert from "node:assert/strict";
import {
  createG2BDirectCredentialRefresh,
  G2B_DIRECT_CREDENTIAL_REFRESH_CONTRACT,
  G2B_DIRECT_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
} from "../authority-audit/g2bDirectCredentialRefresh.mjs";

function fakeTransport(result = { ok: true, state: "REFRESH_SUCCESS_CONFIRMED" }) {
  const calls = [];
  return { calls,
    prepareDirectContextCredentialRefresh: async () => { calls.push("READY"); return { ok: true, state: "REFRESH_READY_TO_SEND" }; },
    executeDirectContextCredentialRefresh: async () => { calls.push("REFRESH"); return result; },
  };
}

const transport = fakeTransport();
const refresh = createG2BDirectCredentialRefresh({ transport });
assert.deepEqual(await refresh.prepare(), { ready: true });
assert.equal((await refresh.execute({ enabled: true })).result, "REFRESH_REQUEST_NOT_STARTED");
assert.equal((await refresh.execute({ enabled: true, consumeApproval: async () => false })).result, "REFRESH_REQUEST_NOT_STARTED");
assert.deepEqual(transport.calls, ["READY"]);
assert.equal((await refresh.execute({ enabled: true, consumeApproval: async () => true })).result, "REFRESH_SUCCESS_CONFIRMED");
assert.equal((await refresh.execute({ enabled: true, consumeApproval: async () => true })).result, "REFRESH_REQUEST_NOT_STARTED");

const stale = createG2BDirectCredentialRefresh({ transport: fakeTransport(), operationInstance: "historical-refresh-operation" });
await stale.prepare();
assert.equal((await stale.execute({ enabled: true, consumeApproval: async () => true })).result, "REFRESH_REQUEST_NOT_STARTED");
assert.match(G2B_DIRECT_CREDENTIAL_REFRESH_OPERATION_INSTANCE, /^[0-9a-f-]{36}$/);

const continuationFixture = createG2BDirectCredentialRefresh({ transport: fakeTransport() });
await continuationFixture.prepare();
const continued = await continuationFixture.execute({
  enabled: true,
  consumeApproval: async () => true,
  postRefreshLocalPreparation: async () => ({ ok: true, remoteOperations: 0 }),
});
assert.equal(continued.result, "REFRESH_SUCCESS_CONFIRMED");
assert.equal(continued.localContinuation, "POST_REFRESH_LOCAL_PREPARATION_CONFIRMED");

for (const [code, expected] of [["AUTH_FAILURE", "REFRESH_AUTH_FAILURE"], ["REQUEST_FAILURE", "REFRESH_PROVIDER_REJECTION"], ["DIRECT_TRANSPORT_FAILURE", "REFRESH_TRANSPORT_FAILURE"], ["PARSE_FAILURE", "REFRESH_MALFORMED_RESPONSE"], ["STORE_WRITE_FAILURE", "REFRESH_STORE_WRITE_FAILURE"], ["TIMEOUT", "REFRESH_TIMEOUT"]]) {
  const fixture = createG2BDirectCredentialRefresh({ transport: fakeTransport({ ok: false, code }) });
  await fixture.prepare();
  assert.equal((await fixture.execute({ enabled: true, consumeApproval: async () => true })).result, expected);
}
assert.equal(G2B_DIRECT_CREDENTIAL_REFRESH_CONTRACT.credentialRefreshCallsMax, 1);
assert.equal(G2B_DIRECT_CREDENTIAL_REFRESH_CONTRACT.totalPhysicalRemoteRefreshCallsMax, 1);
assert.equal(G2B_DIRECT_CREDENTIAL_REFRESH_CONTRACT.postRefreshPermissionDiagnosticAllowed, true);
assert.equal(G2B_DIRECT_CREDENTIAL_REFRESH_CONTRACT.postRefreshPermissionDiagnosticRemoteCalls, 0);
console.log("G2B direct credential refresh matrix passed; remote operations=0");
