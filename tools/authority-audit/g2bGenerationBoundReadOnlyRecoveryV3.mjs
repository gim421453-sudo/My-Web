import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { createG2BGenerationBoundReadOnlyRecoveryV2Executor } from "./g2bGenerationBoundReadOnlyRecoveryV2.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { G2B_RECOVERY_EXECUTION_JOURNAL_CONTRACT } from "./g2bRecoveryExecutionJournal.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";

export const G2B_GENERATION_BOUND_RECOVERY_V3_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-GENERATION-BOUND-READ-ONLY-RECOVERY-V3";
export const G2B_GENERATION_BOUND_RECOVERY_V3_TYPE = "M3_GENERATION_BOUND_READ_ONLY_RECOVERY_V3";
export const G2B_GENERATION_BOUND_RECOVERY_V3_OPERATION_INSTANCE = "95a761e6-fd21-4909-87c1-8f230bbbdc40";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit/prepareG2BGenerationBoundReadOnlyRecoveryV3.mjs",
  "tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV3.test.mjs",
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3-runtime-v1.json",
  prospectiveSafetyEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3-prospective-safety-v1.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3-composite-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3-approval-packet-v1.json",
});

function sourceLocks(repositoryRoot) {
  return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({
    path,
    sha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, path))).digest("hex"),
  })));
}

function fresh(readiness) {
  return readiness?.ok === true
    && readiness?.result === "CACHED_CREDENTIAL_READY_CONFIRMED"
    && readiness?.credentialExpiryRelativeState === "FRESH"
    && readiness?.freshnessMarginSeconds === 120
    && readiness?.networkRequests === 0
    && readiness?.refreshMethodInvocations === 0;
}

function verifiedAnchor({ identityContext, secretProvider, store }) {
  const loaded = store?.load?.(G2B_INTERRUPTED_M3_GENERATION);
  const secret = secretProvider?.read?.();
  const verification = loaded?.state === "READY"
    ? verifyG2BRecoveryAnchor({ record: loaded.record, member: identityContext?.exactIamMember, secret: secret?.secret, secretKeyId: secret?.keyId })
    : { ok: false };
  return verification.ok === true && loaded.record.anchorState === "ANCHOR_VERIFIED"
    ? Object.freeze({ record: loaded.record, secret })
    : null;
}

