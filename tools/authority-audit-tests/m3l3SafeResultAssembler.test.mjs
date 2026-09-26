import assert from "node:assert/strict";
import {
  M3L3_SAFE_RESULT_ASSEMBLER_CONTRACT,
  assembleM3L3SafeResult,
  serializeM3L3SafeResult,
} from "../authority-audit/m3l3SafeResultAssembler.mjs";

const zeros = Object.freeze({
  accessTokenCalls: 0,
  cloudLoggingReads: 0,
  firestoreCalls: 0,
  m4Mutations: 0,
  projectIamMutations: 0,
  retries: 0,
  rollbacks: 0,
  serviceAccountKeyOperations: 0,
  testIamPermissionsCalls: 0,
});

const confirmedInput = Object.freeze({
  runtimeResultCode: "M3_PRESENT_EXACT",
  opAExecutions: 1,
  identityContextEstablished: true,
  approvalConsumed: true,
  approvalStatus: "CONSUMED_NON_REUSABLE",
  prestateReadsUsed: 5,
  opDPreExecutions: 1,
  projectIamReadsAfterPrestate: 1,
  prestateResult: "TARGET_MEMBER_ABSENT",
  mutationAttemptsUsed: 1,
  mutationOutcome: "CONFIRMED_SUCCESS",
  poststateReadsUsed: 2,
  opDPostExecutions: 1,
  totalProjectIamReadsUsed: 2,
  poststateResult: "TARGET_MEMBER_PRESENT_CONFIRMED",
  currentM3FinalState: "EXACT_BINDING_CONFIRMED",
  forbiddenOperationCounts: zeros,
  finalVerdict: "P1_5_C2H2E3D_W1C_M3L3_EXACT_BINDING_CONFIRMED_M4_SEPARATE_APPROVAL_REQUIRED",
});

const confirmed = assembleM3L3SafeResult(confirmedInput);
assert.deepEqual(confirmed.projectIamReadsUsedAfterPrestate, { known: true, value: 1, max: 1 });
assert.deepEqual(confirmed.totalProjectIamReadsUsed, { known: true, value: 2, max: 2 });
assert.equal(JSON.parse(serializeM3L3SafeResult(confirmedInput)).runtimeResultCode, "M3_PRESENT_EXACT");

let syntheticRuntimeCompleted = false;
await Promise.resolve().then(() => { syntheticRuntimeCompleted = true; });
assert.throws(() => {
  const projectIamReadsAfterPrestate = 1;
  void projectIamReadsAfterPrestate;
  // This reproduces the post-await shorthand typo from the stopped live session.
  return { projectIamReadsUsedAfterPrestate };
}, ReferenceError);
assert.equal(syntheticRuntimeCompleted, true);

const unknownInput = Object.freeze({
  ...confirmedInput,
  runtimeResultCode: "LOCAL_RESULT_UNAVAILABLE",
  opAExecutions: null,
  identityContextEstablished: null,
  prestateReadsUsed: null,
  opDPreExecutions: null,
  projectIamReadsAfterPrestate: null,
  prestateResult: "UNKNOWN_NOT_RECOVERED",
  mutationAttemptsUsed: null,
  mutationOutcome: "UNKNOWN_NOT_RECOVERED",
  poststateReadsUsed: null,
  opDPostExecutions: null,
  totalProjectIamReadsUsed: null,
  poststateResult: "UNKNOWN_NOT_RECOVERED",
  currentM3FinalState: "NOT_ESTABLISHED_RESULT_UNAVAILABLE",
  finalVerdict: "P1_5_C2H2E3D_W1C_M3L3_BLOCKED",
});
const unknown = assembleM3L3SafeResult(unknownInput);
assert.deepEqual(unknown.projectIamReadsUsedAfterPrestate, { known: false, min: 0, max: 1 });
assert.deepEqual(unknown.totalProjectIamReadsUsed, { known: false, min: 0, max: 2 });
assert.doesNotThrow(() => JSON.parse(serializeM3L3SafeResult(unknownInput)));

assert.throws(() => assembleM3L3SafeResult({ ...confirmedInput, projectIamReadsAfterPrestate: 2 }), /counter-out-of-range/);
assert.throws(() => assembleM3L3SafeResult({ ...confirmedInput, totalProjectIamReadsUsed: 3 }), /counter-out-of-range/);
assert.throws(() => assembleM3L3SafeResult({ ...confirmedInput, approvalConsumed: false }), /approval-state-mismatch/);
assert.throws(() => assembleM3L3SafeResult({ ...confirmedInput, principal: "must-not-be-accepted" }), /invalid-safe-result-input/);
assert.throws(() => assembleM3L3SafeResult({ ...confirmedInput, rawPolicy: {} }), /invalid-safe-result-input/);
assert.throws(() => assembleM3L3SafeResult({
  ...confirmedInput,
  forbiddenOperationCounts: { ...zeros, retries: 1 },
}), /forbidden-operation-observed/);

assert.deepEqual(M3L3_SAFE_RESULT_ASSEMBLER_CONTRACT, {
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  lockedRuntimeImports: 0,
  unknownCounterRepresentation: "bounded-structured-range",
});

console.log("M3L3 safe result assembler tests passed; synthetic only; production access=0");
