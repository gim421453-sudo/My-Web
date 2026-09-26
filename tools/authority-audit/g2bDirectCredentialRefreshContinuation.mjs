const FRESH_RESULT = "CACHED_CREDENTIAL_READY_CONFIRMED";

function fresh(value) {
  return value?.ok === true
    && value.result === FRESH_RESULT
    && value.credentialExpiryRelativeState === "FRESH"
    && value.freshnessMarginSeconds === 120
    && value.configuredIdentityContextResolved === true
    && value.credentialStoreRecordResolved === true
    && value.credentialRecordMatchesConfiguredContext === true
    && value.credentialRecordMatchesDirectMutationAuthContext === true
    && value.credentialRecordMatchesDirectDiagnosticAuthContext === true
    && value.remoteOperations === 0
    && value.refreshMethodInvocations === 0
    && value.networkRequests === 0;
}

/** This continuation has no transport dependency and cannot make a remote call. */
export async function prepareG2BPostRefreshDiagnosticAuthority({
  readFreshness,
  buildDiagnosticArtifacts,
  verifyDiagnosticArtifacts,
  refreshBinding,
} = {}) {
  if (typeof readFreshness !== "function" || typeof buildDiagnosticArtifacts !== "function"
    || typeof verifyDiagnosticArtifacts !== "function" || !refreshBinding) {
    return Object.freeze({ ok: false, result: "POST_REFRESH_LOCAL_PREPARATION_NOT_CONFIGURED", remoteOperations: 0 });
  }
  let readiness;
  try { readiness = await readFreshness(); } catch {
    return Object.freeze({ ok: false, result: "POST_REFRESH_LOCAL_READINESS_FAILURE", remoteOperations: 0 });
  }
  if (!fresh(readiness)) {
    return Object.freeze({ ok: false, result: "POST_REFRESH_CREDENTIAL_NOT_FRESH", remoteOperations: 0 });
  }
  let artifacts;
  try { artifacts = buildDiagnosticArtifacts({ refreshBinding }); } catch {
    return Object.freeze({ ok: false, result: "POST_REFRESH_DIAGNOSTIC_PACKET_BLOCKED", remoteOperations: 0 });
  }
  if (verifyDiagnosticArtifacts(artifacts, { refreshBinding })?.ok !== true) {
    return Object.freeze({ ok: false, result: "POST_REFRESH_DIAGNOSTIC_PACKET_LOCK_MISMATCH", remoteOperations: 0 });
  }
  return Object.freeze({ ok: true, result: "POST_REFRESH_DIAGNOSTIC_AUTHORITY_PREPARED", artifacts, remoteOperations: 0 });
}

export const G2B_POST_REFRESH_DIAGNOSTIC_CONTINUATION_CONTRACT = Object.freeze({
  localOnly: true,
  freshnessMarginSeconds: 120,
  testIamPermissionsCalls: 0,
  iamCalls: 0,
  credentialRefreshCallsAfterFirst: 0,
  remoteOperationsAfterRefresh: 0,
  m3Mutations: 0,
  m4Mutations: 0,
  firestoreCalls: 0,
});
