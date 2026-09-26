import assert from "node:assert/strict";
import {
  createG2BDirectContextPermissionDiagnostic,
  G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT,
} from "../authority-audit/g2bDirectContextPermissionDiagnostic.mjs";

const freshReadiness = Object.freeze({
  ok: true,
  result: "CACHED_CREDENTIAL_READY_CONFIRMED",
  configuredIdentityContextResolved: true,
  credentialStoreRecordResolved: true,
  cachedAccessTokenPresent: true,
  credentialExpiryMetadataPresent: true,
  credentialExpiryParseValid: true,
  credentialExpiryRelativeState: "FRESH",
  freshnessMarginSeconds: 120,
  credentialRecordMatchesConfiguredContext: true,
  credentialRecordMatchesDirectMutationAuthContext: true,
  credentialRecordMatchesDirectDiagnosticAuthContext: true,
  remoteOperations: 0,
  networkRequests: 0,
  refreshMethodInvocations: 0,
});

function fakeTransport(result = { ok: true, state: "PERMISSION_PRESENT_CONFIRMED" }) {
  const calls = [];
  return {
    calls,
    prepareDirectContextPermissionDiagnostic: async () => { calls.push("READY"); return { ok: true, state: "READY_TO_SEND" }; },
    executeDirectContextPermissionDiagnostic: async () => { calls.push("TEST"); return result; },
  };
}

const presentTransport = fakeTransport();
const present = createG2BDirectContextPermissionDiagnostic({ transport: presentTransport });
assert.deepEqual(await present.prepare(), { ready: true });
const blocked = await present.execute({ enabled: true });
assert.equal(blocked.result, "DIAGNOSTIC_REQUEST_NOT_STARTED");
assert.deepEqual(presentTransport.calls, ["READY"]);
const missingPreLive = await present.execute({ enabled: true, consumeApproval: async () => true });
assert.equal(missingPreLive.result, "DIAGNOSTIC_PRELIVE_CREDENTIAL_NOT_READY");
assert.deepEqual(presentTransport.calls, ["READY"]);
const declined = await present.execute({ enabled: true, preLiveReadinessCheck: async () => freshReadiness, consumeApproval: async () => false });
assert.equal(declined.result, "DIAGNOSTIC_REQUEST_NOT_STARTED");
assert.deepEqual(presentTransport.calls, ["READY"]);
const ordering = [];
const presentResult = await present.execute({ enabled: true,
  preLiveReadinessCheck: async () => { ordering.push("PRELIVE"); return freshReadiness; },
  consumeApproval: async () => { ordering.push("APPROVAL"); return true; },
});
assert.equal(presentResult.result, "PERMISSION_PRESENT_CONFIRMED");
assert.equal(presentResult.counters.testIamPermissionsCalls, 1);
assert.deepEqual(ordering, ["PRELIVE", "APPROVAL"]);
assert.deepEqual(presentTransport.calls, ["READY", "TEST"]);
assert.equal((await present.execute({ enabled: true, preLiveReadinessCheck: async () => freshReadiness, consumeApproval: async () => true })).result, "DIAGNOSTIC_REQUEST_NOT_STARTED");

