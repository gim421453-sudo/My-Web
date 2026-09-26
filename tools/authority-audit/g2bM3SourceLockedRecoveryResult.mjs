import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { sha256Canonical } from "./g2bM3ResolvedStoreFixedLiveEvidence.mjs";

export const SOURCE_LOCKED_RECOVERY_RESULT_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RESOLVEDSTORE-FIXED-SOURCE-LOCKED-RECOVERY-RESULT";
export const SOURCE_LOCKED_RECOVERY_GENERATION = "ac1c8343-5837-4a75-ad55-c93ac320f937";
export const SOURCE_LOCKED_RECOVERY_APPROVAL_SHA256 = "b7ede2e549a8345d1e5d9edd042dc8662be38802b4499405b5e280e9e62e3202";
export const SOURCE_LOCKED_RECOVERY_APPROVAL_RAW_SHA256 = "d9ada3419c1125cf9d536ee37a7121860630757fac242fbf8953f294a4399a20";

const LOCKS = Object.freeze({
  sourceLockManifest: "e14f9741cf10450ed9f8f61895aed5426a7c6ab4627e56a195c65f0eb56e5ddd",
  implementation: "bad1f138ed8b6beff6665efb6fb77b8022bb4fd16d81850a6d4859b73d2f1eb6",
  runtimeCapability: "9bfc494053198699a82296ceda14e4bb7fa2d6c00d66c2fd75297915b151e336",
  composite: "e3e68ed16da0e27e66f1d811cda0e40128e18530d9ca4974dff2d8571aa520bb",
  m3ExecutionEvidence: "ec045fd7d63b494cc6ebb05fc0a0bf2ce0a5af66781f92caf444a4ccec6a3a0e",
  m3ResultDocument: "823053ca67a718706c8a3ea24c94f32f1770ec3076da64794b861a2cf9e04f8e",
});

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bM3AnchorReadOnlyRecoveryExecutor.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
]);

function sourceLocks(repositoryRoot) {
  return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({
    path,
    sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex"),
  })));
}

function forbiddenCounts() {
  return Object.freeze({
    opA: 0,
    localIdentityDiscovery: 0,
    projectIamReads: 0,
    retries: 0,
    rollbacks: 0,
    mutations: 0,
    m3Mutations: 0,
    m4Mutations: 0,
    secondMutation: 0,
    firestoreCalls: 0,
    accessTokenCalls: 0,
    cloudLoggingReads: 0,
    testIamPermissionsCalls: 0,
    serviceAccountKeyOperations: 0,
  });
}

