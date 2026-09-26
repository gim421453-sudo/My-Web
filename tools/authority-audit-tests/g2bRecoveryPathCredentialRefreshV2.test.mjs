import assert from "node:assert/strict";
import {
  G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_CONTRACT,
  G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_OPERATION_INSTANCE,
  adjudicateG2BUnconsumedRecoveryReadApproval,
  buildG2BRecoveryPathCredentialRefreshV2Artifacts,
  continueG2BRecoveryPathAfterRefreshV2,
  createG2BRecoveryPathCredentialRefreshV2Executor,
  inspectG2BRecoveryPathCredentialRefreshV2Context,
  verifyG2BRecoveryPathCredentialRefreshV2Artifacts,
} from "../authority-audit/g2bRecoveryPathCredentialRefreshV2.mjs";

const expired = Object.freeze({
  ok: true, state: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED", configuredIdentityContextResolved: true,
  credentialStoreRecordResolved: true, credentialObjectLoad: "PASS", cachedAccessTokenPresent: true,
  credentialExpiryMetadataPresent: true, credentialExpiryParseValid: true, credentialExpiryRelativeState: "EXPIRED",
  freshnessMarginSeconds: 120, credentialRecordMatchesConfiguredContext: true,
  credentialRecordMatchesDirectMutationAuthContext: true, credentialRecordMatchesDirectDiagnosticAuthContext: true,
  physicalCalls: 0, refreshMethodInvocations: 0, networkRequests: 0, tokenEndpointCalls: 0, metadataRequests: 0,
});
const fresh = Object.freeze({ ...expired, state: "CACHED_CREDENTIAL_READY_CONFIRMED", credentialExpiryRelativeState: "FRESH" });
const refreshReady = Object.freeze({ ok: true, state: "REFRESH_READY_TO_SEND", physicalCalls: 0 });
const recoveryArtifacts = Object.freeze({
  sourceLockManifest: Object.freeze({ source: "fixture" }),
  implementation: Object.freeze({ implementation: "fixture" }),
  runtimeCapability: Object.freeze({ runtime: "fixture" }),
  executionComposite: Object.freeze({ composite: "fixture" }),
  approvalPacket: Object.freeze({
    interruptedM3Generation: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981",
    currentDirectAuthPathId: "g2b-explicit-direct-set-iam-policy-cached-credential-v2",
    recoveryCredentialRecordEqualsCurrentDirectRecord: true,
    recoveryAuthContextEqualsCurrentDirectContext: true,
    preliveLocalCredentialReadinessRecheckRequired: true,
    credentialFreshnessMarginSeconds: 120,
    targetServiceAccount: "fixture",
    targetRole: "roles/iam.serviceAccountTokenCreator",
  }),
});
const recoveryVerification = Object.freeze({ ok: true });
const localTransport = (readiness = expired, preparation = refreshReady) => ({
  readLocalCachedCredentialReadiness: async () => readiness,
  prepareDirectContextCredentialRefresh: async () => preparation,
});

const adjudication = adjudicateG2BUnconsumedRecoveryReadApproval({ recoveryArtifacts, recoveryVerification });
assert.equal(adjudication.ok, true);
assert.equal(adjudication.explicitWallClockExpiry, false);
assert.equal(adjudication.bindsAccessTokenBytes, false);
assert.equal(adjudication.bindsCredentialExpiryBytes, false);
assert.equal(adjudication.bindsRefreshOperationInstance, false);
assert.equal(adjudication.bindsCredentialRecordIdentity, true);
assert.equal(adjudication.requiresPreliveFreshness, true);
assert.equal(adjudication.continuation, "REUSABLE_IF_CONTEXT_AND_PACKET_STILL_MATCH");
assert.equal(adjudication.recoveryReadReapprovalRequired, false);

const stateBoundPacket = structuredClone(recoveryArtifacts);
stateBoundPacket.approvalPacket.expiresAt = "fixture";
assert.equal(adjudicateG2BUnconsumedRecoveryReadApproval({ recoveryArtifacts: stateBoundPacket, recoveryVerification }).continuation, "BLOCKED_UNCERTAIN");
assert.equal(adjudicateG2BUnconsumedRecoveryReadApproval({ recoveryArtifacts, recoveryVerification: { ok: false } }).continuation, "BLOCKED_UNCERTAIN");

