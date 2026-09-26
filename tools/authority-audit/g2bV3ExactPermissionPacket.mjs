import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  G2B_EXACT_PERMISSION,
  G2B_EXACT_PERMISSION_RESOURCE,
  G2B_EXACT_PERMISSION_RESOURCE_ALIAS,
} from "./g2bExactPermissionDiagnosticContract.mjs";
import { sha256Canonical } from "./g2bM3ResolvedStoreFixedLiveEvidence.mjs";

export const G2B_V3_EXACT_PERMISSION_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-EXACT-SERVICE-ACCOUNT-PERMISSION-DIAGNOSTIC-V3";

const ROOT = "1de33c49d24039fc7a40cc68ed67ee357b1ea36c6678ee6fb9e1093003174f55";
const REFRESH_EXECUTION = "db4cb9357ed0794b085381e6f7567882812c330da5b4ca51e0fcb2c16a26af4a";
const REFRESH_RESULT = "485c6a5abbfcfcf764c21df4b4361988717897faf88c9f471ccac4647ba565d2";
const READY_PROOF = "f0bf0b1a3ae19ba141fdeafa7f5710fa875cb2fbac6d92d38a928927d715aeb0";
const RECOVERY = Object.freeze({
  execution: "0db8f9d3d6307cd519b0cc4c2fc0ef955287bd83009bf0b8cd9c4b6fc96fe74e",
  result: "8998bc5f40f4a42730c1c119639ed43a2e884425f9f1396ab85cd824b868750d",
  anchor: "b063fb36de707548505e6c0defb878af12158107df3489730f376357f39d24da",
});
const LOCAL = Object.freeze([
  "tools/authority-audit/g2bExactPermissionDiagnosticContract.mjs",
  "tools/authority-audit/g2bExactPermissionAuthTransport.mjs",
  "tools/authority-audit/g2b_exact_permission_transport.py",
  "tools/authority-audit/g2bExactPermissionDiagnosticExecutor.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/invokeWindowsExecutable.ps1",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bM3ResolvedStoreFixedLiveEvidence.mjs",
  "tools/authority-audit/g2bV3ExactPermissionPacket.mjs",
  "tools/authority-audit-tests/g2bExactPermissionDiagnosticExecutor.test.mjs",
  "tools/authority-audit-tests/g2bExactPermissionDiagnosticPacket.test.mjs",
  "tools/authority-audit-tests/g2bV3ExactPermissionPacket.test.mjs",
]);
const SDK = Object.freeze([
  ["BUNDLED_PYTHON", "platform/bundledpython/python.exe"],
  ["CREDENTIAL_STORE", "lib/googlecloudsdk/core/credentials/store.py"],
  ["GOOGLE_AUTH_CREDENTIAL_ADAPTER", "lib/googlecloudsdk/core/credentials/google_auth_credentials.py"],
  ["CREDENTIAL_REQUESTS_TRANSPORT", "lib/googlecloudsdk/core/credentials/requests.py"],
  ["APITOOLS_REQUESTS_TRANSPORT", "lib/googlecloudsdk/core/requests.py"],
  ["IAM_V1_CLIENT", "lib/googlecloudsdk/generated_clients/apis/iam/v1/iam_v1_client.py"],
  ["IAM_V1_MESSAGES", "lib/googlecloudsdk/generated_clients/apis/iam/v1/iam_v1_messages.py"],
  ["APITOOLS_BASE_API", "lib/third_party/apitools/base/py/base_api.py"],
]);

