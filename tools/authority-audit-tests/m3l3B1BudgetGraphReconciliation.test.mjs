import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  M3L3_B1_CONTRACT,
  M3L3_B1_LIVE_GATE_ERROR_VERDICT,
  buildM3L3B1Payload,
  computeM3L3B1Sha256,
  parseM3L3B1,
  verifyM3L3B1,
} from "../authority-audit/m3l3B1BudgetGraphReconciliation.mjs";
import { buildM3CommandGraph } from "../authority-audit/m3RuntimeCommandGraph.mjs";
import {
  computeG4R3R2Sha256,
  verifyG4R3R2,
  verifyG4R3R2SourceLocks,
} from "../authority-audit/g4r3r2PostIdentityPatchFinalM3ExecutionComposite.mjs";
import {
  computeM3L3LiveEvidenceSha256,
  verifyM3L3LiveEvidence,
} from "../authority-audit/m3l3PostIdentityPatchLiveExecutionEvidence.mjs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const rawHash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const clone = (value) => structuredClone(value);

const graph = buildM3CommandGraph();
const oldCompositePath = "docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3r2-post-identity-patch-final-execution-composite-v1.json";
const oldComposite = readJson(oldCompositePath);
const stoppedEvidence = readJson("docs/evidence/p1-5-c2h2e3d-w1c-m3l3-post-identity-patch-live-execution-v1.json");
const evidencePath = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-b1-g4r3r2-budget-graph-reconciliation-v1.json";
const evidenceText = readFileSync(evidencePath, "utf8");
const persisted = JSON.parse(evidenceText);
const derived = buildM3L3B1Payload({ graph, g4r3r2: oldComposite });

assert.equal(verifyM3L3LiveEvidence(stoppedEvidence).ok, true);
assert.equal(computeM3L3LiveEvidenceSha256(stoppedEvidence), "adb7b77820533417390661e87d9a69ceec055f7da703bf04a5175fed8cc79ce4");
assert.equal(rawHash("docs/p1-5-c2h2e3d-w1c-m3l3-post-identity-patch-composite-locked-live-execution.md"), "55da01905a8c281ba388664016e1d6656d4ae39d3df36b4df13902253b271ded");

assert.equal(verifyG4R3R2(oldComposite).ok, true);
assert.equal(computeG4R3R2Sha256(oldComposite), "1bc8cef8f28de978aead7d1b82033c32fa8f45a2b98a53e9d79ec66f28943195");
assert.equal(rawHash("docs/p1-5-c2h2e3d-w1c-m3l2-g4r3r2-post-identity-patch-final-m3-execution-composite.md"), "f0421acdaf1f9649b7314613a381c8c82072f84d70365c2e8c51b66876d16ac7");
const historicalSourceLocks = verifyG4R3R2SourceLocks(oldComposite, {
  sdkRoot: join(process.env.LOCALAPPDATA || "", "Google", "Cloud SDK", "google-cloud-sdk"),
});
// The historical composite is immutable. A current fail-closed graph repair
// must surface as drift rather than relocking old live authority evidence.
assert.equal(historicalSourceLocks.ok, false);
assert.equal(historicalSourceLocks.code, "SOURCE_LOCK_DRIFT");
assert.equal(typeof historicalSourceLocks.path, "string");

assert.deepEqual(persisted, derived);
assert.deepEqual(parseM3L3B1(evidenceText), persisted);
assert.equal(verifyM3L3B1(persisted, { graph, g4r3r2: oldComposite }).ok, true);
assert.equal(persisted.verdict, M3L3_B1_LIVE_GATE_ERROR_VERDICT);
assert.equal(persisted.budgetMismatch.relation, "MATCH");
assert.deepEqual(persisted.budgetMismatch.mismatchFields, []);
assert.deepEqual(persisted.graphRequiredBudget, persisted.g4r3r2BoundBudget);
assert.equal(persisted.graphRequiredBudget.projectIamReadsMax, 2);
assert.equal(persisted.budgetMismatch.stoppedLiveApprovalProjectIamReadsMax, 0);

