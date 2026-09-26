import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT, readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE, G2B_GENERATION_BOUND_RECOVERY_V2_TYPE } from "./g2bGenerationBoundReadOnlyRecoveryV2.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_RECOVERY_V2_NEXT_REFRESH_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RECOVERY-V2-PATH-NEW-BOUNDED-CREDENTIAL-REFRESH-PREPARATION";
export const G2B_RECOVERY_V2_NEXT_REFRESH_TYPE = "M3_RECOVERY_V2_PATH_CURRENT_DIRECT_CONTEXT_CREDENTIAL_REFRESH_NEXT";
export const G2B_RECOVERY_V2_NEXT_REFRESH_OPERATION_INSTANCE = "b9869829-a6d7-476d-9376-bb5b177a2f97";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bRecoveryV2NextCredentialRefreshPreparation.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit-tests/g2bRecoveryV2NextCredentialRefreshPreparation.test.mjs",
]);
const OUTPUTS = Object.freeze({
  source: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-path-refresh-next-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-path-refresh-next-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-path-refresh-next-runtime-v1.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-path-refresh-next-composite-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-path-refresh-next-approval-packet-v1.json",
});
const hashFile = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

function expired(readiness) {
  return readiness?.result === "CACHED_CREDENTIAL_EXPIRED_CONFIRMED"
    && readiness?.credentialExpiryRelativeState === "EXPIRED" && readiness?.freshnessMarginSeconds === 120
    && readiness?.networkRequests === 0 && readiness?.refreshMethodInvocations === 0;
}

function preparedJournal(journal) {
  const record = journal?.record;
  return journal?.state === "READY" && record?.operationInstance === G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE
    && record?.phase === "PREPARED" && record?.approvalConsumed === false && record?.requestBoundaryEntered === false
    && record?.responseObserved === false && record?.terminalRecoveryResult === null;
}

function packetBinding(packet) {
  return packet?.type === G2B_GENERATION_BOUND_RECOVERY_V2_TYPE
    && packet?.operationInstance === G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE
    && packet?.parentInterruptedM3Generation === G2B_INTERRUPTED_M3_GENERATION
    && packet?.existingVerifiedGenerationBoundRecoveryAnchor === true
    && packet?.currentDirectAuthPathId === G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath
    && packet?.recoveryCredentialRecordEqualsCurrentDirectRecord === true
    && packet?.recoveryAuthContextEqualsCurrentDirectContext === true
    && packet?.preliveLocalCredentialReadinessRecheckRequired === true
    && packet?.credentialFreshnessMarginSeconds === 120;
}

function bindsCredentialBytes(packet) {
  return Object.keys(packet || {}).some((key) => /access.?token|refresh.?token|credential.*expiry|expiry.*bytes|approval.*expires|wall.?clock/i.test(key));
}

/** Approval continuity depends on immutable context, packet, and pre-remote journal state, not token bytes or an invented TTL. */
export function adjudicateG2BRecoveryV2ApprovalContinuity({ recoveryArtifacts, recoveryVerification, journal, continuityContext = {} } = {}) {
  const packet = recoveryArtifacts?.approvalPacket;
  const base = packetBinding(packet) && recoveryVerification?.ok === true && preparedJournal(journal) && !bindsCredentialBytes(packet);
  const recordMatch = continuityContext.recordIdentityMatches !== false;
  const authMatch = continuityContext.authContextMatches !== false;
  const allowed = base && recordMatch && authMatch;
  return Object.freeze({
    ok: allowed,
    approvalHasExplicitWallClockExpiry: false,
    bindsAccessTokenBytes: false,
    bindsRefreshTokenBytes: false,
    bindsCredentialExpiryBytes: false,
    bindsRefreshOperationInstance: false,
    bindsCredentialRecordIdentity: packet?.recoveryCredentialRecordEqualsCurrentDirectRecord === true,
    bindsAuthContext: packet?.recoveryAuthContextEqualsCurrentDirectContext === true,
    requiresPreliveFreshness: packet?.preliveLocalCredentialReadinessRecheckRequired === true,
    bindsOperationInstance: packet?.operationInstance === G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE,
    bindsParentInterruptedM3Generation: packet?.parentInterruptedM3Generation === G2B_INTERRUPTED_M3_GENERATION,
    bindsRecoveryAnchor: packet?.existingVerifiedGenerationBoundRecoveryAnchor === true,
    journalPrepared: preparedJournal(journal),
    tokenBytesChangedNonAuthoritative: continuityContext.tokenBytesChanged === true,
    expiryBytesChangedNonAuthoritative: continuityContext.expiryBytesChanged === true,
    continuation: allowed ? "REUSABLE_IF_CONTEXT_PACKET_AND_JOURNAL_STILL_MATCH" : "BLOCKED_UNCERTAIN",
    recoveryReadReapprovalRequired: !allowed,
    continuationAllowed: allowed,
  });
}

