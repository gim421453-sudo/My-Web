import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  G4R3R2_COMPOSITE_CONTRACT,
  buildG4R3R2Payload,
  computeG4R3R2Sha256,
  parseG4R3R2,
  verifyG4R3R2,
  verifyG4R3R2SourceLocks,
} from "../authority-audit/g4r3r2PostIdentityPatchFinalM3ExecutionComposite.mjs";
import { computeG4R3H_F1Sha256, verifyG4R3H_F1 } from "../authority-audit/g4r3hF1AttestationIntegrityDriftForensic.mjs";
import { computeG4R3H_R2Sha256, verifyG4R3H_R2 } from "../authority-audit/g4r3hR2CurrentStateExactIdentityImplementation.mjs";
import { computeG4R3R1_V2Sha256, verifyG4R3R1_V2 } from "../authority-audit/g4r3r1PostIdentityPatchRuntimeCapabilityAttestationV2.mjs";
import { buildM3CommandGraph } from "../authority-audit/m3RuntimeCommandGraph.mjs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const rawHash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const clone = (value) => structuredClone(value);

const f1 = readJson("docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3h-f1-attestation-integrity-drift-forensic-v1.json");
const r2 = readJson("docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3h-r2-current-state-exact-identity-implementation-v1.json");
const r1 = readJson("docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3r1-post-identity-patch-runtime-capability-v2.json");
const evidencePath = "docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3r2-post-identity-patch-final-execution-composite-v1.json";
const persisted = readJson(evidencePath);
const derived = buildG4R3R2Payload({ g4r3hR2: r2, g4r3r1: r1 });

assert.equal(verifyG4R3H_F1(f1).ok, true);
assert.equal(computeG4R3H_F1Sha256(f1), "845c4ce63d9830966ab331afd641cae127f106d3f93d03ef704a5f79659eb33b");
assert.equal(rawHash("docs/p1-5-c2h2e3d-w1c-m3l2-g4r3h-f1-attestation-runtime-lock-integrity-drift-forensic.md"), "a8cf31f138a5010a4c25831579498e269e58c30d91e03db621612540aea80ef7");

assert.equal(verifyG4R3H_R2(r2).ok, true);
assert.equal(computeG4R3H_R2Sha256(r2), "dd488891964eeac9427557b95c5cf46a42bb2f5969bbc6bcba6f55c176c79adc");
assert.equal(rawHash("docs/p1-5-c2h2e3d-w1c-m3l2-g4r3h-r2-current-state-exact-identity-implementation-superseding-attestation.md"), "dc7650788218f7aae178f8d657c81bc816a4848e4061e0364aa0c99b34b911e1");

assert.equal(verifyG4R3R1_V2(r1).ok, true);
assert.equal(computeG4R3R1_V2Sha256(r1), "82e72c67adf78a837c82c877505ab6265cfa64fda8e14e280964860c1e7909b9");
assert.equal(rawHash("docs/p1-5-c2h2e3d-w1c-m3l2-g4r3r1-post-identity-patch-runtime-command-capability-reattestation.md"), "11bcb124f12500805da2f8b2937c1456caf10e0ec9bab3fbf63e6bbd911278b7");

assert.deepEqual(persisted, derived);
assert.deepEqual(parseG4R3R2(JSON.stringify(persisted)), persisted);
assert.equal(verifyG4R3R2(persisted).ok, true);
assert.equal(computeG4R3R2Sha256(persisted), computeG4R3R2Sha256(JSON.parse(readFileSync(evidencePath, "utf8"))));
const historicalSourceLocks = verifyG4R3R2SourceLocks(persisted, {
  sdkRoot: join(process.env.LOCALAPPDATA || "", "Google", "Cloud SDK", "google-cloud-sdk"),
});
assert.equal(historicalSourceLocks.ok, false);
assert.equal(historicalSourceLocks.code, "SOURCE_LOCK_DRIFT");
assert.equal(typeof historicalSourceLocks.path, "string");

const graph = buildM3CommandGraph();
const nodeIds = graph.nodes.map((node) => node.id);
const nodeSet = new Set(nodeIds);
const predecessorEdges = graph.nodes.flatMap((node) => node.predecessorConditions
  .map((condition) => condition.split("=")[0])
  .filter((predecessor) => nodeSet.has(predecessor))
  .map((predecessor) => [predecessor, node.id]));
