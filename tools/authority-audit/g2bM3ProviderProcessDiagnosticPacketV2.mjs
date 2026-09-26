import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { sha256Canonical } from "./g2bM3ResolvedStoreFixedLiveEvidence.mjs";

export const G2B_PROVIDER_PROCESS_DIAGNOSTIC_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-PROVIDER-PROCESS-ROOT-CAUSE-DIAGNOSTIC-V2";
export const G2B_PROVIDER_PROCESS_DIAGNOSTIC_GENERATION = "ac1c8343-5837-4a75-ad55-c93ac320f937";
const G2B_TARGET_RESOURCE_ALIAS = "EXACT_G2B_WRITER_SERVICE_ACCOUNT_RESOURCE";

const LOCAL_SOURCES = Object.freeze([
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/m3RuntimeCommandGraph.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs",
  "tools/authority-audit-tests/g2bM3CurrentLiveExecutor.test.mjs",
]);

const SDK_EVIDENCE = Object.freeze([
  Object.freeze({
    pathClass: "CLOUD_SDK_IAM_SERVICE_ACCOUNT_ADD_BINDING_SURFACE",
    sha256: "fcf41f4485dcdb29457feb081a82829013ff74c78543e3d1777fe6b01ad22042",
  }),
  Object.freeze({
    pathClass: "CLOUD_SDK_IAM_SERVICE_ACCOUNT_SET_POLICY_SURFACE",
    sha256: "4148a18a95ad2e13b949f3ea25c167be02a7f799c78df7046b689b6e6cab530e",
  }),
  Object.freeze({
    pathClass: "CLOUD_SDK_IAM_V1_GENERATED_CLIENT",
    sha256: "304f81531be1e0f8bb05c726aec9a6053f80a11cec1867245231f6276ad0ebcf",
  }),
  Object.freeze({
    pathClass: "CLOUD_SDK_IAM_V1_GENERATED_MESSAGES",
    sha256: "098d22bfde402e0a1bb398cbced35a75b2a5108c699ad122966a408cffc785e1",
  }),
]);

function localLocks(repositoryRoot) {
  return Object.freeze(LOCAL_SOURCES.map((path) => Object.freeze({
    path,
    sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex"),
  })));
}

