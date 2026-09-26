import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildG2BM3LiveApprovalPacket, verifyG2BM3LiveApprovalPacket } from "../authority-audit/g2bM3LiveApprovalPacket.mjs";

const packet = buildG2BM3LiveApprovalPacket();
assert.equal(verifyG2BM3LiveApprovalPacket(packet).ok, true);
for (const key of Object.keys(packet)) {
  const missing = { ...packet };
  delete missing[key];
  assert.equal(verifyG2BM3LiveApprovalPacket(missing).ok, false, `missing ${key} must fail closed`);
}
for (const [key, value] of Object.entries({
  recoveryAnchorRequired: false,
  recoverySecretInvalidPolicy: "ALLOW",
  anchorPersistenceFailurePolicy: "ALLOW",
  preexistingBindingPolicy: "MUTATE",
  mutationAttemptsMax: 2,
  retriesMax: 1,
  poststateRequired: false,
  m4Allowed: true,
})) {
  assert.equal(verifyG2BM3LiveApprovalPacket({ ...packet, [key]: value }).ok, false, `${key} tampering must fail closed`);
}
const liveDocument = readFileSync("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-recovery-anchor-hardened-live-approval-packet.md", "utf8");
const documentFields = Object.fromEntries([...liveDocument.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map(([, key, value]) => [key, value]));
const documentMapping = {
  STAGE: "stage", TYPE: "type", TARGET_RESOURCE: "targetResource", TARGET_ROLE: "targetRole",
  G2B_CREATE_EVIDENCE_SHA256: "g2bCreateEvidenceSha256", IMPLEMENTATION_ATTESTATION_SHA256: "implementationAttestationSha256",
  RUNTIME_CAPABILITY_ATTESTATION_SHA256: "runtimeCapabilityAttestationSha256", FINAL_EXECUTION_COMPOSITE_SHA256: "finalExecutionCompositeSha256",
  CURRENT_GRAPH_IDENTITY: "graphIdentity", RECOVERY_SECRET_STATE_REQUIREMENT: "recoverySecretStateRequirement",
  RECOVERY_SECRET_INVALID_POLICY: "recoverySecretInvalidPolicy", ANCHOR_PERSISTENCE_FAILURE_POLICY: "anchorPersistenceFailurePolicy",
  ANCHOR_VERIFICATION_FAILURE_POLICY: "anchorVerificationFailurePolicy", PRE_REMOTE_VERIFIED_ANCHOR_RESUME_POLICY: "preRemoteVerifiedAnchorResumePolicy",
  APPROVAL_CONSUMPTION_POINT: "approvalConsumptionPoint", PRESTATE_RESULT_DOMAIN: "prestateResultDomain",
  PREEXISTING_BINDING_POLICY: "preexistingBindingPolicy", PRESTATE_AMBIGUOUS_POLICY: "prestateAmbiguousPolicy",
  PRESTATE_READ_FAILURE_POLICY: "prestateReadFailurePolicy", INDETERMINATE_POLICY: "indeterminatePolicy",
  INDETERMINATE_ANCHOR_PRESERVATION_POLICY: "indeterminateAnchorPreservationPolicy",
  POSTSTATE_PRESENT_CONFIRMED_SUCCESS_SEMANTICS: "poststatePresentConfirmedSuccessSemantics",
  POSTSTATE_ABSENT_POLICY: "poststateAbsentPolicy", POSTSTATE_AMBIGUOUS_POLICY: "poststateAmbiguousPolicy",
  POSTSTATE_READ_FAILURE_POLICY: "poststateReadFailurePolicy",
};
for (const [documentKey, packetKey] of Object.entries(documentMapping)) {
  assert.equal(documentFields[documentKey], String(packet[packetKey]), `${documentKey} must match the verified packet`);
}
console.log("G2B M3 live approval packet contract matrix passed; remote operations=0");
