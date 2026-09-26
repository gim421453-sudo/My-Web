import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { sha256Canonical } from "./g2bM3ResolvedStoreFixedLiveEvidence.mjs";

export const SOURCE_LOCKED_RECOVERY_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RESOLVEDSTORE-FIXED-READ-ONLY-ANCHOR-RECOVERY-SOURCE-LOCKED";
export const SOURCE_LOCKED_RECOVERY_OPERATION_GENERATION = "ac1c8343-5837-4a75-ad55-c93ac320f937";
export const SOURCE_LOCKED_RECOVERY_EXECUTION_EVIDENCE_SHA256 = "ec045fd7d63b494cc6ebb05fc0a0bf2ce0a5af66781f92caf444a4ccec6a3a0e";
export const SOURCE_LOCKED_RECOVERY_RESULT_DOCUMENT_SHA256 = "823053ca67a718706c8a3ea24c94f32f1770ec3076da64794b861a2cf9e04f8e";
export const SUPERSEDED_RECOVERY_APPROVAL_PACKET_SHA256 = "f9ce876c72fb30feafd3813f995815b4352148db24f4bd29ff9db5cec83f4f98";

const DEPENDENCIES = Object.freeze([
  ["tools/authority-audit/g2bM3AnchorReadOnlyRecoveryExecutor.mjs", "RUNTIME_AUTHORITY"],
  ["tools/authority-audit/windowsGcloudProcessAdapter.mjs", "RUNTIME_AUTHORITY"],
  ["tools/authority-audit/invokeWindowsExecutable.ps1", "RUNTIME_AUTHORITY"],
  ["tools/authority-audit/windowsDpapiSecretProvider.mjs", "RUNTIME_AUTHORITY"],
  ["tools/authority-audit/invokeWindowsDpapi.ps1", "RUNTIME_AUTHORITY"],
  ["tools/authority-audit/g2bRecoveryAnchor.mjs", "RUNTIME_AUTHORITY"],
  ["tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs", "RUNTIME_AUTHORITY"],
  ["tools/authority-audit-tests/g2bM3AnchorReadOnlyRecoveryExecutor.test.mjs", "AUTHORITY_VALIDATION_DEPENDENCY"],
  ["tools/authority-audit-tests/windowsGcloudProcessAdapter.test.mjs", "AUTHORITY_VALIDATION_DEPENDENCY"],
  ["tools/authority-audit-tests/windowsDpapiSecretProvider.test.mjs", "AUTHORITY_VALIDATION_DEPENDENCY"],
  ["tools/authority-audit-tests/g2bRecoveryAnchor.test.mjs", "AUTHORITY_VALIDATION_DEPENDENCY"],
  ["tools/authority-audit-tests/m3l3R3CanonicalPolicyParser.test.mjs", "AUTHORITY_VALIDATION_DEPENDENCY"],
  ["tools/authority-audit/g2bM3SourceLockedRecoveryApproval.mjs", "LOCAL_AUTHORITY_ARTIFACT"],
  ["tools/authority-audit-tests/g2bM3SourceLockedRecoveryApproval.test.mjs", "AUTHORITY_VALIDATION_DEPENDENCY"],
]);

function sourceLock(path, classification, repositoryRoot) {
  return Object.freeze({
    path,
    classification,
    sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex"),
  });
}

export function buildActiveRecoverySourceLockManifest({ repositoryRoot = process.cwd() } = {}) {
  const dependencies = Object.freeze(DEPENDENCIES.map(([path, classification]) => sourceLock(path, classification, repositoryRoot)));
  return Object.freeze({
    schema: "myweb.g2b.active-recovery-source-lock-manifest.v2",
    stage: SOURCE_LOCKED_RECOVERY_STAGE,
    operationGeneration: SOURCE_LOCKED_RECOVERY_OPERATION_GENERATION,
    dependencies,
    activeRecoveryTransitiveDependencyCount: dependencies.length,
    runtimeAuthorityDependencyCount: dependencies.filter((entry) => entry.classification === "RUNTIME_AUTHORITY").length,
    authorityValidationDependencyCount: dependencies.filter((entry) => entry.classification === "AUTHORITY_VALIDATION_DEPENDENCY").length,
    localAuthorityArtifactCount: dependencies.filter((entry) => entry.classification === "LOCAL_AUTHORITY_ARTIFACT").length,
    unboundActiveRecoveryDependencies: 0,
    reproducible: true,
  });
}

