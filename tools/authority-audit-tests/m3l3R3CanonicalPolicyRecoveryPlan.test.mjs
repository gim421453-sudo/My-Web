import assert from "node:assert/strict";
import {
  buildM3L3R3CanonicalPolicyRecoveryPlan,
  computeM3L3R3CanonicalPolicyRecoveryPlanSha256,
  verifyM3L3R3CanonicalPolicyRecoveryPlan,
} from "../authority-audit/m3l3R3CanonicalPolicyRecoveryPlan.mjs";

const plan = buildM3L3R3CanonicalPolicyRecoveryPlan();
assert.equal(verifyM3L3R3CanonicalPolicyRecoveryPlan(plan).ok, true);
assert.match(computeM3L3R3CanonicalPolicyRecoveryPlanSha256(plan), /^[a-f0-9]{64}$/);
for (const mutate of [
  (value) => { value.budget.writerSaGetIamPolicyReadsMax = 2; },
  (value) => { value.budget.iamMutationsMax = 1; },
  (value) => { value.budget.retriesMax = 1; },
  (value) => { value.execution.executed = true; },
]) {
  const changed = structuredClone(plan); mutate(changed);
  assert.equal(verifyM3L3R3CanonicalPolicyRecoveryPlan(changed).ok, false);
}
console.log("M3L3 R3 recovery plan passed; local only; remote calls=0");
