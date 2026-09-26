import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { createG2BGenerationBoundReadOnlyRecoveryV2Executor } from "./g2bGenerationBoundReadOnlyRecoveryV2.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { G2B_RECOVERY_EXECUTION_JOURNAL_CONTRACT } from "./g2bRecoveryExecutionJournal.mjs";
import { createG2BRecoveryPostExecutionEvidenceWriter, G2B_RECOVERY_POSTEXEC_EVIDENCE_CONTRACT, writeCanonicalJsonAtomically } from "./g2bRecoveryPostExecutionEvidence.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";

export const G2B_GENERATION_BOUND_RECOVERY_V3R1_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-GENERATION-BOUND-READ-ONLY-RECOVERY-V3R1";
export const G2B_GENERATION_BOUND_RECOVERY_V3R1_TYPE = "M3_GENERATION_BOUND_READ_ONLY_RECOVERY_V3R1";
export const G2B_GENERATION_BOUND_RECOVERY_V3R1_OPERATION_INSTANCE = "6c1c971d-41ec-4880-bec0-5b1387576c67";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R1.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs",
  "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
  "tools/authority-audit/g2bRecoveryPostExecutionEvidence.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/prepareG2BGenerationBoundReadOnlyRecoveryV3R1.mjs",
  "tools/authority-audit-tests/g2bRecoveryPostExecutionEvidence.test.mjs",
  "tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV3R1.test.mjs",
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r1-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r1-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r1-runtime-v1.json",
  prospectiveSafetyEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r1-prospective-safety-v1.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r1-composite-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r1-approval-packet-v1.json",
});

function locks(repositoryRoot) {
  return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex") })));
}

function fresh(readiness) {
  return readiness?.ok === true && readiness?.result === "CACHED_CREDENTIAL_READY_CONFIRMED"
    && readiness?.credentialExpiryRelativeState === "FRESH" && readiness?.freshnessMarginSeconds === 120
    && readiness?.networkRequests === 0 && readiness?.refreshMethodInvocations === 0;
}

function anchor({ identityContext, secretProvider, store }) {
  const loaded = store?.load?.(G2B_INTERRUPTED_M3_GENERATION);
  const secret = secretProvider?.read?.();
  const verified = loaded?.state === "READY"
    ? verifyG2BRecoveryAnchor({ record: loaded.record, member: identityContext?.exactIamMember, secret: secret?.secret, secretKeyId: secret?.keyId })
    : { ok: false };
  return verified.ok === true && loaded.record.anchorState === "ANCHOR_VERIFIED" ? Object.freeze({ record: loaded.record, secret }) : null;
}

function artifact(value, schema, stage, attributes) {
  return Object.freeze({ schema, stage, ...attributes, canonicalSha256: sha256Canonical(value) });
}