for (const [value, expected] of [
  [{ ok: true, state: "PERMISSION_ABSENT_CONFIRMED" }, "PERMISSION_ABSENT_CONFIRMED"],
  [{ ok: false, code: "DIRECT_CONTEXT_DIAGNOSTIC_AUTH_FAILURE" }, "DIAGNOSTIC_AUTH_FAILURE"],
  [{ ok: false, code: "DIRECT_TRANSPORT_FAILURE" }, "DIAGNOSTIC_TRANSPORT_FAILURE"],
  [{ ok: false, code: "DIRECT_TRANSPORT_PARSE_FAILURE" }, "DIAGNOSTIC_PARSE_FAILURE"],
  [{ ok: false, code: "DIRECT_CONTEXT_DIAGNOSTIC_REQUEST_FAILURE" }, "DIAGNOSTIC_REQUEST_FAILURE"],
  [{ ok: false, code: "DIRECT_TRANSPORT_TIMEOUT" }, "DIAGNOSTIC_TIMEOUT"],
  [{ ok: false, code: "DIRECT_CONTEXT_DIAGNOSTIC_REQUEST_FAILURE", failureMetadata: { safeProviderErrorIdentifier: "HTTP_401" } }, "DIAGNOSTIC_AUTH_FAILURE"],
  [{ ok: false, code: "DIRECT_CONTEXT_DIAGNOSTIC_REQUEST_FAILURE", failureMetadata: { safeProviderErrorIdentifier: "HTTP_403" } }, "DIAGNOSTIC_AUTH_FAILURE"],
  [{ ok: false, code: "DIRECT_CONTEXT_DIAGNOSTIC_REQUEST_FAILURE", failureMetadata: { safeProviderErrorIdentifier: "HTTP_404" } }, "DIAGNOSTIC_REQUEST_FAILURE"],
  [{ ok: false, code: "DIRECT_CONTEXT_DIAGNOSTIC_REQUEST_FAILURE", failureMetadata: { safeProviderErrorIdentifier: "HTTP_500" } }, "DIAGNOSTIC_PROVIDER_FAILURE"],
  [{ ok: false, code: "DIRECT_TRANSPORT_PARSE_FAILURE" }, "DIAGNOSTIC_PARSE_FAILURE"],
]) {
  const diagnostic = createG2BDirectContextPermissionDiagnostic({ transport: fakeTransport(value) });
  await diagnostic.prepare();
  assert.equal((await diagnostic.execute({ enabled: true, preLiveReadinessCheck: async () => freshReadiness, consumeApproval: async () => true })).result, expected);
}

const missingTransport = createG2BDirectContextPermissionDiagnostic();
assert.deepEqual(await missingTransport.prepare(), { ready: false, code: "DIRECT_CONTEXT_BINDING_REQUIRED" });
assert.equal((await missingTransport.execute({ enabled: true, preLiveReadinessCheck: async () => freshReadiness, consumeApproval: async () => true })).counters.testIamPermissionsCalls, 0);

for (const invalidReadiness of [
  { ...freshReadiness, result: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED", ok: false, credentialExpiryRelativeState: "EXPIRED" },
  { ...freshReadiness, result: "CACHED_CREDENTIAL_TOO_CLOSE_TO_EXPIRY", ok: false, credentialExpiryRelativeState: "TOO_CLOSE_TO_EXPIRY" },
  { ...freshReadiness, networkRequests: 1 },
  { ...freshReadiness, refreshMethodInvocations: 1 },
  { ...freshReadiness, remoteOperations: 1 },
]) {
  const transport = fakeTransport();
  const diagnostic = createG2BDirectContextPermissionDiagnostic({ transport });
  await diagnostic.prepare();
  let approvalCalls = 0;
  const result = await diagnostic.execute({ enabled: true, preLiveReadinessCheck: async () => invalidReadiness, consumeApproval: async () => { approvalCalls += 1; return true; } });
  assert.equal(result.result, "DIAGNOSTIC_PRELIVE_CREDENTIAL_NOT_READY");
  assert.equal(approvalCalls, 0);
  assert.deepEqual(transport.calls, ["READY"]);
}

assert.equal(G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.testIamPermissionsCallsMax, 1);
assert.equal(G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.totalPhysicalRemoteDiagnosticCallsMax, 1);
assert.equal(G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.additionalHiddenPhysicalCalls, 0);
assert.equal(G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.preLiveCachedCredentialReadinessRequired, true);
assert.equal(G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.preLiveFreshnessMarginSeconds, 120);
assert.equal(G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.preLiveLocalFreshnessCheckOccursBeforeApprovalConsumption, true);
assert.equal(G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.firstRemoteOperationCannotOccurBeforeApprovalConsumption, true);
assert.equal(G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.approvalConsumptionMatchesFirstPhysicalRemoteCall, true);
assert.equal(G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.m3OperationReachable, false);
console.log("G2B direct-context exact permission diagnostic fake matrix passed; remote operations=0");
