import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  G2B_DIRECT_CREDENTIAL_REFRESH_CONTRACT,
  G2B_DIRECT_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
  G2B_DIRECT_CREDENTIAL_REFRESH_STAGE,
  G2B_PREVIOUS_DIRECT_CREDENTIAL_REFRESH_APPROVAL_PACKET_SHA256,
} from "./g2bDirectCredentialRefresh.mjs";

const LOCAL = [
  "tools/authority-audit/g2bDirectCredentialRefresh.mjs",
  "tools/authority-audit/g2bDirectCredentialRefreshPacket.mjs",
  "tools/authority-audit/g2bDirectCredentialRefreshContinuation.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/invokeWindowsExecutable.ps1",
  "tools/authority-audit-tests/g2bDirectCredentialRefresh.test.mjs",
  "tools/authority-audit-tests/g2bDirectCredentialRefreshContinuation.test.mjs",
  "tools/authority-audit-tests/g2bDirectCachedCredentialReadiness.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicySdkContract.test.mjs",
];
const SDK = [
  ["CREDENTIAL_STORE", "lib/googlecloudsdk/core/credentials/store.py"],
  ["USER_CREDENTIAL_ADAPTER", "lib/googlecloudsdk/core/credentials/google_auth_credentials.py"],
  ["OAUTH_REQUEST_TRANSPORT", "lib/third_party/google/auth/transport/requests.py"],
  ["BUNDLED_PYTHON", "platform/bundledpython/python.exe"],
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const sha256Canonical = (value) => sha256(JSON.stringify(value));
const hashFile = (path) => sha256(readFileSync(path));
const SHA256 = /^[0-9a-f]{64}$/;

function isExpiredPreLiveReadiness(value) {
  return value?.result === "CACHED_CREDENTIAL_EXPIRED_CONFIRMED"
    && value.configuredIdentityContextResolved === true
    && value.credentialStoreRecordResolved === true
    && value.credentialObjectLoad === "PASS"
    && value.cachedAccessTokenPresent === true
    && value.credentialExpiryMetadataPresent === true
    && value.credentialExpiryParseValid === true
    && value.credentialExpiryRelativeState === "EXPIRED"
    && value.credentialRecordMatchesConfiguredContext === true
    && value.credentialRecordMatchesDirectMutationAuthContext === true
    && value.credentialRecordMatchesDirectDiagnosticAuthContext === true
    && value.remoteOperations === 0
    && value.refreshMethodInvocations === 0
    && value.networkRequests === 0;
}

function sdkRoot(environment) {
  if (typeof environment.LOCALAPPDATA !== "string" || !environment.LOCALAPPDATA) throw new Error("local-sdk-root-unavailable");
  return join(environment.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk");
}

export function buildG2BDirectCredentialRefreshArtifacts({
  repositoryRoot = process.cwd(),
  environment = process.env,
  preLiveReadiness,
} = {}) {
  if (!isExpiredPreLiveReadiness(preLiveReadiness)) throw new Error("expired-prelive-readiness-required");
  const root = sdkRoot(environment);
  const sourceLockManifest = Object.freeze({
    schema: "myweb.g2b.direct-credential-refresh-source-lock.v1",
    stage: G2B_DIRECT_CREDENTIAL_REFRESH_STAGE,
    localDependencies: Object.freeze(LOCAL.map((path) => Object.freeze({ path, sha256: hashFile(resolve(repositoryRoot, path)) }))),
    sdkDependencies: Object.freeze(SDK.map(([id, path]) => Object.freeze({ id, logicalPath: `cloud-sdk/${path}`, sha256: hashFile(join(root, ...path.split("/"))) }))),
    activeTransitiveDependencyCount: LOCAL.length + SDK.length,
    unboundDependencies: 0,
    unboundRemoteCapabilities: 0,
    unboundAuthCapabilities: 0,
  });
  const implementation = Object.freeze({
    schema: "myweb.g2b.direct-credential-refresh-implementation.v1",
    stage: G2B_DIRECT_CREDENTIAL_REFRESH_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    authPathId: "g2b-explicit-direct-set-iam-policy-cached-credential-v2",
    credentialProviderClass: "CLOUD_SDK_USER_CREDENTIAL_ADAPTER",
    refreshImplementation: "googlecloudsdk.core.credentials.google_auth_credentials.Credentials.refresh",
    refreshEndpointClass: "OAUTH_TOKEN_ENDPOINT",
    refreshHttpMethod: "POST",
    refreshStoreWriteProvider: "googlecloudsdk.core.credentials.store.Store",
    refreshTokenRotationPossible: true,
    exactCurrentRecordBinding: true,
    operationInstance: G2B_DIRECT_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
    privacySafeEvidence: true,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.direct-credential-refresh-runtime-capability.v1",
    stage: G2B_DIRECT_CREDENTIAL_REFRESH_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    credentialRefreshCallsMax: 1,
    oauthTokenEndpointCallsMax: 1,
    totalPhysicalRemoteRefreshCallsMax: 1,
    additionalHiddenRefreshRemoteCalls: 0,
    automaticRetries: 0,
    credentialStoreWritesMax: 1,
    iamCallsMax: 0,
    testIamPermissionsCallsMax: 0,
    iamMutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreCallsMax: 0,
    serviceAccountTokenGenerationMax: 0,
    serviceAccountKeyOperationsMax: 0,
    serviceAccountImpersonationMax: 0,
    browserLoginMax: 0,
    interactiveLoginMax: 0,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.direct-credential-refresh-execution-composite.v1",
    stage: G2B_DIRECT_CREDENTIAL_REFRESH_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    postRefreshPermissionDiagnosticAllowed: true,
    postRefreshPermissionDiagnosticRemoteCalls: 0,
    m3OperationReachable: false,
    safeToContinueWithoutApproval: false,
  });
  const unsigned = Object.freeze({
    schema: "myweb.g2b.direct-credential-refresh-approval.v1",
    stage: G2B_DIRECT_CREDENTIAL_REFRESH_STAGE,
    type: "CURRENT_DIRECT_CONTEXT_CREDENTIAL_REFRESH_NEW_INSTANCE",
    status: "PASS",
    operationInstance: G2B_DIRECT_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
    previousRefreshApprovalPacketSha256: G2B_PREVIOUS_DIRECT_CREDENTIAL_REFRESH_APPROVAL_PACKET_SHA256,
    previousRefreshApprovalReusable: false,
    previousDiagnosticApprovalReusableAfterRefresh: false,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    executionCompositeSha256: sha256Canonical(executionComposite),
    approvalConsumptionPoint: G2B_DIRECT_CREDENTIAL_REFRESH_CONTRACT.approvalConsumptionPoint,
    credentialRefreshCallsMax: 1,
    oauthTokenEndpointCallsMax: 1,
    totalPhysicalRemoteRefreshCallsMax: 1,
    automaticRetries: 0,
    secondRefreshRequest: 0,
    iamCallsMax: 0,
    testIamPermissionsCallsMax: 0,
    iamMutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreCallsMax: 0,
    preLiveReadiness: Object.freeze({
      result: preLiveReadiness.result,
      credentialExpiryRelativeState: preLiveReadiness.credentialExpiryRelativeState,
      freshnessMarginSeconds: preLiveReadiness.freshnessMarginSeconds,
      configuredIdentityContextResolved: true,
      credentialStoreRecordResolved: true,
      credentialObjectLoad: "PASS",
      cachedAccessTokenPresent: true,
      credentialExpiryMetadataPresent: true,
      credentialExpiryParseValid: true,
      credentialRecordMatchesConfiguredContext: true,
      credentialRecordMatchesDirectMutationAuthContext: true,
      credentialRecordMatchesDirectDiagnosticAuthContext: true,
      remoteOperations: 0,
      refreshMethodInvocations: 0,
      networkRequests: 0,
    }),
    postRefreshPermissionDiagnosticAllowed: true,
    postRefreshPermissionDiagnosticRemoteCalls: 0,
    safeToContinueWithoutApproval: false,
    packetComplete: true,
  });
  const packet = Object.freeze({ ...unsigned, currentDirectCredentialRefreshApprovalPacketSha256: sha256Canonical(unsigned) });
  return Object.freeze({ sourceLockManifest, implementation, runtimeCapability, executionComposite, packet });
}

export function verifyG2BDirectCredentialRefreshArtifacts(artifacts, options = {}) {
  try {
    if (!SHA256.test(artifacts?.packet?.previousRefreshApprovalPacketSha256 || "")) return Object.freeze({ ok: false });
    return Object.freeze({ ok: JSON.stringify(artifacts) === JSON.stringify(buildG2BDirectCredentialRefreshArtifacts({
      ...options,
      preLiveReadiness: options.preLiveReadiness || artifacts.packet.preLiveReadiness,
    })) });
  }
  catch { return Object.freeze({ ok: false }); }
}

export function writeG2BDirectCredentialRefreshArtifacts(artifacts, { repositoryRoot = process.cwd() } = {}) {
  const path = resolve(repositoryRoot, "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-direct-credential-refresh-authority-v2.json");
  mkdirSync(dirname(path), { recursive: true });
  const body = `${JSON.stringify(artifacts, null, 2)}\n`;
  writeFileSync(path, body, "utf8");
  return Object.freeze({ path: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-direct-credential-refresh-authority-v2.json", rawSha256: sha256(body) });
}
