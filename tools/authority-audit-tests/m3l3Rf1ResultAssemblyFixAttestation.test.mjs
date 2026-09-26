import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  M3L3_RF1_CONTRACT,
  M3L3_RF1_VERDICT,
  buildM3L3Rf1Attestation,
  computeM3L3Rf1AttestationSha256,
  verifyM3L3Rf1Attestation,
} from "../authority-audit/m3l3Rf1ResultAssemblyFixAttestation.mjs";

const path = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-rf1-result-assembly-fix-attestation-v1.json";
const persisted = JSON.parse(readFileSync(path, "utf8"));
const expected = buildM3L3Rf1Attestation();
const clone = (value) => structuredClone(value);

assert.deepEqual(persisted, expected);
assert.equal(verifyM3L3Rf1Attestation(persisted).ok, true);
assert.equal(persisted.verdict, M3L3_RF1_VERDICT);
assert.equal(computeM3L3Rf1AttestationSha256(persisted), computeM3L3Rf1AttestationSha256(expected));

const reject = (mutate) => {
  const candidate = clone(persisted);
  mutate(candidate);
  assert.equal(verifyM3L3Rf1Attestation(candidate).ok, false);
};

reject((value) => { value.rootCause.runtimeCallAlreadyCompletedBeforeReferenceError = false; });
reject((value) => { value.rootCause.failureStage = "BEFORE_RUNTIME_RETURN"; });
reject((value) => { value.fix.unknownResultSerialization = "FAIL"; });
reject((value) => { value.authorityImpact.lockedRuntimeChanged = true; });
reject((value) => { value.authorityImpact.g4r3r2SupersessionRequired = true; });
reject((value) => { value.recoveryPlan.remoteIamReadsMax = 2; });
reject((value) => { value.recoveryPlan.iamMutationsMax = 1; });
reject((value) => { value.recoveryPlan.executed = true; });
reject((value) => { value.privacy.exactIdentityPersisted = true; });
reject((value) => { value.execution.productionCalls = 1; });

assert.deepEqual(M3L3_RF1_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  lockedRuntimeMutation: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});

console.log(`M3L3 RF1 attestation passed: ${computeM3L3Rf1AttestationSha256(persisted)}; production access=0`);
