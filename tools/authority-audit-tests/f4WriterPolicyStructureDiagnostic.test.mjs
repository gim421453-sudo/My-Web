import assert from "node:assert/strict";
import {
  buildF4R1WriterPolicyReadRequest,
  classifyWriterSaPolicyStructure,
  F4R1_CONTRACT,
  parseWriterSaIamPolicyForStructure,
} from "../authority-audit/f4WriterPolicyStructureDiagnostic.mjs";

assert.deepEqual(buildF4R1WriterPolicyReadRequest().args, [
  "iam", "service-accounts", "get-iam-policy",
  "<EXACT_WRITER_SA>",
  "--format=json", "--verbosity=error", "--configuration=NONE", "--account=<SESSION_EXACT_PRINCIPAL>",
]);
assert.equal(buildF4R1WriterPolicyReadRequest().readCount, 1);
assert.equal(buildF4R1WriterPolicyReadRequest().retryMax, 0);
assert.equal(buildF4R1WriterPolicyReadRequest().mutationCount, 0);

const empty = parseWriterSaIamPolicyForStructure("{}");
assert.equal(empty.ok, true);
assert.equal(empty.structure.policyVersion, "UNRESOLVED");
assert.equal(empty.structure.etagPresent, false);
assert.equal(empty.structure.targetRoleBindingCount, 0);
assert.equal(classifyWriterSaPolicyStructure(empty.structure), "AMBIGUOUS");

const policy = JSON.stringify({
  version: 3,
  etag: "secret-etag-value",
  bindings: [
    { role: "roles/viewer", members: ["serviceAccount:example@example.invalid"] },
    { role: "roles/iam.serviceAccountTokenCreator", members: ["hidden@example.invalid"] },
    { role: "roles/iam.serviceAccountTokenCreator", members: [], condition: { expression: "secret-condition" } },
  ],
  unknownField: "ignored-safe-unknown",
});
const parsed = parseWriterSaIamPolicyForStructure(policy);
assert.equal(parsed.ok, true);
assert.deepEqual(parsed.structure, {
  policyVersion: 3,
  etagPresent: true,
  conditionalBindingCount: 1,
  targetRoleBindingCount: 2,
  targetMemberPresent: "UNRESOLVED",
});
assert.equal(JSON.stringify(parsed).includes("secret-etag-value"), false);
assert.equal(JSON.stringify(parsed).includes("example@example.invalid"), false);
assert.equal(JSON.stringify(parsed).includes("secret-condition"), false);

const normalized = parseWriterSaIamPolicyForStructure("\ufeff  {\r\n  \"version\": 3,\r\n  \"etag\": \"x\",\r\n  \"bindings\": []\r\n}\n  ");
assert.equal(normalized.ok, true);
assert.equal(normalized.safePreparseMetadata.utf8BomPresent, true);
assert.equal(normalized.safePreparseMetadata.leadingWhitespacePresent, true);
assert.equal(normalized.safePreparseMetadata.trailingWhitespacePresent, true);

for (const input of ["", "   ", "[]", "WARNING\\n{\"bindings\":[]}", "{\"bindings\":[]}garbage", "{bad-json"]) {
  const result = parseWriterSaIamPolicyForStructure(input);
  assert.equal(result.ok, false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "rawPolicy"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, "error"), false);
}
assert.equal(parseWriterSaIamPolicyForStructure("{\"bindings\":null}").parseStatus, "MALFORMED_POLICY_FIELDS");
assert.equal(parseWriterSaIamPolicyForStructure("{\"bindings\":[{\"role\":\"roles/viewer\"}]}").parseStatus, "MALFORMED_POLICY_FIELDS");
assert.equal(parseWriterSaIamPolicyForStructure("{\"version\":\"3\",\"bindings\":[]}").parseStatus, "MALFORMED_POLICY_FIELDS");

assert.deepEqual(F4R1_CONTRACT.allowedPreParseNormalizations, ["UTF8_BOM_REMOVAL", "OUTER_UNICODE_WHITESPACE_TRIM"]);
assert.equal(F4R1_CONTRACT.stdoutStderrMerged, false);
assert.equal(F4R1_CONTRACT.rawStdoutPersisted, false);
assert.equal(F4R1_CONTRACT.readMax, 1);
assert.equal(F4R1_CONTRACT.retryMax, 0);
assert.equal(F4R1_CONTRACT.mutationMax, 0);

console.log("F4P1 bounded policy parser local validation passed; real gcloud=0");
