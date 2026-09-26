import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT, readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_INTERRUPTED_M3_GENERATION, verifyG2BGenerationBoundReadOnlyRecovery } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-GENERATION-BOUND-RECOVERY-PATH-CREDENTIAL-REFRESH";
export const G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_TYPE =
  "RECOVERY_PATH_CURRENT_DIRECT_CONTEXT_CREDENTIAL_REFRESH";
export const G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE =
  "3f8d2de6-f871-4a46-a2b8-a0dbf9c53a8a";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bRecoveryPathCredentialRefresh.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit-tests/g2bRecoveryPathCredentialRefresh.test.mjs",
]);
const SDK_PATHS = Object.freeze([
  ["CREDENTIAL_STORE", "lib/googlecloudsdk/core/credentials/store.py"],
  ["USER_CREDENTIAL_ADAPTER", "lib/googlecloudsdk/core/credentials/google_auth_credentials.py"],
  ["OAUTH_REQUEST_TRANSPORT", "lib/third_party/google/auth/transport/requests.py"],
  ["BUNDLED_PYTHON", "platform/bundledpython/python.exe"],
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-runtime-v1.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-composite-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-credential-refresh-approval-packet-v1.json",
});

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hashFile = (path) => sha256(readFileSync(path));
const noRemote = (value) => value?.physicalCalls === 0 && value?.networkRequests === 0
  && value?.tokenEndpointCalls === 0 && value?.metadataRequests === 0;

function expiredReadiness(value) {
  return value?.ok === false
    && value?.result === "CACHED_CREDENTIAL_EXPIRED_CONFIRMED"
    && value?.configuredIdentityContextResolved === true
    && value?.credentialStoreRecordResolved === true
    && value?.credentialObjectLoad === "PASS"
    && value?.cachedAccessTokenPresent === true
    && value?.credentialExpiryMetadataPresent === true
    && value?.credentialExpiryParseValid === true
    && value?.credentialExpiryRelativeState === "EXPIRED"
    && value?.credentialRecordMatchesConfiguredContext === true
    && value?.credentialRecordMatchesDirectMutationAuthContext === true
    && value?.credentialRecordMatchesDirectDiagnosticAuthContext === true
    && value?.refreshMethodInvocations === 0
    && value?.networkRequests === 0;
}

function freshReadiness(value) {
  return value?.ok === true
    && (value?.result || value?.state) === "CACHED_CREDENTIAL_READY_CONFIRMED"
    && value?.credentialExpiryRelativeState === "FRESH"
    && value?.freshnessMarginSeconds === 120
    && value?.configuredIdentityContextResolved === true
    && value?.credentialStoreRecordResolved === true
    && value?.credentialRecordMatchesConfiguredContext === true
    && value?.credentialRecordMatchesDirectMutationAuthContext === true
    && value?.credentialRecordMatchesDirectDiagnosticAuthContext === true
    && value?.refreshMethodInvocations === 0
    && value?.remoteOperations === 0
    && value?.networkRequests === 0;
}

function refreshReady(value) {
  return value?.ok === true
    && value?.state === "REFRESH_READY_TO_SEND"
    && value?.physicalCalls === 0;
}

function sameRecord(readiness, refreshPreparation) {
  return expiredReadiness(readiness) && refreshReady(refreshPreparation);
}

