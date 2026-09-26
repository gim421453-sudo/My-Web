import { createG2BExplicitSetIamPolicyAuthTransport } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import { executeG2BFutureM3 } from "./g2bM3RecoveryAnchorRuntime.mjs";
import { createG2BRecoveryAnchorStore } from "./g2bRecoveryAnchor.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";

export const G2B_CURRENT_LIVE_RUNTIME_ID = "G2B_EXPLICIT_DIRECT_SET_IAM_POLICY_EXECUTOR_V2";
export const G2B_CURRENT_LIVE_DEFAULT_ENABLED = false;

function blocked(code, extra = {}) { return Object.freeze({ ok: false, code, ...extra }); }
function counters({ prestate = 0, set = 0, poststate = 0 } = {}) {
  return Object.freeze({
    localIdentityDiscovery: 0, prestateWriterIamPolicyReads: prestate, directSetIamPolicyCalls: set,
    poststateWriterIamPolicyReads: poststate, totalPhysicalProviderCalls: prestate + set + poststate,
    retries: 0, rollbacks: 0, secondMutationCalls: 0, projectIamReads: 0, m4Mutations: 0,
    firestoreCalls: 0, tokenCalls: 0, testIamPermissionsCalls: 0,
  });
}

function directExecutorBound(executor) {
  const transport = executor?.directTransport;
  return transport && typeof transport.readFreshPrestate === "function"
    && typeof transport.setFromFreshPrestate === "function"
    && typeof transport.readPostSuccessExactMember === "function"
    && typeof transport.readLocalCachedCredentialReadiness === "function";
}

export function createG2BWindowsLiveExecutor({ environment = process.env, enabled = false } = {}) {
  return Object.freeze({
    id: "g2b-explicit-direct-set-iam-policy-executor-v2",
    directTransport: createG2BExplicitSetIamPolicyAuthTransport({ environment, enabled }),
  });
}

/**
 * The sole prospective M3 path. It has no gcloud fallback and requires a
 * locally supplied, source-locked identity context plus a separate current
 * authorization attestation before any direct transport can be reached.
 */
