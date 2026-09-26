import assert from "node:assert/strict";
import {
  M3L3_R1_EXECUTOR_CONTRACT,
  classifyR1WriterPolicy,
  executeM3l3ReadOnlyRecovery,
} from "../authority-audit/m3l3PostFailureRecoveryExecutor.mjs";

const account = "operator@example.invalid";
const member = `user:${account}`;
const identity = Object.freeze({ exactIamMember: member });
const policy = (bindings) => JSON.stringify({ bindings, etag: "not-persisted" });

assert.equal(classifyR1WriterPolicy(policy([]), identity), "ZERO_BINDINGS_ABSENT");
assert.equal(classifyR1WriterPolicy(policy([{ role: "roles/other", members: ["user:other@example.invalid"] }]), identity), "ZERO_BINDINGS_ABSENT");
assert.equal(classifyR1WriterPolicy(policy([{ role: "roles/iam.serviceAccountTokenCreator", members: [] }]), identity), "ZERO_BINDINGS_ABSENT");
assert.equal(classifyR1WriterPolicy(policy([{ role: "roles/iam.serviceAccountTokenCreator", members: [member] }]), identity), "PRESENT_CONFIRMED");
assert.equal(classifyR1WriterPolicy(policy([{ role: "roles/iam.serviceAccountTokenCreator", members: ["user:other@example.invalid"] }]), identity), "MEMBER_ABSENT");
assert.equal(classifyR1WriterPolicy(policy([{ role: "roles/iam.serviceAccountTokenCreator" }]), identity), "AMBIGUOUS");
assert.equal(classifyR1WriterPolicy(policy([
  { role: "roles/iam.serviceAccountTokenCreator", members: [member] },
  { role: "roles/iam.serviceAccountTokenCreator", members: [member] },
]), identity), "AMBIGUOUS");
assert.equal(classifyR1WriterPolicy(policy([{
  role: "roles/iam.serviceAccountTokenCreator",
  members: [member],
  condition: { expression: "request.time < timestamp('2099-01-01T00:00:00Z')" },
}]), identity), "AMBIGUOUS");
assert.equal(classifyR1WriterPolicy("not-json", identity), "READ_FAILURE");

const makeRunner = (writerPolicyResult) => {
  const calls = [];
  const runProcess = async ({ args }) => {
    calls.push([...args]);
    if (calls.length === 1) return { exitCode: 0, timedOut: false, stdout: `${account}\n`, stderr: "" };
    if (calls.length === 2) return writerPolicyResult;
    throw new Error("unexpected-third-call");
  };
  return { calls, runProcess };
};

for (const expected of ["ZERO_BINDINGS_ABSENT", "PRESENT_CONFIRMED", "MEMBER_ABSENT", "AMBIGUOUS"]) {
  const bindings = expected === "ZERO_BINDINGS_ABSENT"
    ? []
    : expected === "PRESENT_CONFIRMED"
      ? [{ role: "roles/iam.serviceAccountTokenCreator", members: [member] }]
      : expected === "MEMBER_ABSENT"
        ? [{ role: "roles/iam.serviceAccountTokenCreator", members: ["user:other@example.invalid"] }]
        : [{ role: "roles/iam.serviceAccountTokenCreator" }];
  const fake = makeRunner({ exitCode: 0, timedOut: false, stdout: policy(bindings), stderr: "" });
  const observed = await executeM3l3ReadOnlyRecovery({ enabled: true, executable: "gcloud.cmd", runProcess: fake.runProcess });
  assert.equal(observed.recoveryResult, expected);
  assert.equal(observed.opAExecutions, 1);
  assert.equal(observed.writerSaGetIamPolicyReads, 1);
  assert.equal(observed.approvalConsumed, true);
  assert.equal(fake.calls.length, 2);
  assert.deepEqual(fake.calls[0].slice(0, 2), ["auth", "list"]);
  assert.deepEqual(fake.calls[1].slice(0, 3), ["iam", "service-accounts", "get-iam-policy"]);
  assert.equal(fake.calls.flat().includes("add-iam-policy-binding"), false);
  assert.equal(JSON.stringify(observed).includes(account), false);
  assert.equal(JSON.stringify(observed).includes("bindings"), false);
}

const readFailure = makeRunner({ exitCode: 1, timedOut: false, stdout: "", stderr: "sensitive-not-projected" });
const failed = await executeM3l3ReadOnlyRecovery({ enabled: true, executable: "gcloud.cmd", runProcess: readFailure.runProcess });
assert.equal(failed.recoveryResult, "READ_FAILURE");
assert.equal(failed.writerSaGetIamPolicyReads, 1);
assert.equal(failed.approvalConsumed, true);
assert.equal(JSON.stringify(failed).includes("sensitive-not-projected"), false);

let identityCalls = 0;
const identityFailure = await executeM3l3ReadOnlyRecovery({
  enabled: true,
  executable: "gcloud.cmd",
  runProcess: async () => {
    identityCalls += 1;
    return { exitCode: 0, timedOut: false, stdout: "", stderr: "" };
  },
});
assert.equal(identityFailure.recoveryResult, "IDENTITY_FAILURE");
assert.equal(identityFailure.approvalConsumed, false);
assert.equal(identityFailure.writerSaGetIamPolicyReads, 0);
assert.equal(identityCalls, 1);

let disabledCalls = 0;
const disabled = await executeM3l3ReadOnlyRecovery({ runProcess: () => { disabledCalls += 1; } });
assert.equal(disabled.recoveryResult, "IDENTITY_FAILURE");
assert.equal(disabledCalls, 0);

assert.deepEqual(M3L3_R1_EXECUTOR_CONTRACT, {
  defaultLiveEnabled: false,
  localIdentityDiscoveryMax: 1,
  writerSaGetIamPolicyReadsMax: 1,
  projectIamReadsMax: 0,
  mutationsMax: 0,
  retriesMax: 0,
  rawIdentityOutput: false,
  rawPolicyOutput: false,
});

console.log("M3L3 R1 read-only recovery executor tests passed; synthetic only; production access=0");
