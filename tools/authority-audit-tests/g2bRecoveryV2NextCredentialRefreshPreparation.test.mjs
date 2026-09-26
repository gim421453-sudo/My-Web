import assert from "node:assert/strict";
import {
  adjudicateG2BRecoveryV2ApprovalContinuity,
  buildG2BRecoveryV2NextRefreshArtifacts,
  createG2BRecoveryV2NextRefreshExecutor,
  G2B_RECOVERY_V2_NEXT_REFRESH_OPERATION_INSTANCE,
  inspectG2BRecoveryV2NextRefreshContext,
  verifyG2BRecoveryV2NextRefreshArtifacts,
} from "../authority-audit/g2bRecoveryV2NextCredentialRefreshPreparation.mjs";

const packet = Object.freeze({ type: "M3_GENERATION_BOUND_READ_ONLY_RECOVERY_V2", operationInstance: "883b57ff-9171-420b-b278-172e3d57fb86", parentInterruptedM3Generation: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981", existingVerifiedGenerationBoundRecoveryAnchor: true, currentDirectAuthPathId: "g2b-explicit-direct-set-iam-policy-cached-credential-v2", recoveryCredentialRecordEqualsCurrentDirectRecord: true, recoveryAuthContextEqualsCurrentDirectContext: true, preliveLocalCredentialReadinessRecheckRequired: true, credentialFreshnessMarginSeconds: 120 });
const recoveryArtifacts = Object.freeze({ sourceLockManifest: { fixture: "source" }, implementation: { fixture: "implementation" }, runtimeCapability: { fixture: "runtime" }, prospectiveSafetyEvidence: { fixture: "safety" }, executionComposite: { fixture: "composite" }, approvalPacket: packet });
const verification = Object.freeze({ ok: true });
const journal = Object.freeze({ state: "READY", record: Object.freeze({ operationInstance: "883b57ff-9171-420b-b278-172e3d57fb86", phase: "PREPARED", approvalConsumed: false, requestBoundaryEntered: false, responseObserved: false, terminalRecoveryResult: null }) });
const expired = Object.freeze({ ok: true, state: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED", physicalCalls: 0, configuredIdentityContextResolved: true, credentialStoreRecordResolved: true, credentialObjectLoad: "PASS", cachedAccessTokenPresent: true, credentialExpiryMetadataPresent: true, credentialExpiryParseValid: true, credentialExpiryRelativeState: "EXPIRED", freshnessMarginSeconds: 120 });
const transport = Object.freeze({ readLocalCachedCredentialReadiness: async () => expired, prepareDirectContextCredentialRefresh: async () => ({ ok: true, state: "REFRESH_READY_TO_SEND", physicalCalls: 0 }) });

const adjudication = adjudicateG2BRecoveryV2ApprovalContinuity({ recoveryArtifacts, recoveryVerification: verification, journal });
assert.equal(adjudication.continuation, "REUSABLE_IF_CONTEXT_PACKET_AND_JOURNAL_STILL_MATCH");
assert.equal(adjudication.approvalHasExplicitWallClockExpiry, false);
assert.equal(adjudication.bindsAccessTokenBytes, false);
assert.equal(adjudication.bindsRefreshTokenBytes, false);
assert.equal(adjudication.bindsCredentialExpiryBytes, false);
assert.equal(adjudication.bindsRefreshOperationInstance, false);
assert.equal(adjudication.bindsCredentialRecordIdentity, true);
assert.equal(adjudication.bindsAuthContext, true);
assert.equal(adjudication.requiresPreliveFreshness, true);
assert.equal(adjudicateG2BRecoveryV2ApprovalContinuity({ recoveryArtifacts, recoveryVerification: verification, journal, continuityContext: { tokenBytesChanged: true, expiryBytesChanged: true } }).continuationAllowed, true);
assert.equal(adjudicateG2BRecoveryV2ApprovalContinuity({ recoveryArtifacts, recoveryVerification: verification, journal, continuityContext: { recordIdentityMatches: false } }).continuationAllowed, false);
assert.equal(adjudicateG2BRecoveryV2ApprovalContinuity({ recoveryArtifacts, recoveryVerification: verification, journal, continuityContext: { authContextMatches: false } }).continuationAllowed, false);
assert.equal(adjudicateG2BRecoveryV2ApprovalContinuity({ recoveryArtifacts, recoveryVerification: verification, journal: { ...journal, record: { ...journal.record, approvalConsumed: true } } }).continuationAllowed, false);
assert.equal(adjudicateG2BRecoveryV2ApprovalContinuity({ recoveryArtifacts, recoveryVerification: verification, journal: { ...journal, record: { ...journal.record, phase: "APPROVAL_CONSUMED", approvalConsumed: true } } }).continuationAllowed, false);
assert.equal(adjudicateG2BRecoveryV2ApprovalContinuity({ recoveryArtifacts, recoveryVerification: verification, journal: { ...journal, record: { ...journal.record, requestBoundaryEntered: true } } }).continuationAllowed, false);

const context = await inspectG2BRecoveryV2NextRefreshContext({ transport });
assert.equal(context.ok, true); assert.equal(context.remoteOperations, 0); assert.equal(context.refreshTokenLocallyAvailable, true); assert.equal(context.refreshReadyToSend, true);
const artifacts = buildG2BRecoveryV2NextRefreshArtifacts({ contextInspection: context, recoveryArtifacts, recoveryVerification: verification, journal });
assert.equal(artifacts.approvalPacket.operationInstance, G2B_RECOVERY_V2_NEXT_REFRESH_OPERATION_INSTANCE);
assert.equal(artifacts.approvalPacket.recoveryIamReadsMax, 0);
assert.equal(verifyG2BRecoveryV2NextRefreshArtifacts(artifacts, { contextInspection: context, recoveryArtifacts, recoveryVerification: verification, journal }).ok, true);
const tampered = structuredClone(artifacts); tampered.runtimeCapability.secondRefreshRequest = 1;
assert.equal(verifyG2BRecoveryV2NextRefreshArtifacts(tampered, { contextInspection: context, recoveryArtifacts, recoveryVerification: verification, journal }).ok, false);

let calls = 0; const executor = createG2BRecoveryV2NextRefreshExecutor();
assert.equal((await executor.execute({ transport: { executeDirectContextCredentialRefresh: async () => { calls += 1; } } })).counters.totalPhysicalRemoteRefreshCalls, 0);
const result = await executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, transport: { executeDirectContextCredentialRefresh: async () => { calls += 1; return { ok: true, state: "REFRESH_SUCCESS_CONFIRMED", physicalCalls: 1 }; } } });
assert.equal(result.ok, true); assert.equal(calls, 1); assert.equal(result.counters.recoveryIamReads, 0); assert.equal(result.counters.setIamPolicyCalls, 0); assert.equal(result.counters.iamMutations, 0); assert.equal(result.counters.m4Mutations, 0); assert.equal(result.counters.firestoreCalls, 0);
assert.equal((await executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, transport: { executeDirectContextCredentialRefresh: async () => { calls += 1; } } })).counters.totalPhysicalRemoteRefreshCalls, 0);
console.log("G2B Recovery V2 next refresh continuity matrix passed; fake transport only; remote operations=0");