export function buildG2BProviderProcessDiagnosticPacketV2({ repositoryRoot = process.cwd() } = {}) {
  const sourceLockManifest = Object.freeze({
    schema: "myweb.g2b.m3.provider-process-diagnostic-source-lock-manifest.v2",
    stage: G2B_PROVIDER_PROCESS_DIAGNOSTIC_STAGE,
    operationGeneration: G2B_PROVIDER_PROCESS_DIAGNOSTIC_GENERATION,
    localDependencies: localLocks(repositoryRoot),
    localDependencyCount: LOCAL_SOURCES.length,
    sdkStaticEvidence: SDK_EVIDENCE,
    diagnosticExecutorBound: false,
    unboundDiagnosticDependencies: 0,
    unboundDiagnosticRemoteCapabilities: 0,
    unboundDiagnosticProcessCapabilities: 0,
  });

  const implementation = Object.freeze({
    schema: "myweb.g2b.m3.provider-process-diagnostic-implementation-attestation.v2",
    stage: G2B_PROVIDER_PROCESS_DIAGNOSTIC_STAGE,
    operationGeneration: G2B_PROVIDER_PROCESS_DIAGNOSTIC_GENERATION,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    mutationTarget: G2B_TARGET_RESOURCE_ALIAS,
    mutationTargetContractBound: G2B_TARGET_RESOURCE.length > 0,
    mutationRole: G2B_TARGET_ROLE,
    mutationCondition: "None",
    currentExecutorCanReachLegacyWriter: false,
    resolvedStoreReferenceFixPresent: true,
    mutationArgvContractValid: true,
    mutationProcessAdapterBound: true,
    mutationStderrSanitizerBound: true,
    mutationClassifierBound: true,
    futurePrivacySafeProcessMetadataBound: true,
    rawMutationStdoutReturned: false,
    rawMutationStderrReturned: false,
    diagnosticExecutorBound: false,
    exactPermissionDiagnosticRequestBuilderBound: false,
    exactPermissionDiagnosticParserBound: false,
    boundedAuditQueryBuilderBound: false,
    boundedAuditQueryParserBound: false,
  });

  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.m3.provider-process-diagnostic-runtime-capability.v2",
    stage: G2B_PROVIDER_PROCESS_DIAGNOSTIC_STAGE,
    operationGeneration: G2B_PROVIDER_PROCESS_DIAGNOSTIC_GENERATION,
    capabilities: Object.freeze([
      Object.freeze({ capability: "LOCAL_MUTATION_COMMAND_CONTRACT_INSPECTION", classification: "SUPPORTED_AND_USEFUL" }),
      Object.freeze({ capability: "WRITER_SERVICE_ACCOUNT_IAM_POLICY_READ", classification: "SUPPORTED_NOT_USEFUL" }),
      Object.freeze({ capability: "SERVICE_ACCOUNT_TEST_IAM_PERMISSIONS_API", classification: "SUPPORTED_BUT_NO_SOURCE_LOCKED_EXECUTOR" }),
      Object.freeze({ capability: "GCLOUD_SERVICE_ACCOUNT_TEST_IAM_PERMISSIONS_COMMAND", classification: "UNSUPPORTED" }),
      Object.freeze({ capability: "BOUNDED_CLOUD_AUDIT_LOG_LOOKUP", classification: "UNSAFE_WITHOUT_FAILED_MUTATION_TIME_WINDOW" }),
      Object.freeze({ capability: "PROVIDER_NON_MUTATING_REQUEST_VALIDATION", classification: "UNSUPPORTED" }),
    ]),
    failedMutationTimeWindowAvailable: false,
    failedMutationTargetAvailable: true,
    failedMutationMethodAvailable: true,
    operationGenerationCorrelationAvailable: false,
    privacySafeLogFilterPossible: false,
    boundedLogQueryPossible: false,
    auditLogDiagnosticRequired: false,
    permissionDiagnosticMateriallyUseful: true,
    permissionDiagnosticSafelyReachable: false,
    iamPolicyDiagnosticRequired: false,
    iamPolicyReadsMax: 0,
    projectIamReadsMax: 0,
    testIamPermissionsCallsMax: 0,
    cloudLoggingReadsMax: 0,
    otherRemoteReadsMax: 0,
    totalPhysicalRemoteReadsMax: 0,
    mutationsMax: 0,
    iamMutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    retries: 0,
    rollbacks: 0,
  });

  const composite = Object.freeze({
    schema: "myweb.g2b.m3.provider-process-diagnostic-execution-composite.v2",
    stage: G2B_PROVIDER_PROCESS_DIAGNOSTIC_STAGE,
    operationGeneration: G2B_PROVIDER_PROCESS_DIAGNOSTIC_GENERATION,
    recoveryExecutionEvidenceSha256: "0db8f9d3d6307cd519b0cc4c2fc0ef955287bd83009bf0b8cd9c4b6fc96fe74e",
    recoveryResultDocumentSha256: "8998bc5f40f4a42730c1c119639ed43a2e884425f9f1396ab85cd824b868750d",
    recoveryAnchorEvidenceSha256: "b063fb36de707548505e6c0defb878af12158107df3489730f376357f39d24da",
    supersededDiagnosticPacketSha256: "50b4048f545d8c7a3b1c9d2ea342720b37e9172fa68f3c6b70f5481d5a8284e8",
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    currentM3State: "CONFIRMED_ABSENT_AFTER_RESOLVEDSTORE_FIXED_INDETERMINATE_MUTATION",
    localExactProviderProcessRootCause: "UNRESOLVED",
    remoteDiagnosticStillRequired: true,
    remoteDiagnosticSafelyConstructed: false,
    m3MutationReachable: false,
    m4Reachable: false,
  });

  const unsignedPacket = {
    schema: "myweb.g2b.m3.provider-process-root-cause-diagnostic-approval.v2",
    stage: G2B_PROVIDER_PROCESS_DIAGNOSTIC_STAGE,
    type: "M3_PROVIDER_PROCESS_ROOT_CAUSE_READ_ONLY_DIAGNOSTIC",
    status: "BLOCKED",
    blockReason: "NO_SOURCE_LOCKED_EXACT_PERMISSION_DIAGNOSTIC_EXECUTOR_AND_NO_BOUNDED_AUDIT_TIME_WINDOW",
    operationGeneration: G2B_PROVIDER_PROCESS_DIAGNOSTIC_GENERATION,
    targetResource: G2B_TARGET_RESOURCE_ALIAS,
    targetRole: G2B_TARGET_ROLE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    executionCompositeSha256: sha256Canonical(composite),
    iamPolicyReadsMax: 0,
    projectIamReadsMax: 0,
    testIamPermissionsCallsMax: 0,
    cloudLoggingReadsMax: 0,
    otherRemoteReadsMax: 0,
    totalPhysicalRemoteReadsMax: 0,
    mutations: 0,
    iamMutations: 0,
    m3Mutations: 0,
    m4Mutations: 0,
    retries: 0,
    rollbacks: 0,
    rawMemberPersisted: false,
    rawPrincipalPersisted: false,
    rawIamPolicyPersisted: false,
    rawAuditLogPayloadPersisted: false,
    rawStdoutPersisted: false,
    rawStderrPersisted: false,
    diagnosticPacketComplete: false,
    safeToContinueWithoutApproval: false,
  };
  const packet = Object.freeze({
    ...unsignedPacket,
    diagnosticApprovalPacketSha256: sha256Canonical(unsignedPacket),
  });

  return Object.freeze({ sourceLockManifest, implementation, runtimeCapability, composite, packet });
}

export function verifyG2BProviderProcessDiagnosticPacketV2(artifacts, options = {}) {
  let expected;
  try {
    expected = buildG2BProviderProcessDiagnosticPacketV2(options);
  } catch {
    return Object.freeze({ ok: false, code: "DIAGNOSTIC_PACKET_BUILD_FAILURE" });
  }
  const ok = JSON.stringify(artifacts) === JSON.stringify(expected);
  return Object.freeze({ ok, code: ok ? "DIAGNOSTIC_PACKET_V2_MATCH" : "DIAGNOSTIC_PACKET_V2_MISMATCH" });
}

export const G2B_PROVIDER_PROCESS_DIAGNOSTIC_PACKET_V2_CONTRACT = Object.freeze({
  remoteOperations: 0,
  processSpawn: false,
  mutations: 0,
  packetComplete: false,
  safeToContinueWithoutApproval: false,
});
