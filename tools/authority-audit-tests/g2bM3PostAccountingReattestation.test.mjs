import assert from "node:assert/strict";
import {
  buildG2BM3PostAccountingReattestation,
  G2B_POST_ACCOUNTING_REATTESTATION_CONTRACT,
  verifyG2BM3PostAccountingReattestation,
} from "../authority-audit/g2bM3PostAccountingReattestation.mjs";

const result = buildG2BM3PostAccountingReattestation();
assert.equal(verifyG2BM3PostAccountingReattestation(result).ok, true);
assert.equal(result.liveExecutorDirectTransportBindingComplete, true);
assert.equal(result.livePath.directSetIamPolicy, true);
assert.equal(result.livePath.oldGcloudMutationReachability, 0);
assert.equal(result.prestate.instanceBoundToSet, true);
assert.equal(result.prestate.etagPreserved, true);
assert.equal(result.authTransport.hiddenRemoteCalls, false);
assert.equal(result.authTransport.implicitCredentialRefresh, false);
assert.equal(result.physicalCallGraph.maximum, 3);
assert.deepEqual(result.physicalCallGraph, {
  call1: "FRESH_EXACT_G2B_SERVICE_ACCOUNT_GET_IAM_POLICY",
  call2: "CONDITIONAL_EXACT_G2B_SERVICE_ACCOUNT_SET_IAM_POLICY",
  call3: "POST_SUCCESS_EXACT_G2B_SERVICE_ACCOUNT_GET_IAM_POLICY",
  additionalHiddenPhysicalCalls: 0,
  maximum: 3,
  staticallyProvable: true,
  ifPrestatePresent: 1,
  ifAbsentSetConfirmedSuccess: 3,
  ifAbsentSetConfirmedFailure: 2,
  ifAbsentSetIndeterminate: 2,
});
assert.equal(result.safetyMatrix.S25_CURRENT_AUTH_PRECONDITION_ESTABLISHED, "BLOCKED");
assert.equal(result.currentBlockingSafetyProperty, "CURRENT_DIRECT_TRANSPORT_AUTHORIZATION_PRECONDITION_NOT_ESTABLISHED");
assert.equal(result.prospectiveNewM3SafetyReattestation, "BLOCKED");
assert.equal(result.newM3OperationGeneration, "NOT_CREATED");
assert.equal(result.sourceLocks.length, result.dependencyGraph.activeCount);
assert.equal(JSON.stringify(result).includes("operator@example.invalid"), false);

const tampered = structuredClone(result);
tampered.livePath.oldGcloudMutationReachability = 1;
assert.equal(verifyG2BM3PostAccountingReattestation(tampered).ok, false);
assert.deepEqual(G2B_POST_ACCOUNTING_REATTESTATION_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  remoteOperations: 0,
  newM3OperationReachable: false,
  blockingProperty: "CURRENT_DIRECT_TRANSPORT_AUTHORIZATION_PRECONDITION_NOT_ESTABLISHED",
});
console.log("G2B post-accounting reattestation passed; local source locks only; remote operations=0");
