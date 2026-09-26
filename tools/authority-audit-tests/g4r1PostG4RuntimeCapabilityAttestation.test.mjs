import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseG4R1Attestation,
  verifyG4R1Attestation,
  computeG4R1AttestationSha256,
} from "../authority-audit/g4r1PostG4RuntimeCapabilityAttestation.mjs";

const text = readFileSync("docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r1-post-g4-runtime-capability-attestation-v1.json", "utf8");
const payload = parseG4R1Attestation(text);
assert.ok(payload);
assert.deepEqual(verifyG4R1Attestation(payload).code, "PASS");
const hash = computeG4R1AttestationSha256(payload);
assert.equal(hash, computeG4R1AttestationSha256(JSON.parse(JSON.stringify(payload))));
const reordered = Object.fromEntries(Object.entries(payload).reverse());
assert.equal(hash, computeG4R1AttestationSha256(reordered));

const mutate = (change) => {
  const copy = JSON.parse(JSON.stringify(payload));
  change(copy);
  return copy;
};

assert.notEqual(computeG4R1AttestationSha256(payload), computeG4R1AttestationSha256(mutate((p) => {
  p.runtimeGraph.graphIdentity = [...p.runtimeGraph.graphIdentity].reverse();
})), "array order is intentionally preserved");
assert.equal(parseG4R1Attestation(JSON.stringify(mutate((p) => { p.runtimeGraph.retryMax = 1; }))), null);
assert.equal(parseG4R1Attestation(JSON.stringify(mutate((p) => { p.commandSurface.opEArgvChanged = true; }))), null);
assert.equal(parseG4R1Attestation(JSON.stringify(mutate((p) => { p.forbiddenReachability.m4 = true; }))), null);
assert.equal(parseG4R1Attestation(JSON.stringify(mutate((p) => { p.futureAuthority.freshFinalCompositeRequired = false; }))), null);
assert.equal(parseG4R1Attestation(JSON.stringify(mutate((p) => { p.injectedTimestamp = "2026-01-01"; }))), null);
assert.equal(parseG4R1Attestation(JSON.stringify(mutate((p) => { p.privacy.rawIdentity = true; }))), null);
assert.equal(parseG4R1Attestation(JSON.stringify(mutate((p) => { p.externalCapabilities[0].relativePath = "C:/secret"; }))), null);
console.log("G4R1 post-G4 runtime capability attestation passed; production access=0");