/** Builds a fresh V3R1 authority only. It does not open a transport or make a remote request. */
export function prepareG2BGenerationBoundReadOnlyRecoveryV3R1({ repositoryRoot = process.cwd(), environment = process.env, identityContext, secretProvider, store, readiness, operationInstance = G2B_GENERATION_BOUND_RECOVERY_V3R1_OPERATION_INSTANCE } = {}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(operationInstance)) return Object.freeze({ ok: false, code: "RECOVERY_V3R1_OPERATION_INSTANCE_INVALID" });
  const identity = identityContext ? Object.freeze({ ok: true, context: identityContext }) : resolveG2BLocalPinnedIdentity({ environment });
  const verified = identity.ok === true ? anchor({ identityContext: identity.context, secretProvider: secretProvider || createWindowsDpapiSecretProvider({ environment }), store: store || createG2BRecoveryAnchorStore({}) }) : null;
  if (!verified || !fresh(readiness)) return Object.freeze({ ok: false, code: verified ? "RECOVERY_V3R1_PRELIVE_CREDENTIAL_NOT_READY" : "RECOVERY_V3R1_ANCHOR_NOT_VERIFIED" });
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.generation-bound-recovery-v3r1.source-lock.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R1_STAGE, operationInstance, sourceLocks: locks(repositoryRoot) });
  const implementation = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3r1.implementation.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R1_STAGE,
    operationInstance, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE,
    method: "GET", iamEndpoint: "serviceAccounts.getIamPolicy", recoveryTransportOperation: "READ_GENERATION_BOUND_RECOVERY_POLICY",
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    cachedCredentialOnly: true, implicitCredentialRefresh: false, automaticAuthRetry: 0,
    recoveryResponseUsesMutationPolicyValidator: false, terminalJournalPersistedBeforeEvidenceWriter: true,
    executionEvidenceWriterSourceLocked: true, resultDocumentWriterSourceLocked: true, localFinalizationResumerSourceLocked: true,
    rawPolicyPersisted: false, rawMemberPersisted: false, rawPrincipalPersisted: false, rawCredentialPersisted: false, rawTokenPersisted: false,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3r1.runtime-capability.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R1_STAGE,
    recoveryServiceAccountIamPolicyReadsMax: 1, totalPhysicalRemoteRecoveryCallsMax: 1, projectIamReadsMax: 0,
    setIamPolicyCallsMax: 0, iamMutationsMax: 0, additionalHiddenPhysicalCalls: 0, authHiddenRemoteCalls: 0,
    automaticRetries: 0, secondRecoveryRead: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0,
    credentialRefreshCallsMax: 0, preliveLocalCredentialReadinessRecheckRequired: true,
    ...G2B_RECOVERY_POSTEXEC_EVIDENCE_CONTRACT,
  });
  const prospectiveSafetyEvidence = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3r1.prospective-safety.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R1_STAGE,
    operationInstancePersistedBeforeRemoteBoundary: true, journalContract: G2B_RECOVERY_EXECUTION_JOURNAL_CONTRACT,
    terminalJournalPersistsBeforeEvidence: true, postExecutionEvidenceCannotRetryRead: true,
    finalizationResumeRequiresNoRemoteOperation: true, remoteTargetUnchanged: true, httpMethodUnchanged: true,
    iamEndpointUnchanged: true, authContextUnchanged: true, remoteCallMaxUnchanged: true,
    anchorHmacSemanticsUnchanged: true, presentAbsentSemanticsUnchanged: true,
    onlyPostexecEvidenceResultFinalizationSemanticsChanged: true,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3r1.execution-composite.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R1_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence),
    authorityDependencyCount: SOURCE_PATHS.length, unboundRecoveryDependencies: 0, unboundRemoteCapabilities: 0, unboundAuthCapabilities: 0,
    remoteOperations: 0, mutationReachable: false,
  });
  const approvalPacket = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3r1.approval-packet.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3R1_STAGE,
    type: G2B_GENERATION_BOUND_RECOVERY_V3R1_TYPE, status: "APPROVAL_REQUIRED",
    purpose: "one fresh, separately approved, generation-bound read-only service-account IAM policy recovery read with source-locked terminal evidence/result finalization",
    operationInstance, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    blockedV3OperationInstance: "95a761e6-fd21-4909-87c1-8f230bbbdc40", blockedV3ApprovalReused: false,
    targetServiceAccount: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, existingVerifiedGenerationBoundRecoveryAnchor: true,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    credentialFreshnessMarginSeconds: 120, recoveryServiceAccountIamPolicyReadsMax: 1, totalPhysicalRemoteRecoveryCallsMax: 1,
    projectIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0, additionalHiddenPhysicalCalls: 0,
    authHiddenRemoteCalls: 0, automaticRetries: 0, secondRecoveryRead: 0, m4MutationsMax: 0,
    firestoreCallsMax: 0, testIamPermissionsCallsMax: 0, credentialRefreshCallsMax: 0,
    approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_RECOVERY_GET_IAM_POLICY_REQUEST_BEGINS",
    preliveLocalCredentialReadinessRecheckRequired: true, terminalJournalPersistedBeforeEvidenceWriter: true,
    localEvidenceFinalizationResumeSupported: true, postexecEvidenceFailureRequiresNoRemoteRetry: true,
    resultDomain: Object.freeze(["RECOVERY_CONFIRMED_PRESENT", "RECOVERY_CONFIRMED_ABSENT", "RECOVERY_NOT_ESTABLISHED"]),
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence),
    executionCompositeSha256: sha256Canonical(executionComposite), allRequiredLocalLocksMatch: true, recoveryPacketReproducible: true,
    recoveryPacketComplete: true, safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ ok: true, code: "GENERATION_BOUND_READ_ONLY_RECOVERY_V3R1_READY", sourceLockManifest, implementation, runtimeCapability, prospectiveSafetyEvidence, executionComposite, approvalPacket });
}

