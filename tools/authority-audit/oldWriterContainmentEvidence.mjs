import { createHash } from "node:crypto";

export const OLD_WRITER_CONTAINMENT_EXECUTION = Object.freeze({
  containmentApprovalPacket: "b6bd74f1a596f025b140eef608329301890233b72fc4d9c86954a3e10b0ec360",
  targetSemanticIdentifier: "FROZEN_CLASS_MIGRATION_WRITER_GENERATION_1",
  approvalConsumed: true,
  prestateReadUsed: 1,
  prestateResult: "ENABLED",
  disableMutationAttemptUsed: 1,
  disableOutcome: "CONFIRMED_PROCESS_SUCCESS",
  poststateReadUsed: 1,
  poststateResult: "DISABLED",
  containmentState: "EXACT_OLD_WRITER_STATUS_DISABLED_CONFIRMED",
  retryCount: 0,
  rollbackCount: 0,
  forbiddenOperationCounts: Object.freeze({
    serviceAccountEnable: 0,
    serviceAccountDelete: 0,
    iamPolicyRead: 0,
    iamPolicyMutation: 0,
    projectIamRead: 0,
    projectIamMutation: 0,
    m3: 0,
    m4: 0,
    firestore: 0,
    accessToken: 0,
    cloudLogging: 0,
    testIamPermissions: 0,
    serviceAccountKey: 0,
  }),
  historicalM3StatePreserved: "FROZEN_INDETERMINATE_MEMBER_IDENTITY_LOST",
  privacy: Object.freeze({ rawPrincipalPersisted: false, tokenPersisted: false, rawRemoteResponsePersisted: false }),
  finalVerdict: "P1_5_C2H2E3D_W1C_M3L3_OLD_WRITER_CONTAINMENT_DISABLED_CONFIRMED_REPLACEMENT_WRITER_REQUIRED",
});

export function verifyOldWriterContainmentExecution(evidence) {
  const zeroFields = ["serviceAccountEnable", "serviceAccountDelete", "iamPolicyRead", "iamPolicyMutation", "projectIamRead", "projectIamMutation", "m3", "m4", "firestore", "accessToken", "cloudLogging", "testIamPermissions", "serviceAccountKey"];
  if (!evidence || evidence.containmentApprovalPacket !== OLD_WRITER_CONTAINMENT_EXECUTION.containmentApprovalPacket) return Object.freeze({ ok: false, code: "CONTAINMENT_EVIDENCE_PACKET_MISMATCH" });
  if (evidence.approvalConsumed !== true || evidence.prestateReadUsed !== 1 || evidence.prestateResult !== "ENABLED"
    || evidence.disableMutationAttemptUsed !== 1 || evidence.disableOutcome !== "CONFIRMED_PROCESS_SUCCESS"
    || evidence.poststateReadUsed !== 1 || evidence.poststateResult !== "DISABLED"
    || evidence.containmentState !== "EXACT_OLD_WRITER_STATUS_DISABLED_CONFIRMED") return Object.freeze({ ok: false, code: "CONTAINMENT_EVIDENCE_SEQUENCE_INVALID" });
  if (evidence.retryCount !== 0 || evidence.rollbackCount !== 0 || zeroFields.some((field) => evidence.forbiddenOperationCounts?.[field] !== 0)) return Object.freeze({ ok: false, code: "CONTAINMENT_EVIDENCE_FORBIDDEN_OPERATION" });
  if (evidence.historicalM3StatePreserved !== "FROZEN_INDETERMINATE_MEMBER_IDENTITY_LOST" || evidence.privacy?.rawPrincipalPersisted !== false
    || evidence.privacy?.tokenPersisted !== false || evidence.privacy?.rawRemoteResponsePersisted !== false) return Object.freeze({ ok: false, code: "CONTAINMENT_EVIDENCE_PRIVACY_OR_HISTORY_INVALID" });
  return Object.freeze({ ok: true, code: "CONTAINMENT_EVIDENCE_CONFIRMED" });
}

export function sha256ExactBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
