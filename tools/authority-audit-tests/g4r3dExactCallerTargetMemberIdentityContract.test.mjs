import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeG4R3DContractSha256, parseG4R3DContract, verifyG4R3DContract } from "../authority-audit/g4r3dExactCallerTargetMemberIdentityContract.mjs";

const payload = parseG4R3DContract(readFileSync("docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3d-exact-caller-target-member-identity-contract-v1.json", "utf8"));
assert.ok(payload);
assert.equal(verifyG4R3DContract(payload).code, "EFFECTIVE_CALLER_IDENTITY_SEMANTICS_UNRESOLVED");
assert.equal(computeG4R3DContractSha256(payload), computeG4R3DContractSha256(Object.fromEntries(Object.entries(payload).reverse())));
const mutate = (f) => { const p = JSON.parse(JSON.stringify(payload)); f(p); return p; };
assert.equal(parseG4R3DContract(JSON.stringify(mutate((p) => { p.legacyFingerprintStatus = "AUTHORIZATION_GRADE_EXACT_IDENTITY_PROOF_YES"; }))), null);
assert.equal(parseG4R3DContract(JSON.stringify(mutate((p) => { p.effectiveCredentialContract.status = "RESOLVED"; }))), null);
assert.equal(parseG4R3DContract(JSON.stringify(mutate((p) => { p.toctouAnalysis.status = "PROVEN_IMPOSSIBLE"; }))), null);
assert.equal(parseG4R3DContract(JSON.stringify(mutate((p) => { p.privacy.rawPrincipalPersisted = true; }))), null);
assert.equal(parseG4R3DContract(JSON.stringify(mutate((p) => { p.rawPrincipal = "private@example.invalid"; }))), null);
assert.equal(parseG4R3DContract(JSON.stringify(mutate((p) => { p.identityContext = { exactPrincipal: "private@example.invalid" }; }))), null);
assert.equal(parseG4R3DContract(JSON.stringify(mutate((p) => { p.proposedPatchScope[0].path = "C:/private"; }))), null);
console.log("G4R3D exact caller-target identity design is structurally valid but fail-closed; live access=0");