export function buildSourceLockedRecoveryResultArtifacts({ repositoryRoot = process.cwd() } = {}) {
  const executionEvidence = Object.freeze({
    schema: "myweb.g2b.m3.source-locked-recovery-execution-evidence.v1",
    stage: SOURCE_LOCKED_RECOVERY_RESULT_STAGE,
    operationGeneration: SOURCE_LOCKED_RECOVERY_GENERATION,
    approvalPacketSha256: SOURCE_LOCKED_RECOVERY_APPROVAL_SHA256,
    approvalPacketRawSha256: SOURCE_LOCKED_RECOVERY_APPROVAL_RAW_SHA256,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    approvalConsumed: true,
    approvalStatus: "CONSUMED_NON_REUSABLE",
    recoveryAnchorValid: true,
    recoverySecretValid: true,
    anchorContextMatch: true,
    anchorRoleMatch: true,
    anchorGenerationMatch: true,
    anchorSecretGenerationMatch: true,
    writerIamPolicyReadsUsed: 1,
    physicalRemotePolicyReadsUsed: 1,
    canonicalPolicyParseResult: "PARSED_CANONICAL_POLICY",
    hmacMatchCountCategory: "ZERO",
    recoveryResult: "MEMBER_ABSENT_CONFIRMED",
    currentM3State: "CONFIRMED_ABSENT_AFTER_RESOLVEDSTORE_FIXED_INDETERMINATE_MUTATION",
    anchorTransitioned: true,
    terminalAnchorState: "RECOVERY_CONFIRMED_ABSENT",
    forbiddenOperationCounts: forbiddenCounts(),
    privacy: Object.freeze({
      rawMemberPersisted: false,
      rawPrincipalPersisted: false,
      rawPolicyPersisted: false,
      rawSecretPersisted: false,
      stdoutPersisted: false,
      stderrPersisted: false,
    }),
  });

  const result = Object.freeze({
    schema: "myweb.g2b.m3.source-locked-recovery-result.v1",
    stage: SOURCE_LOCKED_RECOVERY_RESULT_STAGE,
    operationGeneration: SOURCE_LOCKED_RECOVERY_GENERATION,
    executionEvidenceSha256: sha256Canonical(executionEvidence),
    result: "MEMBER_ABSENT_CONFIRMED",
    currentM3State: "CONFIRMED_ABSENT_AFTER_RESOLVEDSTORE_FIXED_INDETERMINATE_MUTATION",
    anotherM3MutationAllowed: false,
    newM3GenerationAllowed: false,
    m4Allowed: false,
    nextApprovalRequired: true,
    nextApprovalType: "M3_PROVIDER_PROCESS_ROOT_CAUSE_DIAGNOSTIC",
  });

  const anchorEvidence = Object.freeze({
    schema: "myweb.g2b.m3.source-locked-recovery-anchor-evidence.v1",
    operationGeneration: SOURCE_LOCKED_RECOVERY_GENERATION,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    preReadState: "MUTATION_INDETERMINATE",
    postReadState: "RECOVERY_CONFIRMED_ABSENT",
    activeAnchorCountBeforeRead: 1,
    contextVerified: true,
    secretGenerationVerified: true,
    rawAuthorityMaterialPersisted: false,
  });

  const privacyEvidence = Object.freeze({
    schema: "myweb.g2b.m3.source-locked-recovery-privacy-evidence.v1",
    operationGeneration: SOURCE_LOCKED_RECOVERY_GENERATION,
    rawMemberPersisted: false,
    rawPrincipalPersisted: false,
    rawPolicyPersisted: false,
    rawSecretPersisted: false,
    accessTokenCreated: false,
    serviceAccountKeyCreated: false,
  });

  const sourceLockEvidence = Object.freeze({
    schema: "myweb.g2b.m3.source-locked-recovery-source-lock-evidence.v1",
    operationGeneration: SOURCE_LOCKED_RECOVERY_GENERATION,
    approvedSourceLockManifestSha256: LOCKS.sourceLockManifest,
    approvedImplementationAttestationSha256: LOCKS.implementation,
    approvedRuntimeCapabilityAttestationSha256: LOCKS.runtimeCapability,
    approvedExecutionCompositeSha256: LOCKS.composite,
    boundM3ExecutionEvidenceSha256: LOCKS.m3ExecutionEvidence,
    boundM3ResultDocumentSha256: LOCKS.m3ResultDocument,
    activeDependencies: sourceLocks(repositoryRoot),
    allRequiredLocalLocksMatchedBeforeRead: true,
    unboundActiveRecoveryDependencies: 0,
  });

  const diagnostic = Object.freeze({
    schema: "myweb.g2b.m3.provider-process-root-cause-local-diagnostic.v1",
    operationGeneration: SOURCE_LOCKED_RECOVERY_GENERATION,
    confirmedFacts: Object.freeze({
      exactTargetBindingAbsentAfterMutationAttempt: true,
      mutationCommandAttemptedOnce: true,
      mutationOutcomeWasIndeterminate: true,
      activeCommandBuilderUsesExactG2BTarget: true,
      activeCommandBuilderUsesExactTargetRole: true,
      activeCommandBuilderUsesConditionNone: true,
      processAdapterUsesShellFallback: false,
      processAdapterRetries: 0,
    }),
    observabilityBoundary: Object.freeze({
      mutationExitCodePersisted: false,
      mutationTimedOutStatePersisted: false,
      mutationSafeErrorIdentifierPersisted: false,
      mutationStderrPersisted: false,
      exactProviderErrorRecoverableOffline: false,
    }),
    rootCauseResult: "EXACT_PROVIDER_PROCESS_FAILURE_NOT_ESTABLISHED_FROM_PERSISTED_EVIDENCE",
    possibleCausesAreNotFindings: Object.freeze([
      "CALLER_LACKED_SET_IAM_POLICY_PERMISSION",
      "GCLOUD_PROVIDER_REJECTED_MUTATION_REQUEST",
      "PROCESS_TRANSPORT_OR_TIMEOUT_FAILURE",
    ]),
    anotherMutationAllowed: false,
    remoteDiagnosticExecuted: false,
  });

  const unsignedDiagnosticPacket = {
    schema: "myweb.g2b.m3.provider-process-root-cause-diagnostic-approval.v1",
    stage: "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-PROVIDER-PROCESS-ROOT-CAUSE-DIAGNOSTIC",
    type: "M3_PROVIDER_PROCESS_ROOT_CAUSE_DIAGNOSTIC",
    purpose: "separately determine whether the consumed absent M3 outcome was caused by caller authorization or the bounded provider/process path without repeating M3",
    operationGeneration: SOURCE_LOCKED_RECOVERY_GENERATION,
    recoveryExecutionEvidenceSha256: sha256Canonical(executionEvidence),
    recoveryResultDocumentSha256: sha256Canonical(result),
    localDiagnosticSha256: sha256Canonical(diagnostic),
    currentM3State: "CONFIRMED_ABSENT_AFTER_RESOLVEDSTORE_FIXED_INDETERMINATE_MUTATION",
    opAMax: 1,
    writerIamPolicyReadsMax: 0,
    projectIamReadsMax: 0,
    testIamPermissionsCallsMax: 1,
    exactPermissionUnderTest: "iam.serviceAccounts.setIamPolicy",
    mutationsMax: 0,
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    retries: 0,
    rollbacks: 0,
    secondMutationAllowed: false,
    firestoreAllowed: false,
    accessTokenAllowed: false,
    cloudLoggingAllowed: false,
    serviceAccountKeyAllowed: false,
    approvalConsumptionPoint: "WHEN_FIRST_SEPARATELY_APPROVED_REMOTE_DIAGNOSTIC_CALL_BEGINS",
    safeToContinueWithoutApproval: false,
  };
  const diagnosticApprovalPacket = Object.freeze({
    ...unsignedDiagnosticPacket,
    diagnosticApprovalPacketSha256: sha256Canonical(unsignedDiagnosticPacket),
  });

  return Object.freeze({ executionEvidence, result, anchorEvidence, privacyEvidence, sourceLockEvidence, diagnostic, diagnosticApprovalPacket });
}

export function verifySourceLockedRecoveryResultArtifacts(artifacts, options = {}) {
  let expected;
  try {
    expected = buildSourceLockedRecoveryResultArtifacts(options);
  } catch {
    return Object.freeze({ ok: false, code: "RECOVERY_RESULT_BUILD_FAILURE" });
  }
  const ok = JSON.stringify(artifacts) === JSON.stringify(expected);
  return Object.freeze({ ok, code: ok ? "SOURCE_LOCKED_RECOVERY_RESULT_MATCH" : "SOURCE_LOCKED_RECOVERY_RESULT_MISMATCH" });
}

export const SOURCE_LOCKED_RECOVERY_RESULT_CONTRACT = Object.freeze({
  remoteOperations: 0,
  processSpawn: false,
  mutationReachable: false,
  m4Reachable: false,
  rawAuthorityMaterialPersisted: false,
});
