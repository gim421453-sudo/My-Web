import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { computeG4R3H_F1Sha256, parseG4R3H_F1, verifyG4R3H_F1 } from "../authority-audit/g4r3hF1AttestationIntegrityDriftForensic.mjs";

const path = "docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3h-f1-attestation-integrity-drift-forensic-v1.json";
const payload = JSON.parse(readFileSync(path, "utf8"));
assert.deepEqual(parseG4R3H_F1(JSON.stringify(payload)), payload);
assert.equal(verifyG4R3H_F1(payload).ok, true);
const first = computeG4R3H_F1Sha256(payload);
const second = computeG4R3H_F1Sha256(JSON.parse(readFileSync(path, "utf8")));
assert.equal(first, second);
assert.equal(payload.currentPayloadRecomputedAttestation, "4b57d183865f0671736497059b67bd5873d441b6c25f94c2fef15d37aa62b134");
assert.equal(payload.g4r3r1ApprovalEligible, false);
console.log(`G4R3H-F1 forensic attestation passed: ${first}`);