assert.equal(nodeIds.length, 9);
assert.equal(nodeIds.length - 1, 8);
assert.equal(predecessorEdges.length, 7);
assert.deepEqual(nodeIds, persisted.graph.nodes);
assert.equal(persisted.graph.graphIdentity, "db970e486979b1a82b4245141236d534e2b754bd345c2dc0c913e02232d5a424");
assert.equal(persisted.sourceLocks.length, new Set(persisted.sourceLocks.map((entry) => entry.path)).size);
assert.equal(persisted.sdkLocks.length, new Set(persisted.sdkLocks.map((entry) => entry.path)).size);
assert.equal(persisted.sourceLocks.length, 26);
assert.equal(persisted.sdkLocks.length, 15);

const reordered = Object.fromEntries(Object.entries(persisted).reverse());
assert.equal(computeG4R3R2Sha256(reordered), computeG4R3R2Sha256(persisted));

const reject = (mutate) => {
  const candidate = clone(persisted);
  mutate(candidate);
  assert.equal(verifyG4R3R2(candidate).ok, false);
};

reject((value) => { value.currentImplementationAuthority.g4r3hR2Attestation = "0".repeat(64); });
reject((value) => { value.currentRuntimeAuthority.g4r3r1Attestation = "0".repeat(64); });
reject((value) => { value.graph.graphIdentity = "0".repeat(64); });
reject((value) => { value.graph.executionEdgeCount = 9; });
reject((value) => { value.graph.predecessorMetadataEdgeCount = 8; });
const driftedSource = clone(persisted);
driftedSource.sourceLocks[0].sha256 = "0".repeat(64);
assert.equal(verifyG4R3R2SourceLocks(driftedSource, {
  sdkRoot: join(process.env.LOCALAPPDATA || "", "Google", "Cloud SDK", "google-cloud-sdk"),
}).ok, false);
const driftedSdk = clone(persisted);
driftedSdk.sdkLocks[0].sha256 = "0".repeat(64);
assert.equal(verifyG4R3R2SourceLocks(driftedSdk, {
  sdkRoot: join(process.env.LOCALAPPDATA || "", "Google", "Cloud SDK", "google-cloud-sdk"),
}).ok, false);
reject((value) => { value.identity.legacyFingerprintAuthorizationReachability = 1; });
reject((value) => { value.prestate.freshRequired = false; });
reject((value) => { value.prestate.r1b4Reusable = true; });
reject((value) => { value.prestate.sameMemberAsMutation = "UNRESOLVED"; });
reject((value) => { value.mutation.maxAttempts = 2; });
reject((value) => { value.mutation.retries = 1; });
reject((value) => { value.mutation.rollbacks = 1; });
reject((value) => { value.mutation.secondMutationReachable = true; });
reject((value) => { value.classifier.unknownNonzero = "CONFIRMED_FAILURE"; });
reject((value) => { value.classifier.confirmedFailureRules = ["unsafe"]; });
reject((value) => { value.poststate.required = "UNRESOLVED"; });
reject((value) => { value.poststate.indeterminateRecoveryMode = "UNRESOLVED"; });
reject((value) => { value.poststate.preexistingBindingAdoptionPolicy = "UNRESOLVED"; });
reject((value) => { value.futureLiveBudget.remoteIamPrestateReadsMax = null; });
reject((value) => { value.approvalConsumption.point = ""; });
reject((value) => { value.skippedTestPolicy.gcloudVersionHelpStatus = "PASS"; });
reject((value) => { value.skippedTestPolicy.authorityClass = "UNRESOLVED"; });
reject((value) => { value.forbiddenReachability.m4 = true; });
reject((value) => { value.forbiddenReachability.firestore = true; });
reject((value) => { value.forbiddenReachability.accessTokenGeneration = true; });
reject((value) => { value.principal = "synthetic@example.invalid"; });
reject((value) => { value.timestamp = "2099-01-01T00:00:00Z"; });

assert.deepEqual(G4R3R2_COMPOSITE_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  filesystemWrite: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});

console.log(`G4R3R2 final composite passed: ${computeG4R3R2Sha256(persisted)}; real gcloud=0; production access=0`);
