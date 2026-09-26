import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeG4R3R1_V2Sha256, parseG4R3R1_V2, verifyG4R3R1_V2, verifyG4R3R1_V2SourceLocks } from "../authority-audit/g4r3r1PostIdentityPatchRuntimeCapabilityAttestationV2.mjs";

const path = "docs/evidence/p1-5-c2h2e3d-w1c-m3l2-g4r3r1-post-identity-patch-runtime-capability-v2.json";
const payload = JSON.parse(readFileSync(path, "utf8"));
const sdkRoot = join(process.env.LOCALAPPDATA || "", "Google", "Cloud SDK", "google-cloud-sdk");
assert.deepEqual(parseG4R3R1_V2(JSON.stringify(payload)), payload);
assert.equal(verifyG4R3R1_V2(payload).ok, true);
assert.deepEqual(verifyG4R3R1_V2SourceLocks(payload, { sdkRoot }), { ok: true, code: "SOURCE_LOCKS_MATCH", checked: 33 });
assert.equal(computeG4R3R1_V2Sha256(payload), computeG4R3R1_V2Sha256(JSON.parse(readFileSync(path, "utf8"))));
assert.equal(verifyG4R3R1_V2({ ...payload, identityContract: { ...payload.identityContract, legacyFingerprintAuthorizationReachability: 1 } }).ok, false);
assert.equal(verifyG4R3R1_V2({ ...payload, prestate: { ...payload.prestate, memberEqualsMutation: "UNRESOLVED" } }).ok, false);
assert.equal(verifyG4R3R1_V2({ ...payload, externalCapabilities: { ...payload.externalCapabilities, unbound: 1 } }).ok, false);
console.log(`G4R3R1 v2 capability attestation passed: ${computeG4R3R1_V2Sha256(payload)}`);
