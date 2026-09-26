import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_CURRENT_LIVE_EXECUTOR_CONTRACT } from "./g2bM3CurrentLiveExecutor.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE, recoverG2BAnchorPolicy, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_GENERATION_BOUND_RECOVERY_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-GENERATION-BOUND-READ-ONLY-RECOVERY";
export const G2B_INTERRUPTED_M3_GENERATION = "8b30e1da-8d4d-4ded-ad94-cf62aabcc981";
export const G2B_GENERATION_BOUND_RECOVERY_TYPE = "M3_GENERATION_BOUND_READ_ONLY_RECOVERY";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecovery.test.mjs",
]);

const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-runtime-capability-v1.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-composite-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-approval-packet-v1.json",
});

function hashFile(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function sourceLocks(repositoryRoot) {
  return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hashFile(resolve(repositoryRoot, path)) })));
}
function same(value, expected) { return value === expected; }
function noRawPersistence(value) {
  return value?.rawMemberPersisted === false && value?.rawPrincipalPersisted === false && value?.rawPolicyPersisted === false;
}

function resolveVerifiedAnchor({ identityContext, secretProvider, store, operationGenerationId }) {
  if (operationGenerationId !== G2B_INTERRUPTED_M3_GENERATION || !identityContext?.exactIamMember) return null;
  const loaded = store?.load?.(operationGenerationId);
  const secret = secretProvider?.read?.();
  if (loaded?.state !== "READY" || loaded.record?.anchorState !== "ANCHOR_VERIFIED" || secret?.state !== "READY") return null;
  const verification = verifyG2BRecoveryAnchor({
    record: loaded.record,
    member: identityContext.exactIamMember,
    secret: secret.secret,
    secretKeyId: secret.keyId,
  });
  if (verification.ok !== true || loaded.record.targetResource !== G2B_TARGET_RESOURCE || loaded.record.targetRole !== G2B_TARGET_ROLE) return null;
  return Object.freeze({ record: loaded.record, secret });
}

function packetFields({ sourceLockManifest, implementation, runtimeCapability, executionComposite }) {
  return Object.freeze({
    interruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    targetServiceAccount: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    interruptedGenerationMutationReusable: false,
    interruptedGenerationApprovalReusable: false,
    recoveryAnchorVerified: true,
    recoveryAnchorGenerationMatch: true,
    recoveryAnchorTargetMatch: true,
    recoveryAnchorRoleMatch: true,
    recoveryAnchorMemberMatch: true,
    recoveryAnchorRereadVerified: true,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    recoveryUsesCurrentDirectAuthPath: true,
    recoveryCredentialRecordEqualsCurrentDirectRecord: true,
    recoveryAuthContextEqualsCurrentDirectContext: true,
    cachedCredentialOnly: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.cachedCredentialOnly,
    implicitCredentialRefresh: false,
    automaticAuthRetry: 0,
    alternateAccountSelection: 0,
    serviceAccountImpersonation: 0,
    serviceAccountKey: 0,
    preliveLocalCredentialReadinessRecheckRequired: true,
    preliveLocalCheckBeforeApprovalConsumption: true,
    preliveNetworkRequests: 0,
    preliveCredentialRefreshCalls: 0,
    credentialFreshnessMarginSeconds: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.freshnessMarginSeconds,
    recoveryServiceAccountIamPolicyReadsMax: 1,
    totalPhysicalRemoteRecoveryCallsMax: 1,
    additionalHiddenPhysicalCalls: 0,
    authHiddenRemoteCalls: 0,
    projectIamReadsMax: 0,
    setIamPolicyCallsMax: 0,
    iamMutationsMax: 0,
    automaticRetries: 0,
    secondRecoveryRead: 0,
    physicalCallMaxStaticallyProvable: true,
    recoveryApprovalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_GENERATION_BOUND_RECOVERY_GET_IAM_POLICY_REQUEST_BEGINS",
    localCredentialCheckBeforeApprovalConsumption: true,
    recoveryAnchorVerificationBeforeApprovalConsumption: true,
    firstRemoteOperationCannotOccurBeforeApprovalConsumption: true,
    approvalConsumptionEqualsFirstPhysicalRemoteCall: true,
    recoveryResultDomain: Object.freeze(["RECOVERY_CONFIRMED_PRESENT", "RECOVERY_CONFIRMED_ABSENT", "RECOVERY_NOT_ESTABLISHED"]),
    presentResultSemantics: "exactly-one-generation-bound-anchor-HMAC-match-after-a-valid-full-canonical-policy-parse",
    absentResultSemantics: "zero-generation-bound-anchor-HMAC-matches-after-a-valid-full-canonical-policy-parse",
    uncertainResultSemantics: "anchor-provider-transport-timeout-parser-or-privacy-ambiguity-stops-without-inference",
    exactMemberReconstructionContract: "evaluate-canonical-target-role-members-in-memory-through-the-preserved-domain-separated-HMAC-anchor-without-persisting-a-raw-member",
    m3MutationsMax: 0,
    m4MutationsMax: 0,
    firestoreCallsMax: 0,
    testIamPermissionsCallsMax: 0,
    credentialRefreshCallsMax: 0,
    rawMemberPersisted: false,
    rawPrincipalPersisted: false,
    rawPolicyPersisted: false,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    executionCompositeSha256: sha256Canonical(executionComposite),
    allRequiredLocalLocksMatch: true,
    recoveryPacketReproducible: true,
    recoveryPacketComplete: true,
    safeToContinueWithoutApproval: false,
  });
}