const contextInspection = await inspectG2BRecoveryPathCredentialRefreshV2Context({ transport: localTransport() });
assert.equal(contextInspection.ok, true);
assert.equal(contextInspection.remoteOperations, 0);
assert.equal(contextInspection.previousRefreshApprovalReused, false);
assert.notEqual(contextInspection.newOperationInstance, "3f8d2de6-f871-4a46-a2b8-a0dbf9c53a8a");
assert.equal((await inspectG2BRecoveryPathCredentialRefreshV2Context({ transport: localTransport(fresh) })).ok, false);

const artifacts = buildG2BRecoveryPathCredentialRefreshV2Artifacts({ contextInspection, recoveryArtifacts, recoveryVerification });
assert.equal(verifyG2BRecoveryPathCredentialRefreshV2Artifacts(artifacts, { contextInspection, recoveryArtifacts, recoveryVerification }).ok, true);
assert.equal(artifacts.approvalPacket.previousRefreshApprovalReused, false);
assert.equal(artifacts.runtimeCapability.totalPhysicalRemoteRefreshCallsMax, 1);
assert.equal(artifacts.approvalPacket.recoveryReadReapprovalRequired, false);
const tampered = structuredClone(artifacts);
tampered.runtimeCapability.automaticRefreshRetries = 1;
assert.equal(verifyG2BRecoveryPathCredentialRefreshV2Artifacts(tampered, { contextInspection, recoveryArtifacts, recoveryVerification }).ok, false);

const calls = [];
const executor = createG2BRecoveryPathCredentialRefreshV2Executor();
assert.equal((await executor.execute({ enabled: true, authorizationPreconditionEstablished: true, transport: { executeDirectContextCredentialRefresh: async () => ({ ok: true, state: "REFRESH_SUCCESS_CONFIRMED", physicalCalls: 1 }) } })).code, "RECOVERY_PATH_REFRESH_V2_APPROVAL_NOT_CONSUMED");
const execution = await executor.execute({
  enabled: true,
  authorizationPreconditionEstablished: true,
  consumeApproval: async () => true,
  transport: { executeDirectContextCredentialRefresh: async () => { calls.push("REFRESH"); return { ok: true, state: "REFRESH_SUCCESS_CONFIRMED", physicalCalls: 1 }; } },
  postRefreshLocalContinuation: async () => ({ ok: true, recoveryPacketAfterRefresh: "STILL_VALID", continuationAllowed: true }),
});
assert.equal(execution.ok, true);
assert.equal(execution.counters.totalPhysicalRemoteRefreshCalls, 1);
assert.deepEqual(calls, ["REFRESH"]);
assert.equal((await executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, transport: {} })).code, "RECOVERY_PATH_REFRESH_V2_DISABLED");

const failed = createG2BRecoveryPathCredentialRefreshV2Executor();
const failedResult = await failed.execute({
  enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true,
  transport: { executeDirectContextCredentialRefresh: async () => ({ ok: false, physicalCalls: 1 }) },
});
assert.equal(failedResult.refreshResult, "REFRESH_INDETERMINATE");
assert.equal(failedResult.counters.retries, 0);

const continuation = await continueG2BRecoveryPathAfterRefreshV2({ transport: localTransport(fresh), recoveryArtifacts, recoveryVerification });
assert.equal(continuation.ok, true);
assert.equal(continuation.recoveryReadReapprovalRequired, false);
assert.equal(continuation.recoveryIamReads, 0);
assert.equal((await continueG2BRecoveryPathAfterRefreshV2({ transport: localTransport(expired), recoveryArtifacts, recoveryVerification })).ok, false);
assert.match(G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_OPERATION_INSTANCE, /^[0-9a-f-]{36}$/);
assert.equal(G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_CONTRACT.totalPhysicalRemoteRefreshCallsMax, 1);
assert.equal(G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_CONTRACT.recoveryIamReadsMax, 0);

console.log("G2B recovery-path credential refresh V2 authority matrix passed; local fixtures only; remote operations=0");
