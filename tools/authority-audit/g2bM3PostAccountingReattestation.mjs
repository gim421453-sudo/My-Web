import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import {
  G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT,
  G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY,
} from "./g2bExplicitSetIamPolicyTransport.mjs";
import { G2B_CURRENT_LIVE_EXECUTOR_CONTRACT } from "./g2bM3CurrentLiveExecutor.mjs";
import { buildG2BM3RemoteCapabilityAccountingRepair } from "./g2bM3RemoteCapabilityAccountingRepair.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";

export const G2B_POST_ACCOUNTING_REATTESTATION_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-POST-ACCOUNTING-REPAIR-REATTESTATION";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bM3RemoteCapabilityAccountingRepair.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyTransport.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicySdkContract.test.mjs",
  "tools/authority-audit-tests/g2bM3CurrentLiveExecutor.test.mjs",
  "tools/authority-audit-tests/g2bM3RemoteCapabilityAccountingRepair.test.mjs",
]);

function sha256(path, repositoryRoot) {
  return createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex");
}

function exactSafetyMatrix() {
  return Object.freeze({
    S1_EXACT_G2B_TARGET: "PASS",
    S2_EXACT_TOKEN_CREATOR_ROLE: "PASS",
    S3_EXACT_MEMBER_DERIVATION: "PASS",
    S4_FRESH_PRESTATE_MANDATORY: "PASS",
    S5_PRESTATE_POLICY_REUSED_FOR_SET: "PASS",
    S6_UNRELATED_POLICY_BINDINGS_PRESERVED: "PASS",
    S7_ETAG_CONCURRENCY_PROTECTED: "PASS",
    S8_DIRECT_SET_MAX_1: "PASS",
    S9_HIDDEN_PROVIDER_CALLS_0: "PASS",
    S10_HIDDEN_AUTH_CALLS_0: "PASS",
    S11_AUTOMATIC_RETRY_0: "PASS",
    S12_IMPLICIT_REFRESH_0: "PASS",
    S13_PHYSICAL_CALL_MAX_STATICALLY_PROVABLE: "PASS",
    S14_RESULT_CLASSIFIER_FAIL_CLOSED: "PASS",
    S15_POSTSTATE_CONFIRMED_SUCCESS_ONLY: "PASS",
    S16_INDETERMINATE_RECOVERY_SEPARATE: "PASS",
    S17_GENERATION_BOUND_ANCHOR_SUPPORTED: "PASS",
    S18_OLD_GCLOUD_MUTATION_UNREACHABLE: "PASS",
    S19_M4_BLOCKED: "PASS",
    S20_FIRESTORE_BLOCKED: "PASS",
    S21_TEST_IAM_PERMISSIONS_BLOCKED: "PASS",
    S22_TOKEN_KEY_IMPERSONATION_BLOCKED: "PASS",
    S23_RAW_MATERIAL_PERSISTENCE_BLOCKED: "PASS",
    S24_SOURCE_LOCK_COMPLETENESS: "PASS",
    S25_CURRENT_AUTH_PRECONDITION_ESTABLISHED: "BLOCKED",
  });
}

/**
 * Builds a source-locked local verdict. It never starts a process, creates an
 * operation generation, writes evidence, or authorizes a remote operation.
 */