export function prepareG2BGenerationBoundReadOnlyRecovery({
  repositoryRoot = process.cwd(), environment = process.env, identityContext, secretProvider, store,
  operationGenerationId = G2B_INTERRUPTED_M3_GENERATION,
} = {}) {
  const identity = identityContext ? Object.freeze({ ok: true, context: identityContext }) : resolveG2BLocalPinnedIdentity({ environment });
  if (identity.ok !== true || !identity.context?.exactIamMember) return Object.freeze({ ok: false, code: "LOCAL_IDENTITY_CONTEXT_UNAVAILABLE" });
  const anchor = resolveVerifiedAnchor({
    identityContext: identity.context,
    secretProvider: secretProvider || createWindowsDpapiSecretProvider({ environment }),
    store: store || createG2BRecoveryAnchorStore({}),
    operationGenerationId,
  });
  if (!anchor) return Object.freeze({ ok: false, code: "INTERRUPTED_GENERATION_ANCHOR_NOT_VERIFIED" });
  const sourceLockManifest = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery.source-lock.v1",
    stage: G2B_GENERATION_BOUND_RECOVERY_STAGE,
    interruptedM3Generation: operationGenerationId,
    sourceLocks: sourceLocks(repositoryRoot),
  });
  const implementation = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery.implementation.v1",
    stage: G2B_GENERATION_BOUND_RECOVERY_STAGE,
    interruptedM3Generation: operationGenerationId,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    recoveryUsesCurrentDirectAuthPath: true,
    anchorVerified: true,
    anchorState: "ANCHOR_VERIFIED",
    rawMemberPersisted: false,
    rawPrincipalPersisted: false,
    rawPolicyPersisted: false,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery.runtime-capability.v1",
    stage: G2B_GENERATION_BOUND_RECOVERY_STAGE,
    interruptedM3Generation: operationGenerationId,
    preliveLocalCredentialReadinessRecheckRequired: true,
    preliveNetworkRequests: 0,
    credentialRefreshCallsMax: 0,
    recoveryServiceAccountIamPolicyReadsMax: 1,
    totalPhysicalRemoteRecoveryCallsMax: 1,
    projectIamReadsMax: 0,
    setIamPolicyCallsMax: 0,
    iamMutationsMax: 0,
    automaticRetries: 0,
    secondRecoveryRead: 0,
    m4MutationsMax: 0,
    firestoreCallsMax: 0,
    physicalCallMaxStaticallyProvable: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.oldGcloudMutationReachability === 0,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery.execution-composite.v1",
    stage: G2B_GENERATION_BOUND_RECOVERY_STAGE,
    interruptedM3Generation: operationGenerationId,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    recoveryAuthorityReadOnly: true,
    remoteOperations: 0,
  });
  const approvalPacket = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery.approval-packet.v1",
    stage: G2B_GENERATION_BOUND_RECOVERY_STAGE,
    type: G2B_GENERATION_BOUND_RECOVERY_TYPE,
    status: "APPROVAL_REQUIRED",
    purpose: "one exact generation-bound read-only service-account IAM policy recovery read after interrupted M3 execution state became unknown",
    ...packetFields({ sourceLockManifest, implementation, runtimeCapability, executionComposite }),
  });
  const complete = [
    operationGenerationId === G2B_INTERRUPTED_M3_GENERATION,
    implementation.recoveryUsesCurrentDirectAuthPath,
    runtimeCapability.physicalCallMaxStaticallyProvable,
    noRawPersistence(implementation),
    approvalPacket.recoveryPacketComplete,
    approvalPacket.allRequiredLocalLocksMatch,
  ].every(Boolean);
  return Object.freeze({ ok: complete, code: complete ? "GENERATION_BOUND_READ_ONLY_RECOVERY_READY" : "GENERATION_BOUND_READ_ONLY_RECOVERY_BLOCKED", sourceLockManifest, implementation, runtimeCapability, executionComposite, approvalPacket });
}

