import assert from "node:assert/strict";
import { buildG2BRepairedM3ProspectiveSafetyReattestation, verifyG2BRepairedM3ProspectiveSafetyReattestation } from "../authority-audit/g2bRepairedM3ProspectiveSafetyReattestation.mjs";

const value = buildG2BRepairedM3ProspectiveSafetyReattestation();
assert.equal(value.composite.prospectiveM3SafeToPrepare, true);
assert.equal(value.implementation.oldGcloudMutationReachability, 0);
assert.equal(value.runtimeCapability.budgets.freshPrestateWriterIamPolicyReadsMax, 1);
assert.equal(value.runtimeCapability.budgets.directSetIamPolicyCallsMax, 1);
assert.equal(value.runtimeCapability.budgets.testIamPermissionsCallsMax, 0);
assert.equal(value.runtimeCapability.approvalBeforeFirstRemoteRequired, true);
assert.equal(verifyG2BRepairedM3ProspectiveSafetyReattestation(value).ok, true);
console.log("G2B repaired M3 prospective safety reattestation passed; local-only; remote operations=0");
