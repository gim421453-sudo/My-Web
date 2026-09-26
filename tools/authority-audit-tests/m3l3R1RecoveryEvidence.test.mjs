import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  M3L3_R1_EVIDENCE_CONTRACT,
  M3L3_R1_READ_FAILURE_VERDICT,
  buildM3L3R1RecoveryEvidence,
  computeM3L3R1RecoveryEvidenceSha256,
  verifyM3L3R1RecoveryEvidence,
} from "../authority-audit/m3l3R1RecoveryEvidence.mjs";

const path = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-r1-read-only-recovery-result-v1.json";
const persisted = JSON.parse(readFileSync(path, "utf8"));
const expected = buildM3L3R1RecoveryEvidence();
const clone = (value) => structuredClone(value);

assert.deepEqual(persisted, expected);
assert.equal(verifyM3L3R1RecoveryEvidence(persisted).ok, true);
assert.equal(persisted.finalVerdict, M3L3_R1_READ_FAILURE_VERDICT);
assert.equal(computeM3L3R1RecoveryEvidenceSha256(persisted), computeM3L3R1RecoveryEvidenceSha256(expected));

const reject = (mutate) => {
  const candidate = clone(persisted);
  mutate(candidate);
  assert.equal(verifyM3L3R1RecoveryEvidence(candidate).ok, false);
};

reject((value) => { value.approval.consumed = false; });
reject((value) => { value.approval.reusable = true; });
reject((value) => { value.approval.maxRemoteReads = 2; });
reject((value) => { value.identity.discoveryUsed = 2; });
reject((value) => { value.identity.rawIdentityPersisted = true; });
reject((value) => { value.remoteRead.writerSaGetIamPolicyReads = 2; });
reject((value) => { value.remoteRead.projectIamReads = 1; });
reject((value) => { value.recoveryResult = "PRESENT_CONFIRMED"; });
reject((value) => { value.forbiddenOperationCounts.iamMutations = 1; });
reject((value) => { value.forbiddenOperationCounts.retries = 1; });
reject((value) => { value.privacy.rawIamPolicyPersisted = true; });
reject((value) => { value.nextApproval.automaticRetryAllowed = true; });
reject((value) => { value.principal = "must-not-be-persisted"; });

assert.deepEqual(M3L3_R1_EVIDENCE_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});

console.log(`M3L3 R1 recovery evidence passed: ${computeM3L3R1RecoveryEvidenceSha256(persisted)}; no recovery retry`);
