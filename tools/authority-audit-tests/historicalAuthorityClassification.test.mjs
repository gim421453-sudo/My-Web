import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  verifyG4R3R2SourceLocks,
} from "../authority-audit/g4r3r2PostIdentityPatchFinalM3ExecutionComposite.mjs";
import {
  buildG2BCurrentFinalExecutionComposite,
  buildG2BCurrentImplementationAttestation,
  buildG2BCurrentRuntimeCapabilityAttestation,
  buildG2BCurrentLiveGraph,
  verifyG2BCurrentLiveAttestations,
} from "../authority-audit/g2bM3CurrentLiveAttestation.mjs";

const historicalPath = "docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3r2-post-identity-patch-final-execution-composite-v1.json";
const historical = JSON.parse(readFileSync(historicalPath, "utf8"));

assert.equal(historical.historicalAuthorityStatus.g4r2, "HISTORICAL_STRUCTURALLY_VALID_BUT_BLOCKED_PRE_IDENTITY_PATCH_COMPOSITE");
assert.equal(historical.historicalAuthorityStatus.g4r3hGeneration1, "HISTORICAL_INCONSISTENT_ATTESTATION_CHAIN");
assert.equal(historical.futureAuthority.m3l3LiveApprovalGranted, false);

const historicalSourceCheck = verifyG4R3R2SourceLocks(historical, {
  repositoryRoot: process.cwd(),
  sdkRoot: join(process.env.LOCALAPPDATA || "", "Google", "Cloud SDK", "google-cloud-sdk"),
});
assert.equal(historicalSourceCheck.ok, false);
assert.equal(historicalSourceCheck.code, "SOURCE_LOCK_DRIFT");

const implementation = buildG2BCurrentImplementationAttestation();
const runtimeCapability = buildG2BCurrentRuntimeCapabilityAttestation();
const composite = buildG2BCurrentFinalExecutionComposite({ implementation, runtimeCapability });
assert.equal(verifyG2BCurrentLiveAttestations({ implementation, runtimeCapability, composite }).ok, true);
assert.notEqual(buildG2BCurrentLiveGraph().identity, historical.graph.graphIdentity);

console.log("Historical authority classification passed: expected historical drift; current live authority pass; remote operations=0");
