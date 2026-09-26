import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_CONTRACT,
  G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
  buildG2BRecoveryPathCredentialRefreshArtifacts,
  continueG2BRecoveryPathAfterRefresh,
  createG2BRecoveryPathCredentialRefreshExecutor,
  inspectG2BRecoveryPathCredentialRefreshContext,
  verifyG2BRecoveryPathCredentialRefreshArtifacts,
} from "../authority-audit/g2bRecoveryPathCredentialRefresh.mjs";

const expired = Object.freeze({
  ok: true, state: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED", configuredIdentityContextResolved: true,
  credentialStoreRecordResolved: true, credentialObjectLoad: "PASS", cachedAccessTokenPresent: true,
  credentialExpiryMetadataPresent: true, credentialExpiryParseValid: true, credentialExpiryRelativeState: "EXPIRED",
  freshnessMarginSeconds: 120, credentialRecordMatchesConfiguredContext: true,
  credentialRecordMatchesDirectMutationAuthContext: true, credentialRecordMatchesDirectDiagnosticAuthContext: true,
  physicalCalls: 0, refreshMethodInvocations: 0, networkRequests: 0, tokenEndpointCalls: 0, metadataRequests: 0,
});
const fresh = Object.freeze({ ...expired, state: "CACHED_CREDENTIAL_READY_CONFIRMED", credentialExpiryRelativeState: "FRESH" });
const ready = Object.freeze({ ok: true, state: "REFRESH_READY_TO_SEND", physicalCalls: 0 });
const recoveryArtifacts = Object.freeze({ approvalPacket: Object.freeze({
  interruptedM3Generation: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981",
  recoveryUsesCurrentDirectAuthPath: true,
  recoveryCredentialRecordEqualsCurrentDirectRecord: true,
  recoveryAuthContextEqualsCurrentDirectContext: true,
}) });
const localTransport = (readiness = expired, preparation = ready) => ({
  readLocalCachedCredentialReadiness: async () => readiness,
  prepareDirectContextCredentialRefresh: async () => preparation,
});

const contextInspection = await inspectG2BRecoveryPathCredentialRefreshContext({ transport: localTransport() });
assert.equal(contextInspection.ok, true);
assert.equal(contextInspection.remoteOperations, 0);
assert.equal(contextInspection.refreshRecordEqualsCurrentDirectRecord, true);
assert.equal(contextInspection.refreshRecordEqualsRecoveryAuthRecord, true);
assert.equal((await inspectG2BRecoveryPathCredentialRefreshContext({ transport: localTransport(expired, { ...ready, physicalCalls: 1 }) })).ok, false);

const artifacts = buildG2BRecoveryPathCredentialRefreshArtifacts({ contextInspection, recoveryArtifacts });
assert.equal(verifyG2BRecoveryPathCredentialRefreshArtifacts(artifacts, { contextInspection, recoveryArtifacts }).ok, true);
assert.equal(artifacts.runtimeCapability.totalPhysicalRemoteRefreshCallsMax, 1);
assert.equal(artifacts.executionComposite.recoveryPacketBindsCredentialState, false);
const tampered = structuredClone(artifacts);
tampered.runtimeCapability.automaticRefreshRetries = 1;
assert.equal(verifyG2BRecoveryPathCredentialRefreshArtifacts(tampered, { contextInspection, recoveryArtifacts }).ok, false);

const calls = [];
const executionTransport = {
  executeDirectContextCredentialRefresh: async () => { calls.push("REFRESH"); return { ok: true, state: "REFRESH_SUCCESS_CONFIRMED", physicalCalls: 1 }; },
};
const executor = createG2BRecoveryPathCredentialRefreshExecutor();
assert.equal((await executor.execute({ enabled: true, authorizationPreconditionEstablished: true, transport: executionTransport })).code, "RECOVERY_PATH_REFRESH_APPROVAL_NOT_CONSUMED");
const result = await executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, transport: executionTransport, postRefreshLocalContinuation: async () => ({ ok: true, recoveryPacketAfterRefresh: "STILL_VALID" }) });
assert.equal(result.refreshResult, "REFRESH_SUCCESS_CONFIRMED");
assert.equal(result.counters.totalPhysicalRemoteRefreshCalls, 1);
assert.deepEqual(calls, ["REFRESH"]);
assert.equal((await executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, transport: executionTransport })).code, "RECOVERY_PATH_REFRESH_DISABLED");

const failed = createG2BRecoveryPathCredentialRefreshExecutor();
const failedResult = await failed.execute({
  enabled: true,
  authorizationPreconditionEstablished: true,
  consumeApproval: async () => true,
  transport: { executeDirectContextCredentialRefresh: async () => ({ ok: false, code: "REFRESH_TIMEOUT", physicalCalls: 1 }) },
});
assert.equal(failedResult.refreshResult, "REFRESH_INDETERMINATE");
assert.equal(failedResult.counters.retries, 0);
assert.equal(failed.snapshot().approvalConsumed, true);

const thrown = createG2BRecoveryPathCredentialRefreshExecutor();
const thrownResult = await thrown.execute({
  enabled: true,
  authorizationPreconditionEstablished: true,
  consumeApproval: async () => true,
  transport: { executeDirectContextCredentialRefresh: async () => { throw new Error("timeout"); } },
});
assert.equal(thrownResult.refreshResult, "REFRESH_INDETERMINATE");
assert.equal(thrownResult.counters.secondRefreshRequest, 0);

assert.equal((await continueG2BRecoveryPathAfterRefresh({ transport: localTransport(fresh), recoveryArtifacts, verifyRecoveryPacket: () => ({ ok: true }) })).recoveryPacketAfterRefresh, "STILL_VALID");
assert.equal((await continueG2BRecoveryPathAfterRefresh({ transport: localTransport(fresh), recoveryArtifacts, verifyRecoveryPacket: () => ({ ok: false }) })).recoveryPacketAfterRefresh, "SUPERSEDED");
assert.equal((await continueG2BRecoveryPathAfterRefresh({ transport: localTransport(expired), recoveryArtifacts, verifyRecoveryPacket: () => ({ ok: true }) })).recoveryPacketAfterRefresh, "SUPERSEDED");
assert.match(G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE, /^[0-9a-f-]{36}$/);
assert.equal(G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_CONTRACT.totalPhysicalRemoteRefreshCallsMax, 1);
assert.equal(G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_CONTRACT.recoveryIamReadsMax, 0);
assert.equal(artifacts.implementation.rawAccessTokenPersisted, false);
assert.equal(artifacts.implementation.rawRefreshTokenPersisted, false);
assert.equal(artifacts.implementation.rawCredentialPersisted, false);
assert.equal(artifacts.implementation.rawAuthorizationHeaderPersisted, false);
assert.equal(artifacts.implementation.rawRequestBodyPersisted, false);
assert.equal(artifacts.implementation.rawResponseBodyPersisted, false);
void mkdtempSync(join(tmpdir(), "g2b-recovery-path-refresh-"));
console.log("G2B recovery-path credential refresh authority matrix passed; local fixtures only; remote operations=0");