/** Builds a new, one-read-only recovery authority; it never sends a request. */
export function prepareG2BGenerationBoundReadOnlyRecoveryV3({ repositoryRoot = process.cwd(), environment = process.env, identityContext, secretProvider, store, readiness } = {}) {
  const identity = identityContext ? Object.freeze({ ok: true, context: identityContext }) : resolveG2BLocalPinnedIdentity({ environment });
  const anchor = identity.ok === true
    ? verifiedAnchor({ identityContext: identity.context, secretProvider: secretProvider || createWindowsDpapiSecretProvider({ environment }), store: store || createG2BRecoveryAnchorStore({}) })
    : null;
  if (!anchor || !fresh(readiness)) return Object.freeze({ ok: false, code: anchor ? "RECOVERY_V3_PRELIVE_CREDENTIAL_NOT_READY" : "RECOVERY_V3_ANCHOR_NOT_VERIFIED" });

  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.generation-bound-recovery-v3.source-lock.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3_STAGE, sourceLocks: sourceLocks(repositoryRoot) });
  const implementation = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3.implementation.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3_STAGE,
    operationInstance: G2B_GENERATION_BOUND_RECOVERY_V3_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    method: "GET", iamEndpoint: "serviceAccounts.getIamPolicy", recoveryTransportOperation: "READ_GENERATION_BOUND_RECOVERY_POLICY",
    cachedCredentialOnly: true, implicitCredentialRefresh: false, automaticAuthRetry: 0, alternateAccountSelection: 0,
    serviceAccountImpersonation: 0, serviceAccountKey: 0, recoveryResponseUsesMutationPolicyValidator: false,
    knownHttpSuccessStatusProjected: true, recoveryAnchorVerified: true, rawPolicyPersisted: false, rawMemberPersisted: false,
    rawPrincipalPersisted: false, rawCredentialPersisted: false, rawTokenPersisted: false,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3.runtime-capability.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3_STAGE,
    recoveryServiceAccountIamPolicyReadsMax: 1, totalPhysicalRemoteRecoveryCallsMax: 1, projectIamReadsMax: 0,
    setIamPolicyCallsMax: 0, iamMutationsMax: 0, additionalHiddenPhysicalCalls: 0, authHiddenRemoteCalls: 0,
    automaticRetries: 0, secondRecoveryRead: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0,
    credentialRefreshCallsMax: 0, preliveLocalCredentialReadinessRecheckRequired: true, preliveNetworkRequests: 0,
    preliveCredentialRefreshCalls: 0,
  });
  const prospectiveSafetyEvidence = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3.prospective-safety.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3_STAGE,
    journalSchema: G2B_RECOVERY_EXECUTION_JOURNAL_CONTRACT, operationInstancePersistedBeforeRemoteBoundary: true,
    approvalConsumptionPersistedAtRemoteBoundary: true, requestStartPersistedAtRemoteBoundary: true,
    responseObservedPersistedWhenAvailable: true, httpStatusClassPersistedWhenAvailable: true,
    knownHttpResponseCannotCollapseToUnknownFromLocalProjection: true, knownLocalFailurePhasePersisted: true,
    transportResultPersistedWhenAvailable: true, responseParseResultPersistedWhenAvailable: true,
    targetRoleEvaluationResultPersistedWhenAvailable: true, anchorComparisonResultPersistedWhenAvailable: true,
    classifierInputCompletenessPersisted: true, terminalRecoveryResultPersisted: true,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3.execution-composite.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence),
    remoteOperations: 0, mutationReachable: false,
  });
  const approvalPacket = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v3.approval-packet.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V3_STAGE,
    type: G2B_GENERATION_BOUND_RECOVERY_V3_TYPE, status: "APPROVAL_REQUIRED",
    purpose: "one fresh, separately approved, generation-bound read-only service-account IAM policy recovery read after Recovery V2 local response-adapter failure",
    operationInstance: G2B_GENERATION_BOUND_RECOVERY_V3_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    recoveryV2Reused: false, recoveryV2ApprovalReused: false, recoveryV2RemoteCallReplayed: false,
    targetServiceAccount: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, existingVerifiedGenerationBoundRecoveryAnchor: true,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    recoveryCredentialRecordEqualsCurrentDirectRecord: true, recoveryAuthContextEqualsCurrentDirectContext: true,
    cachedCredentialOnly: true, implicitCredentialRefresh: false, automaticAuthRetry: 0, alternateAccountSelection: 0,
    serviceAccountImpersonation: 0, serviceAccountKey: 0, credentialFreshnessMarginSeconds: 120,
    recoveryServiceAccountIamPolicyReadsMax: 1, totalPhysicalRemoteRecoveryCallsMax: 1, projectIamReadsMax: 0,
    setIamPolicyCallsMax: 0, iamMutationsMax: 0, additionalHiddenPhysicalCalls: 0, authHiddenRemoteCalls: 0,
    automaticRetries: 0, secondRecoveryRead: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0,
    credentialRefreshCallsMax: 0, approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_RECOVERY_GET_IAM_POLICY_REQUEST_BEGINS",
    preliveLocalCredentialReadinessRecheckRequired: true, preliveLocalCheckBeforeApprovalConsumption: true,
    interruptionStateRereadSupported: true, resultDomain: Object.freeze(["RECOVERY_CONFIRMED_PRESENT", "RECOVERY_CONFIRMED_ABSENT", "RECOVERY_NOT_ESTABLISHED"]),
    rawPolicyPersisted: false, rawMemberPersisted: false, rawPrincipalPersisted: false, rawCredentialPersisted: false, rawTokenPersisted: false,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence),
    executionCompositeSha256: sha256Canonical(executionComposite), allRequiredLocalLocksMatch: true, recoveryPacketReproducible: true,
    recoveryPacketComplete: true, safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ ok: true, code: "GENERATION_BOUND_READ_ONLY_RECOVERY_V3_READY", sourceLockManifest, implementation, runtimeCapability, prospectiveSafetyEvidence, executionComposite, approvalPacket });
}

