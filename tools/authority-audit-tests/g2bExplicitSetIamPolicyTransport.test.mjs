import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createG2BNoRefreshCredentialGuard,
  executeG2BExplicitSetIamPolicy,
  G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT,
  G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY,
  prepareG2BExactMemberSet,
  validateG2BReusablePolicy,
} from "../authority-audit/g2bExplicitSetIamPolicyTransport.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "../authority-audit/g2bRecoveryAnchor.mjs";

const MEMBER = "user:synthetic-test@example.invalid";
const guard = createG2BNoRefreshCredentialGuard({ cachedCredentialPresent: true, expiryEpochMs: Date.now() + 300_000 });
const clone = (value) => structuredClone(value);
const policy = () => ({
  version: 3,
  etag: "synthetic-etag",
  bindings: [
    { role: "roles/viewer", members: ["user:existing@example.invalid"] },
    { role: G2B_TARGET_ROLE, members: ["user:other@example.invalid"] },
  ],
  auditConfigs: [{ service: "allServices", auditLogConfigs: [{ logType: "ADMIN_READ" }] }],
});

function fakeProvider(initial, setResult = { requestStarted: true, httpStatus: 200, responseValid: true }) {
  let current = clone(initial);
  const calls = [];
  return {
    calls,
    getIamPolicy: async ({ phase }) => {
      calls.push(`GET:${phase}`);
      return { ok: true, policy: clone(current) };
    },
    setIamPolicy: async ({ policy: next }) => {
      calls.push("SET:MUTATION");
      if (setResult.requestStarted === true && setResult.httpStatus === 200 && setResult.responseValid === true) current = clone(next);
      return clone(setResult);
    },
  };
}

assert.equal(validateG2BReusablePolicy(policy()).ok, true);
assert.equal(validateG2BReusablePolicy({ ...policy(), unknown: true }).ok, false);
assert.equal(validateG2BReusablePolicy({ ...policy(), etag: "" }).ok, false);
const prepared = prepareG2BExactMemberSet(policy(), { member: MEMBER });
assert.equal(prepared.ok, true);
assert.equal(prepared.state, "TARGET_MEMBER_ABSENT");
assert.equal(prepared.policy.bindings[0].members.includes(MEMBER), false);
assert.equal(prepared.policy.bindings[1].members.includes(MEMBER), true);
assert.equal(prepared.policy.etag, "synthetic-etag");
assert.deepEqual(prepared.policy.auditConfigs, policy().auditConfigs);
const unsetMapping = { version: null, etag: "c3ludGhldGljLWV0YWc=", bindings: [] };
assert.equal(validateG2BReusablePolicy(unsetMapping).ok, false, "untrusted null-version mappings stay blocked");
assert.equal(validateG2BReusablePolicy(unsetMapping, { returnedPolicyVersionState: "UNSET" }).ok, true);
assert.equal(validateG2BReusablePolicy({ ...policy(), version: 3 }, { returnedPolicyVersionState: "UNSET" }).ok, false);
assert.equal(validateG2BReusablePolicy(unsetMapping, { returnedPolicyVersionState: "EXPLICIT" }).ok, false);
assert.equal(prepareG2BExactMemberSet(unsetMapping, { member: MEMBER }).ok, false);
const unsetPrepared = prepareG2BExactMemberSet(unsetMapping, { member: MEMBER, returnedPolicyVersionState: "UNSET" });
assert.equal(unsetPrepared.ok, true);
assert.equal(unsetPrepared.policy.version, null);
assert.equal(unsetPrepared.policy.etag, unsetMapping.etag);
assert.deepEqual(unsetPrepared.policy.bindings, [{ role: G2B_TARGET_ROLE, members: [MEMBER] }]);
assert.equal(prepareG2BExactMemberSet({ ...unsetMapping, bindings: [{ role: "roles/viewer", members: [], condition: { expression: "true" } }] },
  { member: MEMBER, returnedPolicyVersionState: "UNSET" }).ok, false);
assert.equal(prepareG2BExactMemberSet({ ...unsetMapping, bindings: [{ role: "roles/viewer_withcond_x", members: [] }] },
  { member: MEMBER, returnedPolicyVersionState: "UNSET" }).ok, false);

