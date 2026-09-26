import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { computeG2BCleanCasPolicyCanonicalDigest, verifyG2BCleanCasBaselineEvidence } from "./g2bCleanGenerationCasEvidenceCapture.mjs";

const TOP_LEVEL_POLICY_FIELDS = new Set(["bindings", "etag", "version", "auditConfigs"]);
const BINDING_FIELDS = new Set(["role", "members", "condition"]);
const CONDITION_FIELDS = new Set(["expression", "title", "description", "location"]);
const AUDIT_CONFIG_FIELDS = new Set(["service", "auditLogConfigs"]);
const AUDIT_LOG_CONFIG_FIELDS = new Set(["logType", "exemptedMembers"]);

export const G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT = Object.freeze({
  transport: "injected-direct-iam-v1-service-account-policy-transport",
  serviceMethod: "iam.projects.serviceAccounts.setIamPolicy",
  requestMethod: "POST",
  resourceFormat: "projects/{project}/serviceAccounts/{serviceAccount}",
  requestBody: "SetIamPolicyRequest{policy: complete prestate-derived Policy}",
  prestateGetCallsMax: 1,
  setCallsMax: 1,
  poststateGetCallsMax: 1,
  totalPhysicalRemoteCallsMax: 3,
  hiddenProviderCalls: 0,
  retries: 0,
  rollbacks: 0,
  oldGcloudBindingFallback: false,
  credentialRefreshAllowed: false,
  tokenGenerationAllowed: false,
  poststateAfterConfirmedSuccessOnly: true,
  recoveryAfterIndeterminateRequiresSeparateApproval: true,
});

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, allowed) {
  return plainObject(value) && Object.keys(value).every((key) => allowed.has(key));
}

function exactString(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 4096;
}

function validCondition(value) {
  return hasOnlyKeys(value, CONDITION_FIELDS)
    && Object.values(value).every((field) => typeof field === "string");
}

function validBinding(value) {
  return hasOnlyKeys(value, BINDING_FIELDS)
    && exactString(value.role)
    && Array.isArray(value.members)
    && value.members.every(exactString)
    && (!Object.hasOwn(value, "condition") || validCondition(value.condition));
}

function validAuditConfig(value) {
  return hasOnlyKeys(value, AUDIT_CONFIG_FIELDS)
    && exactString(value.service)
    && Array.isArray(value.auditLogConfigs)
    && value.auditLogConfigs.every((config) => hasOnlyKeys(config, AUDIT_LOG_CONFIG_FIELDS)
      && exactString(config.logType)
      && (!Object.hasOwn(config, "exemptedMembers")
        || (Array.isArray(config.exemptedMembers) && config.exemptedMembers.every(exactString))));
}

/** Validates only the complete Policy shape supported by this transport. */
export function validateG2BReusablePolicy(policy, { returnedPolicyVersionState } = {}) {
  const unsetVersion = Object.hasOwn(policy || {}, "version") && policy.version === null;
  const explicitVersion = Object.hasOwn(policy || {}, "version") && Number.isInteger(policy.version);
  if (!hasOnlyKeys(policy, TOP_LEVEL_POLICY_FIELDS)
    || !Array.isArray(policy.bindings)
    || !policy.bindings.every(validBinding)
    || !exactString(policy.etag)
    || (Object.hasOwn(policy, "version") && !(unsetVersion && returnedPolicyVersionState === "UNSET")
      && (!Number.isInteger(policy.version) || policy.version < 0))
    || (returnedPolicyVersionState === "UNSET" && !unsetVersion)
    || (returnedPolicyVersionState === "EXPLICIT" && !explicitVersion)
    || (returnedPolicyVersionState !== undefined && !["UNSET", "EXPLICIT"].includes(returnedPolicyVersionState))
    || (unsetVersion && (returnedPolicyVersionState !== "UNSET"
      || policy.bindings.some((binding) => binding.condition !== undefined || /_withcond_/i.test(binding.role))))
    || (policy && !unsetVersion && policy.version < 3 && policy.bindings.some((binding) => binding.condition !== undefined || /_withcond_/i.test(binding.role)))
    || (Object.hasOwn(policy, "auditConfigs")
      && (!Array.isArray(policy.auditConfigs) || !policy.auditConfigs.every(validAuditConfig)))) {
    return Object.freeze({ ok: false, code: "PRESTATE_POLICY_UNSUPPORTED_OR_MALFORMED" });
  }
  return Object.freeze({ ok: true });
}

function memberIsPresent(policy, role, member) {
  return policy.bindings.some((binding) => binding.role === role && binding.members.includes(member));
}

function unconditionedRoleBinding(policy, role) {
  return policy.bindings.find((binding) => binding.role === role && !Object.hasOwn(binding, "condition"));
}

/**
 * Returns a new complete policy in memory. It never persists or exposes the
 * source policy, its etag, or the derived member in an operation result.
 */