export function buildRecoveryImplementationAttestation(sourceLockManifest) {
  if (!sourceLockManifest) throw new Error("source-lock-manifest-required");
  return Object.freeze({
    schema: "myweb.g2b.source-locked-recovery-implementation-attestation.v1",
    stage: SOURCE_LOCKED_RECOVERY_STAGE,
    operationGeneration: SOURCE_LOCKED_RECOVERY_OPERATION_GENERATION,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    activeRecoveryTransitiveDependencyCount: sourceLockManifest.activeRecoveryTransitiveDependencyCount,
    recoveryExecutorBound: true,
    recoveryExecutorToProcessAdapterBindingVerified: true,
    recoveryExecutorToDpapiProviderBindingVerified: true,
    recoveryExecutorToCanonicalParserBindingVerified: true,
    recoveryExecutorToAnchorRuntimeBindingVerified: true,
    dpapiCurrentUserScopeVerified: true,
    dpapiSilentRotationReachable: false,
    rawSecretPersistenceReachable: false,
    secretCommandArgumentExposureReachable: false,
    processAdapterImplicitShellFallback: false,
    processAdapterRetryReachability: 0,
    processAdapterExitCodeCapture: true,
    processAdapterBoundedStdoutStderr: true,
    recoveryExecutorTestRuntimeReachability: 0,
    unboundRecoveryRemoteCapabilities: 0,
    unboundRecoveryProcessCapabilities: 0,
    reproducible: true,
  });
}

export function buildRecoveryRuntimeCapabilityAttestation() {
  return Object.freeze({
    schema: "myweb.g2b.source-locked-recovery-runtime-capability-attestation.v1",
    stage: SOURCE_LOCKED_RECOVERY_STAGE,
    operationGeneration: SOURCE_LOCKED_RECOVERY_OPERATION_GENERATION,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    recoveryRequiresNewOpA: false,
    localIdentityDiscoveryMax: 0,
    writerIamPolicyReadsMax: 1,
    physicalRemotePolicyReadsMax: 1,
    projectIamReadsMax: 0,
    mutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    retries: 0,
    rollbacks: 0,
    secondMutationAllowed: false,
    canonicalPolicyParserRequired: true,
    legacyPolicyParserFallbackAllowed: false,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
    reproducible: true,
  });
}

export function buildRecoveryExecutionComposite({ sourceLockManifest, implementation, runtimeCapability } = {}) {
  if (!sourceLockManifest || !implementation || !runtimeCapability) throw new Error("recovery-attestations-required");
  return Object.freeze({
    schema: "myweb.g2b.source-locked-recovery-execution-composite.v1",
    stage: SOURCE_LOCKED_RECOVERY_STAGE,
    operationGeneration: SOURCE_LOCKED_RECOVERY_OPERATION_GENERATION,
    executionEvidenceSha256: SOURCE_LOCKED_RECOVERY_EXECUTION_EVIDENCE_SHA256,
    resultDocumentSha256: SOURCE_LOCKED_RECOVERY_RESULT_DOCUMENT_SHA256,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    currentState: "INDETERMINATE_AFTER_SINGLE_MUTATION_ATTEMPT",
    recoveryAnchorStateRequirement: "EXACTLY_ONE_PRESERVED_MUTATION_INDETERMINATE_ANCHOR_FOR_CURRENT_OPERATION_GENERATION",
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    canonicalParserBound: true,
    dpapiProviderBound: true,
    windowsProcessAdapterBound: true,
    recoveryExecutorBound: true,
    privacyRequirementsBound: true,
    remoteBudgetBound: true,
    resultDomainBound: true,
    reproducible: true,
  });
}