export async function executeG2BCurrentLiveM3({
  enabled = G2B_CURRENT_LIVE_DEFAULT_ENABLED,
  executor,
  identityContext,
  authorizationPreconditionEstablished = false,
  consumeApproval,
  secretProvider,
  store,
  operationGenerationId,
  anchorDirectory,
} = {}) {
  let prestateCalls = 0;
  let setCalls = 0;
  let poststateCalls = 0;
  const safeCounters = () => counters({ prestate: prestateCalls, set: setCalls, poststate: poststateCalls });
  if (enabled !== true) return blocked("LIVE_EXECUTION_DISABLED", { counters: safeCounters() });
  if (authorizationPreconditionEstablished !== true) return blocked("CURRENT_DIRECT_TRANSPORT_AUTHORIZATION_REATTESTATION_REQUIRED", { counters: safeCounters() });
  if (!directExecutorBound(executor)) return blocked("EXPLICIT_DIRECT_TRANSPORT_NOT_BOUND", { counters: safeCounters() });
  if (!identityContext || typeof identityContext.exactPrincipal !== "string" || typeof identityContext.exactIamMember !== "string") {
    return blocked("LOCAL_IDENTITY_CONTEXT_REQUIRED", { counters: safeCounters() });
  }
  const resolvedSecretProvider = secretProvider || createWindowsDpapiSecretProvider();
  let resolvedStore;
  try { resolvedStore = store || (anchorDirectory ? createG2BRecoveryAnchorStore({ directory: anchorDirectory }) : null); }
  catch { return blocked("RECOVERY_ANCHOR_STORE_INVALID", { counters: safeCounters() }); }
  if (!resolvedSecretProvider || typeof resolvedSecretProvider.loadOrInitialize !== "function" || typeof resolvedSecretProvider.read !== "function" || !resolvedStore) {
    return blocked("RECOVERY_ANCHOR_DEPENDENCY_NOT_BOUND", { counters: safeCounters() });
  }
  if (typeof operationGenerationId !== "string" || operationGenerationId.trim() === "") {
    return blocked("OPERATION_GENERATION_REQUIRED", { counters: safeCounters() });
  }
  const existingAnchor = typeof resolvedStore.load === "function" ? resolvedStore.load(operationGenerationId) : null;
  if (existingAnchor?.state !== "MISSING" && (existingAnchor?.state !== "READY" || existingAnchor.record?.anchorState !== "ANCHOR_VERIFIED")) {
    return blocked("OPERATION_GENERATION_REUSE_BLOCKED", { counters: safeCounters() });
  }
  const readiness = await readG2BDirectCachedCredentialReadiness({ transport: executor.directTransport });
  if (readiness.ok !== true) {
    return blocked("PRELIVE_CACHED_CREDENTIAL_NOT_READY", { counters: safeCounters(), preLiveReadiness: readiness.result });
  }
  if (typeof consumeApproval !== "function") {
    return blocked("M3_APPROVAL_CONSUMER_REQUIRED", { counters: safeCounters() });
  }
  const request = { account: identityContext.exactPrincipal, member: identityContext.exactIamMember };
  let prestatePolicy = null;
  const result = await executeG2BFutureM3({
    identityContext,
    secretProvider: resolvedSecretProvider,
    store: resolvedStore,
    operationGenerationId,
    reuseVerifiedAnchor: existingAnchor?.state === "READY",
    beforeFirstRemote: async () => consumeApproval(),
    readPrestate: async () => {
      prestateCalls += 1;
      const value = await executor.directTransport.readFreshPrestate(request);
      if (!value?.ok) return "READ_FAILURE";
      prestatePolicy = value.policy;
      return value.state === "ABSENT" ? "MEMBER_ABSENT_CONFIRMED" : "TARGET_MEMBER_PRESENT";
    },
    mutateOnce: async () => {
      if (!prestatePolicy) return { confirmedSuccess: false };
      setCalls += 1;
      const value = await executor.directTransport.setFromFreshPrestate({ ...request, policy: prestatePolicy });
      return { confirmedSuccess: value?.ok === true && value.state === "SET_CONFIRMED_SUCCESS" };
    },
    readPoststate: async () => {
      poststateCalls += 1;
      const value = await executor.directTransport.readPostSuccessExactMember(request);
      return value?.ok === true && value.state === "PRESENT" ? "PRESENT_CONFIRMED" : "READ_FAILURE";
    },
  });
  return Object.freeze({
    ok: result.ok === true,
    code: result.ok ? "M3_PRESENT_EXACT" : result.code || "M3_LIVE_EXECUTION_BLOCKED",
    state: result.ok ? "PRESENT_CONFIRMED" : result.anchorState,
    anchorState: result.anchorState,
    counters: safeCounters(),
  });
}

export const G2B_CURRENT_LIVE_EXECUTOR_CONTRACT = Object.freeze({
  runtimeId: G2B_CURRENT_LIVE_RUNTIME_ID,
  directSetIamPolicyLivePath: true,
  oldGcloudMutationReachability: 0,
  oldGcloudMutationFallbackReachability: 0,
  oldGcloudMutationRetryReachability: 0,
  localIdentityDiscoveryRequired: true,
  localIdentityDiscoveryRemote: false,
  prestateWriterPolicyReadsMax: 1,
  directSetIamPolicyCallsMax: 1,
  directSetInternalGetIamPolicy: false,
  poststateWriterPolicyReadsMax: 1,
  totalPhysicalProviderCallsMax: 3,
  retriesMax: 0,
  rollbacksMax: 0,
  secondMutationReachable: false,
  poststateAfterConfirmedSuccessOnly: true,
  recoveryAfterIndeterminateSeparateApproval: true,
  existingVerifiedAnchorReuseSupported: true,
  authorizationPreconditionRequired: true,
  preLiveCachedCredentialReadinessRequired: true,
  preLiveCredentialFreshnessMarginSeconds: 120,
  approvalConsumptionPoint: "WHEN_FIRST_APPROVED_EXACT_WRITER_SERVICE_ACCOUNT_GET_IAM_POLICY_PRESTATE_REQUEST_BEGINS",
  prospectiveM3Reachable: false,
  firestoreReachable: false,
  tokenReachable: false,
  m4Reachable: false,
  testIamPermissionsReachable: false,
  rawPolicyPersisted: false,
  rawMemberPersisted: false,
  rawCredentialPersisted: false,
});