export function prepareG2BExactMemberSet(policy, { role = G2B_TARGET_ROLE, member, returnedPolicyVersionState } = {}) {
  if (role !== G2B_TARGET_ROLE || !exactString(member)) {
    return Object.freeze({ ok: false, code: "EXACT_TARGET_BINDING_REQUIRED" });
  }
  const validation = validateG2BReusablePolicy(policy, { returnedPolicyVersionState });
  if (!validation.ok) return validation;
  if (memberIsPresent(policy, role, member)) {
    return Object.freeze({ ok: true, state: "TARGET_MEMBER_PRESENT", policy: null });
  }
  const next = structuredClone(policy);
  const binding = unconditionedRoleBinding(next, role);
  if (binding) {
    binding.members.push(member);
  } else {
    next.bindings.push({ role, members: [member] });
  }
  return Object.freeze({ ok: true, state: "TARGET_MEMBER_ABSENT", policy: next });
}

export function createG2BNoRefreshCredentialGuard({
  cachedCredentialPresent = false,
  expiryEpochMs = null,
  now = () => Date.now(),
  minimumFreshnessMs = 120_000,
} = {}) {
  const fresh = cachedCredentialPresent === true
    && Number.isFinite(expiryEpochMs)
    && expiryEpochMs > now() + minimumFreshnessMs;
  return Object.freeze({
    ready: fresh,
    refreshAllowed: false,
    tokenGenerationAllowed: false,
    failureCode: fresh ? null : "CACHED_CREDENTIAL_NOT_FRESH",
  });
}

function safeOutcome({ result, requestStarted, httpStatus = null, responseValid = false }) {
  if (requestStarted !== true) {
    return Object.freeze({ result: "CONFIRMED_FAILURE", classifier: "REQUEST_NOT_STARTED" });
  }
  if (httpStatus === 200 && responseValid === true) {
    return Object.freeze({ result: "CONFIRMED_SUCCESS", classifier: "HTTP_SUCCESS_AND_VALID_RESPONSE" });
  }
  if (httpStatus === 401) return Object.freeze({ result: "CONFIRMED_FAILURE", classifier: "AUTHENTICATION_FAILURE" });
  if (httpStatus === 403) return Object.freeze({ result: "CONFIRMED_FAILURE", classifier: "AUTHORIZATION_FAILURE" });
  if (httpStatus === 400) return Object.freeze({ result: "CONFIRMED_FAILURE", classifier: "INVALID_ARGUMENT" });
  if (httpStatus === 404) return Object.freeze({ result: "CONFIRMED_FAILURE", classifier: "RESOURCE_NOT_FOUND" });
  if (httpStatus === 409 || httpStatus === 412) {
    return Object.freeze({ result: "CONFIRMED_FAILURE", classifier: "ETAG_OR_PRECONDITION_CONFLICT" });
  }
  if (httpStatus >= 500 && httpStatus <= 599) {
    return Object.freeze({ result: "INDETERMINATE", classifier: "PROVIDER_5XX" });
  }
  if (result === "TIMEOUT") return Object.freeze({ result: "INDETERMINATE", classifier: "TIMEOUT_AFTER_REQUEST_START" });
  if (result === "TRANSPORT_FAILURE") return Object.freeze({ result: "INDETERMINATE", classifier: "TRANSPORT_FAILURE_AFTER_REQUEST_START" });
  if (result === "MALFORMED_RESPONSE") return Object.freeze({ result: "INDETERMINATE", classifier: "MALFORMED_RESPONSE" });
  return Object.freeze({ result: "INDETERMINATE", classifier: "UNKNOWN_FAILURE_AFTER_REQUEST_START" });
}

function safeCounters({ getCalls = 0, setCalls = 0, poststateCalls = 0 } = {}) {
  return Object.freeze({
    prestateGetCalls: getCalls - poststateCalls,
    explicitSetCalls: setCalls,
    poststateGetCalls: poststateCalls,
    totalExplicitProviderCalls: getCalls + setCalls,
    hiddenProviderCalls: 0,
    retries: 0,
    rollbackSets: 0,
    secondSetCalls: Math.max(0, setCalls - 1),
  });
}

function safeResult(code, counters, extra = {}) {
  return Object.freeze({ ok: false, code, counters, ...extra });
}

/**
 * Executes only injected provider operations. The production provider is not
 * bound here; tests use a zero-network fake transport to prove the call graph.
 */
