import assert from "node:assert/strict";
import {
  buildM3L3R3CanonicalPolicyParserAttestation,
  computeM3L3R3CanonicalPolicyParserAttestationSha256,
  verifyM3L3R3CanonicalPolicyParserAttestation,
} from "../authority-audit/m3l3R3CanonicalPolicyParserAttestation.mjs";

const payload = buildM3L3R3CanonicalPolicyParserAttestation();
assert.equal(verifyM3L3R3CanonicalPolicyParserAttestation(payload).ok, true);
assert.match(computeM3L3R3CanonicalPolicyParserAttestationSha256(payload), /^[a-f0-9]{64}$/);
const changed = structuredClone(payload);
changed.localProof.genericEmptyObject = "ACCEPTED";
assert.equal(verifyM3L3R3CanonicalPolicyParserAttestation(changed).ok, false);
const budget = structuredClone(payload);
budget.budget.mutationsMax = 1;
assert.equal(verifyM3L3R3CanonicalPolicyParserAttestation(budget).ok, false);
console.log("M3L3 R3 parser attestation passed; local only; remote calls=0");
