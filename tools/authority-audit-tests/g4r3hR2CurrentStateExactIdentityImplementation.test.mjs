import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeG4R3H_R2Sha256, parseG4R3H_R2, verifyG4R3H_R2, verifyG4R3H_R2SourceLocks } from "../authority-audit/g4r3hR2CurrentStateExactIdentityImplementation.mjs";

const path = "docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3h-r2-current-state-exact-identity-implementation-v1.json";
const payload = JSON.parse(readFileSync(path, "utf8"));
assert.deepEqual(parseG4R3H_R2(JSON.stringify(payload)), payload);
assert.equal(verifyG4R3H_R2(payload).ok, true);
assert.deepEqual(verifyG4R3H_R2SourceLocks(payload), { ok: true, code: "SOURCE_LOCKS_MATCH", checked: 22 });
assert.equal(computeG4R3H_R2Sha256(payload), computeG4R3H_R2Sha256(JSON.parse(readFileSync(path, "utf8"))));
assert.equal(verifyG4R3H_R2({ ...payload, identityContract: { ...payload.identityContract, legacyFingerprintAuthorizationReachable: true } }).ok, false);
assert.equal(verifyG4R3H_R2({ ...payload, classifierContract: { ...payload.classifierContract, confirmedFailureRules: ["unsafe"] } }).ok, false);
assert.equal(verifyG4R3H_R2({ ...payload, forbiddenReachability: { ...payload.forbiddenReachability, tokenGeneration: true } }).ok, false);
console.log(`G4R3H-R2 current-state attestation passed: ${computeG4R3H_R2Sha256(payload)}`);