export function verifyG2BGenerationBoundReadOnlyRecoveryV3R1(value, options = {}) {
  try {
    const expected = prepareG2BGenerationBoundReadOnlyRecoveryV3R1(options);
    const actual = Object.freeze({ sourceLockManifest: value?.sourceLockManifest, implementation: value?.implementation, runtimeCapability: value?.runtimeCapability, prospectiveSafetyEvidence: value?.prospectiveSafetyEvidence, executionComposite: value?.executionComposite, approvalPacket: value?.approvalPacket });
    const wanted = Object.freeze({ sourceLockManifest: expected.sourceLockManifest, implementation: expected.implementation, runtimeCapability: expected.runtimeCapability, prospectiveSafetyEvidence: expected.prospectiveSafetyEvidence, executionComposite: expected.executionComposite, approvalPacket: expected.approvalPacket });
    return Object.freeze({ ok: expected.ok === true && canonicalJson(actual) === canonicalJson(wanted) });
  } catch { return Object.freeze({ ok: false }); }
}

/** The only remote capability is the injected one-read recovery transport. Finalization is local and journal-derived. */
export function createG2BGenerationBoundReadOnlyRecoveryV3R1Executor({ operationInstance = G2B_GENERATION_BOUND_RECOVERY_V3R1_OPERATION_INSTANCE } = {}) {
  const delegate = createG2BGenerationBoundReadOnlyRecoveryV2Executor({ operationInstance });
  return Object.freeze({
    async execute({ transport, journal, finalizer = createG2BRecoveryPostExecutionEvidenceWriter(), ...request } = {}) {
      if (typeof transport?.readGenerationBoundRecoveryPolicy !== "function") return Object.freeze({ ok: false, code: "RECOVERY_V3R1_BOUNDARY_REQUIRED", recoveryResult: "RECOVERY_NOT_ESTABLISHED", counters: Object.freeze({ recoveryServiceAccountIamPolicyReads: 0, totalPhysicalRemoteRecoveryCalls: 0 }) });
      const output = await delegate.execute({ ...request, journal, readPolicy: (readRequest) => transport.readGenerationBoundRecoveryPolicy(readRequest) });
      const terminal = journal?.load?.(operationInstance);
      if (terminal?.state !== "READY" || terminal.record?.phase !== "TERMINAL_CLASSIFICATION_COMPLETE") return output;
      const finalization = finalizer.resume({
        operationInstance,
        journal,
        counters: output.counters,
        preliveCredentialState: request.preliveReadiness?.credentialExpiryRelativeState,
        anchorVerificationState: "VERIFIED",
      });
      return Object.freeze({ ...output, postExecutionFinalization: finalization });
    },
    snapshot: () => delegate.snapshot(),
  });
}

export function writeG2BGenerationBoundReadOnlyRecoveryV3R1(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("generation-bound-recovery-v3r1-not-ready");
  const paths = {};
  for (const [key, relative] of Object.entries(OUTPUTS)) {
    writeCanonicalJsonAtomically(resolve(repositoryRoot, relative), value[key]);
    paths[key] = relative;
  }
  return Object.freeze({
    paths: Object.freeze(paths),
    sourceLockManifestSha256: sha256Canonical(value.sourceLockManifest), implementationAttestationSha256: sha256Canonical(value.implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(value.prospectiveSafetyEvidence),
    executionCompositeSha256: sha256Canonical(value.executionComposite), approvalPacketSha256: sha256Canonical(value.approvalPacket),
    approvalPacketRawSha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, OUTPUTS.approvalPacket))).digest("hex"),
  });
}

export const G2B_GENERATION_BOUND_RECOVERY_V3R1_CONTRACT = Object.freeze({
  remoteTargetUnchanged: true,
  httpMethodUnchanged: true,
  iamEndpointUnchanged: true,
  authContextUnchanged: true,
  remoteCallMaxUnchanged: true,
  anchorHmacSemanticsUnchanged: true,
  presentAbsentClassificationSemanticsUnchanged: true,
  onlyPostexecEvidenceResultFinalizationSemanticsChanged: true,
  transportContract: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.id || "g2b-explicit-direct-set-iam-policy-cached-credential-v2",
});
