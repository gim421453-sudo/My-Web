import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  buildG2BRecoveryV2CredentialRefreshArtifacts,
  createG2BRecoveryV2CredentialRefreshExecutor,
  G2B_RECOVERY_V2_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
  inspectG2BRecoveryV2CredentialRefreshContext,
  verifyG2BRecoveryV2CredentialRefreshArtifacts,
  writeG2BRecoveryV2CredentialRefreshArtifacts,
} from "../authority-audit/g2bRecoveryV2CredentialRefreshPreparation.mjs";
import {
  G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE,
} from "../authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "../authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "../authority-audit/g2bDirectCachedCredentialReadiness.mjs";

const expiredReadiness = Object.freeze({
  ok: false,
  result: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED",
  credentialExpiryRelativeState: "EXPIRED",
  freshnessMarginSeconds: 120,
  networkRequests: 0,
  refreshMethodInvocations: 0,
});
const recoveryArtifacts = Object.freeze({
  approvalPacket: Object.freeze({
    type: "M3_GENERATION_BOUND_READ_ONLY_RECOVERY_V2",
    operationInstance: G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE,
    parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    recoveryCredentialRecordEqualsCurrentDirectRecord: true,
    recoveryAuthContextEqualsCurrentDirectContext: true,
  }),
});
const recoveryVerification = Object.freeze({ ok: true });

const fakeTransport = Object.freeze({
  readLocalCachedCredentialReadiness: async () => Object.freeze({
    ok: true,
    state: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED",
    physicalCalls: 0,
    configuredIdentityContextResolved: true,
    credentialStoreRecordResolved: true,
    credentialObjectLoad: "READY",
    cachedAccessTokenPresent: true,
    credentialExpiryMetadataPresent: true,
    credentialExpiryParseValid: true,
    credentialExpiryRelativeState: "EXPIRED",
    freshnessMarginSeconds: 120,
  }),
});

const inspection = await inspectG2BRecoveryV2CredentialRefreshContext({ transport: fakeTransport });
assert.equal(inspection.ok, true);
assert.equal(inspection.remoteOperations, 0);
assert.equal(inspection.credentialRefreshCalls, 0);
assert.equal(inspection.readiness.result, expiredReadiness.result);
assert.equal(inspection.readiness.credentialExpiryRelativeState, expiredReadiness.credentialExpiryRelativeState);
assert.equal(inspection.readiness.freshnessMarginSeconds, expiredReadiness.freshnessMarginSeconds);
assert.equal(inspection.readiness.networkRequests, 0);
assert.equal(inspection.readiness.refreshMethodInvocations, 0);

const artifacts = buildG2BRecoveryV2CredentialRefreshArtifacts({
  contextInspection: inspection,
  recoveryArtifacts,
  recoveryVerification,
});
assert.equal(artifacts.approvalPacket.operationInstance, G2B_RECOVERY_V2_CREDENTIAL_REFRESH_OPERATION_INSTANCE);
assert.equal(artifacts.approvalPacket.credentialRefreshCallsMax, 1);
assert.equal(artifacts.approvalPacket.recoveryIamReadsMax, 0);
assert.equal(artifacts.approvalPacket.iamMutationsMax, 0);
assert.equal(verifyG2BRecoveryV2CredentialRefreshArtifacts(artifacts, {
  contextInspection: inspection,
  recoveryArtifacts,
  recoveryVerification,
}).ok, true);

const tampered = structuredClone(artifacts);
tampered.approvalPacket.credentialRefreshCallsMax = 2;
assert.equal(verifyG2BRecoveryV2CredentialRefreshArtifacts(tampered, {
  contextInspection: inspection,
  recoveryArtifacts,
  recoveryVerification,
}).ok, false);

for (const readiness of [
  { ...expiredReadiness, result: "CACHED_CREDENTIAL_READY_CONFIRMED", credentialExpiryRelativeState: "FRESH", ok: true },
  { ...expiredReadiness, result: "CACHED_CREDENTIAL_TOO_CLOSE_TO_EXPIRY", credentialExpiryRelativeState: "TOO_CLOSE" },
]) {
  assert.throws(() => buildG2BRecoveryV2CredentialRefreshArtifacts({
    contextInspection: { readiness },
    recoveryArtifacts,
    recoveryVerification,
  }), /recovery-v2-refresh-precondition-required/);
}

let refreshCalls = 0;
const executor = createG2BRecoveryV2CredentialRefreshExecutor();
const disabled = await executor.execute({
  transport: { executeDirectContextCredentialRefresh: async () => { refreshCalls += 1; return { ok: true }; } },
});
assert.equal(disabled.ok, false);
assert.equal(refreshCalls, 0);
assert.equal(disabled.counters.totalPhysicalRemoteRefreshCalls, 0);

const success = await executor.execute({
  enabled: true,
  authorizationPreconditionEstablished: true,
  consumeApproval: async () => true,
  transport: {
    executeDirectContextCredentialRefresh: async () => {
      refreshCalls += 1;
      return Object.freeze({ ok: true, state: "REFRESH_SUCCESS_CONFIRMED", physicalCalls: 1 });
    },
  },
});
assert.equal(success.ok, true);
assert.equal(success.counters.credentialRefreshCalls, 1);
assert.equal(success.counters.oauthTokenEndpointCalls, 1);
assert.equal(success.counters.recoveryIamReads, 0);
assert.equal(success.counters.iamMutations, 0);
assert.equal(success.counters.m4Mutations, 0);
assert.equal(success.counters.firestoreCalls, 0);
assert.equal(refreshCalls, 1);

const second = await executor.execute({
  enabled: true,
  authorizationPreconditionEstablished: true,
  consumeApproval: async () => true,
  transport: { executeDirectContextCredentialRefresh: async () => { refreshCalls += 1; return { ok: true }; } },
});
assert.equal(second.ok, false);
assert.equal(second.counters.totalPhysicalRemoteRefreshCalls, 0);
assert.equal(refreshCalls, 1);

const packetText = JSON.stringify(artifacts.approvalPacket);
assert.equal(/ya29\.|Bearer |refresh-token-value|authorization-header|request-body|response-body/i.test(packetText), false);

const copiedRoot = mkdtempSync(join(tmpdir(), "g2b-refresh-artifacts-"));
try {
  for (const path of [
    "tools/authority-audit/g2bRecoveryV2CredentialRefreshPreparation.mjs",
    "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
    "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
    "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
    "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
    "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
    "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
    "tools/authority-audit-tests/g2bRecoveryV2CredentialRefreshPreparation.test.mjs",
  ]) {
    const target = resolve(copiedRoot, path);
    cpSync(resolve(process.cwd(), path), target, { recursive: false });
  }
  const copiedArtifacts = buildG2BRecoveryV2CredentialRefreshArtifacts({
    repositoryRoot: copiedRoot,
    contextInspection: inspection,
    recoveryArtifacts,
    recoveryVerification,
  });
  const written = writeG2BRecoveryV2CredentialRefreshArtifacts(copiedArtifacts, {
    repositoryRoot: copiedRoot,
    contextInspection: inspection,
    recoveryArtifacts,
    recoveryVerification,
  });
  const sourceLock = JSON.parse(readFileSync(resolve(copiedRoot, written.paths.source), "utf8"));
  assert.equal(sourceLock.schema, "myweb.g2b.recovery-v2-credential-refresh.source-lock.v1");
} finally {
  rmSync(copiedRoot, { recursive: true, force: true });
}

console.log("G2B recovery V2 credential refresh preparation passed; fake transport only; remote operations=0");
