import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT,
  G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY,
} from "./g2bExplicitSetIamPolicyTransport.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/m3RuntimeCommandGraph.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/gcloudStderrDiagnosticAnalyzer.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyTransport.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicySdkContract.test.mjs",
]);

function sha256(path, repositoryRoot) {
  return createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex");
}

export function buildG2BM3RemoteCapabilityAccountingRepair({ repositoryRoot = process.cwd() } = {}) {
  const sourceLocks = Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: sha256(path, repositoryRoot) })));
  return Object.freeze({
    schema: "myweb.g2b.m3.remote-capability-accounting-repair.v1",
    architecture: "B_EXPLICIT_PRESTATE_GET_IN_MEMORY_POLICY_UPDATE_DIRECT_SET_IAM_POLICY",
    oldGcloudMutationPath: Object.freeze({ identified: true, reachableFromFutureM3: false, fallbackReachable: false, retryReachable: false }),
    directSetIamPolicy: Object.freeze({
      supported: true,
      method: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.serviceMethod,
      requestMethod: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.requestMethod,
      resourceFormat: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.resourceFormat,
      requestBody: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.requestBody,
      prestatePolicyReusable: true,
      etagRequiredAndPreserved: true,
      policyVersionPreserved: true,
      unknownPolicyFieldsFailClosed: true,
    }),
    credentialBoundary: Object.freeze({
      directMutationAuthTransportIdentified: true,
      directMutationAuthTransport: "CLOUD_SDK_CACHED_CREDENTIAL_NO_REFRESH_STDIN_V2",
      localCredentialFreshnessDeterminable: G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.credentialFreshnessLocallyDeterminable,
      implicitRefreshReachable: G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.authTransportHasHiddenRemoteCalls,
      expiredOrUnknownFailsBeforeHttp: G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.expiredOrUnknownCredentialFailsBeforeHttp,
      rawPolicyTransientAcrossProcessBoundary: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.rawPolicyCrossesProcessBoundary,
      rawPolicyPersisted: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.rawPolicyPersisted,
      directTransportBoundToLiveExecutor: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.liveExecutorBound,
    }),
    physicalCallGraph: Object.freeze({
      call1: "FRESH_EXACT_SERVICE_ACCOUNT_GET_IAM_POLICY",
      call2: "CONDITIONAL_EXACT_SERVICE_ACCOUNT_SET_IAM_POLICY",
      call3: "POST_SUCCESS_EXACT_SERVICE_ACCOUNT_GET_IAM_POLICY",
      additionalHiddenPhysicalCalls: 0,
      maximum: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.totalPhysicalRemoteCallsMax,
      ifPrestatePresent: 1,
      ifAbsentSetConfirmedSuccess: 3,
      ifAbsentSetConfirmedFailure: 2,
      ifAbsentSetIndeterminate: 2,
    }),
    recovery: Object.freeze({ anchorSupported: true, preMutationAnchorRequired: true, poststateAfterConfirmedSuccessOnly: true, poststateAfterIndeterminate: 0, separateApprovalRequiredAfterIndeterminate: true }),
    sourceLocks,
    unboundDependencies: 0,
    unboundRemoteCapabilities: 0,
    unboundAuthCapabilities: 0,
    prospectiveM3Reachable: false,
    nextRequiredBoundary: "NEW_M3_POST_ACCOUNTING_REPAIR_PROSPECTIVE_SAFETY_REATTESTATION",
    remoteOperations: 0,
  });
}

export function verifyG2BM3RemoteCapabilityAccountingRepair(value, options = {}) {
  let expected;
  try { expected = buildG2BM3RemoteCapabilityAccountingRepair(options); } catch { return Object.freeze({ ok: false, code: "ACCOUNTING_REPAIR_SOURCE_LOCK_FAILURE" }); }
  const ok = JSON.stringify(value) === JSON.stringify(expected);
  return Object.freeze({ ok, code: ok ? "ACCOUNTING_REPAIR_SOURCE_LOCK_MATCH" : "ACCOUNTING_REPAIR_SOURCE_LOCK_MISMATCH" });
}

export const G2B_M3_REMOTE_CAPABILITY_ACCOUNTING_REPAIR_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  remoteOperations: 0,
  prospectiveM3Reachable: false,
});
