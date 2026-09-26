import assert from "node:assert/strict";
import {
  classifyCanonicalWriterPolicy,
  M3L3_R3_CANONICAL_POLICY_PARSER_CONTRACT,
  parseCanonicalWriterPolicy,
  projectCanonicalWriterPolicyResult,
  R3_POLICY_PARSE_STATUS,
} from "../authority-audit/m3l3R3CanonicalPolicyParser.mjs";

const exactMember = "serviceAccount:synthetic@example.invalid";
const valid = (bindings, extra = {}) => JSON.stringify({ etag: "synthetic-etag", bindings, ...extra });
const targetBinding = (members = [exactMember], extra = {}) => ({
  role: "roles/iam.serviceAccountTokenCreator", members, ...extra,
});
const otherBinding = { role: "roles/viewer", members: ["user:other@example.invalid"] };

const omitted = projectCanonicalWriterPolicyResult('{"etag":"synthetic-etag"}', exactMember);
assert.equal(omitted.state, "ZERO_BINDINGS_ABSENT");
assert.equal(omitted.canonical.bindingsFieldState, "OMITTED_AS_EMPTY");
assert.equal(projectCanonicalWriterPolicyResult(valid([]), exactMember).state, "ZERO_BINDINGS_ABSENT");
assert.equal(projectCanonicalWriterPolicyResult(valid([], { version: 0 }), exactMember).state, "ZERO_BINDINGS_ABSENT");
assert.equal(projectCanonicalWriterPolicyResult(valid([], { version: 1 }), exactMember).state, "ZERO_BINDINGS_ABSENT");
assert.equal(projectCanonicalWriterPolicyResult(valid([], { version: 3 }), exactMember).state, "ZERO_BINDINGS_ABSENT");
assert.equal(projectCanonicalWriterPolicyResult(valid([targetBinding()]), exactMember).state, "PRESENT_CONFIRMED");
assert.equal(projectCanonicalWriterPolicyResult(valid([targetBinding(["user:other@example.invalid"])]), exactMember).state, "MEMBER_ABSENT");
assert.equal(projectCanonicalWriterPolicyResult(
  valid([targetBinding(["user:first@example.invalid"]), targetBinding([exactMember])]), exactMember,
).state, "PRESENT_CONFIRMED");

for (const input of [
  "{}", "[]", "null", '{"etag":"synthetic-etag","bindings":null}',
  '{"etag":"synthetic-etag","bindings":{}}', '{"etag":"synthetic-etag","bindings":"x"}',
  '{"etag":"synthetic-etag","bindings":[{"role":"roles/viewer"}]}',
  '{"etag":"synthetic-etag","bindings":[{"role":"bad role","members":["user:x"]}]}',
  '{"etag":"synthetic-etag","bindings":[{"role":"roles/viewer","members":[""]}]}',
  '{"etag":"synthetic-etag","error":{"code":7}}', '{"error":{"code":7}}',
  '{"etag":"synthetic-etag","__proto__":{"polluted":true}}',
]) {
  const parsed = parseCanonicalWriterPolicy(input);
  assert.equal(parsed.ok, false, input);
  assert.equal(classifyCanonicalWriterPolicy(input, exactMember), "READ_FAILURE");
}

assert.equal(projectCanonicalWriterPolicyResult(valid([targetBinding([], {})]), exactMember).state, "READ_FAILURE");
assert.equal(projectCanonicalWriterPolicyResult(valid([targetBinding([exactMember], { condition: { expression: "request.time < timestamp('2030-01-01T00:00:00Z')" } })], { version: 3 }), exactMember).state, "AMBIGUOUS");
assert.equal(projectCanonicalWriterPolicyResult(valid([targetBinding([exactMember, exactMember])]), exactMember).state, "AMBIGUOUS");
assert.equal(projectCanonicalWriterPolicyResult(
  valid([otherBinding], { auditConfigs: [{ service: "allServices", auditLogConfigs: [{ logType: "DATA_READ" }] }] }),
  exactMember,
).state, "ZERO_BINDINGS_ABSENT");
assert.equal(parseCanonicalWriterPolicy('{"etag":"synthetic-etag","auditConfigs":[]}').parseStatus, R3_POLICY_PARSE_STATUS.parsed);
assert.equal(Object.prototype.hasOwnProperty.call(parseCanonicalWriterPolicy('{"etag":"synthetic-etag"}'), "bindings"), false);
assert.equal(JSON.stringify(omitted).includes(exactMember), false);
assert.equal(M3L3_R3_CANONICAL_POLICY_PARSER_CONTRACT.genericEmptyObject, "REJECTED");
assert.equal(M3L3_R3_CANONICAL_POLICY_PARSER_CONTRACT.omittedBindingsRule, "VALID_ETAG_POLICY_ONLY");

console.log("M3L3 R3 canonical IAM Policy parser local matrix passed; remote calls=0");
