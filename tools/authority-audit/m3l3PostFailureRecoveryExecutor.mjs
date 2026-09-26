import {
  buildActiveCallerCommand,
  buildPinnedWriterPolicyReadCommand,
  createIdentityContext,
} from "./m3RuntimeCommandGraph.mjs";
import {
  resolveLocalGcloudExecutable,
  runWindowsProcess,
} from "./windowsGcloudProcessAdapter.mjs";

export const R1_DEFAULT_LIVE_ENABLED = false;
export const R1_WRITER_POLICY_READ_MAX = 1;
export const R1_IDENTITY_DISCOVERY_MAX = 1;

const TARGET_ROLE = "roles/iam.serviceAccountTokenCreator";

function result({
  recoveryResult,
  opAExecutions,
  identityContextEstablished,
  approvalConsumed,
  writerSaGetIamPolicyReads,
}) {
  return Object.freeze({
    recoveryResult,
    currentM3State: recoveryResult,
    opAExecutions,
    identityContextEstablished,
    approvalConsumed,
    approvalStatus: approvalConsumed ? "CONSUMED_NON_REUSABLE" : "NOT_REACHED_NON_REUSABLE",
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

function parseActiveAccounts(stdout) {
  if (typeof stdout !== "string" || stdout.length > 1024 * 1024) return [];
  return stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function parsePolicy(stdout) {
  if (typeof stdout !== "string" || stdout.length > 1024 * 1024) return null;
  try {
    const value = JSON.parse(stdout);
    return value && typeof value === "object" && Array.isArray(value.bindings) ? value : null;
  } catch {
    return null;
  }
}

export function classifyR1WriterPolicy(stdout, identityContext) {
  const policy = parsePolicy(stdout);
  const exactMember = identityContext?.exactIamMember;
  if (!policy || typeof exactMember !== "string" || exactMember.length === 0) return "READ_FAILURE";

  const targetBindings = policy.bindings.filter((binding) => binding?.role === TARGET_ROLE);
  if (targetBindings.length === 0) return "ZERO_BINDINGS_ABSENT";
  if (targetBindings.some((binding) => !Array.isArray(binding.members))) return "AMBIGUOUS";

  const exactOccurrences = targetBindings
    .flatMap((binding) => binding.members)
    .filter((member) => member === exactMember)
    .length;
  if (exactOccurrences > 1) return "AMBIGUOUS";
  if (exactOccurrences === 1) {
    const exactBinding = targetBindings.find((binding) => binding.members.includes(exactMember));
    if (exactBinding?.condition !== undefined && exactBinding.condition !== null) return "AMBIGUOUS";
    return "PRESENT_CONFIRMED";
  }

  const totalMembers = targetBindings.reduce((count, binding) => count + binding.members.length, 0);
  return totalMembers === 0 ? "ZERO_BINDINGS_ABSENT" : "MEMBER_ABSENT";
}

export async function executeM3l3ReadOnlyRecovery({
  enabled = R1_DEFAULT_LIVE_ENABLED,
  executable = null,
  runProcess = runWindowsProcess,
  environment = process.env,
} = {}) {
  let opAExecutions = 0;
  let writerSaGetIamPolicyReads = 0;
  let approvalConsumed = false;

  if (enabled !== true) {
    return result({
      recoveryResult: "IDENTITY_FAILURE",
      opAExecutions,
      identityContextEstablished: false,
      approvalConsumed,
      writerSaGetIamPolicyReads,
    });
  }

  const selectedExecutable = executable || resolveLocalGcloudExecutable();
  if (!selectedExecutable) {
    return result({
      recoveryResult: "IDENTITY_FAILURE",
      opAExecutions,
      identityContextEstablished: false,
      approvalConsumed,
      writerSaGetIamPolicyReads,
    });
  }

  let callerResult;
  try {
    opAExecutions += 1;
    callerResult = await runProcess({
      executable: selectedExecutable,
      args: buildActiveCallerCommand(),
      timeoutMs: 10_000,
      environment,
    });
  } catch {
    callerResult = null;
  }
  const accounts = callerResult?.exitCode === 0 && callerResult?.timedOut !== true
    ? parseActiveAccounts(callerResult.stdout)
    : [];
  if (accounts.length !== 1) {
    return result({
      recoveryResult: "IDENTITY_FAILURE",
      opAExecutions,
      identityContextEstablished: false,
      approvalConsumed,
      writerSaGetIamPolicyReads,
    });
  }

  const identityContext = createIdentityContext(accounts[0], { environment });
  if (!identityContext) {
    return result({
      recoveryResult: "IDENTITY_FAILURE",
      opAExecutions,
      identityContextEstablished: false,
      approvalConsumed,
      writerSaGetIamPolicyReads,
    });
  }

  let policyResult;
  approvalConsumed = true;
  writerSaGetIamPolicyReads += 1;
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

  const recoveryResult = policyResult?.exitCode === 0 && policyResult?.timedOut !== true
    ? classifyR1WriterPolicy(policyResult.stdout, identityContext)
    : "READ_FAILURE";

  return result({
    recoveryResult,
    opAExecutions,
    identityContextEstablished: true,
    approvalConsumed,
    writerSaGetIamPolicyReads,
  });
}

export const M3L3_R1_EXECUTOR_CONTRACT = Object.freeze({
  defaultLiveEnabled: false,
  localIdentityDiscoveryMax: 1,
  writerSaGetIamPolicyReadsMax: 1,
  projectIamReadsMax: 0,
  mutationsMax: 0,
  retriesMax: 0,
  rawIdentityOutput: false,
  rawPolicyOutput: false,
});