/** Performs only local cached-credential inspection and local refresh-request construction. */
export async function inspectG2BRecoveryV2NextRefreshContext({ transport } = {}) {
  if (!transport || typeof transport.prepareDirectContextCredentialRefresh !== "function") return Object.freeze({ ok: false, remoteOperations: 0 });
  const readiness = await readG2BDirectCachedCredentialReadiness({ transport });
  let refreshPreparation;
  try { refreshPreparation = await transport.prepareDirectContextCredentialRefresh(); } catch { refreshPreparation = null; }
  const ready = refreshPreparation?.ok === true && refreshPreparation?.state === "REFRESH_READY_TO_SEND" && refreshPreparation?.physicalCalls === 0;
  const ok = expired(readiness) && ready;
  return Object.freeze({
    ok, readiness, refreshPreparation, remoteOperations: 0, credentialRefreshCalls: 0,
    refreshRecordEqualsCurrentDirectRecord: ok, refreshRecordEqualsRecoveryV2AuthRecord: ok,
    recoveryV2AuthContextEqualsCurrentDirectContext: ok, refreshTokenLocallyAvailable: ready, refreshReadyToSend: ready,
  });
}

function sourceLock(repositoryRoot) {
  return Object.freeze({ schema: "myweb.g2b.recovery-v2-next-refresh.source-lock.v1", stage: G2B_RECOVERY_V2_NEXT_REFRESH_STAGE,
    sourceLocks: Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hashFile(resolve(repositoryRoot, path)) }))) });
}

