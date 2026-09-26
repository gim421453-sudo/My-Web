import assert from "node:assert/strict";
import { buildG2BRepairedM3DpapiRecoveryReattestation, verifyG2BRepairedM3DpapiRecoveryReattestation } from "../authority-audit/g2bRepairedM3DpapiRecoveryReattestation.mjs";

const value = buildG2BRepairedM3DpapiRecoveryReattestation();
assert.equal(value.composite.prospectiveM3SafeToPrepare, true);
assert.equal(value.runtimeCapability.localDpapiOnly, true);
assert.equal(value.runtimeCapability.remoteOperationsMax, 0);
assert.equal(value.implementation.invalidMetadataRepair, "EXPLICIT_ONLY_ACTIVE_ANCHOR_COUNT_MUST_BE_ZERO");
assert.equal(verifyG2BRepairedM3DpapiRecoveryReattestation(value).ok, true);
console.log("G2B repaired M3 DPAPI recovery reattestation passed; local-only; remote operations=0");
