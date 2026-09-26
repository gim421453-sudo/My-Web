import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  M3L3_BUDGET_VIOLATION_VERDICT,
  M3L3_LIVE_EVIDENCE_CONTRACT,
  canonicalizeM3L3LiveEvidence,
  computeM3L3LiveEvidenceSha256,
  parseM3L3LiveEvidence,
  verifyM3L3LiveEvidence,
} from "../authority-audit/m3l3PostIdentityPatchLiveExecutionEvidence.mjs";

const evidencePath = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-post-identity-patch-live-execution-v1.json";
const persistedText = readFileSync(evidencePath, "utf8");
const persisted = JSON.parse(persistedText);
const clone = (value) => structuredClone(value);

assert.deepEqual(parseM3L3LiveEvidence(persistedText), persisted);
assert.equal(verifyM3L3LiveEvidence(persisted).ok, true);
assert.equal(verifyM3L3LiveEvidence(persisted).code, "LIVE_BUDGET_VIOLATION_FAIL_CLOSED");
assert.equal(persisted.finalVerdict, M3L3_BUDGET_VIOLATION_VERDICT);

const firstHash = computeM3L3LiveEvidenceSha256(persisted);
const secondHash = computeM3L3LiveEvidenceSha256(JSON.parse(persistedText));
assert.match(firstHash, /^[0-9a-f]{64}$/);
assert.equal(secondHash, firstHash);
assert.equal(canonicalizeM3L3LiveEvidence(persisted), canonicalizeM3L3LiveEvidence(JSON.parse(persistedText)));

const reordered = Object.fromEntries(Object.entries(persisted).reverse());
assert.equal(computeM3L3LiveEvidenceSha256(reordered), firstHash);

const reject = (mutate) => {
  const candidate = clone(persisted);
  mutate(candidate);
  assert.equal(verifyM3L3LiveEvidence(candidate).ok, false);
};

reject((value) => { value.g4r3r2CompositeSha256 = "0".repeat(64); });
reject((value) => { value.g4r3r2ResultDocumentSha256 = "0".repeat(64); });
reject((value) => { value.g4r3r1AttestationSha256 = "0".repeat(64); });
reject((value) => { value.g4r3hR2AttestationSha256 = "0".repeat(64); });
reject((value) => { value.approval.reusable = true; });
reject((value) => { value.approval.consumed = true; });
reject((value) => { value.approval.status = "CONSUMED_NON_REUSABLE"; });
reject((value) => { value.budgetContract.lockedCompositeProjectIamReadsMax = 0; });
reject((value) => { value.budgetContract.approvedProjectIamReadsMax = 2; });
reject((value) => { value.budgetContract.compatible = true; });
reject((value) => { value.budgetContract.decision = "CONTINUE"; });
reject((value) => { value.budgetContract.requiredGraphProjectIamReadNodes = ["OP_D_PRE"]; });
reject((value) => { value.budgets.localIdentityDiscoveryUsed = 1; });
reject((value) => { value.budgets.prestateReadsUsed = 1; });
reject((value) => { value.budgets.prestateReadsUsed = 6; });
reject((value) => { value.budgets.mutationAttemptsUsed = 1; });
reject((value) => { value.budgets.mutationAttemptsUsed = 2; });
reject((value) => { value.budgets.poststateReadsUsed = 1; });
reject((value) => { value.budgets.poststateReadsUsed = 3; });
reject((value) => { value.budgets.retriesUsed = 1; });
reject((value) => { value.identity.exactContextEstablished = true; });
reject((value) => { value.identity.rawIdentityPersisted = true; });
reject((value) => { value.identity.principal = "raw-principal-placeholder"; });
reject((value) => { value.prestate.result = "PRESENT"; });
reject((value) => { value.prestate.readsUsed = 1; });
reject((value) => { value.mutation.attempted = true; });
reject((value) => { value.mutation.outcome = "CONFIRMED_SUCCESS"; });
reject((value) => { value.mutation.retryCount = 1; });
reject((value) => { value.mutation.rollbackCount = 1; });
reject((value) => { value.mutation.secondMutationAttempted = true; });
reject((value) => { value.poststate.executed = true; });
reject((value) => { value.poststate.readsUsed = 1; });
reject((value) => { value.m4.approvalGranted = true; });
reject((value) => { value.m4.mutations = 1; });
reject((value) => { value.forbiddenOperations.accessTokenCalls = 1; });
reject((value) => { value.forbiddenOperations.cloudLoggingReads = 1; });
reject((value) => { value.forbiddenOperations.deployments = 1; });
reject((value) => { value.forbiddenOperations.firestoreApiCalls = 1; });
reject((value) => { value.forbiddenOperations.projectIamMutations = 1; });
reject((value) => { value.forbiddenOperations.projectIamReads = 1; });
reject((value) => { value.forbiddenOperations.serviceAccountKeyOperations = 1; });
reject((value) => { value.forbiddenOperations.testIamPermissionsCalls = 1; });
reject((value) => { value.privacy.tokenPersisted = true; });
reject((value) => { value.timestamp = "2099-01-01T00:00:00Z"; });
reject((value) => { value.rawIamPolicy = "not-allowed"; });

assert.deepEqual(M3L3_LIVE_EVIDENCE_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});

console.log(`M3L3 live budget violation evidence passed: ${firstHash}; OP-A=0; gcloud=0; production access=0`);
