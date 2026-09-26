import {
  buildActiveCallerCommand,
  buildPinnedWriterPolicyReadCommand,
  createIdentityContext,
} from "./m3RuntimeCommandGraph.mjs";
import { assembleM3L3SafeResult } from "./m3l3SafeResultAssembler.mjs";
import { projectCanonicalWriterPolicyResult } from "./m3l3R3CanonicalPolicyParser.mjs";
import { resolveLocalGcloudExecutable, runWindowsProcess } from "./windowsGcloudProcessAdapter.mjs";

export const R3_DEFAULT_LIVE_ENABLED = false;

function parseActiveAccounts(stdout) {
  if (typeof stdout !== "string" || stdout.length > 1024 * 1024) return [];
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function counters(opAExecutions, writerSaGetIamPolicyReads) {
  return Object.freeze({
    opAExecutions,
    writerSaGetIamPolicyReads,
    projectIamReads: 0,
    iamMutations: 0,
    m3Mutations: 0,
    m4Mutations: 0,
    accessTokenCalls: 0,
    firestoreCalls: 0,
    cloudLoggingReads: 0,
    testIamPermissionsCalls: 0,
    serviceAccountKeyOperations: 0,
    retries: 0,
    rollbacks: 0,
  });
}

function validateProjection({ state, approvalConsumed, identityContextEstablished, counts }) {
  const prestateResult = state === "PRESENT_CONFIRMED"
    ? "TARGET_MEMBER_PRESENT"
    : ["ZERO_BINDINGS_ABSENT", "MEMBER_ABSENT"].includes(state)
      ? "TARGET_MEMBER_ABSENT"
      : state === "AMBIGUOUS" ? "AMBIGUOUS"
        : state === "READ_FAILURE" ? "READ_FAILURE" : "UNKNOWN_NOT_RECOVERED";
  assembleM3L3SafeResult({
    runtimeResultCode: `R3_${state}`,
    opAExecutions: counts.opAExecutions,
    identityContextEstablished,
    approvalConsumed,
    approvalStatus: approvalConsumed ? "CONSUMED_NON_REUSABLE" : "NOT_REACHED_NON_REUSABLE",
    prestateReadsUsed: counts.writerSaGetIamPolicyReads,
    opDPreExecutions: 0,
    projectIamReadsAfterPrestate: 0,
    prestateResult,
    mutationAttemptsUsed: 0,
    mutationOutcome: "NOT_ATTEMPTED",
    poststateReadsUsed: 0,
    opDPostExecutions: 0,
    totalProjectIamReadsUsed: 0,
    poststateResult: "NOT_EXECUTED",
    currentM3FinalState: state,
    forbiddenOperationCounts: {
      accessTokenCalls: 0, cloudLoggingReads: 0, firestoreCalls: 0, m4Mutations: 0,
      projectIamMutations: 0, retries: 0, rollbacks: 0, serviceAccountKeyOperations: 0,
      testIamPermissionsCalls: 0,
    },
    finalVerdict: "P1_5_C2H2E3D_W1C_M3L3_BLOCKED",
  });
}

function safeResult({ state, parseStatus = null, approvalConsumed, identityContextEstablished, counts }) {
  validateProjection({ state, approvalConsumed, identityContextEstablished, counts });
  return Object.freeze({
    state,
    parseStatus,
    approvalConsumed,
    approvalStatus: approvalConsumed ? "CONSUMED_NON_REUSABLE" : "NOT_REACHED_NON_REUSABLE",
    identityContextEstablished,
    counters: counts,
  });
}

export async function executeM3l3R3CanonicalPolicyRecovery({
  enabled = R3_DEFAULT_LIVE_ENABLED,
  executable = null,
  runProcess = runWindowsProcess,
  environment = process.env,
} = {}) {
  let opAExecutions = 0;
  let writerSaGetIamPolicyReads = 0;
  const unavailable = () => safeResult({
    state: "IDENTITY_FAILURE", approvalConsumed: false, identityContextEstablished: false,
    counts: counters(opAExecutions, writerSaGetIamPolicyReads),
  });

  if (enabled !== true) return unavailable();
  const selectedExecutable = executable || resolveLocalGcloudExecutable();
  if (!selectedExecutable) return unavailable();

  let callerResult;
  try {
    opAExecutions += 1;
    callerResult = await runProcess({ executable: selectedExecutable, args: buildActiveCallerCommand(), timeoutMs: 10_000, environment });
  } catch {
    return unavailable();
  }
  const accounts = callerResult?.exitCode === 0 && callerResult?.timedOut !== true
    ? parseActiveAccounts(callerResult.stdout) : [];
  if (accounts.length !== 1) return unavailable();
  const identityContext = createIdentityContext(accounts[0], { environment });
  if (!identityContext) return unavailable();

  writerSaGetIamPolicyReads += 1;
  let policyResult;
  try {
    policyResult = await runProcess({
      executable: selectedExecutable,
      args: buildPinnedWriterPolicyReadCommand(identityContext),
      timeoutMs: 10_000,
      environment: identityContext.childEnvironment,
    });
  } catch {
    policyResult = null;
  }
  const projected = policyResult?.exitCode === 0 && policyResult?.timedOut !== true
    ? projectCanonicalWriterPolicyResult(policyResult.stdout, identityContext.exactIamMember)
    : Object.freeze({ state: "READ_FAILURE", parseStatus: null, canonical: null });
  return safeResult({
    state: projected.state,
    parseStatus: projected.parseStatus,
    approvalConsumed: true,
    identityContextEstablished: true,
    counts: counters(opAExecutions, writerSaGetIamPolicyReads),
  });
}

export const M3L3_R3_CANONICAL_POLICY_RECOVERY_CONTRACT = Object.freeze({
  defaultLiveEnabled: false,
  localIdentityDiscoveryMax: 1,
  writerSaGetIamPolicyReadsMax: 1,
  projectIamReadsMax: 0,
  mutationsMax: 0,
  retriesMax: 0,
  rawIdentityOutput: false,
  rawPolicyOutput: false,
  rawProcessOutput: false,
  approvalRequired: true,
});