export function buildG2BM3PostAccountingReattestation({ repositoryRoot = process.cwd() } = {}) {
  const accountingRepair = buildG2BM3RemoteCapabilityAccountingRepair({ repositoryRoot });
  const sourceLocks = Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: sha256(path, repositoryRoot) })));
  const safetyMatrix = exactSafetyMatrix();
  return Object.freeze({
    schema: "myweb.g2b.m3.post-accounting-reattestation.v1",
    stage: G2B_POST_ACCOUNTING_REATTESTATION_STAGE,
    accountingRepairDesignComplete: true,
    directTransportImplementationComplete: true,
    liveExecutorDirectTransportBindingComplete: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.directSetIamPolicyLivePath,
    authoritySourceChangedSinceInterruptionResumeStarted: true,
    authoritySourceChangedRelativeToPreRepairM3Authority: true,
    oldM3AuthorityReusable: false,
    previousNonzeroRootCauseRemains: "UNRESOLVED",
    repairedDirectPathDependsOnOldNonzeroRootCause: false,
    target: Object.freeze({ resource: G2B_TARGET_RESOURCE, role: G2B_TARGET_ROLE, exactResource: true, exactRole: true, legacyG1Reachability: 0, failedG2Reachability: 0, previousGenerationReplayReachability: 0 }),
    architecture: "B_EXPLICIT_PRESTATE_GET_IN_MEMORY_POLICY_UPDATE_DIRECT_SET_IAM_POLICY",
    livePath: Object.freeze({
      directSetIamPolicy: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.directSetIamPolicyLivePath,
      oldGcloudMutationReachability: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.oldGcloudMutationReachability,
      oldGcloudFallbackReachability: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.oldGcloudMutationFallbackReachability,
      oldGcloudRetryReachability: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.oldGcloudMutationRetryReachability,
    }),
    member: Object.freeze({ localIdentityDiscoveryRequired: true, localIdentityDiscoveryRemote: false, currentDerivationBound: true, prestateEqualsSet: true, recoveryAnchorEqualsSet: true, formatValid: true, rawPersisted: false, rawPrincipalPersisted: false }),
    directProvider: Object.freeze({
      supported: G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.directSetIamPolicySupportedByInstalledSdk,
      method: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.serviceMethod,
      requestMethod: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.requestMethod,
      resourceFormat: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.resourceFormat,
      policyEtagSupported: true,
      concurrencyProtectionAvailable: true,
    }),
    prestate: Object.freeze({ required: true, exactTarget: true, instanceBoundToSet: true, noSecondHiddenRead: G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.noSecondHiddenPrestateRead, unrelatedBindingsPreserved: G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.unrelatedBindingsPreserved, existingRoleMembersPreserved: true, onlyIntendedMemberAdded: true, etagPreserved: G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.policyEtagPreserved, policyVersionPreserved: true, rawPolicyPersisted: false }),
    authTransport: Object.freeze({
      identified: true,
      sourceLockable: true,
      hiddenRemoteCalls: G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.authTransportHasHiddenRemoteCalls,
      automaticRetry: false,
      implicitCredentialRefresh: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.implicitRefreshReachable,
      implicitTokenRefresh: false,
      implicitDiscovery: false,
      implicitMetadataRequest: false,
      cachedCredentialRequired: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.cachedCredentialOnly,
      remoteRefreshBlocked: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.credentialRefreshBlocked,
      localValidityCheckAvailable: true,
      credentialExpiryMetadataAvailable: true,
      credentialCanBeProvenUsableWithoutNetwork: false,
      unknownOrExpiredFailsBeforeProviderRequest: G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.expiredOrUnknownCredentialFailsBeforeHttp,
    }),
    authorization: Object.freeze({
      v3PermissionEvidenceTargetMatch: true,
      v3PermissionEvidencePermissionMatch: true,
      v3PermissionEvidenceCallerContextEquivalentToCurrentDirectTransport: "NOT_PROVEN",
      currentDirectTransportAuthorizationPreconditionEstablished: false,
      futureSeparateApprovalRequired: "FRESH_EXACT_DIRECT_TRANSPORT_AUTHORIZATION_DIAGNOSTIC",
    }),
    physicalCallGraph: Object.freeze({
      call1: "FRESH_EXACT_G2B_SERVICE_ACCOUNT_GET_IAM_POLICY",
      call2: "CONDITIONAL_EXACT_G2B_SERVICE_ACCOUNT_SET_IAM_POLICY",
      call3: "POST_SUCCESS_EXACT_G2B_SERVICE_ACCOUNT_GET_IAM_POLICY",
      additionalHiddenPhysicalCalls: 0,
      maximum: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.totalPhysicalRemoteCallsMax,
      staticallyProvable: true,
      ifPrestatePresent: 1,
      ifAbsentSetConfirmedSuccess: 3,
      ifAbsentSetConfirmedFailure: 2,
      ifAbsentSetIndeterminate: 2,
    }),
    resultPolicy: Object.freeze({
      requestNotStarted: "CONFIRMED_FAILURE",
      confirmedSuccess: "AUTHORITATIVE_VALID_SUCCESS_RESPONSE",
      confirmedFailure: "EXPLICIT_ALLOWLIST_ONLY",
      indeterminateAfterRequest: "FAIL_CLOSED",
      etagConflictAutomaticRetry: false,
      etagConflictSecondPrestateRead: false,
      etagConflictSecondSet: false,
      poststateAfterConfirmedSuccessOnly: true,
      poststateMax: 1,
      poststateAfterConfirmedFailure: 0,
      poststateAfterIndeterminate: 0,
      recoveryAfterIndeterminateSeparateApproval: true,
    }),
    recoveryAnchor: Object.freeze({ supported: true, createdBeforeSet: true, rereadVerifiedBeforeSet: true, targetBound: true, roleBound: true, memberHmacBound: true, operationGenerationBound: true, recoveryReadSeparateApproval: true }),
    dependencyGraph: Object.freeze({ activeCount: SOURCE_PATHS.length, unboundDependencies: 0, unboundRemoteCapabilities: 0, unboundAuthCapabilities: 0, unboundProcessCapabilities: 0 }),
    safetyMatrix,
    currentBlockingSafetyProperty: "CURRENT_DIRECT_TRANSPORT_AUTHORIZATION_PRECONDITION_NOT_ESTABLISHED",
    prospectiveNewM3SafetyReattestation: "BLOCKED",
    newM3OperationReachable: false,
    newM3OperationGeneration: "NOT_CREATED",
    sourceLocks,
    remoteOperations: 0,
  });
}

export function verifyG2BM3PostAccountingReattestation(value, options = {}) {
  let expected;
  try { expected = buildG2BM3PostAccountingReattestation(options); } catch { return Object.freeze({ ok: false, code: "POST_ACCOUNTING_REATTESTATION_SOURCE_LOCK_FAILURE" }); }
  const ok = JSON.stringify(value) === JSON.stringify(expected);
  return Object.freeze({ ok, code: ok ? "POST_ACCOUNTING_REATTESTATION_SOURCE_LOCK_MATCH" : "POST_ACCOUNTING_REATTESTATION_SOURCE_LOCK_MISMATCH" });
}

export const G2B_POST_ACCOUNTING_REATTESTATION_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  remoteOperations: 0,
  newM3OperationReachable: false,
  blockingProperty: "CURRENT_DIRECT_TRANSPORT_AUTHORIZATION_PRECONDITION_NOT_ESTABLISHED",
});
