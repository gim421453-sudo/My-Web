import assert from "node:assert/strict";
import {
  M3L3_READ_FAILURE_DIAGNOSTIC_CONTRACT,
  projectSafeWriterPolicyReadDiagnostic,
} from "../authority-audit/m3l3ReadFailureSafeDiagnostic.mjs";
import {
  M3L3_R2_DIAGNOSTIC_EXECUTOR_CONTRACT,
  executeM3l3ReadFailureDiagnostic,
} from "../authority-audit/m3l3ReadFailureDiagnosticExecutor.mjs";

const sensitive = "secret@example.test C:\\Users\\Private token=hidden";
const diagnostic = projectSafeWriterPolicyReadDiagnostic({
  exitCode: 1,
  timedOut: false,
  stdout: "",
  stderr: `ERROR: permission denied ${sensitive}`,
});
assert.equal(diagnostic.outcome, "NONZERO_EXIT");
assert.equal(diagnostic.exitCodeKind, "NONZERO");
assert.equal(diagnostic.errorUnknownLineCount, 1);
assert.ok(diagnostic.errorKnownRuleIds.includes("ERROR_PREFIX_V1"));
assert.equal(JSON.stringify(diagnostic).includes("secret@example.test"), false);
assert.equal(JSON.stringify(diagnostic).includes("permission denied"), false);
assert.equal(JSON.stringify(diagnostic).includes("C:\\Users"), false);

assert.equal(projectSafeWriterPolicyReadDiagnostic({ timedOut: true }).outcome, "TIMED_OUT");
assert.equal(projectSafeWriterPolicyReadDiagnostic({ spawnError: { code: "ENOENT" } }).outcome, "SPAWN_FAILURE");
assert.equal(projectSafeWriterPolicyReadDiagnostic({ exitCode: 0, stdout: "not-json" }).outcome, "MALFORMED_JSON");
assert.equal(projectSafeWriterPolicyReadDiagnostic({ exitCode: 0, stdout: "{}" }).outcome, "UNSUPPORTED_POLICY_SHAPE");
assert.equal(projectSafeWriterPolicyReadDiagnostic({ exitCode: 0, stdout: '{"bindings":[]}' }).outcome, "POLICY_PARSEABLE");

const account = "operator@example.invalid";
const calls = [];
const failed = await executeM3l3ReadFailureDiagnostic({
  enabled: true,
  executable: "gcloud.cmd",
  runProcess: async ({ args }) => {
    calls.push(args);
    if (calls.length === 1) return { exitCode: 0, timedOut: false, stdout: `${account}\n`, stderr: "" };
    return { exitCode: 1, timedOut: false, stdout: "", stderr: `ERROR: blocked ${sensitive}` };
  },
});
assert.equal(failed.state, "READ_FAILURE");
assert.equal(failed.approvalConsumed, true);
assert.equal(failed.counters.opAExecutions, 1);
assert.equal(failed.counters.writerSaGetIamPolicyReads, 1);
assert.equal(failed.counters.projectIamReads, 0);
assert.equal(failed.counters.iamMutations, 0);
assert.equal(calls.length, 2);
assert.equal(calls.flat().includes("add-iam-policy-binding"), false);
assert.equal(JSON.stringify(failed).includes(account), false);
assert.equal(JSON.stringify(failed).includes(sensitive), false);

let disabledCalls = 0;
const disabled = await executeM3l3ReadFailureDiagnostic({ runProcess: () => { disabledCalls += 1; } });
assert.equal(disabled.state, "IDENTITY_FAILURE");
assert.equal(disabledCalls, 0);

assert.equal(M3L3_READ_FAILURE_DIAGNOSTIC_CONTRACT.networkAccess, false);
assert.equal(M3L3_READ_FAILURE_DIAGNOSTIC_CONTRACT.normalizedFingerprintReturned, false);
assert.equal(M3L3_R2_DIAGNOSTIC_EXECUTOR_CONTRACT.defaultLiveEnabled, false);
assert.equal(M3L3_R2_DIAGNOSTIC_EXECUTOR_CONTRACT.writerSaGetIamPolicyReadsMax, 1);
assert.equal(M3L3_R2_DIAGNOSTIC_EXECUTOR_CONTRACT.mutationsMax, 0);
assert.equal(JSON.stringify(await executeM3l3ReadFailureDiagnostic({
  enabled: true,
  executable: "gcloud.cmd",
  runProcess: async () => ({ exitCode: 0, timedOut: false, stdout: "", stderr: "" }),
})).includes("projectIamReadsUsedAfterPrestate"), false);

console.log("M3L3 R2 safe read-failure diagnostic tests passed; synthetic only; production access=0");
