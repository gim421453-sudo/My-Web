import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";

export const G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-DIRECT-CONTEXT-EXACT-PERMISSION-DIAGNOSTIC";
export const G2B_DIRECT_CONTEXT_PERMISSION = "iam.serviceAccounts.setIamPolicy";

function blocked(code, counters = {}) {
  return Object.freeze({ ok: false, result: code, counters: Object.freeze({ testIamPermissionsCalls: 0, retries: 0, mutations: 0, ...counters }) });
}

function isFreshReadiness(value) {
  return value?.ok === true
    && value.result === "CACHED_CREDENTIAL_READY_CONFIRMED"
    && value.configuredIdentityContextResolved === true
    && value.credentialStoreRecordResolved === true
    && value.cachedAccessTokenPresent === true
    && value.credentialExpiryMetadataPresent === true
    && value.credentialExpiryParseValid === true
    && value.credentialExpiryRelativeState === "FRESH"
    && value.freshnessMarginSeconds === 120
    && value.credentialRecordMatchesConfiguredContext === true
    && value.credentialRecordMatchesDirectMutationAuthContext === true
    && value.credentialRecordMatchesDirectDiagnosticAuthContext === true
    && value.remoteOperations === 0
    && value.networkRequests === 0
    && value.refreshMethodInvocations === 0;
}

function classify(value) {
  if (value?.ok === true && value.state === "PERMISSION_PRESENT_CONFIRMED") return Object.freeze({ result: "PERMISSION_PRESENT_CONFIRMED" });
  if (value?.ok === true && value.state === "PERMISSION_ABSENT_CONFIRMED") return Object.freeze({ result: "PERMISSION_ABSENT_CONFIRMED" });
  const code = typeof value?.code === "string" ? value.code : "DIAGNOSTIC_UNEXPECTED_RESPONSE";
  const provider = value?.failureMetadata?.safeProviderErrorIdentifier;
  if (provider === "HTTP_401" || provider === "HTTP_403") return Object.freeze({ result: "DIAGNOSTIC_AUTH_FAILURE" });
  if (code.includes("AUTH")) return Object.freeze({ result: "DIAGNOSTIC_AUTH_FAILURE" });
  if (code.includes("TIMEOUT")) return Object.freeze({ result: "DIAGNOSTIC_TIMEOUT" });
  if (code.includes("PARSE") || code.includes("PRIVACY")) return Object.freeze({ result: "DIAGNOSTIC_PARSE_FAILURE" });
  if (code.includes("TRANSPORT") || code.includes("PROCESS")) return Object.freeze({ result: "DIAGNOSTIC_TRANSPORT_FAILURE" });
  if (typeof provider === "string" && /^HTTP_5/.test(provider)) return Object.freeze({ result: "DIAGNOSTIC_PROVIDER_FAILURE" });
  if (code.includes("REQUEST")) return Object.freeze({ result: "DIAGNOSTIC_REQUEST_FAILURE" });
  return Object.freeze({ result: "DIAGNOSTIC_UNEXPECTED_RESPONSE" });
}

