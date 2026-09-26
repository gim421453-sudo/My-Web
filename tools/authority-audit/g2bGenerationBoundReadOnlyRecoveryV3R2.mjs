import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { createG2BGenerationBoundReadOnlyRecoveryV2Executor } from "./g2bGenerationBoundReadOnlyRecoveryV2.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { createG2BRecoveryExecutionJournal, G2B_RECOVERY_EXECUTION_JOURNAL_CONTRACT } from "./g2bRecoveryExecutionJournal.mjs";
import { createG2BRecoveryPostExecutionEvidenceWriter, G2B_RECOVERY_POSTEXEC_EVIDENCE_CONTRACT, writeCanonicalJsonAtomically } from "./g2bRecoveryPostExecutionEvidence.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { classifyG2BHostAnchorAttestationFreshness, readFreshG2BHostAnchorAttestation } from "./g2bHostAnchorAttestation.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";

export const G2B_GENERATION_BOUND_RECOVERY_V3R2_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-GENERATION-BOUND-READ-ONLY-RECOVERY-V3R2";
export const G2B_GENERATION_BOUND_RECOVERY_V3R2_TYPE = "M3_GENERATION_BOUND_READ_ONLY_RECOVERY_V3R2";
// The first V3R2 packet is preserved as superseded and unconsumed after the
// local source-lock correction. This instance is the only executable V3R2 one.
export const G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE = "c3e9822b-c0af-4b1b-9f2c-5695ad8d2f73";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R2.mjs", "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs", "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
  "tools/authority-audit/g2bRecoveryPostExecutionEvidence.mjs", "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs", "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs", "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs", "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs", "tools/authority-audit/prepareG2BGenerationBoundReadOnlyRecoveryV3R2.mjs",
  "tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV3R2.test.mjs",
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-source-lock-v2.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-implementation-v2.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-runtime-v2.json",
  prospectiveSafetyEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-prospective-safety-v2.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-composite-v2.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-approval-packet-v2.json",
});
const locks = (root) => Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex") })));
const fresh = (r) => r?.ok === true && r?.result === "CACHED_CREDENTIAL_READY_CONFIRMED" && r?.credentialExpiryRelativeState === "FRESH" && r?.freshnessMarginSeconds === 120 && r?.networkRequests === 0 && r?.refreshMethodInvocations === 0;
const ACCOUNT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MEMBER = /^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validContext(context, operationInstance) {
  return context && typeof context === "object"
    && context.operationInstance === operationInstance
    && context.parentInterruptedM3Generation === G2B_INTERRUPTED_M3_GENERATION
    && context.targetResource === G2B_TARGET_RESOURCE
    && context.targetRole === G2B_TARGET_ROLE
    && context.authContextId === G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath
    && context.recoveryAnchorVerified === true
    && ACCOUNT.test(context.account || "")
    && MEMBER.test(context.member || "")
    && context.identityContext?.exactPrincipal === context.account
    && context.identityContext?.exactIamMember === context.member
    && typeof context.secretProvider?.read === "function"
    && typeof context.store?.load === "function";
}

