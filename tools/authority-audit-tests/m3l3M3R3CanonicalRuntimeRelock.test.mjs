import assert from "node:assert/strict";
import { buildM3L3M3R3CanonicalRuntimeRelock, computeM3L3M3R3CanonicalRuntimeRelockSha256, verifyM3L3M3R3CanonicalRuntimeRelock } from "../authority-audit/m3l3M3R3CanonicalRuntimeRelock.mjs";

const payload = buildM3L3M3R3CanonicalRuntimeRelock();
assert.equal(verifyM3L3M3R3CanonicalRuntimeRelock(payload).ok, true);
assert.deepEqual(payload.canonicalRuntimeIntegration, { prestate: true, poststate: true, legacyM3StateReachability: 0, parserImplementations: 1 });
assert.equal(payload.budget.prestateRemoteReadsMax, 5);
assert.equal(payload.budget.poststateRemoteReadsMax, 2);
assert.equal(payload.budget.projectIamReadsMax, 2);
assert.deepEqual(payload.budget.allowedProjectIamReadNodes, ["OP_D_PRE", "OP_D_POST"]);
assert.equal(payload.repositoryLocks.some((entry) => entry.path.endsWith("m3l3R3CanonicalPolicyParser.mjs")), true);
assert.equal(verifyM3L3M3R3CanonicalRuntimeRelock({ ...payload, budget: { ...payload.budget, projectIamReadsMax: 1 } }).ok, false);
console.log(`M3-R3 canonical runtime relock passed: ${computeM3L3M3R3CanonicalRuntimeRelockSha256(payload)}; real gcloud=0`);