const pre = persisted.nodeOperationClassification.find((node) => node.nodeId === "OP_D_PRE");
const post = persisted.nodeOperationClassification.find((node) => node.nodeId === "OP_D_POST");
assert.equal(pre.resourceType, "PROJECT_IAM_POLICY");
assert.equal(pre.resourceScope, "EXACT_PROJECT");
assert.deepEqual(pre.budgetBuckets, ["remoteIamPrestateReadsMax", "projectIamReadsMax"]);
assert.equal(post.resourceType, "PROJECT_IAM_POLICY");
assert.equal(post.resourceScope, "EXACT_PROJECT");
assert.deepEqual(post.executionCondition, ["OP_C_POST=PRESENT_EXACT"]);
assert.deepEqual(post.budgetBuckets, ["remoteIamPoststateReadsMax", "projectIamReadsMax"]);
assert.deepEqual(persisted.branchProjectIamReads, {
  prestatePresentMax: 0,
  mutationSuccessMax: 2,
  mutationIndeterminateMax: 1,
  postNodeCondition: "OP_E_CONFIRMED_SUCCESS_AND_OP_C_POST_PRESENT_EXACT",
});

const firstHash = computeM3L3B1Sha256(persisted);
const secondHash = computeM3L3B1Sha256(JSON.parse(evidenceText));
assert.match(firstHash, /^[0-9a-f]{64}$/);
assert.equal(secondHash, firstHash);
assert.equal(computeM3L3B1Sha256(Object.fromEntries(Object.entries(persisted).reverse())), firstHash);

const reject = (mutate, options = {}) => {
  const candidate = clone(persisted);
  mutate(candidate);
  assert.equal(verifyM3L3B1(candidate, {
    graph: options.graph || graph,
    g4r3r2: options.g4r3r2 || oldComposite,
  }).ok, false);
};

reject((value) => { value.m3l3StoppedEvidenceSha256 = "0".repeat(64); });
reject((value) => { value.g4r3r2CompositeSha256 = "0".repeat(64); });
reject((value) => { value.graphIdentity = "0".repeat(64); });
reject((value) => { value.graphRequiredBudget.projectIamReadsMax = 0; });
reject((value) => { value.graphRequiredBudget.projectIamReadsMax = 1; });
reject((value) => { value.graphRequiredBudget.projectIamReadsMax = 3; });
reject((value) => { value.g4r3r2BoundBudget.remoteIamPrestateReadsMax = 4; });
reject((value) => { value.g4r3r2BoundBudget.remoteIamPoststateReadsMax = 1; });
reject((value) => { value.g4r3r2BoundBudget.iamMutationAttemptsMax = 2; });
reject((value) => { value.g4r3r2BoundBudget.retriesMax = 1; });
reject((value) => { value.budgetMismatch.relation = "UNDERBUDGET"; });
reject((value) => { value.budgetMismatch.mismatchFields = ["projectIamReadsMax"]; });
reject((value) => { value.correctedBudget.allowedProjectIamReadNodes = ["OP_D_PRE"]; });
reject((value) => { value.correctedBudget.allowedProjectIamReadNodes.push("PROJECT_IAM_DIAGNOSTIC"); });
reject((value) => { value.correctedBudget.supersedingCompositeRequired = true; });
reject((value) => { value.nodeOperationClassification.find((node) => node.nodeId === "OP_D_PRE").resourceScope = "EXACT_WRITER_SERVICE_ACCOUNT"; });
reject((value) => { value.nodeOperationClassification.find((node) => node.nodeId === "OP_D_POST").budgetBuckets = ["remoteIamPoststateReadsMax"]; });
reject((value) => { value.oldApprovalStatus.reusable = true; });
reject((value) => { value.privacy.rawIdentityPersisted = true; });
reject((value) => { value.principal = "raw-principal-placeholder"; });
reject((value) => { value.timestamp = "not-allowed"; });

const underbudgetComposite = clone(oldComposite);
underbudgetComposite.futureLiveBudget.projectIamReadsMax = 0;
assert.throws(() => buildM3L3B1Payload({ graph, g4r3r2: underbudgetComposite }), /project-iam-budget-not-reconciled/);

const driftedGraph = clone(graph);
driftedGraph.nodes.find((node) => node.id === "OP_D_PRE").commandSurface = "surface.iam.service_accounts.get_iam_policy";
assert.throws(() => buildM3L3B1Payload({ graph: driftedGraph, g4r3r2: oldComposite }), /node-contract-drift/);

assert.deepEqual(M3L3_B1_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  runtimeMutation: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});

console.log(`M3L3-B1 graph-budget reconciliation passed: ${firstHash}; relation=MATCH; Stage B=0; real gcloud=0`);
