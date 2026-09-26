import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT,
  G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_STAGE,
} from "./g2bDirectContextPermissionDiagnostic.mjs";

const LOCAL = [
  "tools/authority-audit/g2bDirectContextPermissionDiagnostic.mjs",
  "tools/authority-audit/g2bDirectContextPermissionDiagnosticPacket.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/invokeWindowsExecutable.ps1",
  "tools/authority-audit-tests/g2bDirectContextPermissionDiagnostic.test.mjs",
  "tools/authority-audit-tests/g2bDirectContextPermissionDiagnosticPacket.test.mjs",
  "tools/authority-audit-tests/g2bDirectCachedCredentialReadiness.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicySdkContract.test.mjs",
];

const SDK = [
  ["CREDENTIAL_STORE", "lib/googlecloudsdk/core/credentials/store.py"],
  ["USER_CREDENTIAL_ADAPTER", "lib/googlecloudsdk/core/credentials/google_auth_credentials.py"],
  ["CREDENTIAL_REQUEST_WRAPPER", "lib/googlecloudsdk/core/credentials/requests.py"],
  ["CORE_REQUEST_SESSION", "lib/googlecloudsdk/core/requests.py"],
  ["CLOUD_SDK_PROPERTIES", "lib/googlecloudsdk/core/properties.py"],
  ["OAUTH_REQUEST_TRANSPORT", "lib/third_party/google/auth/transport/requests.py"],
  ["IAM_V1_CLIENT", "lib/googlecloudsdk/generated_clients/apis/iam/v1/iam_v1_client.py"],
  ["IAM_V1_MESSAGES", "lib/googlecloudsdk/generated_clients/apis/iam/v1/iam_v1_messages.py"],
  ["API_TOOLS_ENCODING", "lib/third_party/apitools/base/py/encoding_helper.py"],
  ["BUNDLED_PYTHON", "platform/bundledpython/python.exe"],
];

const REFRESH_EXECUTION_EVIDENCE = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-direct-credential-refresh-execution-evidence-v1.json";
const REFRESH_RESULT_DOCUMENT = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-direct-credential-refresh-result-v1.json";
const OUTPUT = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-direct-context-exact-permission-authority-v3.json";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const sha256Canonical = (value) => sha256(JSON.stringify(value));
const hashFile = (path) => sha256(readFileSync(path));