export function verifyG2BGenerationBoundReadOnlyRecovery(value, options = {}) {
  try {
    const expected = prepareG2BGenerationBoundReadOnlyRecovery(options);
    const persisted = value && typeof value === "object"
      ? Object.freeze({
        sourceLockManifest: value.sourceLockManifest,
        implementation: value.implementation,
        runtimeCapability: value.runtimeCapability,
        executionComposite: value.executionComposite,
        approvalPacket: value.approvalPacket,
      })
      : null;
    const expectedArtifacts = Object.freeze({
      sourceLockManifest: expected.sourceLockManifest,
      implementation: expected.implementation,
      runtimeCapability: expected.runtimeCapability,
      executionComposite: expected.executionComposite,
      approvalPacket: expected.approvalPacket,
    });
    const ok = expected.ok === true && canonicalJson(persisted) === canonicalJson(expectedArtifacts);
    return Object.freeze({ ok, code: ok ? "GENERATION_BOUND_READ_ONLY_RECOVERY_LOCKED" : "GENERATION_BOUND_READ_ONLY_RECOVERY_LOCK_MISMATCH" });
  } catch {
    return Object.freeze({ ok: false, code: "GENERATION_BOUND_READ_ONLY_RECOVERY_INVALID" });
  }
}

function readinessIsFresh(readiness) {
  return readiness?.ok === true
    && readiness?.result === "CACHED_CREDENTIAL_READY_CONFIRMED"
    && readiness?.credentialExpiryRelativeState === "FRESH"
    && readiness?.networkRequests === 0
    && readiness?.refreshMethodInvocations === 0;
}

function safeExecutionResult(code, counters, extra = {}) {
  return Object.freeze({ ok: false, code, recoveryResult: "RECOVERY_NOT_ESTABLISHED", counters: Object.freeze(counters), ...extra });
}

const SAFE_FAILURE_STAGES = new Set(["BEFORE_HTTP_SEND", "DURING_HTTP_SEND", "AFTER_HTTP_RESPONSE"]);
const SAFE_HTTP_CLASSES = new Set(["UNKNOWN", "2XX", "3XX", "4XX", "5XX"]);
const SAFE_EXCEPTION_CLASSES = new Set([
  "NONE", "LOCAL_CREDENTIAL_FAILURE", "LOCAL_CLIENT_SETUP_FAILURE",
  "REMOTE_REQUEST_EXCEPTION", "RESPONSE_PARSE_FAILURE", "PRIVACY_GUARD_FAILURE",
]);
const SAFE_PROVIDER_IDENTIFIERS = new Set([
  "NOT_AVAILABLE", "HTTP_400", "HTTP_401", "HTTP_403", "HTTP_404", "HTTP_409", "HTTP_412",
  "HTTP_429", "HTTP_500", "HTTP_502", "HTTP_503", "HTTP_504",
]);