/** Raw account/member are non-enumerable and only cross the in-memory executor boundary. */
export function resolveG2BRecoveryV3R2Context({ environment = process.env, operationInstance = G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE, identityContext, secretProvider, store, repositoryRoot = process.cwd(), attestationDirectory, allowExpiredAttestationForExecution = false } = {}) {
  const identity = identityContext ? Object.freeze({ ok: true, context: identityContext }) : resolveG2BLocalPinnedIdentity({ environment });
  const provider = secretProvider || createWindowsDpapiSecretProvider({ environment });
  const resolvedStore = store || createG2BRecoveryAnchorStore({});
  const loaded = identity.ok === true ? resolvedStore.load(G2B_INTERRUPTED_M3_GENERATION) : null;
  const secret = provider?.read?.();
  if (!identity.ok || !identity.context?.exactPrincipal || loaded?.state !== "READY" || loaded.record?.anchorState !== "ANCHOR_VERIFIED") return Object.freeze({ ok: false, code: identity.ok ? "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED" : identity.code });
  let anchorValidationSource = "CURRENT_HOST_DPAPI";
  let expiredAttestationOnly = false;
  let verified = { ok: false };
  if (secret?.state === "ENVIRONMENT_BLOCKED") {
    const attested = readFreshG2BHostAnchorAttestation({ directory: attestationDirectory, secretKeyId: loaded.record.secretKeyId, generationId: loaded.record.operationGenerationId, account: identity.context.exactPrincipal, member: identity.context.exactIamMember, anchorRecord: loaded.record, environment, repositoryRoot });
    if (attested.ok) {
      verified = { ok: true };
      anchorValidationSource = "FRESH_HOST_ATTESTATION";
    } else if (allowExpiredAttestationForExecution === true) {
      const classified = classifyG2BHostAnchorAttestationFreshness({ directory: attestationDirectory, secretKeyId: loaded.record.secretKeyId, generationId: loaded.record.operationGenerationId, account: identity.context.exactPrincipal, member: identity.context.exactIamMember, anchorRecord: loaded.record, environment, repositoryRoot });
      if (classified.state !== "ATTESTATION_EXPIRED_ONLY") return Object.freeze({ ok: false, code: "RECOVERY_V3R2_ANCHOR_ENVIRONMENT_BLOCKED", attestationCode: classified.code || attested.code });
      verified = { ok: true };
      expiredAttestationOnly = true;
      anchorValidationSource = "EXPIRED_ONLY_ATTESTATION_REQUIRES_EXECUTION_REFRESH";
    } else return Object.freeze({ ok: false, code: "RECOVERY_V3R2_ANCHOR_ENVIRONMENT_BLOCKED", attestationCode: attested.code });
  } else if (secret?.state === "READY") {
    try {
      verified = verifyG2BRecoveryAnchor({ record: loaded.record, member: identity.context.exactIamMember, secret: secret.secret, secretKeyId: secret.keyId });
    } finally {
      if (Buffer.isBuffer(secret.secret)) secret.secret.fill(0);
    }
  } else {
    return Object.freeze({ ok: false, code: "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED" });
  }
  if (!verified.ok) return Object.freeze({ ok: false, code: "RECOVERY_V3R2_ANCHOR_NOT_VERIFIED" });
  const context = { operationInstance, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, authContextId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath, recoveryAnchorVerified: true, anchorValidationSource, expiredAttestationOnly };
  Object.defineProperties(context, { identityContext: { value: identity.context, enumerable: false }, secretProvider: { value: provider, enumerable: false }, store: { value: resolvedStore, enumerable: false }, account: { value: identity.context.exactPrincipal, enumerable: false }, member: { value: identity.context.exactIamMember, enumerable: false } });
  return Object.freeze({ ok: true, context: Object.freeze(context) });
}