export async function executeG2BExplicitSetIamPolicy({
  enabled = false,
  provider,
  targetResource,
  targetRole = G2B_TARGET_ROLE,
  intendedMember,
  baselineEvidence,
  credentialGuard,
  requirePoststate = true,
} = {}) {
  let getCalls = 0;
  let setCalls = 0;
  let poststateCalls = 0;
  const counters = () => safeCounters({ getCalls, setCalls, poststateCalls });
  if (enabled !== true) return safeResult("EXPLICIT_M3_EXECUTION_DISABLED", counters());
  if (targetResource !== G2B_TARGET_RESOURCE || targetRole !== G2B_TARGET_ROLE || !exactString(intendedMember)) {
    return safeResult("EXACT_G2B_TARGET_BINDING_REQUIRED", counters());
  }
  if (!credentialGuard || credentialGuard.ready !== true || credentialGuard.refreshAllowed !== false) {
    return safeResult("CACHED_CREDENTIAL_NOT_FRESH", counters());
  }
  if (!provider || typeof provider.getIamPolicy !== "function" || typeof provider.setIamPolicy !== "function") {
    return safeResult("EXPLICIT_DIRECT_PROVIDER_REQUIRED", counters());
  }

  let prestate;
  getCalls += 1;
  try { prestate = await provider.getIamPolicy({ resource: targetResource, phase: "PRESTATE" }); }
  catch { return safeResult("PRESTATE_READ_FAILURE", counters()); }
  if (!prestate || prestate.ok !== true) return safeResult("PRESTATE_READ_FAILURE", counters());
  if (baselineEvidence !== undefined) {
    const observedDigest = computeG2BCleanCasPolicyCanonicalDigest({ policy: prestate.policy,
      returnedPolicyVersionState: prestate.returnedPolicyVersionState,
      returnedPolicyVersionValue: prestate.returnedPolicyVersionState === "UNSET" ? null : prestate.policy?.version });
    if (!verifyG2BCleanCasBaselineEvidence(baselineEvidence) || baselineEvidence.baselineCapable !== true
      || baselineEvidence.casState !== "RESOLVED" || baselineEvidence.targetResource !== targetResource
      || baselineEvidence.targetRole !== targetRole || baselineEvidence.targetMember !== intendedMember
      || observedDigest !== baselineEvidence.policyCanonicalDigest
      || typeof prestate.policy?.etag !== "string" || prestate.policy.etag.length === 0) {
      return safeResult("BASELINE_SEMANTIC_OR_ETAG_GATE_FAILED", counters());
    }
  }
  const prepared = prepareG2BExactMemberSet(prestate.policy, { role: targetRole, member: intendedMember,
    returnedPolicyVersionState: prestate.returnedPolicyVersionState });
  if (!prepared.ok) return safeResult(prepared.code, counters());
  if (prepared.state === "TARGET_MEMBER_PRESENT") {
    return safeResult("PRESTATE_MEMBER_PRESENT_NO_SET", counters(), { state: "TARGET_MEMBER_PRESENT" });
  }

  let setResponse;
  setCalls += 1;
  try {
    setResponse = await provider.setIamPolicy({ resource: targetResource, policy: prepared.policy,
      returnedPolicyVersionState: prestate.returnedPolicyVersionState, phase: "MUTATION" });
  } catch {
    setResponse = { requestStarted: true, result: "TRANSPORT_FAILURE" };
  }
  const classified = safeOutcome(setResponse || {});
  if (classified.result !== "CONFIRMED_SUCCESS") {
    return safeResult(`SET_${classified.classifier}`, counters(), {
      state: classified.result === "INDETERMINATE" ? "MUTATION_INDETERMINATE" : "MUTATION_CONFIRMED_FAILURE",
      recoveryRequired: classified.result === "INDETERMINATE",
    });
  }
  if (requirePoststate !== true) {
    return Object.freeze({ ok: true, code: "SET_CONFIRMED_SUCCESS", state: "MUTATION_CONFIRMED", counters: counters() });
  }

  let poststate;
  getCalls += 1;
  poststateCalls += 1;
  try { poststate = await provider.getIamPolicy({ resource: targetResource, phase: "POSTSTATE" }); }
  catch { return safeResult("POSTSTATE_READ_FAILURE", counters()); }
  if (!poststate || poststate.ok !== true) return safeResult("POSTSTATE_READ_FAILURE", counters());
  const final = prepareG2BExactMemberSet(poststate.policy, { role: targetRole, member: intendedMember,
    returnedPolicyVersionState: poststate.returnedPolicyVersionState });
  if (!final.ok || final.state !== "TARGET_MEMBER_PRESENT") {
    return safeResult("POSTSTATE_MEMBER_NOT_PRESENT", counters());
  }
  return Object.freeze({ ok: true, code: "PRESENT_CONFIRMED", state: "PRESENT_CONFIRMED", counters: counters() });
}

export const G2B_EXPLICIT_SET_IAM_POLICY_TRANSPORT_SECURITY = Object.freeze({
  directMutationAuthTransport: "CLOUD_SDK_CACHED_CREDENTIAL_NO_REFRESH_GUARD",
  credentialFreshnessLocallyDeterminable: true,
  expiredOrUnknownCredentialFailsBeforeHttp: true,
  authTransportHasHiddenRemoteCalls: false,
  oldGcloudMutationFallbackReachable: false,
  oldGcloudMutationRetryReachable: false,
  directSetIamPolicySupportedByInstalledSdk: true,
  noSecondHiddenPrestateRead: true,
  policyEtagPreserved: true,
  unrelatedBindingsPreserved: true,
  unknownPolicyFieldsFailClosed: true,
});
