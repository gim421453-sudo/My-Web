import { sha256Canonical } from "./g2bM3ResolvedStoreFixedLiveEvidence.mjs";
import { G2B_V3_EXACT_PERMISSION_STAGE } from "./g2bV3ExactPermissionPacket.mjs";

export const G2B_V3_EXECUTION_EVIDENCE_SCHEMA = "myweb.g2b.v3-exact-permission-execution-evidence.v1";

const BOUND = Object.freeze({
  sourceLockManifestSha256: "b61acbbcf6470c75182b877300999bbfda37b01594fe172cef71ba5d63488f96",
  implementationAttestationSha256: "50940757a8946c08a36b01dc15e8e8638fd12fff91e3fd8274417780a748b467",
  runtimeCapabilityAttestationSha256: "cc549d6c4fe81cae9ee01249e62ebbc524126c7c32b308aafc77640d8078051c",
  executionCompositeSha256: "d8e59cd4b8ca0532d42cc5000aedad327272d157e377c43c3ce59dd46b25c0e0",
  approvalPacketSha256: "5de63c5a53396c100f0b8f2a18664e7fa6f1000be30e8e76671a49e3b8e0641a",
  packetDocumentRawSha256: "2da37318311d2ad04ae74b92a08fdc05cd5ada9985398a3d97fccb06d857017a",
  readyProofSha256: "f0bf0b1a3ae19ba141fdeafa7f5710fa875cb2fbac6d92d38a928927d715aeb0",
});

export function buildG2BV3ExactPermissionExecutionEvidence() {
  return Object.freeze({
    schema: G2B_V3_EXECUTION_EVIDENCE_SCHEMA,
    stage: G2B_V3_EXACT_PERMISSION_STAGE,
    ...BOUND,
    approvalConsumed: true,
    targetAlias: "EXACT_G2B_WRITER_SERVICE_ACCOUNT",
    exactPermission: "iam.serviceAccounts.setIamPolicy",
    permissionCount: 1,
    diagnosticResult: "PERMISSION_PRESENT_CONFIRMED",
    exactMutationPermissionState: "PRESENT_CONFIRMED",
    testIamPermissionsCallsUsed: 1,
    totalPhysicalRemoteDiagnosticCallsUsed: 1,
    httpRequestAttempted: true,
    httpResponseObserved: true,
    httpStatusClass: "2XX",
    safeFailureMetadata: null,
    forbiddenOperationCounts: Object.freeze({
      credentialRefreshCalls: 0, oauthTokenEndpointCalls: 0, iamPolicyReads: 0,
      projectIamReads: 0, cloudLoggingReads: 0, iamMutations: 0, m3Mutations: 0,
      m4Mutations: 0, firestoreCalls: 0, serviceAccountTokenGeneration: 0,
      serviceAccountKeyOperations: 0, retries: 0, rollbacks: 0,
    }),
    privacy: Object.freeze({
      rawCredentialOutput: false, rawPrincipalPersisted: false, rawHttpResponsePersisted: false,
      rawStdoutPersisted: false, rawStderrPersisted: false,
    }),
  });
}

export function buildG2BV3ExactPermissionResultDocument(executionEvidence) {
  if (!executionEvidence || sha256Canonical(executionEvidence) !== sha256Canonical(buildG2BV3ExactPermissionExecutionEvidence())) {
    throw new Error("exact-v3-execution-evidence-required");
  }
  return Object.freeze({
    schema: "myweb.g2b.v3-exact-permission-result.v1",
    stage: G2B_V3_EXACT_PERMISSION_STAGE,
    executionEvidenceSha256: sha256Canonical(executionEvidence),
    result: "PERMISSION_PRESENT_CONFIRMED",
    exactMutationPermissionState: "PRESENT_CONFIRMED",
    m3AuthorizationDefect: "NOT_CONFIRMED_BY_EXACT_PERMISSION_DIAGNOSTIC",
    m3MutationReachable: false,
    m4Allowed: false,
    nextApprovalRequired: false,
    rawAuthorityMaterialPersisted: false,
  });
}

export function verifyG2BV3ExactPermissionResultArtifacts({ executionEvidence, resultDocument } = {}) {
  try {
    const expectedExecution = buildG2BV3ExactPermissionExecutionEvidence();
    const expectedResult = buildG2BV3ExactPermissionResultDocument(expectedExecution);
    return Object.freeze({
      ok: sha256Canonical(executionEvidence) === sha256Canonical(expectedExecution)
        && sha256Canonical(resultDocument) === sha256Canonical(expectedResult),
    });
  } catch {
    return Object.freeze({ ok: false });
  }
}
