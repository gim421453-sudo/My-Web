import { createHash } from "node:crypto";

export const REPLACEMENT_WRITER_G2B_PREFLIGHT_EXECUTION = Object.freeze({
  approvalPacketSha256: "e7cfb51bba3336ddb67f033ea44e19125a528dd784a203364c2700cb0d8090bf",
  failedG2CreateEvidenceSha256: "cdede0b4453817e36462b59de842c792df62a4815f3127f6313cc9c9ad9b7f55",
  targetGeneration: "REPLACEMENT_WRITER_GENERATION_2B",
  approvalConsumed: true,
  metadataReadUsed: 1,
  preflightResult: "ABSENT",
  retryCount: 0,
  forbiddenOperationCounts: Object.freeze({
    serviceAccountCreate: 0, serviceAccountDisable: 0, serviceAccountEnable: 0, serviceAccountDelete: 0,
    projectIamRead: 0, projectIamMutation: 0, iamPolicyRead: 0, iamPolicyMutation: 0,
    m3: 0, m4: 0, firestore: 0, accessToken: 0, cloudLogging: 0,
    testIamPermissions: 0, serviceAccountKey: 0,
  }),
  g1FrozenGuard: true,
  failedG2Guard: true,
  privacy: Object.freeze({ rawAuthenticationMaterialPersisted: false, rawRemoteResponsePersisted: false }),
  finalVerdict: "G2B_PREFLIGHT_ABSENT_CONFIRMED_SEPARATE_CREATE_APPROVAL_REQUIRED",
});

export function verifyReplacementWriterG2BPreflightExecution(evidence) {
  const expected = REPLACEMENT_WRITER_G2B_PREFLIGHT_EXECUTION;
  const zeroFields = Object.keys(expected.forbiddenOperationCounts);
  if (!evidence || evidence.approvalPacketSha256 !== expected.approvalPacketSha256
    || evidence.failedG2CreateEvidenceSha256 !== expected.failedG2CreateEvidenceSha256
    || evidence.targetGeneration !== expected.targetGeneration || evidence.approvalConsumed !== true) {
    return Object.freeze({ ok: false, code: "G2B_PREFLIGHT_EVIDENCE_BINDING_INVALID" });
  }
  if (evidence.metadataReadUsed !== 1 || evidence.preflightResult !== "ABSENT" || evidence.retryCount !== 0
    || evidence.g1FrozenGuard !== true || evidence.failedG2Guard !== true
    || evidence.privacy?.rawAuthenticationMaterialPersisted !== false
    || evidence.privacy?.rawRemoteResponsePersisted !== false
    || zeroFields.some((field) => evidence.forbiddenOperationCounts?.[field] !== 0)) {
    return Object.freeze({ ok: false, code: "G2B_PREFLIGHT_EVIDENCE_SEQUENCE_OR_SAFETY_INVALID" });
  }
  return Object.freeze({ ok: true, code: "G2B_PREFLIGHT_ABSENT_EVIDENCE_CONFIRMED" });
}

export function sha256ExactBytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
