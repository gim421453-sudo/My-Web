import assert from "node:assert/strict";
import {
  classifyWriterPolicyTargetRoleAbsence,
  TARGET_ROLE_ABSENCE_RESULTS,
  WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT,
} from "../authority-audit/writerPolicyTargetRoleAbsenceDiagnostic.mjs";

const validPolicy = (bindings) => ({ version: 3, etag: "transient-etag", bindings });

assert.equal(classifyWriterPolicyTargetRoleAbsence({}), TARGET_ROLE_ABSENCE_RESULTS.ambiguous);
assert.equal(classifyWriterPolicyTargetRoleAbsence({ version: 3, etag: "x" }), "AMBIGUOUS");
assert.equal(classifyWriterPolicyTargetRoleAbsence(validPolicy([])), "ABSENT_PROVEN");
assert.equal(
  classifyWriterPolicyTargetRoleAbsence(validPolicy([
    { role: "roles/viewer", members: ["serviceAccount:synthetic.invalid"] },
  ])),
  "ABSENT_PROVEN",
);
assert.equal(
  classifyWriterPolicyTargetRoleAbsence(validPolicy([
    { role: "roles/iam.serviceAccountTokenCreator", members: ["serviceAccount:synthetic.invalid"] },
  ])),
  "AMBIGUOUS",
);
assert.equal(
  classifyWriterPolicyTargetRoleAbsence(validPolicy([
    { role: "roles/iam.serviceAccountTokenCreator", members: [], condition: { expression: "synthetic" } },
  ])),
  "AMBIGUOUS",
);
assert.equal(
  classifyWriterPolicyTargetRoleAbsence(validPolicy([
    { role: "roles/viewer", members: ["serviceAccount:synthetic.invalid"] },
    { role: "roles/logging.viewer", members: [] },
  ])),
  "ABSENT_PROVEN",
);

for (const malformed of [
  { version: 3, etag: "x", bindings: null },
  { version: 3, etag: "x", bindings: [null] },
  { version: 3, etag: "x", bindings: [{ members: [] }] },
  { version: 3, etag: "x", bindings: [{ role: "roles/viewer", members: "not-an-array" }] },
  { version: "3", etag: "x", bindings: [] },
  { version: 3, etag: "", bindings: [] },
]) {
  assert.equal(classifyWriterPolicyTargetRoleAbsence(malformed), "AMBIGUOUS");
}

assert.equal(classifyWriterPolicyTargetRoleAbsence({ targetRoleBindingCount: 0 }), "AMBIGUOUS");
assert.equal(classifyWriterPolicyTargetRoleAbsence(null), "AMBIGUOUS");
assert.equal(classifyWriterPolicyTargetRoleAbsence("{}"), "AMBIGUOUS");
assert.deepEqual(WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT.resultDomain, ["ABSENT_PROVEN", "AMBIGUOUS"]);
assert.equal(WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT.acceptsCollapsedProjection, false);
assert.equal(WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT.inspectsMemberValues, false);
assert.equal(WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT.returnsPresentProven, false);

const output = JSON.stringify({
  result: classifyWriterPolicyTargetRoleAbsence(validPolicy([
    { role: "roles/viewer", members: ["sensitive@example.invalid"], condition: { expression: "secret" } },
  ])),
  contract: WRITER_POLICY_TARGET_ROLE_ABSENCE_CONTRACT,
});
assert.equal(output.includes("sensitive@example.invalid"), false);
assert.equal(output.includes("secret"), false);
assert.equal(output.includes("transient-etag"), false);
assert.equal(output.includes("bindings"), false);
assert.equal(Object.values(TARGET_ROLE_ABSENCE_RESULTS).includes("PRESENT_PROVEN"), false);

console.log("R1B1H identity-independent target-role absence helper passed; real access=0");
