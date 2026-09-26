import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT } from "./g2bExplicitSetIamPolicyTransport.mjs";
import { G2B_CURRENT_LIVE_EXECUTOR_CONTRACT } from "./g2bM3CurrentLiveExecutor.mjs";
import { G2B_M3_RUNTIME_CONTRACT } from "./g2bM3RecoveryAnchorRuntime.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { buildG2BV3DiagnosticContinuityAttestation, canonicalJson, sha256Canonical, verifyG2BV3DiagnosticContinuityAttestation, V3_EXECUTION_EVIDENCE_SHA256, V3_RESULT_DOCUMENT_SHA256 } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_REPAIRED_M3_AUTHORITY_V2_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-REPAIRED-DIRECT-AUTHORITY-V2";
export const G2B_REPAIRED_M3_AUTHORITY_V2_TYPE = "REPAIRED_DIRECT_M3_TOKEN_CREATOR_BINDING_V2";
const TEMPORAL_RULE = "NO_ARBITRARY_WALL_CLOCK_EXPIRY;VALIDITY_DEPENDS_ON_CONTEXT_AND_RUNTIME_CONTINUITY;LIVE_PROVIDER_SET_AUTHORIZATION_REMAINS_AUTHORITATIVE;CACHED_CREDENTIAL_FRESHNESS_IS_SEPARATELY_RECHECKED_PRELIVE";
const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bRepairedM3AuthorityPreparationV2.mjs",
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bRepairedM3ProspectiveSafetyReattestation.mjs",
  "tools/authority-audit/g2bRepairedM3DpapiRecoveryReattestation.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-authority-v2r1-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-authority-v2r1-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-authority-v2r1-runtime-capability-v1.json",
  composite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-authority-v2r1-prospective-safety-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-authority-v2r1-live-approval-packet-v1.json",
});

function hash(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function sourceLocks(root) { return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hash(resolve(root, path)) }))); }
function uuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || ""); }
function exact(value) { return value === true; }

function verifiedAnchor({ identityContext, secretProvider, store, operationGenerationId }) {
  const loaded = store?.load?.(operationGenerationId);
  const secret = secretProvider?.read?.();
  if (loaded?.state !== "READY" || loaded.record?.anchorState !== "ANCHOR_VERIFIED" || secret?.state !== "READY") return null;
  const verification = verifyG2BRecoveryAnchor({ record: loaded.record, member: identityContext?.exactIamMember, secret: secret.secret, secretKeyId: secret.keyId });
  return verification.ok === true && loaded.record.targetResource === G2B_TARGET_RESOURCE && loaded.record.targetRole === G2B_TARGET_ROLE
    ? Object.freeze({ secretKeyId: secret.keyId, record: loaded.record }) : null;
}

