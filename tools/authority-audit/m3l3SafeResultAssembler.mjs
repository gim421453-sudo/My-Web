const INPUT_KEYS = Object.freeze([
  "approvalConsumed",
  "approvalStatus",
  "currentM3FinalState",
  "finalVerdict",
  "forbiddenOperationCounts",
  "identityContextEstablished",
  "mutationAttemptsUsed",
  "mutationOutcome",
  "opAExecutions",
  "opDPostExecutions",
  "opDPreExecutions",
  "poststateReadsUsed",
  "poststateResult",
  "prestateReadsUsed",
  "prestateResult",
  "projectIamReadsAfterPrestate",
  "runtimeResultCode",
  "totalProjectIamReadsUsed",
]);

const COUNTER_MAXIMA = Object.freeze({
  opAExecutions: 1,
  prestateReadsUsed: 5,
  opDPreExecutions: 1,
  projectIamReadsAfterPrestate: 1,
  mutationAttemptsUsed: 1,
  poststateReadsUsed: 2,
  opDPostExecutions: 1,
  totalProjectIamReadsUsed: 2,
});

const FORBIDDEN_COUNT_KEYS = Object.freeze([
  "accessTokenCalls",
  "cloudLoggingReads",
  "firestoreCalls",
  "m4Mutations",
  "projectIamMutations",
  "retries",
  "rollbacks",
  "serviceAccountKeyOperations",
  "testIamPermissionsCalls",
]);

const PRESTATE_RESULTS = new Set([
  "TARGET_MEMBER_PRESENT",
  "TARGET_MEMBER_ABSENT",
  "AMBIGUOUS",
  "READ_FAILURE",
  "NOT_REACHED",
  "UNKNOWN_NOT_RECOVERED",
]);
const MUTATION_OUTCOMES = new Set([
  "NOT_ATTEMPTED",
  "CONFIRMED_SUCCESS",
  "CONFIRMED_FAILURE",
  "INDETERMINATE",
  "UNKNOWN_NOT_RECOVERED",
]);
const POSTSTATE_RESULTS = new Set([
  "TARGET_MEMBER_PRESENT_CONFIRMED",
  "TARGET_MEMBER_ABSENT",
  "AMBIGUOUS",
  "READ_FAILURE",
  "NOT_EXECUTED",
  "UNKNOWN_NOT_RECOVERED",
]);
const APPROVAL_STATUSES = new Set(["NOT_REACHED_NON_REUSABLE", "CONSUMED_NON_REUSABLE"]);
const FINAL_VERDICTS = new Set([
  "P1_5_C2H2E3D_W1C_M3L3_EXACT_BINDING_CONFIRMED_M4_SEPARATE_APPROVAL_REQUIRED",
  "P1_5_C2H2E3D_W1C_M3L3_PRESTATE_ALREADY_PRESENT_SEPARATE_ADOPTION_GATE_REQUIRED",
  "P1_5_C2H2E3D_W1C_M3L3_PRESTATE_AMBIGUOUS_STOP",
  "P1_5_C2H2E3D_W1C_M3L3_PRESTATE_READ_FAILURE_STOP",
  "P1_5_C2H2E3D_W1C_M3L3_IDENTITY_DISCOVERY_FAILURE_STOP",
  "P1_5_C2H2E3D_W1C_M3L3_IDENTITY_CONTRACT_FAILURE_STOP",
  "P1_5_C2H2E3D_W1C_M3L3_MUTATION_NOT_ATTEMPTED_STOP",
  "P1_5_C2H2E3D_W1C_M3L3_MUTATION_INDETERMINATE_SEPARATE_RECOVERY_APPROVAL_REQUIRED",
  "P1_5_C2H2E3D_W1C_M3L3_POSTSTATE_ABSENT_STOP_NO_SECOND_MUTATION",
  "P1_5_C2H2E3D_W1C_M3L3_POSTSTATE_AMBIGUOUS_STOP",
  "P1_5_C2H2E3D_W1C_M3L3_POSTSTATE_READ_FAILURE_STOP",
  "P1_5_C2H2E3D_W1C_M3L3_BLOCKED",
]);
const SAFE_RUNTIME_RESULT = /^[A-Z][A-Z0-9_]{0,95}$/;

