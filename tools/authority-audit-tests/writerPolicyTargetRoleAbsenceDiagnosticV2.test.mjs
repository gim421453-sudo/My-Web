import assert from "node:assert/strict";
import {
  classifyWriterPolicyTargetRoleAbsenceV2,
  TARGET_ROLE_ABSENCE_REASON_IDS_V2,
  TARGET_ROLE_ABSENCE_RESULTS_V2,
  WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT_V2,
} from "../authority-audit/writerPolicyTargetRoleAbsenceDiagnosticV2.mjs";

const absent = "ABSENT_PROVEN";
const ambiguous = "AMBIGUOUS";
const validEtag = "synthetic-etag";
const policy = (version, bindings) => ({ version, etag: validEtag, bindings });
const unrelated = { role: "roles/viewer", members: ["synthetic.invalid"] };

assert.deepEqual(classifyWriterPolicyTargetRoleAbsenceV2({}), {
  state: ambiguous, reasonId: TARGET_ROLE_ABSENCE_REASON_IDS_V2.incompletePolicy,
});
assert.deepEqual(classifyWriterPolicyTargetRoleAbsenceV2({ etag: validEtag }), {
  state: absent, reasonId: TARGET_ROLE_ABSENCE_REASON_IDS_V2.completeEtagOnlyZeroBindings,
});
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2({ etag: "" }).state, ambiguous);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2({ etag: 1 }).state, ambiguous);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(policy(1, [])).state, absent);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(policy(3, [])).state, absent);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2({ version: 2, etag: validEtag, bindings: [] }).state, ambiguous);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(policy(3, [unrelated])).state, absent);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(policy(3, [unrelated, {
  role: "roles/logging.viewer", members: [],
}])).state, absent);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(policy(3, [{
  role: "roles/iam.serviceAccountTokenCreator", members: [],
}])).state, ambiguous);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(policy(3, [{
  role: "roles/iam.serviceAccountTokenCreator", members: [], condition: { expression: "secret" },
}])).state, ambiguous);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(policy(1, [{
  role: "roles/viewer", members: [], condition: { expression: "synthetic" },
}])).state, ambiguous);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(policy(3, [{
  role: "roles/viewer", members: [], condition: { expression: "synthetic" },
}])).state, absent);

for (const malformed of [
  { version: 3, etag: validEtag, bindings: null },
  { version: 3, etag: validEtag, bindings: [null] },
  { version: 3, etag: validEtag, bindings: [{ members: [] }] },
  { version: 3, etag: validEtag, bindings: [{ role: "roles/viewer", members: "not-array" }] },
  { version: 3, etag: validEtag, bindings: [{ role: "roles/viewer", members: [], condition: [] }] },
  { version: 3, etag: validEtag, bindings: [{ role: "roles/viewer", members: [], extra: true }] },
]) {
  assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(malformed).state, ambiguous);
}

assert.equal(classifyWriterPolicyTargetRoleAbsenceV2({ targetRoleBindingCount: 0 }).state, ambiguous);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2(null).state, ambiguous);
assert.equal(classifyWriterPolicyTargetRoleAbsenceV2("{}").state, ambiguous);
assert.deepEqual(WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT_V2.resultDomain, [absent, ambiguous]);
assert.equal(WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT_V2.returnsPresentProven, false);
assert.equal(WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT_V2.memberInspectionRequired, false);
assert.equal(WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT_V2.fingerprintMatchingUsed, false);
assert.equal(Object.values(TARGET_ROLE_ABSENCE_RESULTS_V2).includes("PRESENT_PROVEN"), false);

const output = JSON.stringify(classifyWriterPolicyTargetRoleAbsenceV2(policy(3, [{
  role: "roles/viewer", members: ["sensitive@example.invalid"], condition: { expression: "secret" },
}])), WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT_V2);
assert.equal(output.includes("sensitive@example.invalid"), false);
assert.equal(output.includes("secret"), false);
assert.equal(output.includes(validEtag), false);
assert.equal(output.includes("bindings"), false);

console.log("R1B3H helper V2 synthetic matrix passed; real access=0");
