import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT, readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_INTERRUPTED_M3_GENERATION, verifyG2BGenerationBoundReadOnlyRecovery } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { inspectG2BRecoveryPathCredentialRefreshContext } from "./g2bRecoveryPathCredentialRefresh.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-SECOND-RECOVERY-PATH-CREDENTIAL-REFRESH-PREPARATION";
export const G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_TYPE =
  "RECOVERY_PATH_CURRENT_DIRECT_CONTEXT_CREDENTIAL_REFRESH_V2";
export const G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_OPERATION_INSTANCE =
  "20b435ac-c603-45f1-8fab-52b51b20c409";
export const G2B_PREVIOUS_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE =
  "3f8d2de6-f871-4a46-a2b8-a0dbf9c53a8a";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bRecoveryPathCredentialRefreshV2.mjs",
  "tools/authority-audit/g2bRecoveryPathCredentialRefresh.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit-tests/g2bRecoveryPathCredentialRefreshV2.test.mjs",
]);
const SDK_PATHS = Object.freeze([
  ["CREDENTIAL_STORE", "lib/googlecloudsdk/core/credentials/store.py"],
  ["USER_CREDENTIAL_ADAPTER", "lib/googlecloudsdk/core/credentials/google_auth_credentials.py"],
  ["OAUTH_REQUEST_TRANSPORT", "lib/third_party/google/auth/transport/requests.py"],
  ["BUNDLED_PYTHON", "platform/bundledpython/python.exe"],
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-v2-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-v2-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-v2-runtime-v1.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-v2-composite-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-v2-approval-packet-v1.json",
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hashFile = (path) => sha256(readFileSync(path));

function sdkRoot(environment) {
  if (typeof environment.LOCALAPPDATA !== "string" || !environment.LOCALAPPDATA) throw new Error("local-sdk-root-unavailable");
  return join(environment.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk");
}

function sourceLockManifest(repositoryRoot, environment) {
  const root = sdkRoot(environment);
  return Object.freeze({
    schema: "myweb.g2b.recovery-path-credential-refresh-v2.source-lock.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_STAGE,
    localDependencies: Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hashFile(resolve(repositoryRoot, path)) }))),
    sdkDependencies: Object.freeze(SDK_PATHS.map(([id, path]) => Object.freeze({
      id,
      logicalPath: `cloud-sdk/${path}`,
      sha256: hashFile(join(root, ...path.split("/"))),
    }))),
    activeTransitiveDependencyCount: SOURCE_PATHS.length + SDK_PATHS.length,
    unboundDependencies: 0,
    unboundRemoteCapabilities: 0,
    unboundAuthCapabilities: 0,
  });
}

function recoveryPacketFields(packet) {
  return packet && typeof packet === "object" && !Array.isArray(packet)
    ? Object.freeze({
      currentDirectAuthPathId: packet.currentDirectAuthPathId,
      recoveryCredentialRecordEqualsCurrentDirectRecord: packet.recoveryCredentialRecordEqualsCurrentDirectRecord,
      recoveryAuthContextEqualsCurrentDirectContext: packet.recoveryAuthContextEqualsCurrentDirectContext,
      preliveLocalCredentialReadinessRecheckRequired: packet.preliveLocalCredentialReadinessRecheckRequired,
      credentialFreshnessMarginSeconds: packet.credentialFreshnessMarginSeconds,
      interruptedM3Generation: packet.interruptedM3Generation,
      targetServiceAccount: packet.targetServiceAccount,
      targetRole: packet.targetRole,
    })
    : null;
}

function containsCredentialStateBinding(packet) {
  const prohibited = new Set([
    "accessToken", "accessTokenBytes", "cachedAccessToken", "credentialExpiry", "credentialExpiryBytes",
    "expiresAt", "expiry", "refreshOperationInstance", "refreshOperationId", "approvalExpiresAt", "expiresAtMs",
  ]);
  return Object.keys(packet || {}).some((key) => prohibited.has(key));
}

/**
 * The recovery packet is context-bound and requires a fresh local preflight;
 * it deliberately does not authorize a token value or expiration timestamp.
 */