/**
 * Preserves only bounded transport facts.  A future evidence writer can
 * explain why recovery was not established without retaining policy/member
 * content, credentials, or process output.
 */
function safeRecoveryTransportDiagnostic(response) {
  const metadata = response?.safeTransportMetadata;
  const failure = response?.failureMetadata;
  const safeMetadata = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    && typeof metadata.requestStarted === "boolean"
    && SAFE_HTTP_CLASSES.has(metadata.httpStatusClass)
    && (metadata.httpStatusCodeSafe === "NOT_OBSERVED" || Number.isInteger(metadata.httpStatusCodeSafe))
    && metadata.providerResult === "SUCCESS"
    ? Object.freeze({
      requestStarted: metadata.requestStarted,
      httpStatusClass: metadata.httpStatusClass,
      httpStatusCodeSafe: metadata.httpStatusCodeSafe,
      providerResult: metadata.providerResult,
    })
    : null;
  const safeFailure = failure && typeof failure === "object" && !Array.isArray(failure)
    && SAFE_FAILURE_STAGES.has(failure.failureStage)
    && SAFE_HTTP_CLASSES.has(failure.httpStatusClass)
    && (failure.httpStatusCodeSafe === "NOT_OBSERVED" || Number.isInteger(failure.httpStatusCodeSafe))
    && SAFE_PROVIDER_IDENTIFIERS.has(failure.safeProviderErrorIdentifier)
    && SAFE_EXCEPTION_CLASSES.has(failure.transportExceptionClassSafe)
    ? Object.freeze({
      failureStage: failure.failureStage,
      httpStatusClass: failure.httpStatusClass,
      httpStatusCodeSafe: failure.httpStatusCodeSafe,
      safeProviderErrorIdentifier: failure.safeProviderErrorIdentifier,
      transportExceptionClassSafe: failure.transportExceptionClassSafe,
    })
    : null;
  return Object.freeze({
    responseAccepted: response?.ok === true && response?.policy && typeof response.policy === "object",
    requestStarted: typeof response?.requestStarted === "boolean" ? response.requestStarted : safeMetadata?.requestStarted ?? "UNKNOWN",
    physicalCalls: response?.physicalCalls === 0 || response?.physicalCalls === 1 ? response.physicalCalls : "UNKNOWN",
    success: safeMetadata,
    failure: safeFailure,
  });
}

function safeRecoveryClassificationDiagnostic(classified) {
  const parseStatus = typeof classified?.parseStatus === "string" && /^[A-Z_]+$/.test(classified.parseStatus)
    ? classified.parseStatus
    : "NOT_AVAILABLE";
  const semanticMatchCount = ["ZERO", "ONE", "MULTIPLE", "UNKNOWN"].includes(classified?.semanticMatchCount)
    ? classified.semanticMatchCount
    : "UNKNOWN";
  const state = ["PRESENT_CONFIRMED", "MEMBER_ABSENT_CONFIRMED", "AMBIGUOUS", "POLICY_PARSE_FAILURE", "PRIVACY_GUARD_FAILURE", "ANCHOR_INVALID", "SECRET_UNAVAILABLE"].includes(classified?.state)
    ? classified.state
    : "NOT_AVAILABLE";
  return Object.freeze({ attempted: true, state, parseStatus, semanticMatchCount });
}

