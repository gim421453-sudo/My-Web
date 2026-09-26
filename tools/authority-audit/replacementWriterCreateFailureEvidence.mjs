import { createHash } from "node:crypto";

export const REPLACEMENT_WRITER_CREATE_FAILURE_EXECUTION = Object.freeze({
  createApprovalPacket: "9d9559d491863e8fb34bf28f240c1158ded9a3591a14d8900d69a11dccca1ef5",
  preflightEvidence: "9a71aee4f6ed5e88ec727c77e2798a71d335e1762d835e4e60e1ff9ec50fc5b3",
  preflightResultDocument: "83d84cb9120e9f7d565a1b6f5816adf4042674fe6e6110799970e52bc03b93a4",
  targetGeneration: "G2_INVALID_ACCOUNT_ID",
  approvalConsumed: true,
  freshPrecreateReadUsed: 1,
  freshPrecreateResult: "ABSENT",
  createMutationAttemptUsed: 1,
  createOutcome: "CONFIRMED_FAILURE_INVALID_ARGUMENT_ACCOUNT_ID_LENGTH",
  postcreateReadUsed: 0,
  postcreateResult: "NOT_RUN_CONFIRMED_CREATE_FAILURE",
  finalG2State: "NOT_CREATED_INVALID_ACCOUNT_ID",
  retryCount: 0,
  rollbackCount: 0,
  forbiddenOperationCounts: Object.freeze({ serviceAccountDisable: 0, serviceAccountEnable: 0, serviceAccountDelete: 0, iamPolicyRead: 0, iamPolicyMutation: 0, projectIamRead: 0, projectIamMutation: 0, m3: 0, m4: 0, firestore: 0, accessToken: 0, cloudLogging: 0, testIamPermissions: 0, serviceAccountKey: 0 }),
  g1FrozenGuard: true,
  privacy: Object.freeze({ rawAuthenticationMaterialPersisted: false, rawRemoteResponsePersisted: false }),
  finalVerdict: "G2_CREATE_REJECTED_INVALID_ACCOUNT_ID_NO_RETRY_NEW_IDENTITY_DESIGN_REQUIRED",
});

export function verifyReplacementWriterCreateFailureEvidence(evidence) {
  const zeroFields = Object.keys(REPLACEMENT_WRITER_CREATE_FAILURE_EXECUTION.forbiddenOperationCounts);
  if (!evidence || evidence.createApprovalPacket !== REPLACEMENT_WRITER_CREATE_FAILURE_EXECUTION.createApprovalPacket || evidence.approvalConsumed !== true) return Object.freeze({ ok: false, code: "G2_CREATE_FAILURE_PACKET_OR_CONSUMPTION_INVALID" });
  if (evidence.freshPrecreateReadUsed !== 1 || evidence.freshPrecreateResult !== "ABSENT" || evidence.createMutationAttemptUsed !== 1 || evidence.createOutcome !== "CONFIRMED_FAILURE_INVALID_ARGUMENT_ACCOUNT_ID_LENGTH" || evidence.postcreateReadUsed !== 0 || evidence.finalG2State !== "NOT_CREATED_INVALID_ACCOUNT_ID") return Object.freeze({ ok: false, code: "G2_CREATE_FAILURE_SEQUENCE_INVALID" });
  if (evidence.retryCount !== 0 || evidence.rollbackCount !== 0 || zeroFields.some((field) => evidence.forbiddenOperationCounts?.[field] !== 0) || evidence.g1FrozenGuard !== true || evidence.privacy?.rawAuthenticationMaterialPersisted !== false || evidence.privacy?.rawRemoteResponsePersisted !== false) return Object.freeze({ ok: false, code: "G2_CREATE_FAILURE_SAFETY_INVALID" });
  return Object.freeze({ ok: true, code: "G2_CREATE_FAILURE_EVIDENCE_CONFIRMED" });
}

export function sha256ExactBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