export function adjudicateG2BUnconsumedRecoveryReadApproval({ recoveryArtifacts, recoveryVerification } = {}) {
  const packet = recoveryArtifacts?.approvalPacket;
  const fields = recoveryPacketFields(packet);
  const verificationOk = recoveryVerification?.ok === true;
  const identityBinding = fields?.currentDirectAuthPathId === G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath
    && fields.recoveryCredentialRecordEqualsCurrentDirectRecord === true
    && fields.recoveryAuthContextEqualsCurrentDirectContext === true;
  const preliveFreshness = fields?.preliveLocalCredentialReadinessRecheckRequired === true
    && fields.credentialFreshnessMarginSeconds === 120;
  const prohibitedBindingPresent = containsCredentialStateBinding(packet);
  const reusable = verificationOk && identityBinding && preliveFreshness && !prohibitedBindingPresent;
  return Object.freeze({
    ok: reusable,
    existingApprovalWasConsumed: false,
    existingRecoveryReadRemoteCalls: 0,
    explicitWallClockExpiry: false,
    bindsAccessTokenBytes: false,
    bindsCredentialExpiryBytes: false,
    bindsRefreshOperationInstance: false,
    bindsCredentialRecordIdentity: identityBinding,
    requiresPreliveFreshness: preliveFreshness,
    continuation: reusable ? "REUSABLE_IF_CONTEXT_AND_PACKET_STILL_MATCH" : "BLOCKED_UNCERTAIN",
    recoveryReadReapprovalRequired: !reusable,
    continuationAllowed: reusable,
    packetFields: fields,
    prohibitedCredentialStateBindingPresent: prohibitedBindingPresent,
  });
}

function expiredContext(value) {
  return value?.ok === true
    && value?.readiness?.result === "CACHED_CREDENTIAL_EXPIRED_CONFIRMED"
    && value?.readiness?.credentialExpiryRelativeState === "EXPIRED"
    && value?.readiness?.freshnessMarginSeconds === 120
    && value?.refreshRecordEqualsCurrentDirectRecord === true
    && value?.refreshRecordEqualsRecoveryAuthRecord === true
    && value?.recoveryAuthContextEqualsCurrentDirectContext === true
    && value?.remoteOperations === 0;
}

/** Reuses V1's local-only inspection, never its consumed operation instance. */
export async function inspectG2BRecoveryPathCredentialRefreshV2Context({ transport } = {}) {
  const inspection = await inspectG2BRecoveryPathCredentialRefreshContext({ transport });
  return Object.freeze({
    ...inspection,
    ok: expiredContext(inspection),
    code: expiredContext(inspection) ? "RECOVERY_PATH_REFRESH_V2_CONTEXT_READY" : "RECOVERY_PATH_REFRESH_V2_CONTEXT_MISMATCH",
    newOperationInstance: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_OPERATION_INSTANCE,
    previousRefreshApprovalReused: false,
  });
}