export function verifyG2BGenerationBoundReadOnlyRecoveryV3(value, options = {}) {
  try {
    const expected = prepareG2BGenerationBoundReadOnlyRecoveryV3(options);
    const actual = Object.freeze({ sourceLockManifest: value?.sourceLockManifest, implementation: value?.implementation, runtimeCapability: value?.runtimeCapability, prospectiveSafetyEvidence: value?.prospectiveSafetyEvidence, executionComposite: value?.executionComposite, approvalPacket: value?.approvalPacket });
    const canonical = Object.freeze({ sourceLockManifest: expected.sourceLockManifest, implementation: expected.implementation, runtimeCapability: expected.runtimeCapability, prospectiveSafetyEvidence: expected.prospectiveSafetyEvidence, executionComposite: expected.executionComposite, approvalPacket: expected.approvalPacket });
    return Object.freeze({ ok: expected.ok === true && canonicalJson(actual) === canonicalJson(canonical) });
  } catch { return Object.freeze({ ok: false }); }
}

/** Reuses the durable V2 journal and anchor classifier with V3's recovery-only transport capability. */
export function createG2BGenerationBoundReadOnlyRecoveryV3Executor({ operationInstance = G2B_GENERATION_BOUND_RECOVERY_V3_OPERATION_INSTANCE } = {}) {
  const delegate = createG2BGenerationBoundReadOnlyRecoveryV2Executor({ operationInstance });
  return Object.freeze({
    async execute({ transport, ...request } = {}) {
      if (typeof transport?.readGenerationBoundRecoveryPolicy !== "function") {
        return Object.freeze({ ok: false, code: "RECOVERY_V3_BOUNDARY_REQUIRED", recoveryResult: "RECOVERY_NOT_ESTABLISHED", counters: Object.freeze({ recoveryServiceAccountIamPolicyReads: 0, totalPhysicalRemoteRecoveryCalls: 0 }) });
      }
      return delegate.execute({ ...request, readPolicy: (readRequest) => transport.readGenerationBoundRecoveryPolicy(readRequest) });
    },
    snapshot: () => delegate.snapshot(),
  });
}

export function writeG2BGenerationBoundReadOnlyRecoveryV3(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("generation-bound-recovery-v3-not-ready");
  const paths = {};
  for (const [key, relative] of Object.entries(OUTPUTS)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("generation-bound-recovery-v3-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = relative;
  }
  return Object.freeze({ paths: Object.freeze(paths), sourceLockManifestSha256: sha256Canonical(value.sourceLockManifest), implementationAttestationSha256: sha256Canonical(value.implementation), runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(value.prospectiveSafetyEvidence), executionCompositeSha256: sha256Canonical(value.executionComposite), approvalPacketSha256: sha256Canonical(value.approvalPacket), approvalPacketRawSha256: createHash("sha256").update(readFileSync(resolve(repositoryRoot, OUTPUTS.approvalPacket))).digest("hex") });
}

export const G2B_GENERATION_BOUND_RECOVERY_V3_CONTRACT = Object.freeze({
  remoteTargetUnchanged: true,
  httpMethodUnchanged: true,
  iamEndpointUnchanged: true,
  authCredentialRecordSelectionUnchanged: true,
  authContextUnchanged: true,
  implicitRefreshBehaviorUnchanged: true,
  automaticRetryBehaviorUnchanged: true,
  remoteCallMaxUnchanged: true,
  anchorHmacSemanticsUnchanged: true,
  presentAbsentClassificationSemanticsUnchanged: true,
  onlyLocalObservabilityAdapterEvidenceSemanticsChanged: true,
  transportContract: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.id || "g2b-explicit-direct-set-iam-policy-cached-credential-v2",
});