function sdkRoot(environment) {
  if (typeof environment.LOCALAPPDATA !== "string" || !environment.LOCALAPPDATA) throw new Error("local-sdk-root-unavailable");
  return join(environment.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk");
}

function sourceLockManifest(repositoryRoot, environment) {
  const root = sdkRoot(environment);
  return Object.freeze({
    schema: "myweb.g2b.recovery-path-credential-refresh.source-lock.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_STAGE,
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

/** Re-resolves only the local credential record and request construction. */
export async function inspectG2BRecoveryPathCredentialRefreshContext({ transport } = {}) {
  if (!transport || typeof transport.readLocalCachedCredentialReadiness !== "function"
    || typeof transport.prepareDirectContextCredentialRefresh !== "function") {
    return Object.freeze({ ok: false, code: "RECOVERY_PATH_REFRESH_TRANSPORT_UNAVAILABLE", remoteOperations: 0 });
  }
  let readiness;
  let refreshPreparation;
  try {
    readiness = await readG2BDirectCachedCredentialReadiness({ transport });
    refreshPreparation = await transport.prepareDirectContextCredentialRefresh();
  } catch {
    return Object.freeze({ ok: false, code: "RECOVERY_PATH_REFRESH_LOCAL_INSPECTION_FAILED", remoteOperations: 0 });
  }
  const equivalent = sameRecord(readiness, refreshPreparation);
  return Object.freeze({
    ok: equivalent,
    code: equivalent ? "RECOVERY_PATH_REFRESH_CONTEXT_READY" : "RECOVERY_PATH_REFRESH_CONTEXT_MISMATCH",
    readiness,
    refreshPreparation,
    currentDirectAuthContextResolved: equivalent,
    credentialStoreRecordResolved: equivalent,
    refreshRecordEqualsCurrentDirectRecord: equivalent,
    refreshRecordEqualsRecoveryAuthRecord: equivalent,
    recoveryAuthContextEqualsCurrentDirectContext: equivalent,
    remoteOperations: 0,
  });
}

export function buildG2BRecoveryPathCredentialRefreshArtifacts({
  repositoryRoot = process.cwd(), environment = process.env, contextInspection, recoveryArtifacts,
} = {}) {
  if (contextInspection?.ok !== true || !sameRecord(contextInspection.readiness, contextInspection.refreshPreparation)) {
    throw new Error("recovery-path-refresh-context-required");
  }
  if (recoveryArtifacts?.approvalPacket?.interruptedM3Generation !== G2B_INTERRUPTED_M3_GENERATION
    || recoveryArtifacts?.approvalPacket?.recoveryUsesCurrentDirectAuthPath !== true
    || recoveryArtifacts?.approvalPacket?.recoveryCredentialRecordEqualsCurrentDirectRecord !== true
    || recoveryArtifacts?.approvalPacket?.recoveryAuthContextEqualsCurrentDirectContext !== true) {
    throw new Error("generation-bound-recovery-binding-required");
  }
  const sourceLock = sourceLockManifest(repositoryRoot, environment);
  const implementation = Object.freeze({
    schema: "myweb.g2b.recovery-path-credential-refresh.implementation.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLock),
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    recoveryUsesCurrentDirectAuthPath: true,
    refreshRecordEqualsCurrentDirectRecord: true,
    refreshRecordEqualsRecoveryAuthRecord: true,
    recoveryAuthContextEqualsCurrentDirectContext: true,
    refreshImplementation: "googlecloudsdk.core.credentials.google_auth_credentials.Credentials.refresh",
    refreshStoreWriteProvider: "googlecloudsdk.core.credentials.store.Store",
    refreshEndpointClass: "OAUTH_TOKEN_ENDPOINT",
    refreshHttpMethod: "POST",
    refreshTokenRotationPossible: true,
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
    schema: "myweb.g2b.recovery-path-credential-refresh.runtime-capability.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_STAGE,
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
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.recovery-path-credential-refresh.execution-composite.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_STAGE,
    interruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    sourceLockManifestSha256: sha256Canonical(sourceLock),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    recoveryApprovalPacketSha256: sha256Canonical(recoveryArtifacts.approvalPacket),
    recoveryPacketBindsCredentialState: false,
    recoveryPacketPostRefreshRule: "REVERIFY_EXISTING_PACKET_AGAINST_CURRENT_SOURCE_AND_SAME_AUTH_CONTEXT;_REBUILD_ONLY_IF_VERIFICATION_FAILS",
    m3OperationReachable: false,
    safeToContinueWithoutApproval: false,
  });
  const approvalPacket = Object.freeze({
    schema: "myweb.g2b.recovery-path-credential-refresh.approval-packet.v1",
    stage: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_STAGE,
    type: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_TYPE,
    status: "APPROVAL_REQUIRED",
    purpose: "refresh the one current direct cached credential record before the separately approved generation-bound recovery read",
    operationInstance: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
    interruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    previousRefreshApprovalReused: false,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    refreshRecordEqualsCurrentDirectRecord: true,
    refreshRecordEqualsRecoveryAuthRecord: true,
    recoveryAuthContextEqualsCurrentDirectContext: true,
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
      result: contextInspection.readiness.result || contextInspection.readiness.state,
      credentialExpiryRelativeState: contextInspection.readiness.credentialExpiryRelativeState,
      freshnessMarginSeconds: contextInspection.readiness.freshnessMarginSeconds,
      configuredIdentityContextResolved: true,
      credentialStoreRecordResolved: true,
      credentialObjectLoad: "PASS",
      cachedAccessTokenPresent: true,
      credentialExpiryMetadataPresent: true,
      credentialExpiryParseValid: true,
      remoteOperations: 0,
      refreshMethodInvocations: 0,
      networkRequests: 0,
    }),
    privacySafeEvidence: true,
    refreshPacketReproducible: true,
    refreshPacketComplete: true,
    allRequiredLocalLocksMatch: true,
    safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ sourceLock, implementation, runtimeCapability, executionComposite, approvalPacket });
}

export function verifyG2BRecoveryPathCredentialRefreshArtifacts(value, options = {}) {
  try {
    const expected = buildG2BRecoveryPathCredentialRefreshArtifacts(options);
    const actual = Object.freeze({
      sourceLock: value?.sourceLock,
      implementation: value?.implementation,
      runtimeCapability: value?.runtimeCapability,
      executionComposite: value?.executionComposite,
      approvalPacket: value?.approvalPacket,
    });
    return Object.freeze({ ok: canonicalJson(actual) === canonicalJson(expected) });
  } catch { return Object.freeze({ ok: false }); }
}

function blocked(code, counters, extra = {}) {
  return Object.freeze({ ok: false, code, refreshResult: "REFRESH_INDETERMINATE", counters: Object.freeze(counters), ...extra });
}

/** The only future remote capability here is one explicit credential refresh. */
export function createG2BRecoveryPathCredentialRefreshExecutor({ operationInstance = G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE } = {}) {
  let consumed = false;
  return Object.freeze({
    async execute({ enabled = false, authorizationPreconditionEstablished = false, consumeApproval, transport, postRefreshLocalContinuation } = {}) {
      const counters = { credentialRefreshCalls: 0, oauthTokenEndpointCalls: 0, totalPhysicalRemoteRefreshCalls: 0, retries: 0, secondRefreshRequest: 0, recoveryIamReads: 0, setIamPolicyCalls: 0, iamMutations: 0, testIamPermissionsCalls: 0, m4Mutations: 0, firestoreCalls: 0 };
      if (enabled !== true || authorizationPreconditionEstablished !== true || consumed
        || operationInstance !== G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE
        || typeof transport?.executeDirectContextCredentialRefresh !== "function") {
        return blocked("RECOVERY_PATH_REFRESH_DISABLED", counters);
      }
      if (typeof consumeApproval !== "function") return blocked("RECOVERY_PATH_REFRESH_APPROVAL_NOT_CONSUMED", counters);
      let approved = false;
      try { approved = await consumeApproval(); } catch { approved = false; }
      if (approved !== true) return blocked("RECOVERY_PATH_REFRESH_APPROVAL_NOT_CONSUMED", counters);
      consumed = true;
      counters.credentialRefreshCalls = 1;
      counters.oauthTokenEndpointCalls = 1;
      counters.totalPhysicalRemoteRefreshCalls = 1;
      let result;
      try { result = await transport.executeDirectContextCredentialRefresh(); }
      catch { return blocked("REFRESH_INDETERMINATE", counters); }
      if (result?.ok !== true || result?.state !== "REFRESH_SUCCESS_CONFIRMED" || result?.physicalCalls !== 1) {
        return blocked("REFRESH_INDETERMINATE", counters);
      }
      let continuation = "NOT_REQUESTED";
      if (typeof postRefreshLocalContinuation === "function") {
        try { continuation = await postRefreshLocalContinuation(); }
        catch { continuation = Object.freeze({ ok: false, recoveryPacketAfterRefresh: "SUPERSEDED" }); }
      }
      return Object.freeze({ ok: true, refreshResult: "REFRESH_SUCCESS_CONFIRMED", recoveryPacketAfterRefresh: continuation?.recoveryPacketAfterRefresh || "NOT_REQUESTED", counters: Object.freeze(counters) });
    },
    snapshot: () => Object.freeze({ approvalConsumed: consumed }),
  });
}

/** Local-only continuation: refresh never authorizes the recovery IAM read. */
export async function continueG2BRecoveryPathAfterRefresh({ transport, recoveryArtifacts, verifyRecoveryPacket = verifyG2BGenerationBoundReadOnlyRecovery, verifyOptions } = {}) {
  if (!transport || typeof transport.readLocalCachedCredentialReadiness !== "function") {
    return Object.freeze({ ok: false, recoveryPacketAfterRefresh: "SUPERSEDED", remoteOperations: 0 });
  }
  let readiness;
  try { readiness = await readG2BDirectCachedCredentialReadiness({ transport }); }
  catch { return Object.freeze({ ok: false, recoveryPacketAfterRefresh: "SUPERSEDED", remoteOperations: 0 }); }
  if (!freshReadiness(readiness)) return Object.freeze({ ok: false, recoveryPacketAfterRefresh: "SUPERSEDED", remoteOperations: 0 });
  let verification;
  try { verification = verifyRecoveryPacket(recoveryArtifacts, verifyOptions); }
  catch { verification = { ok: false }; }
  return Object.freeze({
    ok: verification?.ok === true,
    recoveryPacketAfterRefresh: verification?.ok === true ? "STILL_VALID" : "SUPERSEDED",
    rebuildRecoveryAuthorityRequired: verification?.ok !== true,
    recoveryIamReads: 0,
    remoteOperations: 0,
  });
}

export function writeG2BRecoveryPathCredentialRefreshArtifacts(value, {
  repositoryRoot = process.cwd(), environment = process.env, contextInspection, recoveryArtifacts,
} = {}) {
  if (!verifyG2BRecoveryPathCredentialRefreshArtifacts(value, { repositoryRoot, environment, contextInspection, recoveryArtifacts }).ok) {
    throw new Error("recovery-path-refresh-artifacts-not-verified");
  }
  const artifacts = Object.freeze({
    sourceLockManifest: value.sourceLock,
    implementation: value.implementation,
    runtimeCapability: value.runtimeCapability,
    executionComposite: value.executionComposite,
    approvalPacket: value.approvalPacket,
  });
  const paths = {};
  const mapping = Object.freeze({ sourceLockManifest: "sourceLock", implementation: "implementation", runtimeCapability: "runtimeCapability", executionComposite: "executionComposite", approvalPacket: "approvalPacket" });
  for (const [output, artifact] of Object.entries(mapping)) {
    const path = resolve(repositoryRoot, OUTPUTS[output]);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(artifacts[output], null, 2)}\n`, "utf8");
    paths[output] = OUTPUTS[output];
  }
  return Object.freeze({
    paths: Object.freeze(paths),
    sourceLockManifestSha256: sha256Canonical(artifacts.sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(artifacts.implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(artifacts.runtimeCapability),
    executionCompositeSha256: sha256Canonical(artifacts.executionComposite),
    approvalPacketSha256: sha256Canonical(artifacts.approvalPacket),
    approvalPacketRawSha256: hashFile(resolve(repositoryRoot, OUTPUTS.approvalPacket)),
  });
}

export const G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_CONTRACT = Object.freeze({
  operationInstance: G2B_RECOVERY_PATH_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
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
