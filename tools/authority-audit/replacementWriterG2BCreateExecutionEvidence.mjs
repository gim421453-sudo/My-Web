import { createHash } from "node:crypto";

export const REPLACEMENT_WRITER_G2B_CREATE_EXECUTION = Object.freeze({
  createApprovalPacketSha256: "0a162758393c4e8440d3bafd48da8e82401dbeaefc569aee60d661b2c6be7f80",
  preflightExecutionEvidenceSha256: "069fa04d097135592c9e72c21bd2451f15ebbce3163cf75647465bbdbf50a781",
  preflightResultDocumentSha256: "2b306a74e64199b1aab534b6ed206a014a16aceff693c50498b90cb93084a11a",
  targetGeneration: "REPLACEMENT_WRITER_GENERATION_2B",
  approvalConsumed: true,
  freshPrecreateReadUsed: 1,
  freshPrecreateResult: "ABSENT",
  createMutationAttemptUsed: 1,
  createOutcome: "CONFIRMED_PROCESS_SUCCESS",
  postcreateReadUsed: 1,
  postcreateResult: "PRESENT_ENABLED",
  g2bCreateState: "EXACT_G2B_SERVICE_ACCOUNT_STATUS_ENABLED_CONFIRMED",
  retryCount: 0,
  rollbackCount: 0,
  secondCreateUsed: 0,
  forbiddenOperationCounts: Object.freeze({
    serviceAccountDisable: 0, serviceAccountEnable: 0, serviceAccountDelete: 0,
    projectIamRead: 0, projectIamMutation: 0, iamPolicyRead: 0, iamPolicyMutation: 0,
    m3: 0, m4: 0, firestore: 0, accessToken: 0, cloudLogging: 0,
    testIamPermissions: 0, serviceAccountKey: 0,
  }),
  g1FrozenGuard: true,
  failedG2Guard: true,
  privacy: Object.freeze({ rawAuthenticationMaterialPersisted: false, rawRemoteResponsePersisted: false }),
  finalVerdict: "G2B_EXISTS_ENABLED_NO_IAM_AUTHORITY_FUTURE_RECOVERY_ANCHOR_IMPLEMENTATION_REQUIRED",
});

export function verifyReplacementWriterG2BCreateExecution(evidence) {
  const expected = REPLACEMENT_WRITER_G2B_CREATE_EXECUTION;
  const zeroFields = Object.keys(expected.forbiddenOperationCounts);
  if (!evidence || evidence.createApprovalPacketSha256 !== expected.createApprovalPacketSha256
    || evidence.preflightExecutionEvidenceSha256 !== expected.preflightExecutionEvidenceSha256
    || evidence.preflightResultDocumentSha256 !== expected.preflightResultDocumentSha256
    || evidence.targetGeneration !== expected.targetGeneration || evidence.approvalConsumed !== true) {
    return Object.freeze({ ok: false, code: "G2B_CREATE_EVIDENCE_BINDING_INVALID" });
  }
  if (evidence.freshPrecreateReadUsed !== 1 || evidence.freshPrecreateResult !== "ABSENT"
    || evidence.createMutationAttemptUsed !== 1 || evidence.createOutcome !== "CONFIRMED_PROCESS_SUCCESS"
    || evidence.postcreateReadUsed !== 1 || evidence.postcreateResult !== "PRESENT_ENABLED"
    || evidence.g2bCreateState !== "EXACT_G2B_SERVICE_ACCOUNT_STATUS_ENABLED_CONFIRMED"
    || evidence.retryCount !== 0 || evidence.rollbackCount !== 0 || evidence.secondCreateUsed !== 0
    || evidence.g1FrozenGuard !== true || evidence.failedG2Guard !== true
    || evidence.privacy?.rawAuthenticationMaterialPersisted !== false
    || evidence.privacy?.rawRemoteResponsePersisted !== false
    || zeroFields.some((field) => evidence.forbiddenOperationCounts?.[field] !== 0)) {
    return Object.freeze({ ok: false, code: "G2B_CREATE_EVIDENCE_SEQUENCE_OR_SAFETY_INVALID" });
  }
  return Object.freeze({ ok: true, code: "G2B_CREATE_ENABLED_EVIDENCE_CONFIRMED" });
}

export function sha256ExactBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
