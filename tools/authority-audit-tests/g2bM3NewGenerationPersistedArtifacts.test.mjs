import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildG2BM3NewGenerationAuthorityPreparation } from "../authority-audit/g2bM3NewGenerationAuthorityPreparation.mjs";
import { buildG2BM3ProspectiveSafetyReview, verifyG2BM3ProspectiveSafetyReview } from "../authority-audit/g2bM3ProspectiveSafetyReview.mjs";

const base = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-new-generation-";
const read = (suffix) => JSON.parse(readFileSync(`${base}${suffix}.json`, "utf8"));
const persisted = {
  review: read("prospective-safety-review-v2"),
  sourceLockManifest: read("source-lock-manifest-v1"),
  implementation: read("implementation-attestation-v1"),
  runtimeCapability: read("runtime-capability-attestation-v1"),
  composite: read("final-execution-composite-v1"),
  packet: read("approval-packet-v1"),
};

assert.equal(verifyG2BM3ProspectiveSafetyReview(persisted.review).ok, false);
assert.equal(buildG2BM3ProspectiveSafetyReview().newM3OperationReachable, false);
assert.throws(() => buildG2BM3NewGenerationAuthorityPreparation({ operationGeneration: persisted.packet.operationGeneration }));
assert.equal(persisted.packet.operationGeneration, "214348c8-3be0-44f8-a010-adbe1ac68090");
assert.equal(persisted.packet.sourceLockManifestSha256, persisted.implementation.sourceLockManifestSha256);
assert.equal(persisted.packet.freshPrestateRequired, true);
assert.equal(persisted.packet.preexistingBindingPolicy, "MUTATION_0_STOP_RECONCILE");
assert.equal(persisted.packet.prestateFailurePolicy, "MUTATION_0_STOP");
assert.equal(persisted.packet.mutationAttemptsMax, 1);
assert.equal(persisted.packet.retriesMax, 0);
assert.equal(persisted.packet.rollbacksMax, 0);
assert.equal(persisted.packet.secondMutationReachable, false);
assert.equal(persisted.packet.opARemote, false);
assert.equal(persisted.packet.totalPhysicalRemoteCallsMax, 3, "historical artifact remains immutable evidence of the old undercount");
assert.equal(persisted.packet.poststateReadReachableAfterIndeterminate, false);

console.log("G2B persisted new-generation artifacts remain immutable historical evidence; prospective mutation is now blocked; remote operations=0");