export function prepareG2BGenerationBoundReadOnlyRecoveryV3R2({ repositoryRoot = process.cwd(), environment = process.env, recoveryContext, readiness, operationInstance = G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE } = {}) {
  const resolved = recoveryContext ? Object.freeze({ ok: true, context: recoveryContext }) : resolveG2BRecoveryV3R2Context({ environment, operationInstance });
  if (!resolved.ok || !validContext(resolved.context, operationInstance)) return Object.freeze({ ok: false, code: resolved.ok ? "RECOVERY_V3R2_CONTEXT_INVALID" : resolved.code });
  if (!fresh(readiness)) return Object.freeze({ ok: false, code: "RECOVERY_V3R2_PRELIVE_CREDENTIAL_NOT_READY" });
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.generation-bound-recovery-v3r2.source-lock.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R2_STAGE, operationInstance, sourceLocks: locks(repositoryRoot) });
  const implementation = Object.freeze({ schema: "myweb.g2b.generation-bound-recovery-v3r2.implementation.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R2_STAGE, operationInstance, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, method: "GET", iamEndpoint: "serviceAccounts.getIamPolicy", recoveryTransportOperation: "READ_GENERATION_BOUND_RECOVERY_POLICY", currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath, requiredRecoveryContext: true, accountMemberTransientOnly: true, cachedCredentialOnly: true, implicitCredentialRefresh: false, automaticAuthRetry: 0, recoveryResponseUsesMutationPolicyValidator: false, executionEvidenceWriterSourceLocked: true, resultDocumentWriterSourceLocked: true, localFinalizationResumerSourceLocked: true, rawPolicyPersisted: false, rawMemberPersisted: false, rawPrincipalPersisted: false, rawCredentialPersisted: false, rawTokenPersisted: false });
  const runtimeCapability = Object.freeze({ schema: "myweb.g2b.generation-bound-recovery-v3r2.runtime-capability.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R2_STAGE, recoveryServiceAccountIamPolicyReadsMax: 1, totalPhysicalRemoteRecoveryCallsMax: 1, projectIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0, additionalHiddenPhysicalCalls: 0, authHiddenRemoteCalls: 0, automaticRetries: 0, secondRecoveryRead: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0, credentialRefreshCallsMax: 0, preliveLocalCredentialReadinessRecheckRequired: true, ...G2B_RECOVERY_POSTEXEC_EVIDENCE_CONTRACT });
  const prospectiveSafetyEvidence = Object.freeze({ schema: "myweb.g2b.generation-bound-recovery-v3r2.prospective-safety.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R2_STAGE, operationInstancePersistedBeforeRemoteBoundary: true, journalContract: G2B_RECOVERY_EXECUTION_JOURNAL_CONTRACT, terminalJournalPersistsBeforeEvidence: true, postExecutionEvidenceCannotRetryRead: true, finalizationResumeRequiresNoRemoteOperation: true, remoteTargetUnchanged: true, httpMethodUnchanged: true, iamEndpointUnchanged: true, authContextUnchanged: true, remoteCallMaxUnchanged: true, anchorHmacSemanticsUnchanged: true, presentAbsentSemanticsUnchanged: true });
  const executionComposite = Object.freeze({ schema: "myweb.g2b.generation-bound-recovery-v3r2.execution-composite.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R2_STAGE, sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence), authorityDependencyCount: SOURCE_PATHS.length, unboundRecoveryDependencies: 0, unboundRemoteCapabilities: 0, unboundAuthCapabilities: 0, remoteOperations: 0, mutationReachable: false });
  const approvalPacket = Object.freeze({ schema: "myweb.g2b.generation-bound-recovery-v3r2.approval-packet.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R2_STAGE, type: G2B_GENERATION_BOUND_RECOVERY_V3R2_TYPE, status: "APPROVAL_REQUIRED", purpose: "one fresh separately approved generation-bound read-only IAM policy recovery read with explicit transient dependency propagation", operationInstance, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, blockedV3R1OperationInstance: "6c1c971d-41ec-4880-bec0-5b1387576c67", blockedV3R1ApprovalReused: false, targetServiceAccount: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, existingVerifiedGenerationBoundRecoveryAnchor: true, currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath, requiredRecoveryContext: true, credentialFreshnessMarginSeconds: 120, preliveLocalCredentialReadinessRecheckRequired: true, recoveryServiceAccountIamPolicyReadsMax: 1, totalPhysicalRemoteRecoveryCallsMax: 1, projectIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0, additionalHiddenPhysicalCalls: 0, authHiddenRemoteCalls: 0, automaticRetries: 0, secondRecoveryRead: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0, credentialRefreshCallsMax: 0, approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_RECOVERY_GET_IAM_POLICY_REQUEST_BEGINS", resultDomain: Object.freeze(["RECOVERY_CONFIRMED_PRESENT", "RECOVERY_CONFIRMED_ABSENT", "RECOVERY_NOT_ESTABLISHED"]), sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence), executionCompositeSha256: sha256Canonical(executionComposite), allRequiredLocalLocksMatch: true, recoveryPacketReproducible: true, recoveryPacketComplete: true, safeToContinueWithoutApproval: false });
  return Object.freeze({ ok: true, recoveryContext: resolved.context, sourceLockManifest, implementation, runtimeCapability, prospectiveSafetyEvidence, executionComposite, approvalPacket });
}

export function verifyG2BGenerationBoundReadOnlyRecoveryV3R2(value, options = {}) { try { const expected = prepareG2BGenerationBoundReadOnlyRecoveryV3R2(options); const actual = { sourceLockManifest: value?.sourceLockManifest, implementation: value?.implementation, runtimeCapability: value?.runtimeCapability, prospectiveSafetyEvidence: value?.prospectiveSafetyEvidence, executionComposite: value?.executionComposite, approvalPacket: value?.approvalPacket }; const wanted = { sourceLockManifest: expected.sourceLockManifest, implementation: expected.implementation, runtimeCapability: expected.runtimeCapability, prospectiveSafetyEvidence: expected.prospectiveSafetyEvidence, executionComposite: expected.executionComposite, approvalPacket: expected.approvalPacket }; return Object.freeze({ ok: expected.ok === true && canonicalJson(actual) === canonicalJson(wanted) }); } catch { return Object.freeze({ ok: false }); } }

export function createG2BGenerationBoundReadOnlyRecoveryV3R2Executor({ operationInstance = G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE } = {}) {
  const delegate = createG2BGenerationBoundReadOnlyRecoveryV2Executor({ operationInstance, requireRecoveryContext: true });
  return Object.freeze({ async execute({ transport, recoveryContext, journal = createG2BRecoveryExecutionJournal(), finalizer = createG2BRecoveryPostExecutionEvidenceWriter(), ...request } = {}) {
    if (typeof transport?.readGenerationBoundRecoveryPolicy !== "function" || !validContext(recoveryContext, operationInstance)) return Object.freeze({ ok: false, code: "RECOVERY_V3R2_CONTEXT_BOUNDARY_REQUIRED", recoveryResult: "RECOVERY_NOT_ESTABLISHED", counters: Object.freeze({ recoveryServiceAccountIamPolicyReads: 0, totalPhysicalRemoteRecoveryCalls: 0 }) });
    const output = await delegate.execute({ ...request, recoveryContext, journal, readPolicy: (readRequest) => transport.readGenerationBoundRecoveryPolicy(readRequest) });
    const terminal = journal.load(operationInstance);
    if (terminal?.state !== "READY" || terminal.record?.phase !== "TERMINAL_CLASSIFICATION_COMPLETE") return output;
    return Object.freeze({ ...output, postExecutionFinalization: finalizer.resume({ operationInstance, journal, counters: output.counters, preliveCredentialState: request.preliveReadiness?.credentialExpiryRelativeState, anchorVerificationState: "VERIFIED" }) });
  }, snapshot: () => delegate.snapshot() });
}

export function writeG2BGenerationBoundReadOnlyRecoveryV3R2(value, { repositoryRoot = process.cwd() } = {}) { if (value?.ok !== true) throw new Error("generation-bound-recovery-v3r2-not-ready"); const paths = {}; for (const [key, relative] of Object.entries(OUTPUTS)) { writeCanonicalJsonAtomically(resolve(repositoryRoot, relative), value[key]); paths[key] = relative; } return Object.freeze({ paths, sourceLockManifestSha256: sha256Canonical(value.sourceLockManifest), implementationAttestationSha256: sha256Canonical(value.implementation), runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(value.prospectiveSafetyEvidence), executionCompositeSha256: sha256Canonical(value.executionComposite), approvalPacketSha256: sha256Canonical(value.approvalPacket), approvalPacketRawSha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, OUTPUTS.approvalPacket))).digest("hex") }); }
export const G2B_GENERATION_BOUND_RECOVERY_V3R2_CONTRACT = Object.freeze({ transportContract: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.id, recoveryOnlyReadReachable: true, mutationPrestateReachable: false, setIamPolicyReachable: false });
