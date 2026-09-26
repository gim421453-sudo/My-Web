import assert from "node:assert/strict";
import {
  buildM3R3PostIndeterminateRecoveryStrategy,
  computeM3R3PostIndeterminateRecoveryStrategySha256,
  M3_R3_POST_INDETERMINATE_RECOVERY_STRATEGY_CONTRACT,
  verifyM3R3PostIndeterminateRecoveryStrategy,
} from "../authority-audit/m3l3M3R3PostIndeterminateRecoveryStrategy.mjs";

const payload = buildM3R3PostIndeterminateRecoveryStrategy();
assert.equal(verifyM3R3PostIndeterminateRecoveryStrategy(payload).ok, true);
assert.equal(computeM3R3PostIndeterminateRecoveryStrategySha256(payload), computeM3R3PostIndeterminateRecoveryStrategySha256({ ...payload }));

for (const candidate of [
  { ...payload, pathA: { ...payload.pathA, prestateTargetRoleCardinalityProof: true } },
  { ...payload, pathA: { ...payload.pathA, externalConcurrentWriterRuledOut: true } },
  { ...payload, pathB: { ...payload.pathB, timeWindowRecoverable: true } },
  { ...payload, pathB: { ...payload.pathB, exactMemberRecoverable: "YES" } },
  { ...payload, pathB: { ...payload.pathB, resultDomain: [...payload.pathB.resultDomain, "MEMBER_ABSENT_AFTER_PARSE_FAILURE"] } },
  { ...payload, futureDefect: { ...payload.futureDefect, historicalSessionRetrofitAllowed: true } },
  { ...payload, safety: { ...payload.safety, iamReads: 1 } },
  { ...payload, safety: { ...payload.safety, secondMutationAllowed: true } },
]) {
  assert.equal(verifyM3R3PostIndeterminateRecoveryStrategy(candidate).ok, false);
}

assert.equal(M3_R3_POST_INDETERMINATE_RECOVERY_STRATEGY_CONTRACT.displayFingerprintAuthority, false);
console.log("M3-R3 post-indeterminate strategy attack matrix passed; remote operations=0");
