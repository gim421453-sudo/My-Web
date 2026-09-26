import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeG4R3SAttestationSha256, parseG4R3SAttestation, verifyG4R3SAttestation } from "../authority-audit/g4r3sEffectiveCallerPinningSemantics.mjs";

const payload = parseG4R3SAttestation(readFileSync("docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3s-effective-caller-pinning-semantics-v1.json", "utf8"));
assert.ok(payload);
assert.equal(verifyG4R3SAttestation(payload).code, "PINNED_ACCOUNT_CREDENTIAL_FALLBACK_UNRESOLVED");
assert.equal(computeG4R3SAttestationSha256(payload), computeG4R3SAttestationSha256(Object.fromEntries(Object.entries(payload).reverse())));
const mutate = (f) => { const p = JSON.parse(JSON.stringify(payload)); f(p); return p; };
assert.equal(parseG4R3SAttestation(JSON.stringify(mutate((p) => { p.officialSemantics.accessTokenCanIgnoreActiveAccount = false; }))), null);
assert.equal(parseG4R3SAttestation(JSON.stringify(mutate((p) => { p.accountPinningSemantics.configAccountToctou = "STILL_POSSIBLE"; }))), null);
assert.equal(parseG4R3SAttestation(JSON.stringify(mutate((p) => { p.authOverrideInventory.valuesPersisted = 1; }))), null);
assert.equal(parseG4R3SAttestation(JSON.stringify(mutate((p) => { p.futureAuthorityRequirements.m3l3ApprovalGranted = true; }))), null);
assert.equal(parseG4R3SAttestation(JSON.stringify(mutate((p) => { p.rawPrincipal = "private@example.invalid"; }))), null);
assert.equal(parseG4R3SAttestation(JSON.stringify(mutate((p) => { p.proposedPatchScope[0].path = "C:/private"; }))), null);
console.log("G4R3S caller-pinning semantics are locally reconciled but fail-closed; live access=0");
