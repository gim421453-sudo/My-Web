export const G2B_DIRECT_CREDENTIAL_REFRESH_STAGE =
  "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-PRELIVE-CREDENTIAL-EXPIRY-RECOVERY";

// This is a newly issued, single-use approval identity. Older refresh packets
// remain historical evidence and cannot authorize this operation.
export const G2B_DIRECT_CREDENTIAL_REFRESH_OPERATION_INSTANCE =
  "a5a8a69c-6b99-4670-a47d-53d435b3bab7";
export const G2B_PREVIOUS_DIRECT_CREDENTIAL_REFRESH_APPROVAL_PACKET_SHA256 =
  "9294a0c619077560a127cb8d3c50d59767427bcf9d141eabe494fc9ceece7731";

function blocked(result) {
  return Object.freeze({ ok: false, result, counters: Object.freeze({ refreshCalls: 0, retries: 0, iamCalls: 0, mutations: 0 }) });
}

function classify(value) {
  if (value?.ok === true && value.state === "REFRESH_SUCCESS_CONFIRMED") return "REFRESH_SUCCESS_CONFIRMED";
  const code = typeof value?.code === "string" ? value.code : "REFRESH_INDETERMINATE";
  if (code.includes("AUTH")) return "REFRESH_AUTH_FAILURE";
  if (code.includes("TIMEOUT")) return "REFRESH_TIMEOUT";
  if (code.includes("STORE")) return "REFRESH_STORE_WRITE_FAILURE";
  if (code.includes("PARSE")) return "REFRESH_MALFORMED_RESPONSE";
  if (code.includes("TRANSPORT") || code.includes("PROCESS")) return "REFRESH_TRANSPORT_FAILURE";
  if (code.includes("REQUEST")) return "REFRESH_PROVIDER_REJECTION";
  return "REFRESH_INDETERMINATE";
}

/** Approval is consumed immediately before the sole bounded token request. */
export function createG2BDirectCredentialRefresh({
  transport,
  operationInstance = G2B_DIRECT_CREDENTIAL_REFRESH_OPERATION_INSTANCE,
} = {}) {
  let prepared = false;
  let consumed = false;
  return Object.freeze({
    prepare: async () => {
      if (!transport || typeof transport.prepareDirectContextCredentialRefresh !== "function") return Object.freeze({ ready: false });
      const result = await transport.prepareDirectContextCredentialRefresh();
      prepared = result?.ok === true && result.state === "REFRESH_READY_TO_SEND";
      return Object.freeze({ ready: prepared });
    },
    execute: async ({ enabled = false, consumeApproval, postRefreshLocalPreparation } = {}) => {
      if (operationInstance !== G2B_DIRECT_CREDENTIAL_REFRESH_OPERATION_INSTANCE
        || enabled !== true || !prepared || consumed || typeof consumeApproval !== "function"
        || !transport || typeof transport.executeDirectContextCredentialRefresh !== "function") return blocked("REFRESH_REQUEST_NOT_STARTED");
      let approved = false;
      try { approved = await consumeApproval(); } catch { approved = false; }
      if (approved !== true) return blocked("REFRESH_REQUEST_NOT_STARTED");
      consumed = true;
      let result;
      try { result = await transport.executeDirectContextCredentialRefresh(); }
      catch { result = { ok: false, code: "DIRECT_TRANSPORT_FAILURE" }; }
      const classified = classify(result);
      let localContinuation = "NOT_REACHED";
      if (classified === "REFRESH_SUCCESS_CONFIRMED" && typeof postRefreshLocalPreparation === "function") {
        try {
          const continuation = await postRefreshLocalPreparation();
          localContinuation = continuation?.ok === true
            ? "POST_REFRESH_LOCAL_PREPARATION_CONFIRMED"
            : "POST_REFRESH_LOCAL_PREPARATION_BLOCKED";
        } catch { localContinuation = "POST_REFRESH_LOCAL_PREPARATION_BLOCKED"; }
      }
      return Object.freeze({ ok: classified === "REFRESH_SUCCESS_CONFIRMED", result: classified,
        localContinuation,
        counters: Object.freeze({ refreshCalls: 1, retries: 0, iamCalls: 0, mutations: 0 }) });
    },
    snapshot: () => Object.freeze({ prepared, approvalConsumed: consumed }),
  });
}

export const G2B_DIRECT_CREDENTIAL_REFRESH_CONTRACT = Object.freeze({
  authContext: "SAME_G2B_EXPLICIT_DIRECT_CACHED_CREDENTIAL_TRANSPORT",
  credentialRefreshCallsMax: 1,
  oauthTokenEndpointCallsMax: 1,
  totalPhysicalRemoteRefreshCallsMax: 1,
  automaticRetries: 0,
  additionalHiddenRefreshRemoteCalls: 0,
  iamCallsMax: 0,
  mutationsMax: 0,
  approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS",
  postRefreshPermissionDiagnosticAllowed: true,
  postRefreshPermissionDiagnosticRemoteCalls: 0,
  m3OperationReachable: false,
});