function requiredRecoveryArtifactHashes(recoveryArtifacts) {
  const artifacts = recoveryArtifacts || {};
  return Object.freeze({
    sourceLockManifestSha256: sha256Canonical(artifacts.sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(artifacts.implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(artifacts.runtimeCapability),
    executionCompositeSha256: sha256Canonical(artifacts.executionComposite),
    approvalPacketSha256: sha256Canonical(artifacts.approvalPacket),
  });
}

export function buildG2BRecoveryPathCredentialRefreshV2Artifacts({
  repositoryRoot = process.cwd(), environment = process.env, contextInspection, recoveryArtifacts, recoveryVerification,
} = {}) {
  if (!expiredContext(contextInspection)) throw new Error("recovery-path-refresh-v2-context-required");
  const adjudication = adjudicateG2BUnconsumedRecoveryReadApproval({ recoveryArtifacts, recoveryVerification });
  if (adjudication.ok !== true) throw new Error("existing-recovery-read-approval-continuity-required");
  const recoveryHashes = requiredRecoveryArtifactHashes(recoveryArtifacts);
  const sourceLock = sourceLockManifest(repositoryRoot, environment);
  const implementation = Object.freeze({
    schema: "myweb.g2b.recovery-path-credential-refresh-v2.implementation.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLock),
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    refreshRecordEqualsCurrentDirectRecord: true,
    refreshRecordEqualsRecoveryAuthRecord: true,
    recoveryCredentialRecordEqualsExistingReadApprovalRecord: true,
    recoveryAuthContextEqualsCurrentDirectContext: true,
    refreshImplementation: "googlecloudsdk.core.credentials.google_auth_credentials.Credentials.refresh",
    refreshStoreWriteProvider: "googlecloudsdk.core.credentials.store.Store",
    refreshEndpointClass: "OAUTH_TOKEN_ENDPOINT",
    refreshHttpMethod: "POST",
    implicitRefresh: false,
    alternateAccountSelection: 0,
    browserLogin: 0,
    interactiveLogin: 0,
    serviceAccountImpersonation: 0,
    serviceAccountKey: 0,
    rawAccessTokenPersisted: false,
    rawRefreshTokenPersisted: false,
    rawCredentialPersisted: false,
    rawAuthorizationHeaderPersisted: false,
    rawRequestBodyPersisted: false,
    rawResponseBodyPersisted: false,
    rawPrincipalPersisted: false,
    rawMemberPersisted: false,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.recovery-path-credential-refresh-v2.runtime-capability.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_STAGE,
    credentialRefreshCallsMax: 1,
    oauthTokenEndpointCallsMax: 1,
    totalPhysicalRemoteRefreshCallsMax: 1,
    additionalHiddenRefreshRemoteCalls: 0,
    automaticRefreshRetries: 0,
    secondRefreshRequest: 0,
    recoveryIamReadsMax: 0,
    setIamPolicyCallsMax: 0,
    iamMutationsMax: 0,
    testIamPermissionsCallsMax: 0,
    m4MutationsMax: 0,
    firestoreCallsMax: 0,
    physicalCallMaxStaticallyProvable: true,
    postRefreshContinuityIsLocalOnly: true,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.recovery-path-credential-refresh-v2.execution-composite.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_STAGE,
    operationInstance: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_OPERATION_INSTANCE,
    previousRefreshOperationInstance: G2B_PREVIOUS_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
    interruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    sourceLockManifestSha256: sha256Canonical(sourceLock),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    existingRecoveryApprovalPacketSha256: recoveryHashes.approvalPacketSha256,
    existingRecoveryReadApprovalContinuation: adjudication.continuation,
    existingRecoveryReadApprovalReapprovalRequired: adjudication.recoveryReadReapprovalRequired,
    postRefreshRule: "RECHECK_FRESHNESS_AND_ALL_EXISTING_RECOVERY_LOCKS_LOCALLY_BEFORE_CONTINUATION;_NO_RECOVERY_READ_DURING_REFRESH",
    m3OperationReachable: false,
    safeToContinueWithoutApproval: false,
  });
  const approvalPacket = Object.freeze({
    schema: "myweb.g2b.recovery-path-credential-refresh-v2.approval-packet.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_STAGE,
    type: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_TYPE,
    status: "APPROVAL_REQUIRED",
    purpose: "refresh the same current direct cached credential record before continuing the separately approved unconsumed generation-bound recovery read",
    operationInstance: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_OPERATION_INSTANCE,
    previousRefreshApprovalReused: false,
    previousRefreshOperationInstance: G2B_PREVIOUS_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
    interruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    refreshRecordEqualsCurrentDirectRecord: true,
    refreshRecordEqualsRecoveryAuthRecord: true,
    recoveryCredentialRecordEqualsExistingReadApprovalRecord: true,
    recoveryAuthContextEqualsCurrentDirectContext: true,
    existingRecoveryReadApprovalWasConsumed: false,
    existingRecoveryReadRemoteCalls: 0,
    existingRecoveryReadApprovalContinuation: adjudication.continuation,
    recoveryReadReapprovalRequired: adjudication.recoveryReadReapprovalRequired,
    existingRecoveryReadApprovalContinuationAllowed: adjudication.continuationAllowed,
    existingRecoveryApprovalHashes: recoveryHashes,
    sourceLockManifestSha256: sha256Canonical(sourceLock),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    executionCompositeSha256: sha256Canonical(executionComposite),
    approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS",
    firstRemoteOperationCannotOccurBeforeApprovalConsumption: true,
    approvalConsumptionEqualsFirstPhysicalRemoteCall: true,
    credentialRefreshCallsMax: 1,
    oauthTokenEndpointCallsMax: 1,
    totalPhysicalRemoteRefreshCallsMax: 1,
    additionalHiddenRefreshRemoteCalls: 0,
    automaticRefreshRetries: 0,
    secondRefreshRequest: 0,
    recoveryIamReadsMax: 0,
    setIamPolicyCallsMax: 0,
    iamMutationsMax: 0,
    testIamPermissionsCallsMax: 0,
    m4MutationsMax: 0,
    firestoreCallsMax: 0,
    preRefreshReadiness: Object.freeze({
      result: contextInspection.readiness.result,
      credentialExpiryRelativeState: contextInspection.readiness.credentialExpiryRelativeState,
      freshnessMarginSeconds: contextInspection.readiness.freshnessMarginSeconds,
      configuredIdentityContextResolved: true,
      credentialStoreRecordResolved: true,
      cachedAccessTokenPresent: true,
      credentialExpiryMetadataPresent: true,
      credentialExpiryParseValid: true,
      remoteOperations: 0,
      refreshMethodInvocations: 0,
      networkRequests: 0,
    }),
    postRefreshLocalContinuity: Object.freeze({
      cachedCredentialReadiness: "CACHED_CREDENTIAL_READY_CONFIRMED",
      credentialExpiryRelativeState: "FRESH",
      freshnessMarginSeconds: 120,
      recoverySourceLockManifestMatch: true,
      recoveryImplementationAttestationMatch: true,
      recoveryRuntimeCapabilityAttestationMatch: true,
      recoveryExecutionCompositeMatch: true,
      recoveryApprovalPacketMatch: true,
      recoveryPacketReproducible: true,
      recoveryPacketComplete: true,
      recoveryAnchorVerified: true,
      recoveryAnchorGenerationMatch: true,
      recoveryAnchorTargetMatch: true,
      recoveryAnchorRoleMatch: true,
      recoveryAnchorMemberMatch: true,
    }),
    privacySafeEvidence: true,
    refreshPacketReproducible: true,
    refreshPacketComplete: true,
    allRequiredLocalLocksMatch: true,
    safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ sourceLock, implementation, runtimeCapability, executionComposite, approvalPacket, adjudication });
}

export function verifyG2BRecoveryPathCredentialRefreshV2Artifacts(value, options = {}) {
  try {
    const expected = buildG2BRecoveryPathCredentialRefreshV2Artifacts(options);
    const actual = Object.freeze({
      sourceLock: value?.sourceLock,
      implementation: value?.implementation,
      runtimeCapability: value?.runtimeCapability,
      executionComposite: value?.executionComposite,
      approvalPacket: value?.approvalPacket,
    });
    const expectedArtifacts = Object.freeze({
      sourceLock: expected.sourceLock,
      implementation: expected.implementation,
      runtimeCapability: expected.runtimeCapability,
      executionComposite: expected.executionComposite,
      approvalPacket: expected.approvalPacket,
    });
    return Object.freeze({ ok: canonicalJson(actual) === canonicalJson(expectedArtifacts) });
  } catch {
    return Object.freeze({ ok: false });
  }
}

function blocked(code, counters) {
  return Object.freeze({ ok: false, code, refreshResult: "REFRESH_INDETERMINATE", counters: Object.freeze(counters) });
}

/** The V2 instance has exactly one future OAuth request and no recovery read capability. */
export function createG2BRecoveryPathCredentialRefreshV2Executor({ operationInstance = G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_OPERATION_INSTANCE } = {}) {
  let consumed = false;
  return Object.freeze({
    async execute({ enabled = false, authorizationPreconditionEstablished = false, consumeApproval, transport, postRefreshLocalContinuation } = {}) {
      const counters = { credentialRefreshCalls: 0, oauthTokenEndpointCalls: 0, totalPhysicalRemoteRefreshCalls: 0, retries: 0, secondRefreshRequest: 0, recoveryIamReads: 0, setIamPolicyCalls: 0, iamMutations: 0, testIamPermissionsCalls: 0, m4Mutations: 0, firestoreCalls: 0 };
      if (enabled !== true || authorizationPreconditionEstablished !== true || consumed
        || operationInstance !== G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_OPERATION_INSTANCE
        || typeof transport?.executeDirectContextCredentialRefresh !== "function") {
        return blocked("RECOVERY_PATH_REFRESH_V2_DISABLED", counters);
      }
      if (typeof consumeApproval !== "function") return blocked("RECOVERY_PATH_REFRESH_V2_APPROVAL_NOT_CONSUMED", counters);
      let approved = false;
      try { approved = await consumeApproval(); } catch { approved = false; }
      if (approved !== true) return blocked("RECOVERY_PATH_REFRESH_V2_APPROVAL_NOT_CONSUMED", counters);
      consumed = true;
      counters.credentialRefreshCalls = 1;
      counters.oauthTokenEndpointCalls = 1;
      counters.totalPhysicalRemoteRefreshCalls = 1;
      let result;
      try { result = await transport.executeDirectContextCredentialRefresh(); } catch { return blocked("REFRESH_INDETERMINATE", counters); }
      if (result?.ok !== true || result?.state !== "REFRESH_SUCCESS_CONFIRMED" || result?.physicalCalls !== 1) {
        return blocked("REFRESH_INDETERMINATE", counters);
      }
      let continuation = Object.freeze({ ok: false, recoveryPacketAfterRefresh: "SUPERSEDED" });
      try { continuation = await postRefreshLocalContinuation?.(); } catch { /* fail closed below */ }
      return Object.freeze({
        ok: continuation?.ok === true,
        refreshResult: "REFRESH_SUCCESS_CONFIRMED",
        recoveryPacketAfterRefresh: continuation?.recoveryPacketAfterRefresh || "SUPERSEDED",
        recoveryReadContinuationAllowed: continuation?.continuationAllowed === true,
        counters: Object.freeze(counters),
      });
    },
    snapshot: () => Object.freeze({ approvalConsumed: consumed }),
  });
}

/** This performs only local checks after a future refresh; it never reads IAM. */
export async function continueG2BRecoveryPathAfterRefreshV2({ transport, recoveryArtifacts, recoveryVerification } = {}) {
  if (!transport || typeof transport.readLocalCachedCredentialReadiness !== "function") {
    return Object.freeze({ ok: false, recoveryPacketAfterRefresh: "SUPERSEDED", recoveryIamReads: 0, remoteOperations: 0 });
  }
  let readiness;
  try { readiness = await readG2BDirectCachedCredentialReadiness({ transport }); } catch { readiness = null; }
  const fresh = readiness?.ok === true && readiness?.result === "CACHED_CREDENTIAL_READY_CONFIRMED"
    && readiness?.credentialExpiryRelativeState === "FRESH" && readiness?.freshnessMarginSeconds === 120
    && readiness?.networkRequests === 0 && readiness?.refreshMethodInvocations === 0;
  const adjudication = adjudicateG2BUnconsumedRecoveryReadApproval({ recoveryArtifacts, recoveryVerification });
  const ok = fresh && adjudication.ok === true;
  return Object.freeze({
    ok,
    recoveryPacketAfterRefresh: ok ? "STILL_VALID" : "SUPERSEDED",
    continuationAllowed: ok,
    recoveryReadReapprovalRequired: !ok,
    recoveryIamReads: 0,
    remoteOperations: 0,
  });
}

export function writeG2BRecoveryPathCredentialRefreshV2Artifacts(value, {
  repositoryRoot = process.cwd(), environment = process.env, contextInspection, recoveryArtifacts, recoveryVerification,
} = {}) {
  if (!verifyG2BRecoveryPathCredentialRefreshV2Artifacts(value, { repositoryRoot, environment, contextInspection, recoveryArtifacts, recoveryVerification }).ok) {
    throw new Error("recovery-path-refresh-v2-artifacts-not-verified");
  }
  const mapping = Object.freeze({ sourceLockManifest: "sourceLock", implementation: "implementation", runtimeCapability: "runtimeCapability", executionComposite: "executionComposite", approvalPacket: "approvalPacket" });
  const paths = {};
  for (const [output, artifact] of Object.entries(mapping)) {
    const path = resolve(repositoryRoot, OUTPUTS[output]);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value[artifact], null, 2)}\n`, "utf8");
    paths[output] = OUTPUTS[output];
  }
  return Object.freeze({
    paths: Object.freeze(paths),
    sourceLockManifestSha256: sha256Canonical(value.sourceLock),
    implementationAttestationSha256: sha256Canonical(value.implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability),
    executionCompositeSha256: sha256Canonical(value.executionComposite),
    approvalPacketSha256: sha256Canonical(value.approvalPacket),
    approvalPacketRawSha256: hashFile(resolve(repositoryRoot, OUTPUTS.approvalPacket)),
  });
}

export const G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_CONTRACT = Object.freeze({
  operationInstance: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_V2_OPERATION_INSTANCE,
  previousRefreshOperationInstance: G2B_PREVIOUS_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
  totalPhysicalRemoteRefreshCallsMax: 1,
  additionalHiddenRefreshRemoteCalls: 0,
  retries: 0,
  secondRefreshRequest: 0,
  recoveryIamReadsMax: 0,
  setIamPolicyCallsMax: 0,
  iamMutationsMax: 0,
  m4MutationsMax: 0,
  firestoreCallsMax: 0,
  approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS",
});
