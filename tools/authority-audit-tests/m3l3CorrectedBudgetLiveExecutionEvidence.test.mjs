import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  M3L3_CORRECTED_LIVE_BLOCKED_VERDICT,
  M3L3_CORRECTED_LIVE_EVIDENCE_CONTRACT,
  canonicalizeM3L3CorrectedLiveEvidence,
  computeM3L3CorrectedLiveEvidenceSha256,
  parseM3L3CorrectedLiveEvidence,
  verifyM3L3CorrectedLiveEvidence,
} from "../authority-audit/m3l3CorrectedBudgetLiveExecutionEvidence.mjs";

const evidencePath = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-corrected-project-iam-budget-live-execution-v2.json";
const persistedText = readFileSync(evidencePath, "utf8");
const persisted = JSON.parse(persistedText);
const clone = (value) => structuredClone(value);

assert.deepEqual(parseM3L3CorrectedLiveEvidence(persistedText), persisted);
assert.equal(verifyM3L3CorrectedLiveEvidence(persisted).ok, true);
assert.equal(verifyM3L3CorrectedLiveEvidence(persisted).code, "LIVE_RESULT_UNAVAILABLE_FAIL_CLOSED");
assert.equal(persisted.finalVerdict, M3L3_CORRECTED_LIVE_BLOCKED_VERDICT);

const firstHash = computeM3L3CorrectedLiveEvidenceSha256(persisted);
const secondHash = computeM3L3CorrectedLiveEvidenceSha256(JSON.parse(persistedText));
assert.match(firstHash, /^[0-9a-f]{64}$/);
assert.equal(secondHash, firstHash);
assert.equal(canonicalizeM3L3CorrectedLiveEvidence(persisted), canonicalizeM3L3CorrectedLiveEvidence(JSON.parse(persistedText)));
assert.equal(computeM3L3CorrectedLiveEvidenceSha256(Object.fromEntries(Object.entries(persisted).reverse())), firstHash);

const reject = (mutate) => {
  const candidate = clone(persisted);
  mutate(candidate);
  assert.equal(verifyM3L3CorrectedLiveEvidence(candidate).ok, false);
};

reject((value) => { value.newApprovalBudget.projectIamReadsMax = 0; });
reject((value) => { value.newApprovalBudget.projectIamReadsMax = 3; });
reject((value) => { value.actualUsage.projectIamReads.max = 3; });
reject((value) => { value.allowedProjectIamReadNodes.push("EXTRA_PROJECT_READ"); });
reject((value) => { value.actualUsage.projectIamReadNodes.OP_D_PRE.maxExecutions = 2; });
reject((value) => { value.actualUsage.projectIamReadNodes.OP_D_POST.maxExecutions = 2; });
reject((value) => { value.actualUsage.projectIamReadNodes.OP_D_PRE.physicalCallsPerExecution = 2; });
reject((value) => { value.actualUsage.projectIamReadNodes.OP_D_POST.physicalCallsPerExecution = 2; });
reject((value) => { value.actualUsage.remoteIamPrestateReads.max = 6; });
reject((value) => { value.actualUsage.iamMutationAttempts.max = 2; });
reject((value) => { value.actualUsage.remoteIamPoststateReads.max = 3; });
reject((value) => { value.forbiddenOperationCounts.retries = 1; });
reject((value) => { value.forbiddenOperationCounts.rollbacks = 1; });
reject((value) => { value.safetyClaims.poststateAfterIndeterminateReachable = true; });
reject((value) => { value.safetyClaims.prestatePresentAutoAdoptReachable = true; });
reject((value) => { value.safetyClaims.secondMutationReachable = true; });
reject((value) => { value.forbiddenOperationCounts.m4Mutations = 1; });
reject((value) => { value.forbiddenOperationCounts.firestoreCalls = 1; });
reject((value) => { value.forbiddenOperationCounts.accessTokenCalls = 1; });
reject((value) => { value.forbiddenOperationCounts.cloudLoggingReads = 1; });
reject((value) => { value.forbiddenOperationCounts.testIamPermissionsCalls = 1; });
reject((value) => { value.forbiddenOperationCounts.projectIamMutations = 1; });
reject((value) => { value.privacy.exactIdentityPersisted = true; });
reject((value) => { value.approvalConsumption.consumed = false; });
reject((value) => { value.approvalConsumption.reusable = true; });
reject((value) => { value.previousStoppedApproval.reusable = true; });
reject((value) => { value.mutationOutcome = "CONFIRMED_SUCCESS"; });
reject((value) => { value.finalM3State = "EXACT_BINDING_CONFIRMED"; });

assert.deepEqual(M3L3_CORRECTED_LIVE_EVIDENCE_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});

console.log(`M3L3 corrected-budget live evidence fail-closed: ${firstHash}; approval consumed; no recovery calls`);
