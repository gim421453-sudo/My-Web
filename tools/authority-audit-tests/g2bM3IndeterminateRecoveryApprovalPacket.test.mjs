import assert from "node:assert/strict";
import { buildG2BM3IndeterminateRecoveryApprovalPacket, verifyG2BM3IndeterminateRecoveryApprovalPacket } from "../authority-audit/g2bM3IndeterminateRecoveryApprovalPacket.mjs";

const packet = buildG2BM3IndeterminateRecoveryApprovalPacket();
assert.equal(verifyG2BM3IndeterminateRecoveryApprovalPacket(packet).ok, true);
for (const [key, value] of Object.entries({ writerSaIamReadsMax: 2, m3MutationsMax: 1, retriesMax: 1, rollbacksMax: 1, recoveryRequiresNewOpA: true })) {
  assert.equal(verifyG2BM3IndeterminateRecoveryApprovalPacket({ ...packet, [key]: value }).ok, false, `${key} must fail closed`);
}
console.log("G2B M3 indeterminate recovery approval packet matrix passed; remote operations=0");