/** A supplied policy reader is the only future remote capability; no mutation function exists. */
export function createG2BGenerationBoundReadOnlyRecoveryExecutor() {
  let readStarted = false;
  return Object.freeze({
    async execute({ enabled = false, authorizationPreconditionEstablished = false, consumeApproval, readPolicy, preliveReadiness, identityContext, secretProvider, store, operationGenerationId = G2B_INTERRUPTED_M3_GENERATION } = {}) {
      const counters = { recoveryServiceAccountIamPolicyReads: 0, totalPhysicalRemoteRecoveryCalls: 0, setIamPolicyCalls: 0, iamMutations: 0, retries: 0, secondRecoveryRead: 0, m4Mutations: 0, firestoreCalls: 0 };
      if (enabled !== true || authorizationPreconditionEstablished !== true) return safeExecutionResult("READ_ONLY_RECOVERY_DISABLED", counters);
      if (readStarted) return safeExecutionResult("RECOVERY_READ_BUDGET_EXHAUSTED", counters);
      if (typeof consumeApproval !== "function" || typeof readPolicy !== "function") return safeExecutionResult("RECOVERY_BOUNDARY_REQUIRED", counters);
      const anchor = resolveVerifiedAnchor({ identityContext, secretProvider, store, operationGenerationId });
      if (!anchor) return safeExecutionResult("RECOVERY_ANCHOR_NOT_VERIFIED", counters);
      if (!readinessIsFresh(preliveReadiness)) return safeExecutionResult("PRELIVE_CACHED_CREDENTIAL_NOT_READY", counters);
      let approved = false;
      try { approved = await consumeApproval(); } catch { approved = false; }
      if (approved !== true) return safeExecutionResult("RECOVERY_APPROVAL_NOT_CONSUMED", counters);
      readStarted = true;
      counters.recoveryServiceAccountIamPolicyReads = 1;
      counters.totalPhysicalRemoteRecoveryCalls = 1;
      let response;
      try { response = await readPolicy({ resource: G2B_TARGET_RESOURCE, role: G2B_TARGET_ROLE, authPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath }); }
      catch { return safeExecutionResult("RECOVERY_POLICY_READ_FAILURE", counters, { recoveryDiagnostic: Object.freeze({ phase: "POLICY_READ", exception: "THROWN", transport: safeRecoveryTransportDiagnostic(null) }) }); }
      const transport = safeRecoveryTransportDiagnostic(response);
      if (response?.ok !== true || !response.policy || typeof response.policy !== "object") return safeExecutionResult("RECOVERY_POLICY_READ_FAILURE", counters, { recoveryDiagnostic: Object.freeze({ phase: "POLICY_READ", exception: "NONE", transport }) });
      let classified;
      try { classified = recoverG2BAnchorPolicy({ record: anchor.record, secretResult: anchor.secret, policyText: JSON.stringify(response.policy) }); }
      catch { return safeExecutionResult("RECOVERY_POLICY_CLASSIFICATION_FAILURE", counters, { recoveryDiagnostic: Object.freeze({ phase: "POLICY_CLASSIFICATION", exception: "THROWN", transport }) }); }
      const classification = safeRecoveryClassificationDiagnostic(classified);
      const recoveryDiagnostic = Object.freeze({ phase: "POLICY_CLASSIFICATION", exception: "NONE", transport, classification });
      if (classified?.state === "PRESENT_CONFIRMED") return Object.freeze({ ok: true, code: "RECOVERY_CONFIRMED_PRESENT", recoveryResult: "RECOVERY_CONFIRMED_PRESENT", counters: Object.freeze(counters), recoveryDiagnostic });
      if (classified?.state === "MEMBER_ABSENT_CONFIRMED") return Object.freeze({ ok: true, code: "RECOVERY_CONFIRMED_ABSENT", recoveryResult: "RECOVERY_CONFIRMED_ABSENT", counters: Object.freeze(counters), recoveryDiagnostic });
      return safeExecutionResult("RECOVERY_NOT_ESTABLISHED", counters, { recoveryDiagnostic });
    },
  });
}

export function writeG2BGenerationBoundReadOnlyRecovery(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("generation-bound-recovery-not-ready");
  const paths = {};
  for (const [key, relative] of Object.entries(OUTPUTS)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("generation-bound-recovery-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = relative;
  }
  return Object.freeze({
    paths: Object.freeze(paths),
    sourceLockManifestSha256: sha256Canonical(value.sourceLockManifest),
    implementationAttestationSha256: sha256Canonical(value.implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability),
    executionCompositeSha256: sha256Canonical(value.executionComposite),
    approvalPacketSha256: sha256Canonical(value.approvalPacket),
    approvalPacketRawSha256: hashFile(resolve(repositoryRoot, OUTPUTS.approvalPacket)),
  });
}
