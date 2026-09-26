import assert from "node:assert/strict";
import {
  executeM3l3R3CanonicalPolicyRecovery,
  M3L3_R3_CANONICAL_POLICY_RECOVERY_CONTRACT,
} from "../authority-audit/m3l3R3CanonicalPolicyRecoveryExecutor.mjs";

const account = "operator@example.invalid";
const member = `user:${account}`;
const policy = (bindings) => JSON.stringify({ etag: "synthetic-etag", bindings });
const target = (members) => ({ role: "roles/iam.serviceAccountTokenCreator", members });

function runner(policyResult) {
  const calls = [];
  return {
    calls,
    runProcess: async ({ args }) => {
      calls.push(args);
      return calls.length === 1
        ? { exitCode: 0, timedOut: false, stdout: `${account}\n`, stderr: "" }
        : policyResult;
    },
  };
}

for (const [expected, response] of [
  ["ZERO_BINDINGS_ABSENT", { exitCode: 0, timedOut: false, stdout: '{"etag":"synthetic-etag"}', stderr: "" }],
  ["PRESENT_CONFIRMED", { exitCode: 0, timedOut: false, stdout: policy([target([member])]), stderr: "" }],
  ["MEMBER_ABSENT", { exitCode: 0, timedOut: false, stdout: policy([target(["user:other@example.invalid"])]), stderr: "" }],
  ["AMBIGUOUS", { exitCode: 0, timedOut: false, stdout: policy([target([member, member])]), stderr: "" }],
  ["READ_FAILURE", { exitCode: 0, timedOut: false, stdout: "{}", stderr: "" }],
]) {
  const fake = runner(response);
  const result = await executeM3l3R3CanonicalPolicyRecovery({ enabled: true, executable: "gcloud.cmd", runProcess: fake.runProcess });
  assert.equal(result.state, expected);
  assert.equal(result.approvalConsumed, true);
  assert.equal(result.counters.opAExecutions, 1);
  assert.equal(result.counters.writerSaGetIamPolicyReads, 1);
  assert.equal(fake.calls.length, 2);
  assert.equal(fake.calls.flat().includes("add-iam-policy-binding"), false);
  assert.equal(JSON.stringify(result).includes(account), false);
  assert.equal(JSON.stringify(result).includes("synthetic-etag"), false);
}

let disabledCalls = 0;
const disabled = await executeM3l3R3CanonicalPolicyRecovery({ runProcess: () => { disabledCalls += 1; } });
assert.equal(disabled.state, "IDENTITY_FAILURE");
assert.equal(disabledCalls, 0);
assert.equal(M3L3_R3_CANONICAL_POLICY_RECOVERY_CONTRACT.defaultLiveEnabled, false);
assert.equal(M3L3_R3_CANONICAL_POLICY_RECOVERY_CONTRACT.writerSaGetIamPolicyReadsMax, 1);
assert.equal(M3L3_R3_CANONICAL_POLICY_RECOVERY_CONTRACT.mutationsMax, 0);
assert.equal(M3L3_R3_CANONICAL_POLICY_RECOVERY_CONTRACT.approvalRequired, true);

console.log("M3L3 R3 canonical policy recovery executor passed; synthetic only; production access=0");