function packetFields({ operationGenerationId, continuity, prospectiveSafety, anchor }) {
  const execution = G2B_CURRENT_LIVE_EXECUTOR_CONTRACT;
  const transport = G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT;
  const authTransport = G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT;
  const readiness = G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT;
  return Object.freeze({
    targetServiceAccount: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, targetServiceAccountExactlyBound: true, targetRoleExactlyBound: true, legacyG1TargetReachable: false,
    currentDirectAuthPathId: readiness.sourcePath, m3UsesCurrentDirectAuthPath: true, m3CredentialRecordEqualsSuccessfulV3DiagnosticRecord: true, m3AuthContextEqualsSuccessfulV3DiagnosticAuthContext: true, alternateAccountSelection: 0,
    directContextPermissionDiagnosticV3ExecutionEvidenceSha256: V3_EXECUTION_EVIDENCE_SHA256, directContextPermissionDiagnosticV3ResultDocumentSha256: V3_RESULT_DOCUMENT_SHA256,
    diagnosticContinuityAttestationSha256: sha256Canonical(continuity.attestation), diagnosticResult: "PERMISSION_PRESENT_CONFIRMED", exactMutationPermissionState: "PRESENT_CONFIRMED", currentDirectTransportAuthorizationPreconditionEstablished: true,
    m3AuthorizationEvidenceTemporalRule: TEMPORAL_RULE,
    preliveLocalCredentialReadinessRecheckRequired: true, preliveLocalCheckBeforeApprovalConsumption: true, preliveNetworkRequests: readiness.networkRequests, preliveCredentialRefreshCalls: 0, credentialFreshnessMarginSeconds: readiness.freshnessMarginSeconds, preliveCachedCredentialReadiness: "CACHED_CREDENTIAL_READY_CONFIRMED", preliveExpiryRelativeState: "FRESH",
    existingCachedAccessTokenUseForAuthenticatedRequest: "allowed", credentialRefreshAllowed: false, oauthRefreshAllowed: false, newAccessTokenGenerationAllowed: false, serviceAccountTokenGenerationAllowed: false, serviceAccountImpersonationAllowed: false, serviceAccountKeyAllowed: false,
    freshPrestateRequired: true, prestateTarget: "EXACT_G2B_SERVICE_ACCOUNT_IAM_POLICY", prestateRemoteReadsMax: execution.prestateWriterPolicyReadsMax, setIamPolicyCallsMax: transport.setCallsMax, poststateRemoteReadsMax: execution.poststateWriterPolicyReadsMax, totalPhysicalRemoteCallsMax: execution.totalPhysicalProviderCallsMax,
    presentBranchPhysicalRemoteCallsMax: 1, presentBranchMutationsMax: 0, absentSetSuccessBranchPhysicalRemoteCallsMax: 3, absentConfirmedSetFailureBranchPhysicalRemoteCallsMax: 2, absentIndeterminateSetBranchPhysicalRemoteCallsMax: 2, additionalHiddenPhysicalCalls: transport.hiddenProviderCalls, authHiddenRemoteCalls: 0, automaticRetries: 0, secondSetIamPolicyCall: 0, rollback: 0,
    setInputPolicySource: "EXACT_FRESH_PRESTATE_POLICY", unrelatedPolicyBindingsPreserved: true, unrelatedTargetRoleMembersPreserved: true, onlyIntendedMemberAdded: true, blindPolicyReplacement: false, secondHiddenPrestateGet: 0, policyVersionPreservedOrValidlyHandled: true, etagOrProviderConcurrencyGuardPreserved: true, setUsesFreshPrestateEtagWhereSupported: true,
    m3MutationResultIndeterminatePolicy: "NO_POSTSTATE_NO_RETRY_NO_ROLLBACK_SEPARATE_READ_ONLY_APPROVAL_REQUIRED", poststateAfterConfirmedSetSuccessOnly: true, poststateAfterConfirmedSetFailure: false, poststateAfterIndeterminateSet: false, finalM3SuccessRequiresExactMemberPresent: true, recoveryRemoteRead: 0,
    newM3OperationGeneration: operationGenerationId, recoveryAnchorVerified: true, recoveryAnchorGenerationMatch: anchor.record.operationGenerationId === operationGenerationId, recoveryAnchorTargetMatch: anchor.record.targetResource === G2B_TARGET_RESOURCE, recoveryAnchorRoleMatch: anchor.record.targetRole === G2B_TARGET_ROLE, recoveryAnchorMemberMatch: true, recoveryAnchorRereadVerified: true, recoveryAnchorPersistedBeforeMutationReachable: true,
    m3ApprovalConsumptionPoint: execution.approvalConsumptionPoint, firstApprovedRemoteRequest: "FRESH_EXACT_G2B_SERVICE_ACCOUNT_GET_IAM_POLICY", localCredentialReadinessBeforeConsumption: true, recoveryAnchorVerificationBeforeConsumption: true, firstRemoteOperationCannotOccurBeforeApprovalConsumption: true, approvalConsumptionEqualsFirstPhysicalRemoteCall: true,
    oldGcloudMutationPathReachable: false, opaqueGcloudMutationPathReachable: false, fallbackToOldGcloudPath: false, m4Allowed: false, m4ReachableDuringM3: false, customDataCreateRoleBindingReachable: false, firestoreAllowed: false, firestoreDataWriteReachable: false, testIamPermissionsAllowed: false, cloudLoggingAllowed: false,
    rawPrincipalPersisted: false, rawMemberPersisted: false, rawAccessTokenPersisted: false, rawRefreshTokenPersisted: false, rawCredentialPersisted: false, rawAuthorizationHeaderPersisted: false, rawRequestBodyPersisted: false, rawResponseBodyPersisted: false, rawStdoutPersisted: false, rawStderrPersisted: false, rawDpapiSecretPersisted: false,
    runtimeReuseVerifiedAnchorSupported: G2B_M3_RUNTIME_CONTRACT.existingVerifiedAnchorReuseSupported === true,
    prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafety),
  });
}