for (const version of [0, 1]) {
  const legacyPolicy = { version, etag: `v${version}-etag`, bindings: [{ role: "roles/viewer", members: ["user:existing@example.invalid"] }] };
  const result = prepareG2BExactMemberSet(legacyPolicy, { member: MEMBER });
  assert.equal(result.ok, true, `version ${version} no-condition policy is reusable`);
  assert.equal(result.policy.version, version, `version ${version} is not upgraded implicitly`);
  assert.equal(result.policy.etag, legacyPolicy.etag);
}
const conditionalV3 = { version: 3, etag: "v3-condition-etag", bindings: [
  { role: "roles/viewer", members: ["user:existing@example.invalid"], condition: { expression: "true" } },
] };
const conditionalV3Result = prepareG2BExactMemberSet(conditionalV3, { member: MEMBER });
assert.equal(conditionalV3Result.ok, true);
assert.equal(conditionalV3Result.policy.version, 3);
assert.deepEqual(conditionalV3Result.policy.bindings[0].condition, conditionalV3.bindings[0].condition);
assert.equal(conditionalV3Result.policy.etag, conditionalV3.etag);
assert.equal(prepareG2BExactMemberSet({ version: 0, etag: "e", bindings: [
  { role: "roles/viewer", members: ["user:existing@example.invalid"], condition: { expression: "true" } },
] }, { member: MEMBER }).code, "PRESTATE_POLICY_UNSUPPORTED_OR_MALFORMED");
assert.equal(prepareG2BExactMemberSet({ version: 1, etag: "e", bindings: [
  { role: "roles/viewer_withcond_marker", members: ["user:existing@example.invalid"] },
] }, { member: MEMBER }).code, "PRESTATE_POLICY_UNSUPPORTED_OR_MALFORMED");

const absent = fakeProvider(policy());
const success = await executeG2BExplicitSetIamPolicy({
  enabled: true,
  provider: absent,
  targetResource: G2B_TARGET_RESOURCE,
  intendedMember: MEMBER,
  credentialGuard: guard,
});
assert.deepEqual(absent.calls, ["GET:PRESTATE", "SET:MUTATION", "GET:POSTSTATE"]);
assert.equal(success.ok, true);
assert.deepEqual(success.counters, {
  prestateGetCalls: 1, explicitSetCalls: 1, poststateGetCalls: 1,
  totalExplicitProviderCalls: 3, hiddenProviderCalls: 0, retries: 0, rollbackSets: 0, secondSetCalls: 0,
});
assert.equal(JSON.stringify(success).includes(MEMBER), false);
assert.equal(JSON.stringify(success).includes("synthetic-etag"), false);

const presentPolicy = policy();
presentPolicy.bindings[1].members.push(MEMBER);
const present = fakeProvider(presentPolicy);
const presentResult = await executeG2BExplicitSetIamPolicy({
  enabled: true, provider: present, targetResource: G2B_TARGET_RESOURCE, intendedMember: MEMBER, credentialGuard: guard,
});
assert.deepEqual(present.calls, ["GET:PRESTATE"]);
assert.equal(presentResult.code, "PRESTATE_MEMBER_PRESENT_NO_SET");

for (const [name, setResult, expectedCode, expectedCalls] of [
  ["not-started", { requestStarted: false }, "SET_REQUEST_NOT_STARTED", ["GET:PRESTATE", "SET:MUTATION"]],
  ["etag-conflict", { requestStarted: true, httpStatus: 412 }, "SET_ETAG_OR_PRECONDITION_CONFLICT", ["GET:PRESTATE", "SET:MUTATION"]],
  ["timeout", { requestStarted: true, result: "TIMEOUT" }, "SET_TIMEOUT_AFTER_REQUEST_START", ["GET:PRESTATE", "SET:MUTATION"]],
  ["provider-5xx", { requestStarted: true, httpStatus: 503 }, "SET_PROVIDER_5XX", ["GET:PRESTATE", "SET:MUTATION"]],
  ["malformed", { requestStarted: true, httpStatus: 200, responseValid: false, result: "MALFORMED_RESPONSE" }, "SET_MALFORMED_RESPONSE", ["GET:PRESTATE", "SET:MUTATION"]],
]) {
  const fake = fakeProvider(policy(), setResult);
  const result = await executeG2BExplicitSetIamPolicy({
    enabled: true, provider: fake, targetResource: G2B_TARGET_RESOURCE, intendedMember: MEMBER, credentialGuard: guard,
  });
  assert.deepEqual(fake.calls, expectedCalls, name);
  assert.equal(result.code, expectedCode, name);
  assert.equal(result.counters.retries, 0, name);
  assert.equal(result.counters.secondSetCalls, 0, name);
  assert.equal(result.counters.poststateGetCalls, 0, name);
}