const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function hasExactKeys(value, keys) {
  return plain(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
}

function boundedCounter(value, max) {
  if (value === null) return Object.freeze({ known: false, min: 0, max });
  if (!Number.isInteger(value) || value < 0 || value > max) throw new Error("counter-out-of-range");
  return Object.freeze({ known: true, value, max });
}

function projectForbiddenCounts(value) {
  if (!hasExactKeys(value, FORBIDDEN_COUNT_KEYS)) throw new Error("invalid-forbidden-operation-counts");
  const projected = {};
  for (const key of FORBIDDEN_COUNT_KEYS) {
    if (value[key] !== 0) throw new Error("forbidden-operation-observed");
    projected[key] = 0;
  }
  return Object.freeze(projected);
}

function enumValue(value, domain, code) {
  if (!domain.has(value)) throw new Error(code);
  return value;
}

export function assembleM3L3SafeResult(input) {
  if (!hasExactKeys(input, INPUT_KEYS)) throw new Error("invalid-safe-result-input");
  if (typeof input.approvalConsumed !== "boolean") throw new Error("invalid-approval-consumption");
  if (![true, false, null].includes(input.identityContextEstablished)) throw new Error("invalid-identity-state");
  if (typeof input.runtimeResultCode !== "string" || !SAFE_RUNTIME_RESULT.test(input.runtimeResultCode)) {
    throw new Error("invalid-runtime-result-code");
  }

  const approvalStatus = enumValue(input.approvalStatus, APPROVAL_STATUSES, "invalid-approval-status");
  if (input.approvalConsumed !== (approvalStatus === "CONSUMED_NON_REUSABLE")) {
    throw new Error("approval-state-mismatch");
  }

  return Object.freeze({
    runtimeResultCode: input.runtimeResultCode,
    opAExecutions: boundedCounter(input.opAExecutions, COUNTER_MAXIMA.opAExecutions),
    identityContextEstablished: input.identityContextEstablished,
    approvalConsumed: input.approvalConsumed,
    approvalStatus,
    prestateReadsUsed: boundedCounter(input.prestateReadsUsed, COUNTER_MAXIMA.prestateReadsUsed),
    opDPreExecutions: boundedCounter(input.opDPreExecutions, COUNTER_MAXIMA.opDPreExecutions),
    projectIamReadsUsedAfterPrestate: boundedCounter(
      input.projectIamReadsAfterPrestate,
      COUNTER_MAXIMA.projectIamReadsAfterPrestate,
    ),
    prestateResult: enumValue(input.prestateResult, PRESTATE_RESULTS, "invalid-prestate-result"),
    mutationAttemptsUsed: boundedCounter(input.mutationAttemptsUsed, COUNTER_MAXIMA.mutationAttemptsUsed),
    mutationOutcome: enumValue(input.mutationOutcome, MUTATION_OUTCOMES, "invalid-mutation-outcome"),
    poststateReadsUsed: boundedCounter(input.poststateReadsUsed, COUNTER_MAXIMA.poststateReadsUsed),
    opDPostExecutions: boundedCounter(input.opDPostExecutions, COUNTER_MAXIMA.opDPostExecutions),
    totalProjectIamReadsUsed: boundedCounter(input.totalProjectIamReadsUsed, COUNTER_MAXIMA.totalProjectIamReadsUsed),
    poststateResult: enumValue(input.poststateResult, POSTSTATE_RESULTS, "invalid-poststate-result"),
    currentM3FinalState: input.currentM3FinalState,
    forbiddenOperationCounts: projectForbiddenCounts(input.forbiddenOperationCounts),
    finalVerdict: enumValue(input.finalVerdict, FINAL_VERDICTS, "invalid-final-verdict"),
  });
}

export function serializeM3L3SafeResult(input) {
  return JSON.stringify(assembleM3L3SafeResult(input));
}

export const M3L3_SAFE_RESULT_ASSEMBLER_CONTRACT = Object.freeze({
  networkAccess: false,
  processSpawn: false,
  productionAccess: false,
  lockedRuntimeImports: 0,
  unknownCounterRepresentation: "bounded-structured-range",
});