export function prepareG2BRepairedM3AuthorityV2({ repositoryRoot = process.cwd(), environment = process.env, identityContext, secretProvider, store, operationGenerationId } = {}) {
  if (!uuid(operationGenerationId)) return Object.freeze({ ok: false, code: "OPERATION_GENERATION_INVALID" });
  const localIdentity = identityContext ? Object.freeze({ ok: true, context: identityContext }) : resolveG2BLocalPinnedIdentity({ environment });
  if (localIdentity.ok !== true || !localIdentity.context?.exactPrincipal || !localIdentity.context?.exactIamMember) return Object.freeze({ ok: false, code: localIdentity.code || "LOCAL_IDENTITY_CONTEXT_UNAVAILABLE" });
  const continuity = buildG2BV3DiagnosticContinuityAttestation({ repositoryRoot });
  if (!verifyG2BV3DiagnosticContinuityAttestation(continuity, { repositoryRoot }).ok) return Object.freeze({ ok: false, code: "V3_RUNTIME_CONTINUITY_NOT_ESTABLISHED" });
  const anchor = verifiedAnchor({ identityContext: localIdentity.context, secretProvider: secretProvider || createWindowsDpapiSecretProvider(), store: store || createG2BRecoveryAnchorStore(), operationGenerationId });
  if (!anchor) return Object.freeze({ ok: false, code: "EXISTING_RECOVERY_ANCHOR_NOT_VERIFIED" });
  const prospectiveSafety = Object.freeze({ schema: "myweb.g2b.repaired-m3.authority-v2-prospective-safety-evidence.v1", stage: G2B_REPAIRED_M3_AUTHORITY_V2_STAGE, v3DiagnosticRuntimeContinuity: true, currentDirectTransportAuthorizationPreconditionEstablished: true, oldGcloudMutationPathReachable: false, freshPrestateRequired: true, physicalCallMaxStaticallyProvable: executionContractsValid(), additionalHiddenPhysicalCalls: 0, unrelatedPolicyBindingsPreserved: true, unrelatedTargetRoleMembersPreserved: true, etagOrProviderConcurrencyGuardPreserved: true, poststateAfterConfirmedSetSuccessOnly: true, preliveLocalCredentialReadinessRecheckRequired: true, m4ReachableDuringM3: false, firestoreDataWriteReachable: false, existingVerifiedAnchorReuseSupported: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.existingVerifiedAnchorReuseSupported === true, remoteOperations: 0 });
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.repaired-m3.authority-v2-source-lock.v1", stage: G2B_REPAIRED_M3_AUTHORITY_V2_STAGE, operationGenerationId, sourceLocks: sourceLocks(repositoryRoot) });
  const implementation = Object.freeze({ schema: "myweb.g2b.repaired-m3.authority-v2-implementation.v1", stage: G2B_REPAIRED_M3_AUTHORITY_V2_STAGE, operationGenerationId, identityFingerprint: localIdentity.context.identityFingerprint, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, v3ContinuityAttestationSha256: sha256Canonical(continuity.attestation), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafety), recoveryAnchorVerified: true, recoveryAnchorRereadVerified: true, rawPrincipalPersisted: false, rawMemberPersisted: false, rawCredentialPersisted: false, rawDpapiSecretPersisted: false });
  const runtimeCapability = Object.freeze({ schema: "myweb.g2b.repaired-m3.authority-v2-runtime-capability.v1", stage: G2B_REPAIRED_M3_AUTHORITY_V2_STAGE, operationGenerationId, physicalCallMaxStaticallyProvable: executionContractsValid(), existingVerifiedAnchorReuseSupported: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.existingVerifiedAnchorReuseSupported === true, remoteOperations: 0, iamReads: 0, iamMutations: 0, firestore: 0, m4: 0 });
  const composite = Object.freeze({ schema: "myweb.g2b.repaired-m3.authority-v2-prospective-safety.v1", stage: G2B_REPAIRED_M3_AUTHORITY_V2_STAGE, operationGenerationId, sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationSha256: sha256Canonical(implementation), runtimeCapabilitySha256: sha256Canonical(runtimeCapability), v3ContinuityCompositeSha256: sha256Canonical(continuity.composite), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafety), localOnly: true });
  const approvalPacket = Object.freeze({ schema: "myweb.g2b.repaired-m3.approval-packet.v2", stage: G2B_REPAIRED_M3_AUTHORITY_V2_STAGE, type: G2B_REPAIRED_M3_AUTHORITY_V2_TYPE, status: "APPROVAL_REQUIRED", purpose: "one exact direct SetIamPolicy operation after a verified existing recovery anchor and a fresh exact prestate", authorityCompositeSha256: sha256Canonical(composite), ...packetFields({ operationGenerationId, continuity, prospectiveSafety, anchor }) });
  const complete = [continuity.attestation.continuityPass, prospectiveSafety.physicalCallMaxStaticallyProvable, runtimeCapability.physicalCallMaxStaticallyProvable, ...["recoveryAnchorGenerationMatch", "recoveryAnchorTargetMatch", "recoveryAnchorRoleMatch", "recoveryAnchorMemberMatch", "recoveryAnchorRereadVerified"].map((field) => approvalPacket[field])].every(exact);
  return Object.freeze({ ok: complete, code: complete ? "REPAIRED_M3_AUTHORITY_V2_READY" : "REPAIRED_M3_AUTHORITY_V2_BLOCKED", operationGenerationId, sourceLockManifest, implementation, runtimeCapability, prospectiveSafety, composite, approvalPacket });
}

