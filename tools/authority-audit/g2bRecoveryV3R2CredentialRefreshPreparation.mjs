import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT, readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE } from "./g2bGenerationBoundReadOnlyRecoveryV3R2.mjs";
import { createG2BRecoveryAnchorStore, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { writeCanonicalJsonAtomically } from "./g2bRecoveryPostExecutionEvidence.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";

export const G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RECOVERY-V3R2-PATH-CURRENT-DIRECT-CONTEXT-CREDENTIAL-REFRESH";
export const G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_TYPE = "M3_RECOVERY_V3R2_PATH_CURRENT_DIRECT_CONTEXT_CREDENTIAL_REFRESH";
export const G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_OPERATION_INSTANCE = "6f7d33a7-76e7-4572-97d4-5b7d607d52f5";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bRecoveryV3R2CredentialRefreshPreparation.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R2.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit/g2bRecoveryPostExecutionEvidence.mjs",
  "tools/authority-audit/prepareG2BRecoveryV3R2CredentialRefresh.mjs",
  "tools/authority-audit-tests/g2bRecoveryV3R2CredentialRefreshPreparation.test.mjs",
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r2-credential-refresh-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r2-credential-refresh-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r2-credential-refresh-runtime-v1.json",
  prospectiveSafetyEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r2-credential-refresh-prospective-safety-v1.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r2-credential-refresh-composite-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r2-credential-refresh-approval-packet-v1.json",
});

const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const expired = (value) => value?.result === "CACHED_CREDENTIAL_EXPIRED_CONFIRMED" && value?.credentialExpiryRelativeState === "EXPIRED" && value?.freshnessMarginSeconds === 120 && value?.networkRequests === 0 && value?.refreshMethodInvocations === 0;

function anchorVerified({ environment, identityContext, secretProvider, store }) {
  const identity = identityContext ? { ok: true, context: identityContext } : resolveG2BLocalPinnedIdentity({ environment });
  const loaded = store?.load?.(G2B_INTERRUPTED_M3_GENERATION);
  const secret = secretProvider?.read?.();
  return identity.ok === true && loaded?.state === "READY" && loaded.record?.anchorState === "ANCHOR_VERIFIED"
    && verifyG2BRecoveryAnchor({ record: loaded.record, member: identity.context?.exactIamMember, secret: secret?.secret, secretKeyId: secret?.keyId }).ok === true;
}

export async function inspectG2BRecoveryV3R2CredentialRefreshContext({ transport } = {}) {
  if (typeof transport?.prepareDirectContextCredentialRefresh !== "function") return Object.freeze({ ok: false, code: "RECOVERY_V3R2_REFRESH_TRANSPORT_UNAVAILABLE", remoteOperations: 0 });
  const readiness = await readG2BDirectCachedCredentialReadiness({ transport });
  let prepared; try { prepared = await transport.prepareDirectContextCredentialRefresh(); } catch { prepared = null; }
  const ready = prepared?.ok === true && prepared?.state === "REFRESH_READY_TO_SEND" && prepared?.physicalCalls === 0;
  return Object.freeze({ ok: expired(readiness) && ready, code: expired(readiness) && ready ? "RECOVERY_V3R2_REFRESH_PREPARED" : "RECOVERY_V3R2_REFRESH_CONTEXT_BLOCKED", readiness, refreshReadyToSend: ready, refreshRecordEqualsCurrentDirectRecord: ready, refreshRecordEqualsRecoveryV3R2AuthRecord: ready, recoveryV3R2AuthContextEqualsCurrentDirectContext: ready, remoteOperations: 0, credentialRefreshCalls: 0 });
}