const blockedGuard = createG2BNoRefreshCredentialGuard({ cachedCredentialPresent: true, expiryEpochMs: Date.now() + 1 });
const blocked = fakeProvider(policy());
assert.equal((await executeG2BExplicitSetIamPolicy({
  enabled: true, provider: blocked, targetResource: G2B_TARGET_RESOURCE, intendedMember: MEMBER, credentialGuard: blockedGuard,
})).code, "CACHED_CREDENTIAL_NOT_FRESH");
assert.deepEqual(blocked.calls, []);

const wrongTarget = fakeProvider(policy());
assert.equal((await executeG2BExplicitSetIamPolicy({
  enabled: true, provider: wrongTarget, targetResource: "wrong", intendedMember: MEMBER, credentialGuard: guard,
})).code, "EXACT_G2B_TARGET_BINDING_REQUIRED");
assert.deepEqual(wrongTarget.calls, []);

assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.totalPhysicalRemoteCallsMax, 3);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.hiddenProviderCalls, 0);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.oldGcloudBindingFallback, false);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.authTransportHasHiddenRemoteCalls, false);
assert.equal(G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY.expiredOrUnknownCredentialFailsBeforeHttp, true);

const baselineEvidence = JSON.parse(readFileSync("docs/evidence/g2b-clean-cas-read-ab9841ca-e096-4042-ab53-b47368e22b5b-result.json", "utf8"));
const baseline = { ...baselineEvidence, schema: "myweb.g2b.clean-generation-cas-read-evidence.v2" };
const unsetProvider = (() => {
  let current = { ...unsetMapping, bindings: [] };
  const calls = [];
  return {
    calls,
    getIamPolicy: async ({ phase }) => {
      calls.push(`GET:${phase}`);
      return { ok: true, policy: structuredClone(current), returnedPolicyVersionState: "UNSET" };
    },
    setIamPolicy: async ({ policy: value, returnedPolicyVersionState, phase }) => {
      calls.push(`SET:${phase}`);
      current = structuredClone(value);
      assert.equal(returnedPolicyVersionState, "UNSET");
      return { requestStarted: true, httpStatus: 200, responseValid: true };
    },
  };
})();
const unsetE2e = await executeG2BExplicitSetIamPolicy({ enabled: true, provider: unsetProvider,
  targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, intendedMember: baseline.targetMember,
  credentialGuard: guard, baselineEvidence: baseline });
assert.equal(unsetE2e.ok, true, unsetE2e.code);
assert.equal(unsetProvider.calls.join(","), "GET:PRESTATE,SET:MUTATION,GET:POSTSTATE");
assert.equal(unsetE2e.counters.explicitSetCalls, 1);
assert.equal(unsetE2e.counters.poststateGetCalls, 1);
const driftProvider = fakeProvider({ ...unsetMapping, bindings: [{ role: "roles/editor", members: ["user:drift@example.invalid"] }] });
const drift = await executeG2BExplicitSetIamPolicy({ enabled: true, provider: driftProvider,
  targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, intendedMember: baseline.targetMember,
  credentialGuard: guard, baselineEvidence: baseline });
assert.equal(drift.code, "BASELINE_SEMANTIC_OR_ETAG_GATE_FAILED");
assert.equal(drift.counters.explicitSetCalls, 0);
console.log("Clean-generation UNSET pre-read/set/post-read local E2E passed; remote operations=0");
console.log("G2B explicit SetIamPolicy fake transport matrix passed; physical remote calls are explicit; remote operations=0");