export function buildG2BRecoveryV2NextRefreshArtifacts({ repositoryRoot = process.cwd(), contextInspection, recoveryArtifacts, recoveryVerification, journal } = {}) {
  const adjudication = adjudicateG2BRecoveryV2ApprovalContinuity({ recoveryArtifacts, recoveryVerification, journal });
  if (contextInspection?.ok !== true || adjudication.ok !== true) throw new Error("recovery-v2-next-refresh-precondition-required");
  const source = sourceLock(repositoryRoot);
  const implementation = Object.freeze({ schema: "myweb.g2b.recovery-v2-next-refresh.implementation.v1", stage: G2B_RECOVERY_V2_NEXT_REFRESH_STAGE,
    operationInstance: G2B_RECOVERY_V2_NEXT_REFRESH_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    refreshRecordEqualsCurrentDirectRecord: true, refreshRecordEqualsRecoveryV2AuthRecord: true, recoveryV2AuthContextEqualsCurrentDirectContext: true,
    previousRefreshApprovalReused: false, refreshHttpMethod: "POST", implicitRefresh: false, automaticRefreshRetries: 0, secondRefreshRequest: 0,
    alternateAccountSelection: 0, serviceAccountImpersonation: 0, serviceAccountKey: 0,
    rawAccessTokenPersisted: false, rawRefreshTokenPersisted: false, rawCredentialPersisted: false, rawAuthorizationHeaderPersisted: false, rawRequestBodyPersisted: false, rawResponseBodyPersisted: false,
  });
  const runtimeCapability = Object.freeze({ schema: "myweb.g2b.recovery-v2-next-refresh.runtime-capability.v1", stage: G2B_RECOVERY_V2_NEXT_REFRESH_STAGE,
    credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1, totalPhysicalRemoteRefreshCallsMax: 1, additionalHiddenRefreshRemoteCalls: 0,
    automaticRefreshRetries: 0, secondRefreshRequest: 0, recoveryIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0,
    projectIamReadsMax: 0, testIamPermissionsCallsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0,
  });
  const executionComposite = Object.freeze({ schema: "myweb.g2b.recovery-v2-next-refresh.execution-composite.v1", stage: G2B_RECOVERY_V2_NEXT_REFRESH_STAGE,
    operationInstance: G2B_RECOVERY_V2_NEXT_REFRESH_OPERATION_INSTANCE, sourceLockSha256: sha256Canonical(source), implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), existingRecoveryV2ApprovalPacketSha256: sha256Canonical(recoveryArtifacts.approvalPacket),
    existingUnconsumedRecoveryV2ApprovalAfterSameRecordRefresh: adjudication.continuation, recoveryV2ReapprovalRequired: adjudication.recoveryReadReapprovalRequired,
    recoveryV2ContinuationAllowedAfterFreshLocalChecks: adjudication.continuationAllowed, recoveryIamReadReachable: false, mutationReachable: false,
  });
  const approvalPacket = Object.freeze({ schema: "myweb.g2b.recovery-v2-next-refresh.approval-packet.v1", stage: G2B_RECOVERY_V2_NEXT_REFRESH_STAGE,
    type: G2B_RECOVERY_V2_NEXT_REFRESH_TYPE, status: "APPROVAL_REQUIRED", operationInstance: G2B_RECOVERY_V2_NEXT_REFRESH_OPERATION_INSTANCE,
    purpose: "one new bounded refresh of the same current direct credential record before continuing the existing unconsumed Recovery V2 read approval",
    parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, previousRefreshApprovalReused: false,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    refreshRecordEqualsCurrentDirectRecord: true, refreshRecordEqualsRecoveryV2AuthRecord: true, recoveryV2CredentialRecordEqualsExistingApprovalRecord: true, recoveryV2AuthContextEqualsCurrentDirectContext: true,
    existingRecoveryV2ApprovalContinuation: adjudication.continuation, recoveryV2ReapprovalRequired: adjudication.recoveryReadReapprovalRequired, existingRecoveryV2ApprovalContinuationAllowed: adjudication.continuationAllowed,
    approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS", credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1,
    totalPhysicalRemoteRefreshCallsMax: 1, additionalHiddenRefreshRemoteCalls: 0, automaticRefreshRetries: 0, secondRefreshRequest: 0,
    recoveryIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0, projectIamReadsMax: 0, testIamPermissionsCallsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0,
    postRefreshRecoveryV2JournalState: "PREPARED", postRefreshRecoveryV2RequestBoundaryState: "NOT_ENTERED", rawAccessTokenPersisted: false, rawRefreshTokenPersisted: false,
    rawCredentialPersisted: false, rawAuthorizationHeaderPersisted: false, rawRequestBodyPersisted: false, rawResponseBodyPersisted: false, rawPolicyPersisted: false, rawMemberPersisted: false, rawPrincipalPersisted: false, rawStdoutPersisted: false, rawStderrPersisted: false,
    sourceLockSha256: sha256Canonical(source), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), executionCompositeSha256: sha256Canonical(executionComposite),
    allRequiredLocalLocksMatch: true, refreshPacketReproducible: true, refreshPacketComplete: true, safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ source, implementation, runtimeCapability, executionComposite, approvalPacket, adjudication });
}