/** A disabled-by-default diagnostic sharing the direct mutation auth transport. */
export function createG2BDirectContextPermissionDiagnostic({ transport } = {}) {
  let prepared = false;
  let consumed = false;
  return Object.freeze({
    prepare: async () => {
      if (!transport || typeof transport.prepareDirectContextPermissionDiagnostic !== "function") return Object.freeze({ ready: false, code: "DIRECT_CONTEXT_BINDING_REQUIRED" });
      const result = await transport.prepareDirectContextPermissionDiagnostic();
      prepared = result?.ok === true && result.state === "READY_TO_SEND";
      return Object.freeze({ ready: prepared });
    },
    execute: async ({ enabled = false, consumeApproval, preLiveReadinessCheck } = {}) => {
      if (enabled !== true || !prepared || typeof consumeApproval !== "function") return blocked("DIAGNOSTIC_REQUEST_NOT_STARTED");
      if (consumed || !transport || typeof transport.executeDirectContextPermissionDiagnostic !== "function") return blocked("DIAGNOSTIC_REQUEST_NOT_STARTED");
      if (typeof preLiveReadinessCheck !== "function") return blocked("DIAGNOSTIC_PRELIVE_CREDENTIAL_NOT_READY");
      let readiness;
      try { readiness = await preLiveReadinessCheck(); } catch { readiness = null; }
      if (!isFreshReadiness(readiness)) return blocked("DIAGNOSTIC_PRELIVE_CREDENTIAL_NOT_READY");
      let approvalAccepted = false;
      try { approvalAccepted = await consumeApproval(); } catch { approvalAccepted = false; }
      if (approvalAccepted !== true) return blocked("DIAGNOSTIC_REQUEST_NOT_STARTED");
      consumed = true;
      const counters = { testIamPermissionsCalls: 1, retries: 0, mutations: 0 };
      let value;
      try { value = await transport.executeDirectContextPermissionDiagnostic(); }
      catch { value = { ok: false, code: "DIRECT_TRANSPORT_FAILURE" }; }
      const classified = classify(value);
      return Object.freeze({ ok: classified.result === "PERMISSION_PRESENT_CONFIRMED" || classified.result === "PERMISSION_ABSENT_CONFIRMED", ...classified, counters: Object.freeze(counters) });
    },
    snapshot: () => Object.freeze({ prepared, approvalConsumed: consumed }),
  });
}

export const G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT = Object.freeze({
  authContext: "SAME_G2B_EXPLICIT_DIRECT_CACHED_CREDENTIAL_TRANSPORT",
  credentialSource: "CLOUD_SDK_CREDENTIAL_STORE_EXACT_ACCOUNT_NO_REFRESH",
  configurationContext: "CLOUD_SDK_PROPERTIES_EXACT_ACCOUNT_SANITIZED_CONFIG",
  projectContext: "my-management-app-8a933",
  authPathId: "g2b-explicit-direct-set-iam-policy-cached-credential-v2",
  diagnosticCredentialRecordEqualsDirectMutationRecord: true,
  diagnosticAuthContextEqualsDirectMutationAuthContext: true,
  diagnosticCredentialSourceEqualsDirectMutationCredentialSource: true,
  diagnosticConfigurationContextEqualsDirectMutationConfigurationContext: true,
  diagnosticProjectContextEqualsDirectMutationProjectContext: true,
  refreshedRecordEqualsDirectMutationRecord: true,
  refreshedRecordEqualsDirectDiagnosticRecord: true,
  targetResource: G2B_TARGET_RESOURCE,
  targetRole: G2B_TARGET_ROLE,
  exactPermission: G2B_DIRECT_CONTEXT_PERMISSION,
  permissionCount: 1,
  serviceMethod: "iam.projects.serviceAccounts.testIamPermissions",
  requestMethod: "POST",
  resourceFormat: "projects/{project}/serviceAccounts/{serviceAccount}",
  testIamPermissionsCallsMax: 1,
  totalPhysicalRemoteDiagnosticCallsMax: 1,
  authRefreshRemoteCallsMax: 0,
  tokenExchangeRemoteCallsMax: 0,
  oauthTokenEndpointCallsMax: 0,
  tokenGenerationMax: 0,
  discoveryRemoteCallsMax: 0,
  metadataRemoteCallsMax: 0,
  automaticRetries: 0,
  additionalHiddenPhysicalCalls: 0,
  preLiveCachedCredentialReadinessRequired: true,
  preLiveFreshnessMarginSeconds: 120,
  preLiveReadinessNetworkRequests: 0,
  preLiveReadinessRefreshRequests: 0,
  approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_EXACT_TEST_IAM_PERMISSIONS_REQUEST_BEGINS",
  preLiveLocalFreshnessCheckOccursBeforeApprovalConsumption: true,
  firstRemoteOperationCannotOccurBeforeApprovalConsumption: true,
  approvalConsumptionMatchesFirstPhysicalRemoteCall: true,
  extraPermissionsRequested: 0,
  projectWideDiagnostic: false,
  rawPrincipalPersisted: false,
  rawMemberPersisted: false,
  rawCredentialPersisted: false,
  rawTokenPersisted: false,
  rawRequestBodyPersisted: false,
  rawResponseBodyPersisted: false,
  rawStdoutPersisted: false,
  rawStderrPersisted: false,
  remoteOperationsDuringPreparation: 0,
  m3OperationReachable: false,
});
