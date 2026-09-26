import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  computeG4R3HAttestationSha256,
  parseG4R3HAttestation,
  verifyG4R3HAttestation,
} from "../authority-audit/g4r3hExactEffectiveCallerIdentity.mjs";

const file = "docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3h-exact-effective-caller-identity-implementation-v1.json";
const payload = parseG4R3HAttestation(readFileSync(file, "utf8"));
assert.ok(payload);
assert.equal(verifyG4R3HAttestation(payload).code, "EXACT_IDENTITY_CONTRACT_IMPLEMENTED_LOCAL");
assert.equal(computeG4R3HAttestationSha256(payload), computeG4R3HAttestationSha256(Object.fromEntries(Object.entries(payload).reverse())));

const mutate = (fn) => {
  const next = JSON.parse(JSON.stringify(payload));
  fn(next);
  return next;
};
assert.equal(parseG4R3HAttestation(JSON.stringify(mutate((p) => { p.identityContract.legacyFingerprintAuthorizationRemoved = false; }))), null);
assert.equal(parseG4R3HAttestation(JSON.stringify(mutate((p) => { p.callerPinning.unpinnedRetryReachable = true; }))), null);
assert.equal(parseG4R3HAttestation(JSON.stringify(mutate((p) => { p.futureAuthority.m3l3ApprovalGranted = true; }))), null);
assert.equal(parseG4R3HAttestation(JSON.stringify(mutate((p) => { p.rawPrincipal = "private@example.invalid"; }))), null);
assert.equal(parseG4R3HAttestation(JSON.stringify(mutate((p) => { p.privacy.rawArgvPersisted = true; }))), null);
assert.equal(parseG4R3HAttestation(JSON.stringify(mutate((p) => { p.postPatchRuntimeLocks[0].path = "C:/private"; }))), null);
console.log("G4R3H attestation is reproducible and privacy-safe; live access=0");
