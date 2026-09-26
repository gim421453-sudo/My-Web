import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  M3L3_RECOVERY_PLAN_CONTRACT,
  M3L3_RECOVERY_PLAN_VERDICT,
  buildM3L3PostFailureRecoveryPlan,
  computeM3L3PostFailureRecoveryPlanSha256,
  verifyM3L3PostFailureRecoveryPlan,
} from "../authority-audit/m3l3PostFailureRecoveryPlan.mjs";

const path = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-r1-read-only-recovery-plan-v1.json";
const persisted = JSON.parse(readFileSync(path, "utf8"));
const expected = buildM3L3PostFailureRecoveryPlan();
const clone = (value) => structuredClone(value);

assert.deepEqual(persisted, expected);
assert.equal(verifyM3L3PostFailureRecoveryPlan(persisted).ok, true);
assert.equal(persisted.verdict, M3L3_RECOVERY_PLAN_VERDICT);
assert.equal(computeM3L3PostFailureRecoveryPlanSha256(persisted), computeM3L3PostFailureRecoveryPlanSha256(expected));

const reject = (mutate) => {
  const candidate = clone(persisted);
  mutate(candidate);
  assert.equal(verifyM3L3PostFailureRecoveryPlan(candidate).ok, false);
};

reject((value) => { value.budget.remoteIamReadsMax = 2; });
reject((value) => { value.budget.projectIamReadsMax = 1; });
reject((value) => { value.budget.iamMutationAttemptsMax = 1; });
reject((value) => { value.budget.retriesMax = 1; });
reject((value) => { value.nodes[1].maxExecutions = 2; });
reject((value) => { value.nodes.push({ id: "EXTRA_REMOTE_READ" }); });
reject((value) => { value.identityStrategy.fingerprintAuthority = true; });
reject((value) => { value.identityStrategy.historicalIdentityReconstruction = true; });
reject((value) => { value.privacy.exactIamMemberPersisted = true; });
reject((value) => { value.execution.approved = true; });
reject((value) => { value.execution.executed = true; });
reject((value) => { value.execution.productionCalls = 1; });

assert.deepEqual(M3L3_RECOVERY_PLAN_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  mutationAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});

console.log(`M3L3 read-only recovery plan passed: ${computeM3L3PostFailureRecoveryPlanSha256(persisted)}; production access=0`);
