import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  M3L3_R2_EVIDENCE_CONTRACT,
  M3L3_R2_READ_FAILURE_VERDICT,
  buildM3L3R2RecoveryEvidence,
  computeM3L3R2RecoveryEvidenceSha256,
  verifyM3L3R2RecoveryEvidence,
} from "../authority-audit/m3l3R2RecoveryEvidence.mjs";

const path = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-r2-safe-read-failure-recovery-result-v1.json";
const persisted = JSON.parse(readFileSync(path, "utf8"));
const expected = buildM3L3R2RecoveryEvidence();
const clone = (value) => structuredClone(value);

assert.deepEqual(persisted, expected);
assert.equal(verifyM3L3R2RecoveryEvidence(persisted).ok, true);
assert.equal(persisted.finalVerdict, M3L3_R2_READ_FAILURE_VERDICT);
assert.equal(computeM3L3R2RecoveryEvidenceSha256(persisted), computeM3L3R2RecoveryEvidenceSha256(expected));

const reject = (mutate) => {
  const candidate = clone(persisted);
  mutate(candidate);
  assert.equal(verifyM3L3R2RecoveryEvidence(candidate).ok, false);
};

reject((value) => { value.r2Approval.consumed = false; });
reject((value) => { value.r2Approval.reusable = true; });
reject((value) => { value.remoteRead.used = 2; });
reject((value) => { value.remoteRead.projectIamReads = 1; });
reject((value) => { value.safeFailureDiagnostic.failureClass = "AUTHORIZATION"; });
reject((value) => { value.safeFailureDiagnostic.stdoutSizeBucket = "MEDIUM"; });
reject((value) => { value.forbiddenOperationCounts.iamMutations = 1; });
reject((value) => { value.forbiddenOperationCounts.retries = 1; });
reject((value) => { value.privacy.errorTextPersisted = true; });
reject((value) => { value.principal = "must-not-be-persisted"; });

assert.deepEqual(M3L3_R2_EVIDENCE_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  canonicalization: "recursive-lexicographic-json-utf8-sha256",
});

console.log(`M3L3 R2 recovery evidence passed: ${computeM3L3R2RecoveryEvidenceSha256(persisted)}; no retry`);