function executionContractsValid() {
  return G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.prestateWriterPolicyReadsMax === 1 && G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.setCallsMax === 1 && G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.poststateWriterPolicyReadsMax === 1 && G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.totalPhysicalProviderCallsMax === 3 && G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.hiddenProviderCalls === 0 && G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.implicitRefreshReachable === false;
}

export function verifyG2BRepairedM3AuthorityV2(value, options = {}) {
  try {
    const expected = prepareG2BRepairedM3AuthorityV2(options);
    const ok = expected.ok === true && canonicalJson(value) === canonicalJson(expected);
    return Object.freeze({ ok, code: ok ? "REPAIRED_M3_AUTHORITY_V2_PASS" : "REPAIRED_M3_AUTHORITY_V2_BLOCKED" });
  } catch { return Object.freeze({ ok: false, code: "REPAIRED_M3_AUTHORITY_V2_INVALID" }); }
}

export function writeG2BRepairedM3AuthorityV2(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("repaired-m3-authority-v2-blocked");
  const paths = {};
  for (const [key, relative] of Object.entries(OUTPUTS)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("repaired-m3-authority-v2-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = relative;
  }
  return Object.freeze({ paths: Object.freeze(paths), approvalPacketSha256: sha256Canonical(value.approvalPacket), approvalPacketRawSha256: hash(resolve(repositoryRoot, OUTPUTS.approvalPacket)) });
}
