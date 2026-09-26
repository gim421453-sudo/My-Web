import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  G2B_EXACT_PERMISSION,
  G2B_EXACT_PERMISSION_CONTRACT,
  G2B_EXACT_PERMISSION_RESOURCE,
  G2B_EXACT_PERMISSION_RESOURCE_ALIAS,
  G2B_PERMISSION_RESULT_DOMAIN,
} from "./g2bExactPermissionDiagnosticContract.mjs";
import { sha256Canonical } from "./g2bM3ResolvedStoreFixedLiveEvidence.mjs";

export const G2B_EXACT_PERMISSION_DIAGNOSTIC_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-EXACT-SERVICE-ACCOUNT-PERMISSION-DIAGNOSTIC-V2";
export const G2B_BOUND_M3_OPERATION_GENERATION = "ac1c8343-5837-4a75-ad55-c93ac320f937";

const LOCAL_DEPENDENCIES = Object.freeze([
  "tools/authority-audit/g2bExactPermissionDiagnosticContract.mjs",
  "tools/authority-audit/g2bExactPermissionAuthTransport.mjs",
  "tools/authority-audit/g2b_exact_permission_transport.py",
  "tools/authority-audit/g2bExactPermissionDiagnosticExecutor.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/invokeWindowsExecutable.ps1",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bM3ResolvedStoreFixedLiveEvidence.mjs",
  "tools/authority-audit/g2bExactPermissionDiagnosticPacket.mjs",
  "tools/authority-audit-tests/g2bExactPermissionDiagnosticExecutor.test.mjs",
  "tools/authority-audit-tests/g2bExactPermissionDiagnosticPacket.test.mjs",
]);

const SDK_DEPENDENCIES = Object.freeze([
  ["CLOUD_SDK_BUNDLED_PYTHON", "platform/bundledpython/python.exe"],
  ["CLOUD_SDK_CREDENTIAL_STORE", "lib/googlecloudsdk/core/credentials/store.py"],
  ["CLOUD_SDK_CREDENTIAL_DB", "lib/googlecloudsdk/core/credentials/creds.py"],
  ["CLOUD_SDK_ACTIVE_ACCOUNT_PROPERTIES", "lib/googlecloudsdk/core/properties.py"],
  ["CLOUD_SDK_IAM_V1_CLIENT", "lib/googlecloudsdk/generated_clients/apis/iam/v1/iam_v1_client.py"],
  ["CLOUD_SDK_IAM_V1_MESSAGES", "lib/googlecloudsdk/generated_clients/apis/iam/v1/iam_v1_messages.py"],
  ["CLOUD_SDK_APITOOLS_BASE_API", "lib/third_party/apitools/base/py/base_api.py"],
  ["CLOUD_SDK_APITOOLS_HTTP_WRAPPER", "lib/third_party/apitools/base/py/http_wrapper.py"],
  ["CLOUD_SDK_SERVICE_ACCOUNT_TEST_EXAMPLE", "lib/googlecloudsdk/command_lib/compute/user_permission_troubleshooter.py"],
]);

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function sdkRoot(environment) {
  const localAppData = environment?.LOCALAPPDATA;
  if (typeof localAppData !== "string" || !localAppData) throw new Error("cloud-sdk-root-unavailable");
  return join(localAppData, "Google", "Cloud SDK", "google-cloud-sdk");
}

function localLocks(repositoryRoot) {
  return Object.freeze(LOCAL_DEPENDENCIES.map((path) => Object.freeze({ path, sha256: sha256File(resolve(repositoryRoot, path)) })));
}

function sdkLocks(environment) {
  const root = sdkRoot(environment);
  return Object.freeze(SDK_DEPENDENCIES.map(([id, path]) => Object.freeze({ id, logicalPath: `cloud-sdk/${path}`, sha256: sha256File(join(root, ...path.split("/"))) })));
}