function sdkRoot(environment) {
  if (typeof environment.LOCALAPPDATA !== "string" || !environment.LOCALAPPDATA) throw new Error("local-sdk-root-unavailable");
  return join(environment.LOCALAPPDATA, "Google", "Cloud SDK", "google-cloud-sdk");
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function refreshEvidence(repositoryRoot) {
  const executionPath = resolve(repositoryRoot, REFRESH_EXECUTION_EVIDENCE);
  const resultPath = resolve(repositoryRoot, REFRESH_RESULT_DOCUMENT);
  const execution = readJson(executionPath);
  const result = readJson(resultPath);
  if (execution.refreshResult !== "REFRESH_SUCCESS_CONFIRMED"
    || execution.credentialStoreWriteResult !== "SUCCESS_CONFIRMED"
    || execution.credentialRefreshCallsUsed !== 1
    || execution.oauthTokenEndpointCallsUsed !== 1
    || execution.totalPhysicalRemoteRefreshCallsUsed !== 1
    || execution.additionalHiddenRefreshRemoteCalls !== 0
    || execution.automaticRefreshRetries !== 0
    || execution.testIamPermissionsCalls !== 0
    || execution.iamPolicyReads !== 0
    || execution.iamMutations !== 0
    || execution.m3Mutations !== 0
    || execution.m4Mutations !== 0
    || execution.firestoreCalls !== 0
    || result.refreshResult !== "REFRESH_SUCCESS_CONFIRMED"
    || result.currentCachedCredentialReadiness !== "CACHED_CREDENTIAL_READY_CONFIRMED"
    || result.credentialCurrentlyAcceptableForDiagnostic !== true
    || result.permissionDiagnosticExecuted !== false) {
    throw new Error("refresh-evidence-contract-invalid");
  }
  return Object.freeze({
    executionEvidencePath: REFRESH_EXECUTION_EVIDENCE,
    executionEvidenceSha256: hashFile(executionPath),
    secondExecutionEvidenceSha256: hashFile(executionPath),
    resultDocumentPath: REFRESH_RESULT_DOCUMENT,
    resultDocumentSha256: hashFile(resultPath),
  });
}

function refreshBinding(value, repositoryRoot) {
  if (!value) return refreshEvidence(repositoryRoot);
  const sha = /^[0-9a-f]{64}$/;
  if (value.operationInstance !== "a5a8a69c-6b99-4670-a47d-53d435b3bab7"
    || !sha.test(value.executionEvidenceSha256 || "")
    || !sha.test(value.resultDocumentSha256 || "")
    || typeof value.executionEvidencePath !== "string" || typeof value.resultDocumentPath !== "string") {
    throw new Error("refresh-binding-contract-invalid");
  }
  return Object.freeze({
    executionEvidencePath: value.executionEvidencePath,
    executionEvidenceSha256: value.executionEvidenceSha256,
    secondExecutionEvidenceSha256: value.executionEvidenceSha256,
    resultDocumentPath: value.resultDocumentPath,
    resultDocumentSha256: value.resultDocumentSha256,
    operationInstance: value.operationInstance,
  });
}

export function buildG2BDirectContextPermissionDiagnosticArtifacts({ repositoryRoot = process.cwd(), environment = process.env, refreshBinding: suppliedRefreshBinding } = {}) {
  const root = sdkRoot(environment);
  const refresh = refreshBinding(suppliedRefreshBinding, repositoryRoot);
  const sourceLockManifest = Object.freeze({
    schema: "myweb.g2b.direct-context-exact-permission-source-lock.v2",
    stage: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_STAGE,
    localDependencies: Object.freeze(LOCAL.map((path) => Object.freeze({ path, sha256: hashFile(resolve(repositoryRoot, path)) }))),
    sdkDependencies: Object.freeze(SDK.map(([id, path]) => Object.freeze({ id, logicalPath: `cloud-sdk/${path}`, sha256: hashFile(join(root, ...path.split("/"))) }))),
    activeTransitiveDependencyCount: LOCAL.length + SDK.length,
    unboundDependencies: 0,
    unboundRemoteCapabilities: 0,
    unboundAuthCapabilities: 0,
  });
  const implementation = Object.freeze({
    schema: "myweb.g2b.direct-context-exact-permission-implementation.v2",
    stage: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    authPathId: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.authPathId,
    currentCredentialRecordBinding: "CLOUD_SDK_CONFIGURED_ACCOUNT_STORE_RECORD",
    sameCredentialRecordAsDirectMutation: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticCredentialRecordEqualsDirectMutationRecord,
    sameCredentialRecordAsDiagnostic: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.refreshedRecordEqualsDirectDiagnosticRecord,
    diagnosticCredentialRecordEqualsDirectMutationRecord: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticCredentialRecordEqualsDirectMutationRecord,
    diagnosticAuthContextEqualsDirectMutationAuthContext: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticAuthContextEqualsDirectMutationAuthContext,
    diagnosticCredentialSourceEqualsDirectMutationCredentialSource: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticCredentialSourceEqualsDirectMutationCredentialSource,
    diagnosticConfigurationContextEqualsDirectMutationConfigurationContext: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticConfigurationContextEqualsDirectMutationConfigurationContext,
    diagnosticProjectContextEqualsDirectMutationProjectContext: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticProjectContextEqualsDirectMutationProjectContext,
    refreshedRecordEqualsDirectMutationRecord: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.refreshedRecordEqualsDirectMutationRecord,
    refreshedRecordEqualsDirectDiagnosticRecord: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.refreshedRecordEqualsDirectDiagnosticRecord,
    authContext: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.authContext,
    credentialSource: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.credentialSource,
    configurationContext: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.configurationContext,
    projectContext: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.projectContext,
    serviceMethod: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.serviceMethod,
    requestMethod: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.requestMethod,
    targetResource: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.targetResource,
    requiredPermission: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.exactPermission,
    permissionCount: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.permissionCount,
    oldV3PermissionResultReusable: false,
    privacySafeEvidence: true,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.direct-context-exact-permission-runtime-capability.v2",
    stage: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    cachedCredentialRequired: true,
    implicitRefreshBlocked: true,
    authRefreshRemoteCallsMax: 0,
    tokenExchangeRemoteCallsMax: 0,
    oauthTokenEndpointCallsMax: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.oauthTokenEndpointCallsMax,
    tokenGenerationMax: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.tokenGenerationMax,
    discoveryRemoteCallsMax: 0,
    metadataRemoteCallsMax: 0,
    testIamPermissionsCallsMax: 1,
    totalPhysicalRemoteDiagnosticCallsMax: 1,
    additionalHiddenPhysicalCalls: 0,
    automaticRetries: 0,
    iamPolicyReadsMax: 0,
    projectIamReadsMax: 0,
    iamMutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreCallsMax: 0,
    credentialRefreshCallsMax: 0,
    serviceAccountTokenGenerationMax: 0,
    serviceAccountKeyOperationsMax: 0,
    serviceAccountImpersonationMax: 0,
    cloudLoggingReadsMax: 0,
    extraPermissionsRequested: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.extraPermissionsRequested,
    projectWideDiagnostic: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.projectWideDiagnostic,
    preLiveCachedCredentialReadinessRequired: true,
    preLiveFreshnessMarginSeconds: 120,
    preLiveReadinessNetworkRequests: 0,
    preLiveReadinessRefreshRequests: 0,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.direct-context-exact-permission-execution-composite.v2",
    stage: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    refreshExecutionEvidenceSha256: refresh.executionEvidenceSha256,
    refreshResultDocumentSha256: refresh.resultDocumentSha256,
    preLiveLocalFreshnessCheckOccursBeforeApprovalConsumption: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.preLiveLocalFreshnessCheckOccursBeforeApprovalConsumption,
    firstRemoteOperationCannotOccurBeforeApprovalConsumption: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.firstRemoteOperationCannotOccurBeforeApprovalConsumption,
    approvalConsumptionMatchesFirstPhysicalRemoteCall: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.approvalConsumptionMatchesFirstPhysicalRemoteCall,
    m3OperationReachable: false,
    safeToContinueWithoutApproval: false,
  });
  const unsigned = Object.freeze({
    schema: "myweb.g2b.direct-context-exact-permission-approval.v2",
    stage: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_STAGE,
    type: "DIRECT_CONTEXT_EXACT_PERMISSION_DIAGNOSTIC",
    status: "PASS",
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    executionCompositeSha256: sha256Canonical(executionComposite),
    ...refresh,
    targetResource: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.targetResource,
    requiredPermission: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.exactPermission,
    permissionCount: 1,
    authPathId: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.authPathId,
    diagnosticCredentialRecordEqualsDirectMutationRecord: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticCredentialRecordEqualsDirectMutationRecord,
    diagnosticAuthContextEqualsDirectMutationAuthContext: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticAuthContextEqualsDirectMutationAuthContext,
    diagnosticCredentialSourceEqualsDirectMutationCredentialSource: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticCredentialSourceEqualsDirectMutationCredentialSource,
    diagnosticConfigurationContextEqualsDirectMutationConfigurationContext: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticConfigurationContextEqualsDirectMutationConfigurationContext,
    diagnosticProjectContextEqualsDirectMutationProjectContext: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.diagnosticProjectContextEqualsDirectMutationProjectContext,
    refreshedRecordEqualsDirectMutationRecord: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.refreshedRecordEqualsDirectMutationRecord,
    refreshedRecordEqualsDirectDiagnosticRecord: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.refreshedRecordEqualsDirectDiagnosticRecord,
    approvalConsumptionPoint: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.approvalConsumptionPoint,
    preLiveCachedCredentialReadinessRequired: true,
    preLiveFreshnessMarginSeconds: 120,
    preLiveReadinessNetworkRequests: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.preLiveReadinessNetworkRequests,
    preLiveReadinessRefreshRequests: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.preLiveReadinessRefreshRequests,
    preLiveLocalFreshnessCheckOccursBeforeApprovalConsumption: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.preLiveLocalFreshnessCheckOccursBeforeApprovalConsumption,
    firstRemoteOperationCannotOccurBeforeApprovalConsumption: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.firstRemoteOperationCannotOccurBeforeApprovalConsumption,
    approvalConsumptionMatchesFirstPhysicalRemoteCall: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.approvalConsumptionMatchesFirstPhysicalRemoteCall,
    testIamPermissionsCallsMax: 1,
    totalPhysicalRemoteDiagnosticCallsMax: 1,
    additionalHiddenPhysicalCalls: 0,
    automaticRetries: 0,
    secondDiagnosticCall: 0,
    iamPolicyReadsMax: 0,
    projectIamReadsMax: 0,
    iamMutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreCallsMax: 0,
    credentialRefreshCallsMax: 0,
    oauthTokenEndpointCallsMax: 0,
    tokenGenerationMax: 0,
    extraPermissionsRequested: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.extraPermissionsRequested,
    projectWideDiagnostic: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.projectWideDiagnostic,
    serviceAccountKeyOperationsMax: 0,
    serviceAccountImpersonationMax: 0,
    cloudLoggingReadsMax: 0,
    rawPrincipalPersisted: false,
    rawMemberPersisted: false,
    rawCredentialPersisted: false,
    rawAccessTokenPersisted: false,
    rawRefreshTokenPersisted: false,
    rawAuthorizationHeaderPersisted: false,
    rawRequestBodyPersisted: false,
    rawResponseBodyPersisted: false,
    rawStdoutPersisted: false,
    rawStderrPersisted: false,
    m3OperationReachable: false,
    safeToContinueWithoutApproval: false,
    packetComplete: true,
  });
  const packet = Object.freeze({ ...unsigned, directContextPermissionDiagnosticApprovalPacketSha256: sha256Canonical(unsigned) });
  return Object.freeze({ sourceLockManifest, implementation, runtimeCapability, executionComposite, packet });
}

export function verifyG2BDirectContextPermissionDiagnosticArtifacts(artifacts, options = {}) {
  try { return Object.freeze({ ok: JSON.stringify(artifacts) === JSON.stringify(buildG2BDirectContextPermissionDiagnosticArtifacts(options)) }); }
  catch { return Object.freeze({ ok: false }); }
}

export function writeG2BDirectContextPermissionDiagnosticArtifacts(artifacts, { repositoryRoot = process.cwd() } = {}) {
  const path = resolve(repositoryRoot, OUTPUT);
  mkdirSync(dirname(path), { recursive: true });
  const body = `${JSON.stringify(artifacts, null, 2)}\n`;
  writeFileSync(path, body, "utf8");
  return Object.freeze({ path: OUTPUT, rawSha256: sha256(body) });
}