const hashFile = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const sdkRoot = (environment) => join(environment.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk");

function requireEvidence(repositoryRoot, relativePath, expectedHash) {
  const value = JSON.parse(readFileSync(resolve(repositoryRoot, relativePath), "utf8"));
  if (sha256Canonical(value) !== expectedHash) throw new Error("v3-evidence-hash-mismatch");
}

export function buildG2BV3ExactPermissionArtifacts({ repositoryRoot = process.cwd(), environment = process.env } = {}) {
  requireEvidence(repositoryRoot, "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-credential-refresh-execution-evidence-v1.json", REFRESH_EXECUTION);
  requireEvidence(repositoryRoot, "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-credential-refresh-result-v1.json", REFRESH_RESULT);
  requireEvidence(repositoryRoot, "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-v3-zero-network-ready-to-send-proof-v1.json", READY_PROOF);
  const root = sdkRoot(environment);
  const sourceLockManifest = Object.freeze({
    schema: "myweb.g2b.v3-exact-permission-source-lock.v1",
    stage: G2B_V3_EXACT_PERMISSION_STAGE,
    localDependencies: Object.freeze(LOCAL.map((path) => Object.freeze({ path, sha256: hashFile(resolve(repositoryRoot, path)) }))),
    sdkDependencies: Object.freeze(SDK.map(([id, path]) => Object.freeze({ id, logicalPath: `cloud-sdk/${path}`, sha256: hashFile(join(root, ...path.split("/"))) }))),
    activeTransitiveDependencyCount: LOCAL.length + SDK.length,
    unboundDependencies: 0,
    unboundRemoteCapabilities: 0,
    unboundProcessCapabilities: 0,
  });
  const implementation = Object.freeze({
    schema: "myweb.g2b.v3-exact-permission-implementation.v1",
    stage: G2B_V3_EXACT_PERMISSION_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    requestBuilder: "buildG2BExactPermissionRequest",
    responseParser: "classifyG2BExactPermissionResponse",
    transport: "Cloud SDK apitools-compatible requests transport with current credential refresh blocked",
    exactEndpointTemplate: "v1/{+resource}:testIamPermissions",
    exactHttpMethod: "POST",
    exactResourceFormat: "projects/{project}/serviceAccounts/{serviceAccountEmail}",
    freshCredentialRequired: true,
    credentialRefreshAllowed: false,
    zeroNetworkReadyProofSha256: READY_PROOF,
    privacyGuardBound: true,
    safeFailureMetadataBound: true,
  });
  const budgets = Object.freeze({
    testIamPermissionsCallsMax: 1,
    totalPhysicalRemoteDiagnosticCallsMax: 1,
    credentialRefreshCallsMax: 0,
    oauthTokenEndpointCallsMax: 0,
    iamPolicyReadsMax: 0,
    projectIamReadsMax: 0,
    cloudLoggingReadsMax: 0,
    otherRemoteReadsMax: 0,
    iamMutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreCallsMax: 0,
    serviceAccountTokenGenerationMax: 0,
    serviceAccountKeyOperationsMax: 0,
    retries: 0,
    rollbacks: 0,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.v3-exact-permission-runtime-capability.v1",
    stage: G2B_V3_EXACT_PERMISSION_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    targetResource: G2B_EXACT_PERMISSION_RESOURCE,
    targetAlias: G2B_EXACT_PERMISSION_RESOURCE_ALIAS,
    exactPermission: G2B_EXACT_PERMISSION,
    permissionCount: 1,
    ...budgets,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.v3-exact-permission-composite.v1",
    stage: G2B_V3_EXACT_PERMISSION_STAGE,
    boundM3OperationGeneration: "ac1c8343-5837-4a75-ad55-c93ac320f937",
    currentM3State: "CONFIRMED_ABSENT_AFTER_RESOLVEDSTORE_FIXED_INDETERMINATE_MUTATION",
    latestRecoveryExecutionEvidenceSha256: RECOVERY.execution,
    latestRecoveryResultDocumentSha256: RECOVERY.result,
    latestRecoveryAnchorEvidenceSha256: RECOVERY.anchor,
    localSetupRootCauseEvidenceSha256: ROOT,
    credentialRefreshExecutionEvidenceSha256: REFRESH_EXECUTION,
    credentialRefreshResultDocumentSha256: REFRESH_RESULT,
    zeroNetworkReadyProofSha256: READY_PROOF,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_EXACT_SERVICE_ACCOUNT_TEST_IAM_PERMISSIONS_CALL_BEGINS",
    safeToContinueWithoutApproval: false,
  });
  const unsigned = {
    schema: "myweb.g2b.v3-exact-permission-approval.v1",
    stage: G2B_V3_EXACT_PERMISSION_STAGE,
    type: "M3_PROVIDER_PROCESS_EXACT_PERMISSION_READ_ONLY_DIAGNOSTIC_AFTER_LOCAL_CLIENT_SETUP_RECOVERY",
    status: "PASS",
    targetResource: G2B_EXACT_PERMISSION_RESOURCE,
    targetRole: "roles/iam.serviceAccountTokenCreator",
    exactPermission: G2B_EXACT_PERMISSION,
    diagnosticPermissionCount: 1,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    executionCompositeSha256: sha256Canonical(executionComposite),
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_EXACT_SERVICE_ACCOUNT_TEST_IAM_PERMISSIONS_CALL_BEGINS",
    ...budgets,
    packetComplete: true,
    safeToContinueWithoutApproval: false,
  };
  const packet = Object.freeze({ ...unsigned, diagnosticApprovalPacketSha256: sha256Canonical(unsigned) });
  return Object.freeze({ sourceLockManifest, implementation, runtimeCapability, executionComposite, packet });
}

export function verifyG2BV3ExactPermissionArtifacts(artifacts, options = {}) {
  try {
    return Object.freeze({ ok: JSON.stringify(artifacts) === JSON.stringify(buildG2BV3ExactPermissionArtifacts(options)) });
  } catch {
    return Object.freeze({ ok: false });
  }
}
