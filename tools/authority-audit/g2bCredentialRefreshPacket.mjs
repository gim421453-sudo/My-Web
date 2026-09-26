import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { sha256Canonical } from "./g2bM3ResolvedStoreFixedLiveEvidence.mjs";

export const G2B_CREDENTIAL_REFRESH_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-AUTH-CREDENTIAL-REFRESH";
const ROOT_CAUSE_SHA256 = "1de33c49d24039fc7a40cc68ed67ee357b1ea36c6678ee6fb9e1093003174f55";
const LOCAL = [
  "tools/authority-audit/g2bM3ResolvedStoreFixedLiveEvidence.mjs",
  "tools/authority-audit/g2bCredentialRefreshTransport.mjs",
  "tools/authority-audit/g2b_credential_refresh_transport.py",
  "tools/authority-audit/g2bExactPermissionAuthTransport.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/invokeWindowsExecutable.ps1",
  "tools/authority-audit/g2bCredentialRefreshPacket.mjs",
  "tools/authority-audit-tests/g2bCredentialRefreshTransport.test.mjs",
  "tools/authority-audit-tests/g2bCredentialRefreshPacket.test.mjs",
];
const SDK = [
  ["CREDENTIAL_STORE", "lib/googlecloudsdk/core/credentials/store.py"],
  ["USER_CREDENTIAL_ADAPTER", "lib/googlecloudsdk/core/credentials/google_auth_credentials.py"],
  ["GOOGLE_AUTH_REQUEST", "lib/third_party/google/auth/transport/requests.py"],
  ["BUNDLED_PYTHON", "platform/bundledpython/python.exe"],
];
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
function sdkRoot(environment) { return join(environment.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk"); }

export function buildG2BCredentialRefreshArtifacts({ repositoryRoot = process.cwd(), environment = process.env } = {}) {
  const root = sdkRoot(environment);
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.credential-refresh-source-lock.v1", stage: G2B_CREDENTIAL_REFRESH_STAGE,
    localDependencies: Object.freeze(LOCAL.map((path) => Object.freeze({ path, sha256: hash(resolve(repositoryRoot, path)) }))),
    sdkDependencies: Object.freeze(SDK.map(([id, path]) => Object.freeze({ id, logicalPath: `cloud-sdk/${path}`, sha256: hash(join(root, ...path.split("/"))) }))),
    activeTransitiveDependencyCount: LOCAL.length + SDK.length, unboundDependencies: 0, unboundRemoteCapabilities: 0, unboundProcessCapabilities: 0 });
  const implementation = Object.freeze({ schema: "myweb.g2b.credential-refresh-implementation.v1", stage: G2B_CREDENTIAL_REFRESH_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), credentialTypeClass: "CLOUD_SDK_USER_CREDENTIAL_ADAPTER",
    refreshImplementation: "googlecloudsdk.core.credentials.google_auth_credentials.Credentials.refresh",
    refreshLibrary: "Cloud SDK bundled google-auth", refreshRequiresNetwork: true, refreshEndpointClass: "OAUTH_TOKEN_ENDPOINT", refreshHttpMethod: "POST",
    noRetryBoundary: "_TokenEndpointRequestWithRetry.__wrapped__", credentialStoreWriteAfterSuccess: true, fakeReadyPathBound: true, privacyGuardBound: true });
  const runtimeCapability = Object.freeze({ schema: "myweb.g2b.credential-refresh-runtime-capability.v1", stage: G2B_CREDENTIAL_REFRESH_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), credentialRefreshCallsMax: 1, otherRemoteAuthCallsMax: 0, totalPhysicalRemoteAuthCallsMax: 1,
    credentialStoreWritesMax: 1, testIamPermissionsCallsMax: 0, iamPolicyReadsMax: 0, projectIamReadsMax: 0, cloudLoggingReadsMax: 0,
    iamMutationsMax: 0, m3MutationsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0, serviceAccountTokenGenerationMax: 0,
    serviceAccountKeyOperationsMax: 0, browserLoginMax: 0, retries: 0, rollbacks: 0, rawTokenOutput: false, rawCredentialOutput: false });
  const executionComposite = Object.freeze({ schema: "myweb.g2b.credential-refresh-composite.v1", stage: G2B_CREDENTIAL_REFRESH_STAGE,
    rootCauseEvidenceSha256: ROOT_CAUSE_SHA256, boundM3OperationGeneration: "ac1c8343-5837-4a75-ad55-c93ac320f937",
    futurePermissionTargetAlias: "EXACT_G2B_WRITER_SERVICE_ACCOUNT", futurePermission: "iam.serviceAccounts.setIamPolicy",
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    postRefreshTestIamPermissionsAllowed: false, safeToContinueWithoutApproval: false });
  const unsigned = { schema: "myweb.g2b.credential-refresh-approval.v1", stage: G2B_CREDENTIAL_REFRESH_STAGE,
    type: "CLOUD_SDK_CREDENTIAL_REFRESH_FOR_EXACT_PERMISSION_DIAGNOSTIC", status: "PASS", currentLocalRootCause: "CLOUD_SDK_CREDENTIAL_REFRESH_REQUIRED",
    rootCauseEvidenceSha256: ROOT_CAUSE_SHA256, sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), executionCompositeSha256: sha256Canonical(executionComposite),
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_CLOUD_SDK_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS", credentialRefreshCallsMax: 1, otherRemoteAuthCallsMax: 0,
    totalPhysicalRemoteAuthCallsMax: 1, credentialStoreWritesMax: 1, testIamPermissionsCallsMax: 0, iamPolicyReadsMax: 0, projectIamReadsMax: 0, cloudLoggingReadsMax: 0,
    iamMutationsMax: 0, m3MutationsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0, serviceAccountTokenGenerationMax: 0, serviceAccountKeyOperationsMax: 0,
    retries: 0, rollbacks: 0, postRefreshTestIamPermissionsAllowed: false, safeToContinueWithoutApproval: false, packetComplete: true };
  const packet = Object.freeze({ ...unsigned, credentialRefreshApprovalPacketSha256: sha256Canonical(unsigned) });
  return Object.freeze({ sourceLockManifest, implementation, runtimeCapability, executionComposite, packet });
}

export function verifyG2BCredentialRefreshArtifacts(artifacts, options = {}) {
  try { const expected = buildG2BCredentialRefreshArtifacts(options); return Object.freeze({ ok: JSON.stringify(artifacts) === JSON.stringify(expected) }); }
  catch { return Object.freeze({ ok: false }); }
}