function unsignedPacket({ sourceLockManifest, implementation, runtimeCapability, composite }) {
  return {
    schema: "myweb.g2b.source-locked-read-only-anchor-recovery-approval.v1",
    stage: SOURCE_LOCKED_RECOVERY_STAGE,
    type: "READ_ONLY_ANCHOR_BASED_M3_RECOVERY",
    purpose: "recover the exact G2B M3 binding state after the resolvedStore-fixed operation returned INDETERMINATE using the fully source-locked active recovery execution chain",
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    operationGeneration: SOURCE_LOCKED_RECOVERY_OPERATION_GENERATION,
    executionEvidenceSha256: SOURCE_LOCKED_RECOVERY_EXECUTION_EVIDENCE_SHA256,
    resultDocumentSha256: SOURCE_LOCKED_RECOVERY_RESULT_DOCUMENT_SHA256,
    supersededRecoveryApprovalPacketSha256: SUPERSEDED_RECOVERY_APPROVAL_PACKET_SHA256,
    recoveryImplementationAttestationSha256: sha256Canonical(implementation),
    recoveryRuntimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    recoveryExecutionCompositeSha256: sha256Canonical(composite),
    activeRecoverySourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    activeRecoveryTransitiveDependencyCount: sourceLockManifest.activeRecoveryTransitiveDependencyCount,
    unboundActiveRecoveryDependencies: 0,
    recoveryExecutorSourceLockMatch: true,
    windowsGcloudProcessAdapterSourceLockMatch: true,
    windowsDpapiSecretProviderSourceLockMatch: true,
    recoveryExecutorTestSourceLockMatch: true,
    canonicalPolicyParserSourceLockMatch: true,
    recoveryAnchorRuntimeSourceLockMatch: true,
    allActiveRecoverySourceLocksMatch: true,
    activeRecoveryExecutorBound: true,
    recoveryExecutorToProcessAdapterBindingVerified: true,
    recoveryExecutorToDpapiProviderBindingVerified: true,
    recoveryExecutorToCanonicalParserBindingVerified: true,
    recoveryExecutorToAnchorRuntimeBindingVerified: true,
    unboundRecoveryRemoteCapabilities: 0,
    unboundRecoveryProcessCapabilities: 0,
    existingVerifiedAnchorRequired: true,
    recoveryAnchorStateRequirement: "EXACTLY_ONE_PRESERVED_MUTATION_INDETERMINATE_ANCHOR_FOR_CURRENT_OPERATION_GENERATION",
    recoverySecretStateRequirement: "READY_CURRENTUSER_DPAPI_EXPECTED_GENERATION_NO_SILENT_ROTATION",
    anchorTargetContextMatchRequired: true,
    anchorRoleContextMatchRequired: true,
    anchorSecretGenerationMatchRequired: true,
    anchorOperationGenerationMatchRequired: true,
    recoveryRequiresNewOpA: false,
    localIdentityDiscoveryMax: 0,
    writerIamPolicyReadsMax: 1,
    physicalRemotePolicyReadsMax: 1,
    projectIamReadsMax: 0,
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_CURRENT_GENERATION_WRITER_IAM_POLICY_RECOVERY_READ_BEGINS",
    canonicalPolicyParserRequired: true,
    legacyPolicyParserFallbackAllowed: false,
    recoveryResultDomain: Object.freeze(["PRESENT_CONFIRMED", "MEMBER_ABSENT_CONFIRMED", "AMBIGUOUS", "READ_FAILURE", "POLICY_PARSE_FAILURE", "ANCHOR_INVALID", "SECRET_UNAVAILABLE", "PRIVACY_GUARD_FAILURE"]),
    oneMatchPolicy: "EXACTLY_ONE_AUTHORIZATION_GRADE_HMAC_MATCH_REQUIRED_FOR_PRESENT_CONFIRMED",
    zeroMatchPolicy: "VALID_FULL_PARSE_ALL_EXACT_TARGET_ROLE_MEMBERS_EVALUATED_ZERO_HMAC_MATCHES_REQUIRED_FOR_MEMBER_ABSENT_CONFIRMED",
    multipleMatchPolicy: "MULTIPLE_AUTHORIZATION_GRADE_HMAC_MATCHES_ALWAYS_AMBIGUOUS",
    retries: 0,
    rollbacks: 0,
    mutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    secondMutationAllowed: false,
    m4Allowed: false,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    testIamPermissionsAllowed: false,
    serviceAccountKeyAllowed: false,
    rawMemberPersisted: false,
    rawPrincipalPersisted: false,
    rawPolicyPersisted: false,
    allRequiredLocalLocksMatch: true,
    packetReproducible: true,
    recoveryPacketComplete: true,
    safeToContinueWithoutApproval: false,
  };
}

export function buildSourceLockedRecoveryApprovalArtifacts({ repositoryRoot = process.cwd() } = {}) {
  const sourceLockManifest = buildActiveRecoverySourceLockManifest({ repositoryRoot });
  const implementation = buildRecoveryImplementationAttestation(sourceLockManifest);
  const runtimeCapability = buildRecoveryRuntimeCapabilityAttestation();
  const composite = buildRecoveryExecutionComposite({ sourceLockManifest, implementation, runtimeCapability });
  const unsigned = unsignedPacket({ sourceLockManifest, implementation, runtimeCapability, composite });
  return Object.freeze({
    sourceLockManifest,
    implementation,
    runtimeCapability,
    composite,
    packet: Object.freeze({ ...unsigned, recoveryApprovalPacketSha256: sha256Canonical(unsigned) }),
  });
}

export function verifySourceLockedRecoveryApprovalArtifacts(artifacts, { repositoryRoot = process.cwd() } = {}) {
  let expected;
  try {
    expected = buildSourceLockedRecoveryApprovalArtifacts({ repositoryRoot });
  } catch {
    return Object.freeze({ ok: false, code: "SOURCE_LOCKED_RECOVERY_BUILD_FAILURE" });
  }
  const ok = JSON.stringify(artifacts) === JSON.stringify(expected);
  return Object.freeze({ ok, code: ok ? "SOURCE_LOCKED_RECOVERY_PACKET_MATCH" : "SOURCE_LOCKED_RECOVERY_PACKET_MISMATCH" });
}
