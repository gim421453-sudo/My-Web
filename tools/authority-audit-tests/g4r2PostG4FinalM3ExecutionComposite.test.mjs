import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseG4R2Composite, verifyG4R2Composite, computeG4R2CompositeSha256 } from "../authority-audit/g4r2PostG4FinalM3ExecutionComposite.mjs";

const payload = parseG4R2Composite(readFileSync("docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r2-post-g4-final-m3-execution-composite-v1.json", "utf8"));
assert.ok(payload);
assert.equal(verifyG4R2Composite(payload).code, "FRESH_PRESTATE_IDENTITY_CONTRACT_UNRESOLVED");
const hash = computeG4R2CompositeSha256(payload);
assert.equal(hash, computeG4R2CompositeSha256(Object.fromEntries(Object.entries(payload).reverse())));
const mutate = (f) => { const p = JSON.parse(JSON.stringify(payload)); f(p); return p; };
assert.equal(parseG4R2Composite(JSON.stringify(mutate((p) => { p.runtimeGraph.retryMax = 1; }))), null);
assert.equal(parseG4R2Composite(JSON.stringify(mutate((p) => { p.externalCapabilities.pop(); }))), null);
assert.equal(parseG4R2Composite(JSON.stringify(mutate((p) => { p.prestate.r1b4ReusableAsFreshPrestate = true; }))), null);
assert.equal(parseG4R2Composite(JSON.stringify(mutate((p) => { p.forbiddenReachability.firestore = true; }))), null);
assert.equal(parseG4R2Composite(JSON.stringify(mutate((p) => { p.futureAuthority.m3l3LiveApprovalGranted = true; }))), null);
assert.equal(parseG4R2Composite(JSON.stringify(mutate((p) => { p.injectedTimestamp = "x"; }))), null);
assert.equal(parseG4R2Composite(JSON.stringify(mutate((p) => { p.absolutePath = "C:/x"; }))), null);
console.log("G4R2 composite relock built fail-closed; M3L3 approval eligible=no; production access=0");
