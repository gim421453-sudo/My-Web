import assert from "node:assert/strict";
import {
  buildG2BM3RemoteCapabilityAccountingRepair,
  G2B_M3_REMOTE_CAPABILITY_ACCOUNTING_REPAIR_CONTRACT,
  verifyG2BM3RemoteCapabilityAccountingRepair,
} from "../authority-audit/g2bM3RemoteCapabilityAccountingRepair.mjs";

const repair = buildG2BM3RemoteCapabilityAccountingRepair();
assert.equal(verifyG2BM3RemoteCapabilityAccountingRepair(repair).ok, true);
assert.equal(repair.architecture, "B_EXPLICIT_PRESTATE_GET_IN_MEMORY_POLICY_UPDATE_DIRECT_SET_IAM_POLICY");
assert.deepEqual(repair.oldGcloudMutationPath, {
  identified: true, reachableFromFutureM3: false, fallbackReachable: false, retryReachable: false,
});
assert.equal(repair.directSetIamPolicy.supported, true);
assert.equal(repair.directSetIamPolicy.method, "iam.projects.serviceAccounts.setIamPolicy");
assert.equal(repair.directSetIamPolicy.requestMethod, "POST");
assert.equal(repair.directSetIamPolicy.etagRequiredAndPreserved, true);
assert.deepEqual(repair.physicalCallGraph, {
  call1: "FRESH_EXACT_SERVICE_ACCOUNT_GET_IAM_POLICY",
  call2: "CONDITIONAL_EXACT_SERVICE_ACCOUNT_SET_IAM_POLICY",
  call3: "POST_SUCCESS_EXACT_SERVICE_ACCOUNT_GET_IAM_POLICY",
  additionalHiddenPhysicalCalls: 0,
  maximum: 3,
  ifPrestatePresent: 1,
  ifAbsentSetConfirmedSuccess: 3,
  ifAbsentSetConfirmedFailure: 2,
  ifAbsentSetIndeterminate: 2,
});
  assert.equal(repair.credentialBoundary.implicitRefreshReachable, false);
  assert.equal(repair.credentialBoundary.expiredOrUnknownFailsBeforeHttp, true);
  assert.equal(repair.credentialBoundary.rawPolicyTransientAcrossProcessBoundary, true);
  assert.equal(repair.credentialBoundary.rawPolicyPersisted, false);
  assert.equal(repair.credentialBoundary.directTransportBoundToLiveExecutor, true);
assert.equal(repair.recovery.poststateAfterIndeterminate, 0);
assert.equal(repair.unboundDependencies, 0);
assert.equal(repair.unboundRemoteCapabilities, 0);
assert.equal(repair.unboundAuthCapabilities, 0);
  assert.equal(repair.prospectiveM3Reachable, false);
  assert.equal(repair.sourceLocks.some((lock) => lock.path.endsWith("g2b_explicit_set_iam_policy_transport.py")), true);
assert.equal(JSON.stringify(repair).includes("@"), false);

const tampered = structuredClone(repair);
tampered.physicalCallGraph.maximum = 4;
assert.equal(verifyG2BM3RemoteCapabilityAccountingRepair(tampered).ok, false);
assert.deepEqual(G2B_M3_REMOTE_CAPABILITY_ACCOUNTING_REPAIR_CONTRACT, {
  networkAccess: false, processSpawn: false, productionAccess: false, remoteOperations: 0, prospectiveM3Reachable: false,
});
console.log("G2B remote capability accounting repair attestation passed; local only; remote operations=0");