export function prepareG2BRecoveryV3R2CredentialRefresh({ repositoryRoot = process.cwd(), environment = process.env, contextInspection, identityContext, secretProvider, store, operationInstance = G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_OPERATION_INSTANCE } = {}) {
  const provider = secretProvider || createWindowsDpapiSecretProvider({ environment });
  const resolvedStore = store || createG2BRecoveryAnchorStore({});
  if (!/^[0-9a-f-]{36}$/.test(operationInstance)) return Object.freeze({ ok: false, code: "RECOVERY_V3R2_REFRESH_OPERATION_INSTANCE_INVALID" });
  if (!anchorVerified({ environment, identityContext, secretProvider: provider, store: resolvedStore }) || contextInspection?.ok !== true) return Object.freeze({ ok: false, code: "RECOVERY_V3R2_REFRESH_CONTEXT_BLOCKED" });
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.recovery-v3r2-refresh.source-lock.v1", stage: G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_STAGE, operationInstance, sourceLocks: Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hash(resolve(repositoryRoot, path)) }))) });
  const implementation = Object.freeze({ schema: "myweb.g2b.recovery-v3r2-refresh.implementation.v1", stage: G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_STAGE, operationInstance, parentRecoveryV3R2OperationInstance: G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath, refreshRecordEqualsCurrentDirectRecord: true, refreshRecordEqualsRecoveryV3R2AuthRecord: true, recoveryV3R2AuthContextEqualsCurrentDirectContext: true, refreshHttpMethod: "POST", refreshEndpointClass: "OAUTH_TOKEN_ENDPOINT", alternateAccountSelection: 0, serviceAccountImpersonation: 0, serviceAccountKey: 0, implicitRefresh: false, automaticRefreshRetries: 0, rawAccessTokenPersisted: false, rawRefreshTokenPersisted: false, rawCredentialPersisted: false, rawAuthorizationHeaderPersisted: false, rawRequestBodyPersisted: false, rawResponseBodyPersisted: false, rawPrincipalPersisted: false, rawMemberPersisted: false });
  const runtimeCapability = Object.freeze({ schema: "myweb.g2b.recovery-v3r2-refresh.runtime-capability.v1", stage: G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_STAGE, credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1, totalPhysicalRemoteRefreshCallsMax: 1, additionalHiddenRefreshRemoteCalls: 0, automaticRefreshRetries: 0, secondRefreshRequest: 0, recoveryIamReadsMax: 0, projectIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0, testIamPermissionsCallsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0 });
  const prospectiveSafetyEvidence = Object.freeze({ schema: "myweb.g2b.recovery-v3r2-refresh.prospective-safety.v1", stage: G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_STAGE, approvalConsumptionEqualsFirstPhysicalRemoteCall: true, firstRemoteOperationCannotOccurBeforeApprovalConsumption: true, postRefreshRequiresLocalV3R2Reattestation: true, credentialFreshnessMarginSeconds: 120, recoveryIamReadDuringRefreshReachable: false, mutationReachable: false, rawCredentialDataPersisted: false });
  const executionComposite = Object.freeze({ schema: "myweb.g2b.recovery-v3r2-refresh.execution-composite.v1", stage: G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_STAGE, operationInstance, sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence), remoteOperations: 0, mutationReachable: false, unboundRuntimeDependencies: 0, unboundRemoteCapabilities: 0, unboundAuthCapabilities: 0 });
  const approvalPacket = Object.freeze({ schema: "myweb.g2b.recovery-v3r2-refresh.approval-packet.v1", stage: G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_STAGE, type: G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_TYPE, status: "APPROVAL_REQUIRED", purpose: "one bounded refresh of the current direct credential record before re-attesting the existing unconsumed V3R2 recovery IAM-read authority", operationInstance, parentRecoveryV3R2OperationInstance: G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath, preRefreshReadiness: Object.freeze({ result: contextInspection.readiness.result, credentialExpiryRelativeState: contextInspection.readiness.credentialExpiryRelativeState, freshnessMarginSeconds: 120, remoteOperations: 0, refreshMethodInvocations: 0 }), approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS", credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1, totalPhysicalRemoteRefreshCallsMax: 1, additionalHiddenRefreshRemoteCalls: 0, automaticRefreshRetries: 0, secondRefreshRequest: 0, recoveryIamReadsMax: 0, projectIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0, testIamPermissionsCallsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0, postRefreshV3R2ReattestationRequired: true, sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence), executionCompositeSha256: sha256Canonical(executionComposite), allRequiredLocalLocksMatch: true, refreshPacketReproducible: true, refreshPacketComplete: true, safeToContinueWithoutApproval: false });
  return Object.freeze({ ok: true, code: "RECOVERY_V3R2_REFRESH_AUTHORITY_READY", sourceLockManifest, implementation, runtimeCapability, prospectiveSafetyEvidence, executionComposite, approvalPacket });
}

export function verifyG2BRecoveryV3R2CredentialRefresh(value, options = {}) { try { const expected = prepareG2BRecoveryV3R2CredentialRefresh(options); const actual = { sourceLockManifest: value?.sourceLockManifest, implementation: value?.implementation, runtimeCapability: value?.runtimeCapability, prospectiveSafetyEvidence: value?.prospectiveSafetyEvidence, executionComposite: value?.executionComposite, approvalPacket: value?.approvalPacket }; const wanted = { sourceLockManifest: expected.sourceLockManifest, implementation: expected.implementation, runtimeCapability: expected.runtimeCapability, prospectiveSafetyEvidence: expected.prospectiveSafetyEvidence, executionComposite: expected.executionComposite, approvalPacket: expected.approvalPacket }; return Object.freeze({ ok: expected.ok && canonicalJson(actual) === canonicalJson(wanted) }); } catch { return Object.freeze({ ok: false }); } }

export function createG2BRecoveryV3R2CredentialRefreshExecutor({ operationInstance = G2B_RECOVERY_V3R2_CREDENTIAL_REFRESH_OPERATION_INSTANCE } = {}) { let used = false; return Object.freeze({ async execute({ enabled = false, authorizationPreconditionEstablished = false, consumeApproval, transport } = {}) { const counters = { credentialRefreshCalls: 0, totalPhysicalRemoteRefreshCalls: 0, recoveryIamReads: 0, setIamPolicyCalls: 0, iamMutations: 0, retries: 0, m4Mutations: 0, firestoreCalls: 0 }; if (enabled !== true || authorizationPreconditionEstablished !== true || used || typeof consumeApproval !== "function" || typeof transport?.executeDirectContextCredentialRefresh !== "function") return Object.freeze({ ok: false, code: "RECOVERY_V3R2_REFRESH_BOUNDARY_REQUIRED", counters: Object.freeze(counters) }); if (await consumeApproval() !== true) return Object.freeze({ ok: false, code: "RECOVERY_V3R2_REFRESH_APPROVAL_NOT_CONSUMED", counters: Object.freeze(counters) }); used = true; counters.credentialRefreshCalls = 1; counters.totalPhysicalRemoteRefreshCalls = 1; let result; try { result = await transport.executeDirectContextCredentialRefresh(); } catch { result = null; } return Object.freeze({ ok: result?.ok === true && result?.state === "REFRESH_SUCCESS_CONFIRMED" && result?.physicalCalls === 1, code: result?.ok === true ? "REFRESH_SUCCESS_CONFIRMED" : "REFRESH_INDETERMINATE", counters: Object.freeze(counters) }); } }); }

export function writeG2BRecoveryV3R2CredentialRefresh(value, { repositoryRoot = process.cwd() } = {}) { if (value?.ok !== true) throw new Error("recovery-v3r2-refresh-authority-not-ready"); const paths = {}; for (const [key, relative] of Object.entries(OUTPUTS)) { writeCanonicalJsonAtomically(resolve(repositoryRoot, relative), value[key]); paths[key] = relative; } return Object.freeze({ paths, sourceLockManifestSha256: sha256Canonical(value.sourceLockManifest), implementationAttestationSha256: sha256Canonical(value.implementation), runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(value.prospectiveSafetyEvidence), executionCompositeSha256: sha256Canonical(value.executionComposite), approvalPacketSha256: sha256Canonical(value.approvalPacket), approvalPacketRawSha256: hash(resolve(repositoryRoot, OUTPUTS.approvalPacket)) }); }