export function buildG2BExactPermissionDiagnosticArtifacts({ repositoryRoot = process.cwd(), environment = process.env } = {}) {
  const sourceLockManifest = Object.freeze({
    schema: "myweb.g2b.exact-permission-diagnostic-source-lock.v1",
    stage: G2B_EXACT_PERMISSION_DIAGNOSTIC_STAGE,
    localDependencies: localLocks(repositoryRoot),
    sdkDependencies: sdkLocks(environment),
    activeTransitiveDependencyCount: LOCAL_DEPENDENCIES.length + SDK_DEPENDENCIES.length,
    unboundDependencies: 0,
    unboundRemoteCapabilities: 0,
    unboundProcessCapabilities: 0,
  });

  const implementation = Object.freeze({
    schema: "myweb.g2b.exact-permission-diagnostic-implementation.v1",
    stage: G2B_EXACT_PERMISSION_DIAGNOSTIC_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    exactPermissionDerivation: "PROVEN",
    mutationApiSurface: "iam.projects.serviceAccounts",
    mutationMethod: "SetIamPolicy",
    mutationResourceType: "ServiceAccount",
    exactMutationRequiredPermission: G2B_EXACT_PERMISSION,
    permissionDerivationEvidence: Object.freeze([
      "CURRENT_G2B_MUTATION_USES_SERVICE_ACCOUNT_ADD_IAM_POLICY_BINDING",
      "IAM_V1_SERVICE_ACCOUNT_SET_IAM_POLICY_METHOD_ID",
      "PRIOR_EXACT_SAME_RESOURCE_PERMISSION_DIAGNOSTIC_CONTRACT",
    ]),
    testIamPermissionsSupported: true,
    testIamPermissionsResourceForm: G2B_EXACT_PERMISSION_CONTRACT.resourceForm,
    requestContract: Object.freeze({ resource: "exact service-account resource", permissions: Object.freeze([G2B_EXACT_PERMISSION]) }),
    responseContract: G2B_EXACT_PERMISSION_CONTRACT.responseSemantics,
    executorBound: true,
    requestBuilderBound: true,
    responseParserBound: true,
    authTransportBound: true,
    privacyGuardBound: true,
    classifierBound: true,
    safeFailureMetadataBound: true,
    transportSchema: "myweb.g2b.exact-permission-transport.v2",
    correctedDiagnosticCallReachable: true,
    historicalV1RetryAllowed: false,
    historicalV1ReplayAllowed: false,
    cachedCredentialOnly: true,
    credentialRefreshBlocked: true,
    resultDomain: G2B_PERMISSION_RESULT_DOMAIN,
  });

  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.exact-permission-diagnostic-runtime-capability.v1",
    stage: G2B_EXACT_PERMISSION_DIAGNOSTIC_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    targetResource: G2B_EXACT_PERMISSION_RESOURCE,
    targetAlias: G2B_EXACT_PERMISSION_RESOURCE_ALIAS,
    permissions: Object.freeze([G2B_EXACT_PERMISSION]),
    graph: Object.freeze([
      Object.freeze({ id: "LOCAL_CACHED_CREDENTIAL_RESOLUTION", remote: false, max: 1, refreshAllowed: false }),
      Object.freeze({ id: "EXACT_SERVICE_ACCOUNT_TEST_IAM_PERMISSIONS", remote: true, max: 1, predecessor: "LOCAL_CACHED_CREDENTIAL_RESOLUTION=FRESH" }),
    ]),
    safeFailureMetadata: Object.freeze([
      "failureStage",
      "httpStatusClass",
      "httpStatusCodeSafe",
      "transportExceptionClassSafe",
      "safeProviderErrorIdentifier",
      "timeout",
    ]),
    safeFailureStages: Object.freeze([
      "BEFORE_HTTP_SEND",
      "DURING_HTTP_SEND",
      "AFTER_HTTP_RESPONSE",
      "RESPONSE_HANDLING",
      "PROCESS_OR_TRANSPORT_TERMINATION",
    ]),
    opAMax: 0,
    iamPolicyReadsMax: 0,
    projectIamReadsMax: 0,
    testIamPermissionsCallsMax: 1,
    cloudLoggingReadsMax: 0,
    otherRemoteReadsMax: 0,
    totalPhysicalRemoteDiagnosticCallsMax: 1,
    iamMutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreMax: 0,
    serviceAccountTokenGenerationMax: 0,
    serviceAccountKeyOperationsMax: 0,
    retries: 0,
    rollbacks: 0,
    secondDiagnosticCallWithinApproval: 0,
  });

  const executionComposite = Object.freeze({
    schema: "myweb.g2b.exact-permission-diagnostic-execution-composite.v1",
    stage: G2B_EXACT_PERMISSION_DIAGNOSTIC_STAGE,
    boundM3OperationGeneration: G2B_BOUND_M3_OPERATION_GENERATION,
    currentM3State: "CONFIRMED_ABSENT_AFTER_RESOLVEDSTORE_FIXED_INDETERMINATE_MUTATION",
    recoveryExecutionEvidenceSha256: "0db8f9d3d6307cd519b0cc4c2fc0ef955287bd83009bf0b8cd9c4b6fc96fe74e",
    recoveryResultDocumentSha256: "8998bc5f40f4a42730c1c119639ed43a2e884425f9f1396ab85cd824b868750d",
    recoveryAnchorEvidenceSha256: "b063fb36de707548505e6c0defb878af12158107df3489730f376357f39d24da",
    supersededDiagnosticPacketSha256: "20da3c1b0c5816dff7c68c6765d8343120b11ab421cb8eb050f4ad90e70498c4",
    consumedHistoricalDiagnosticPacketSha256: "34891d23ee91160cb1f83f5084917ba21ab0b3a94bc5ebaf0e1f5be8dbe974b8",
    historicalDiagnosticExecutionEvidenceSha256: "d191beb25c9be2f134c2b0f2f7709b664337286774a6e29afa7809ebe526ed33",
    historicalDiagnosticResultDocumentSha256: "b3d062f437a0832c2d303216232d0775be5900d72467d4b081139fc676fc1a65",
    targetResource: G2B_EXACT_PERMISSION_RESOURCE,
    exactPermission: G2B_EXACT_PERMISSION,
    permissionCount: 1,
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    resultDomain: G2B_PERMISSION_RESULT_DOMAIN,
    privacy: Object.freeze({ rawCallerPrincipalPersisted: false, rawCredentialPersisted: false, rawResponsePersisted: false, rawOutputPersisted: false }),
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_EXACT_SERVICE_ACCOUNT_TEST_IAM_PERMISSIONS_CALL_BEGINS",
    historicalV1RetryAllowed: false,
    historicalV1ReplayAllowed: false,
    correctedV2DiagnosticCallReachable: true,
  });

  const unsignedPacket = {
    schema: "myweb.g2b.exact-permission-diagnostic-approval.v1",
    stage: G2B_EXACT_PERMISSION_DIAGNOSTIC_STAGE,
    type: "M3_PROVIDER_PROCESS_EXACT_PERMISSION_READ_ONLY_DIAGNOSTIC_WITH_BOUNDED_FAILURE_OBSERVABILITY",
    status: "PASS",
    targetResource: G2B_EXACT_PERMISSION_RESOURCE,
    targetRole: "roles/iam.serviceAccountTokenCreator",
    boundM3OperationGeneration: G2B_BOUND_M3_OPERATION_GENERATION,
    exactMutationRequiredPermission: G2B_EXACT_PERMISSION,
    diagnosticPermissionCount: 1,
    diagnosticResourceScope: "EXACT_G2B_WRITER_SERVICE_ACCOUNT",
    supersedesConsumedDiagnosticPacketSha256: "34891d23ee91160cb1f83f5084917ba21ab0b3a94bc5ebaf0e1f5be8dbe974b8",
    v1RetryAllowed: false,
    v1ReplayAllowed: false,
    v1PacketReusable: false,
    correctedV2TestIamPermissionsCallReachable: true,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    executionCompositeSha256: sha256Canonical(executionComposite),
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_EXACT_SERVICE_ACCOUNT_TEST_IAM_PERMISSIONS_CALL_BEGINS",
    testIamPermissionsCallsMax: 1,
    iamPolicyReadsMax: 0,
    projectIamReadsMax: 0,
    cloudLoggingReadsMax: 0,
    otherRemoteReadsMax: 0,
    totalPhysicalRemoteDiagnosticCallsMax: 1,
    mutations: 0,
    iamMutations: 0,
    m3Mutations: 0,
    m4Mutations: 0,
    firestoreAllowed: false,
    accessTokenGenerationAllowed: false,
    serviceAccountKeyAllowed: false,
    retries: 0,
    rollbacks: 0,
    secondDiagnosticCallWithinV2Approval: 0,
    rawMemberPersisted: false,
    rawCallerPrincipalPersisted: false,
    rawCredentialPersisted: false,
    packetComplete: true,
    safeToContinueWithoutApproval: false,
  };
  const packet = Object.freeze({ ...unsignedPacket, diagnosticApprovalPacketSha256: sha256Canonical(unsignedPacket) });
  return Object.freeze({ sourceLockManifest, implementation, runtimeCapability, executionComposite, packet });
}

export function verifyG2BExactPermissionDiagnosticArtifacts(artifacts, options = {}) {
  let expected;
  try { expected = buildG2BExactPermissionDiagnosticArtifacts(options); }
  catch { return Object.freeze({ ok: false, code: "EXACT_PERMISSION_PACKET_BUILD_FAILURE" }); }
  const ok = JSON.stringify(artifacts) === JSON.stringify(expected);
  return Object.freeze({ ok, code: ok ? "EXACT_PERMISSION_PACKET_MATCH" : "EXACT_PERMISSION_PACKET_MISMATCH" });
}

export const G2B_EXACT_PERMISSION_PACKET_CONTRACT = Object.freeze({
  remoteOperationsDuringBuild: 0,
  processSpawnDuringBuild: false,
  packetComplete: true,
  safeToContinueWithoutApproval: false,
});