export function verifyG2BRecoveryV2NextRefreshArtifacts(value, options = {}) {
  try {
    const expected = buildG2BRecoveryV2NextRefreshArtifacts(options);
    const actual = Object.freeze({ source: value?.source, implementation: value?.implementation, runtimeCapability: value?.runtimeCapability, executionComposite: value?.executionComposite, approvalPacket: value?.approvalPacket });
    const canonical = Object.freeze({ source: expected.source, implementation: expected.implementation, runtimeCapability: expected.runtimeCapability, executionComposite: expected.executionComposite, approvalPacket: expected.approvalPacket });
    return Object.freeze({ ok: canonicalJson(actual) === canonicalJson(canonical) });
  } catch { return Object.freeze({ ok: false }); }
}

/** A future executor has one injected refresh capability and no recovery IAM, mutation, M4, or Firestore capability. */
export function createG2BRecoveryV2NextRefreshExecutor({ operationInstance = G2B_RECOVERY_V2_NEXT_REFRESH_OPERATION_INSTANCE } = {}) {
  let used = false;
  return Object.freeze({
    async execute({ enabled = false, authorizationPreconditionEstablished = false, consumeApproval, transport } = {}) {
      const counters = { credentialRefreshCalls: 0, oauthTokenEndpointCalls: 0, totalPhysicalRemoteRefreshCalls: 0, retries: 0, secondRefreshRequest: 0, recoveryIamReads: 0, setIamPolicyCalls: 0, iamMutations: 0, projectIamReads: 0, testIamPermissionsCalls: 0, m4Mutations: 0, firestoreCalls: 0 };
      if (enabled !== true || authorizationPreconditionEstablished !== true || used || operationInstance !== G2B_RECOVERY_V2_NEXT_REFRESH_OPERATION_INSTANCE || typeof consumeApproval !== "function" || typeof transport?.executeDirectContextCredentialRefresh !== "function") return Object.freeze({ ok: false, code: "RECOVERY_V2_NEXT_REFRESH_BOUNDARY_REQUIRED", counters: Object.freeze(counters) });
      let approved = false; try { approved = await consumeApproval(); } catch { approved = false; }
      if (approved !== true) return Object.freeze({ ok: false, code: "RECOVERY_V2_NEXT_REFRESH_APPROVAL_NOT_CONSUMED", counters: Object.freeze(counters) });
      used = true; counters.credentialRefreshCalls = 1; counters.oauthTokenEndpointCalls = 1; counters.totalPhysicalRemoteRefreshCalls = 1;
      let result; try { result = await transport.executeDirectContextCredentialRefresh(); } catch { result = null; }
      return Object.freeze({ ok: result?.ok === true && result?.state === "REFRESH_SUCCESS_CONFIRMED" && result?.physicalCalls === 1, code: result?.ok === true ? "REFRESH_SUCCESS_CONFIRMED" : "REFRESH_INDETERMINATE", counters: Object.freeze(counters) });
    }, snapshot: () => Object.freeze({ operationInstance, used }),
  });
}

export function writeG2BRecoveryV2NextRefreshArtifacts(value, { repositoryRoot = process.cwd(), contextInspection, recoveryArtifacts, recoveryVerification, journal } = {}) {
  if (!verifyG2BRecoveryV2NextRefreshArtifacts(value, { repositoryRoot, contextInspection, recoveryArtifacts, recoveryVerification, journal }).ok) throw new Error("recovery-v2-next-refresh-artifacts-invalid");
  const paths = {};
  for (const [key, relative] of Object.entries(OUTPUTS)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("recovery-v2-next-refresh-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" }); paths[key] = relative;
  }
  return Object.freeze({ paths: Object.freeze(paths), sourceLockSha256: sha256Canonical(value.source), implementationAttestationSha256: sha256Canonical(value.implementation), runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability), executionCompositeSha256: sha256Canonical(value.executionComposite), approvalPacketSha256: sha256Canonical(value.approvalPacket), approvalPacketRawSha256: hashFile(resolve(repositoryRoot, OUTPUTS.approvalPacket)) });
}
