import {
  buildG2BExactPermissionRequest,
  classifyG2BExactPermissionResponse,
} from "./g2bExactPermissionDiagnosticContract.mjs";

export const G2B_EXACT_PERMISSION_DIAGNOSTIC_DEFAULT_ENABLED = false;

export function createG2BExactPermissionDiagnosticExecutor({ transport } = {}) {
  let consumed = false;
  return Object.freeze({
    execute: async ({ enabled = G2B_EXACT_PERMISSION_DIAGNOSTIC_DEFAULT_ENABLED } = {}) => {
      const counters = { testIamPermissionsCalls: 0, mutations: 0, retries: 0 };
      if (enabled !== true) return Object.freeze({ ok: false, result: "DIAGNOSTIC_REQUEST_FAILURE", counters: Object.freeze(counters) });
      if (consumed || !transport || typeof transport.executeOnce !== "function") {
        return Object.freeze({ ok: false, result: "DIAGNOSTIC_REQUEST_FAILURE", counters: Object.freeze(counters) });
      }
      consumed = true;
      counters.testIamPermissionsCalls = 1;
      let response;
      try { response = await transport.executeOnce(buildG2BExactPermissionRequest()); }
      catch { response = { ok: false, code: "DIAGNOSTIC_REQUEST_FAILURE" }; }
      const classified = classifyG2BExactPermissionResponse(response);
      return Object.freeze({
        ok: classified.result === "PERMISSION_PRESENT_CONFIRMED" || classified.result === "PERMISSION_ABSENT_CONFIRMED",
        ...classified,
        counters: Object.freeze(counters),
      });
    },
    snapshot: () => Object.freeze({ approvalConsumed: consumed }),
  });
}

export const G2B_EXACT_PERMISSION_DIAGNOSTIC_EXECUTOR_CONTRACT = Object.freeze({
  approvalConsumptionPoint: "WHEN_FIRST_APPROVED_EXACT_SERVICE_ACCOUNT_TEST_IAM_PERMISSIONS_CALL_BEGINS",
  testIamPermissionsCallsMax: 1,
  totalPhysicalRemoteDiagnosticCallsMax: 1,
  retries: 0,
  mutations: 0,
  iamPolicyReads: 0,
  projectIamReads: 0,
  cloudLoggingReads: 0,
  m3Mutations: 0,
  m4Mutations: 0,
  firestore: 0,
  serviceAccountTokenGeneration: 0,
  serviceAccountKeyOperations: 0,
});
