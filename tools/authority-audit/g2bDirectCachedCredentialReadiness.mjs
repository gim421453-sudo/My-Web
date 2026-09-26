export const G2B_DIRECT_CACHED_CREDENTIAL_READINESS_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-DIRECT-CACHED-CREDENTIAL-LOCAL-READINESS";

const ALLOWED_RESULTS = new Set([
  "CACHED_CREDENTIAL_READY_CONFIRMED",
  "CACHED_CREDENTIAL_EXPIRED_CONFIRMED",
  "CACHED_CREDENTIAL_TOO_CLOSE_TO_EXPIRY",
  "CACHED_CREDENTIAL_MISSING",
  "CACHED_CREDENTIAL_METADATA_INVALID",
]);

function blocked(result) {
  return Object.freeze({
    ok: false,
    result,
    remoteOperations: 0,
    refreshMethodInvocations: 0,
    networkRequests: 0,
  });
}

/** Uses the same direct transport helper, but exits before any HTTP client is created. */
export async function readG2BDirectCachedCredentialReadiness({ transport } = {}) {
  if (!transport || typeof transport.readLocalCachedCredentialReadiness !== "function") {
    return blocked("LOCAL_CREDENTIAL_LOAD_FAILURE");
  }
  let value;
  try { value = await transport.readLocalCachedCredentialReadiness(); }
  catch { return blocked("LOCAL_CREDENTIAL_LOAD_FAILURE"); }
  if (value?.ok !== true || !ALLOWED_RESULTS.has(value.state) || value.physicalCalls !== 0) {
    return blocked(value?.code === "LOCAL_PRIVACY_GUARD"
      ? "CACHED_CREDENTIAL_CONTEXT_MISMATCH"
      : "CACHED_CREDENTIAL_READINESS_UNKNOWN");
  }
  return Object.freeze({
    ok: value.state === "CACHED_CREDENTIAL_READY_CONFIRMED",
    result: value.state,
    configuredIdentityContextResolved: value.configuredIdentityContextResolved === true,
    credentialStoreRecordResolved: value.credentialStoreRecordResolved === true,
    credentialObjectLoad: value.credentialObjectLoad,
    cachedAccessTokenPresent: value.cachedAccessTokenPresent === true,
    credentialExpiryMetadataPresent: value.credentialExpiryMetadataPresent === true,
    credentialExpiryParseValid: value.credentialExpiryParseValid === true,
    credentialExpiryRelativeState: value.credentialExpiryRelativeState,
    freshnessMarginSeconds: value.freshnessMarginSeconds,
    credentialRecordMatchesConfiguredContext: true,
    credentialRecordMatchesDirectMutationAuthContext: true,
    credentialRecordMatchesDirectDiagnosticAuthContext: true,
    remoteOperations: 0,
    refreshMethodInvocations: 0,
    networkRequests: 0,
  });
}

export const G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT = Object.freeze({
  sourcePath: "g2b-explicit-direct-set-iam-policy-cached-credential-v2",
  cachedCredentialOnly: true,
  freshnessMarginSeconds: 120,
  implicitRefreshAllowed: false,
  networkRequests: 0,
  tokenEndpointCalls: 0,
  metadataRequests: 0,
  m3OperationReachable: false,
});
