const REPOSITORY_LIMITS = Object.freeze({ credentialRefreshMax: 1, iamReadMax: 1, setIamPolicyMax: 0 });

export function hasExplicitRemoteExecutionIntent(executionEnvelope) {
  return executionEnvelope?.executionMode === "REMOTE_READ_ONLY"
    && executionEnvelope?.executeRemoteNow === true;
}

export function authorizeG2BTransportOperation(executionEnvelope, operation) {
  if (!hasExplicitRemoteExecutionIntent(executionEnvelope)) {
    return Object.freeze({ ok: false, code: "CURRENT_REMOTE_EXECUTION_INTENT_REQUIRED" });
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(executionEnvelope.operationInstance || "")
    || !/^[a-f0-9]{64}$/.test(executionEnvelope.approvalPacketSha256 || "")
    || !/^[a-f0-9]{64}$/.test(executionEnvelope.sourceLockDigest || "")) {
    return Object.freeze({ ok: false, code: "CURRENT_REMOTE_EXECUTION_BINDING_MISSING" });
  }
  const budgetKey = operation === "DIRECT_CONTEXT_CREDENTIAL_REFRESH" ? "credentialRefreshMax"
    : operation === "SET_FROM_PRESTATE_POLICY" ? "setIamPolicyMax"
    : operation === "TEST_DIRECT_CONTEXT_EXACT_PERMISSION" ? "testIamPermissionsMax"
    : ["READ_PRESTATE_POLICY", "READ_GENERATION_BOUND_RECOVERY_POLICY", "READ_EXACT_G2B_MEMBER"].includes(operation) ? "iamReadMax" : null;
  if (!budgetKey || !Number.isSafeInteger(executionEnvelope[budgetKey]) || executionEnvelope[budgetKey] < 1) {
    return Object.freeze({ ok: false, code: "CURRENT_REMOTE_EXECUTION_BUDGET_BLOCKED" });
  }
  return Object.freeze({ ok: true });
}

export function validateG2BCurrentRunExecutionEnvelope({
  executionEnvelope,
  operationInstance,
  packetRawSha256,
  sourceLockDigest,
  packet,
} = {}) {
  if (!hasExplicitRemoteExecutionIntent(executionEnvelope)) {
    return Object.freeze({ ok: false, code: "CURRENT_REMOTE_EXECUTION_INTENT_REQUIRED" });
  }
  if (executionEnvelope.operationInstance !== operationInstance
    || executionEnvelope.approvalPacketSha256 !== packetRawSha256
    || executionEnvelope.sourceLockDigest !== sourceLockDigest) {
    return Object.freeze({ ok: false, code: "CURRENT_REMOTE_EXECUTION_BINDING_MISMATCH" });
  }
  const requested = {
    credentialRefreshMax: executionEnvelope.credentialRefreshMax,
    iamReadMax: executionEnvelope.iamReadMax,
    setIamPolicyMax: executionEnvelope.setIamPolicyMax,
  };
  if (!Number.isSafeInteger(requested.credentialRefreshMax) || requested.credentialRefreshMax < 0
    || !Number.isSafeInteger(requested.iamReadMax) || requested.iamReadMax < 0
    || !Number.isSafeInteger(requested.setIamPolicyMax) || requested.setIamPolicyMax < 0) {
    return Object.freeze({ ok: false, code: "CURRENT_REMOTE_EXECUTION_BUDGET_INVALID" });
  }
  const packetLimits = {
    credentialRefreshMax: packet?.credentialRefreshMax,
    iamReadMax: packet?.iamPolicyReadMax,
    setIamPolicyMax: packet?.setIamPolicyMax,
  };
  const effective = Object.fromEntries(Object.keys(REPOSITORY_LIMITS).map((key) => [
    key,
    Math.min(requested[key], packetLimits[key], REPOSITORY_LIMITS[key]),
  ]));
  if (requested.setIamPolicyMax !== 0 || packetLimits.setIamPolicyMax !== 0
    || effective.credentialRefreshMax !== 1 || effective.iamReadMax !== 1) {
    return Object.freeze({ ok: false, code: "CURRENT_REMOTE_EXECUTION_BUDGET_BLOCKED", effective: Object.freeze(effective) });
  }
  return Object.freeze({
    ok: true,
    effective: Object.freeze(effective),
    totalPhysicalRemoteCallsMax: effective.credentialRefreshMax + effective.iamReadMax,
  });
}

export const G2B_CURRENT_RUN_EXECUTION_INTENT_CONTRACT = Object.freeze({
  defaultExecutionMode: "LOCAL_ONLY",
  defaultExecuteRemoteNow: false,
  localOnlyHardLatch: true,
  currentRunMarkerRequired: true,
  approvalPacketIsExecutionIntent: false,
  historicalApprovalIsExecutionIntent: false,
  repositoryLimits: REPOSITORY_LIMITS,
});
