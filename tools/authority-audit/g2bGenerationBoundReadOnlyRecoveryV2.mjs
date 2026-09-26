import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE, recoverG2BAnchorPolicy, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { createG2BRecoveryExecutionJournal, G2B_RECOVERY_EXECUTION_JOURNAL_CONTRACT } from "./g2bRecoveryExecutionJournal.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";

export const G2B_GENERATION_BOUND_RECOVERY_V2_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-GENERATION-BOUND-READ-ONLY-RECOVERY-V2";
export const G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE = "883b57ff-9171-420b-b278-172e3d57fb86";
export const G2B_GENERATION_BOUND_RECOVERY_V2_TYPE = "M3_GENERATION_BOUND_READ_ONLY_RECOVERY_V2";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV2.test.mjs",
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v2-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v2-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v2-runtime-v1.json",
  prospectiveSafetyEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v2-prospective-safety-v1.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v2-composite-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v2-approval-packet-v1.json",
});
const safeHash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const HTTP_CLASSES = new Set(["UNKNOWN", "2XX", "3XX", "4XX", "5XX"]);
const SAFE_FAILURE_STAGES = new Set(["BEFORE_HTTP_SEND", "DURING_HTTP_SEND", "AFTER_HTTP_RESPONSE"]);
const SAFE_EXCEPTION_CLASSES = new Set(["NONE", "LOCAL_CREDENTIAL_FAILURE", "LOCAL_CLIENT_SETUP_FAILURE", "REMOTE_REQUEST_EXCEPTION", "RESPONSE_PARSE_FAILURE", "PRIVACY_GUARD_FAILURE"]);
const SAFE_PROVIDER_IDENTIFIERS = new Set(["NOT_AVAILABLE", "HTTP_200", "HTTP_400", "HTTP_401", "HTTP_403", "HTTP_404", "HTTP_409", "HTTP_412", "HTTP_429", "HTTP_500", "HTTP_502", "HTTP_503", "HTTP_504"]);
const ACCOUNT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MEMBER = /^(?:user|serviceAccount):[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sourceLocks(repositoryRoot) {
  return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: safeHash(resolve(repositoryRoot, path)) })));
}

function fresh(readiness) {
  return readiness?.ok === true && readiness?.result === "CACHED_CREDENTIAL_READY_CONFIRMED"
    && readiness?.credentialExpiryRelativeState === "FRESH" && readiness?.networkRequests === 0
    && readiness?.refreshMethodInvocations === 0 && readiness?.freshnessMarginSeconds === 120;
}

function verifiedAnchor({ identityContext, secretProvider, store }) {
  const loaded = store?.load?.(G2B_INTERRUPTED_M3_GENERATION);
  const secret = secretProvider?.read?.();
  if (loaded?.state !== "READY" || loaded.record?.anchorState !== "ANCHOR_VERIFIED" || secret?.state !== "READY") return null;
  const verification = verifyG2BRecoveryAnchor({ record: loaded.record, member: identityContext?.exactIamMember, secret: secret.secret, secretKeyId: secret.keyId });
  return verification.ok === true && loaded.record.targetResource === G2B_TARGET_RESOURCE && loaded.record.targetRole === G2B_TARGET_ROLE
    ? Object.freeze({ record: loaded.record, secret })
    : null;
}

function safeTransport(response) {
  const success = response?.safeTransportMetadata;
  const failure = response?.failureMetadata;
  if (response?.ok === true && response?.policy && typeof response.policy === "object"
    && success?.requestStarted === true && success?.providerResult === "SUCCESS"
    && HTTP_CLASSES.has(success?.httpStatusClass) && Number.isInteger(success?.httpStatusCodeSafe)) {
    return Object.freeze({ responseObserved: true, httpStatusClass: success.httpStatusClass, transportResult: "SUCCESS" });
  }
  if (failure && SAFE_FAILURE_STAGES.has(failure.failureStage) && HTTP_CLASSES.has(failure.httpStatusClass)
    && SAFE_PROVIDER_IDENTIFIERS.has(failure.safeProviderErrorIdentifier)
    && SAFE_EXCEPTION_CLASSES.has(failure.transportExceptionClassSafe)) {
    const transportResult = failure.transportExceptionClassSafe === "REMOTE_REQUEST_EXCEPTION"
      ? failure.httpStatusClass === "UNKNOWN" ? "TRANSPORT_FAILURE" : "PROVIDER_FAILURE"
      : "LOCAL_FAILURE";
    return Object.freeze({ responseObserved: failure.failureStage === "AFTER_HTTP_RESPONSE", httpStatusClass: failure.httpStatusClass, transportResult });
  }
  if (["TRANSPORT_TIMEOUT", "PROCESS_INTERRUPTION", "OTHER_FAILURE"].includes(response?.safeTransportResult)) {
    return Object.freeze({ responseObserved: false, httpStatusClass: "UNKNOWN", transportResult: response.safeTransportResult });
  }
  return Object.freeze({ responseObserved: false, httpStatusClass: "UNKNOWN", transportResult: "LOCAL_FAILURE" });
}

function parseResult(classified) {
  if (classified?.state === "POLICY_PARSE_FAILURE") return "MALFORMED";
  return classified?.ok === true ? "SUCCESS" : "UNEXPECTED_SHAPE";
}

function result({ code, recoveryResult, journal, counters }) {
  return Object.freeze({ ok: recoveryResult !== "RECOVERY_NOT_ESTABLISHED", code, recoveryResult, journal: journal?.record || null, counters: Object.freeze(counters) });
}

function advance(journal, operationInstance, patch) {
  const transitioned = journal.transition(operationInstance, patch);
  return transitioned.ok ? transitioned : null;
}

// V3R2 passes this transient context through every layer. It is never written
// to a journal or artifact; only its already-verified anchor is persisted.
function resolveExecutionContext({ recoveryContext, identityContext, secretProvider, store, operationInstance, strict }) {
  const legacyMember = identityContext?.exactIamMember;
  const legacyAccount = identityContext?.exactPrincipal || (typeof legacyMember === "string" ? legacyMember.replace(/^(?:user|serviceAccount):/, "") : undefined);
  const fallback = recoveryContext || {
    identityContext,
    secretProvider,
    store,
    account: legacyAccount,
    member: legacyMember,
    authContextId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    operationInstance,
    parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
  };
  if ((strict && !recoveryContext) || !fallback || typeof fallback !== "object"
    || fallback.operationInstance !== operationInstance
    || fallback.parentInterruptedM3Generation !== G2B_INTERRUPTED_M3_GENERATION
    || fallback.targetResource !== G2B_TARGET_RESOURCE || fallback.targetRole !== G2B_TARGET_ROLE
    || fallback.authContextId !== G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath
    || !ACCOUNT.test(fallback.account || "") || !MEMBER.test(fallback.member || "")
    || (strict && fallback.identityContext?.exactPrincipal !== fallback.account)
    || (!strict && fallback.identityContext?.exactPrincipal && fallback.identityContext.exactPrincipal !== fallback.account)
    || fallback.identityContext?.exactIamMember !== fallback.member
    || !fallback.secretProvider || typeof fallback.secretProvider.read !== "function"
    || !fallback.store || typeof fallback.store.load !== "function") return null;
  return fallback;
}

export function prepareG2BGenerationBoundReadOnlyRecoveryV2({ repositoryRoot = process.cwd(), environment = process.env, identityContext, secretProvider, store } = {}) {
  const identity = identityContext ? Object.freeze({ ok: true, context: identityContext }) : resolveG2BLocalPinnedIdentity({ environment });
  const anchor = identity.ok === true ? verifiedAnchor({ identityContext: identity.context, secretProvider: secretProvider || createWindowsDpapiSecretProvider({ environment }), store: store || createG2BRecoveryAnchorStore({}) }) : null;
  if (!anchor) return Object.freeze({ ok: false, code: "RECOVERY_V2_ANCHOR_NOT_VERIFIED" });
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.generation-bound-recovery-v2.source-lock.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V2_STAGE, sourceLocks: sourceLocks(repositoryRoot) });
  const implementation = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v2.implementation.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V2_STAGE,
    operationInstance: G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    method: "GET", iamEndpoint: "serviceAccounts.getIamPolicy", cachedCredentialOnly: true, implicitCredentialRefresh: false,
    automaticAuthRetry: 0, alternateAccountSelection: 0, serviceAccountImpersonation: 0, serviceAccountKey: 0,
    recoveryAnchorVerified: true, recoveryAnchorState: "ANCHOR_VERIFIED", rawPolicyPersisted: false, rawMemberPersisted: false,
    rawPrincipalPersisted: false, rawCredentialPersisted: false, rawTokenPersisted: false,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v2.runtime-capability.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V2_STAGE,
    recoveryServiceAccountIamPolicyReadsMax: 1, totalPhysicalRemoteRecoveryCallsMax: 1, projectIamReadsMax: 0,
    setIamPolicyCallsMax: 0, iamMutationsMax: 0, additionalHiddenPhysicalCalls: 0, authHiddenRemoteCalls: 0,
    automaticRetries: 0, secondRecoveryRead: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0,
    preliveLocalCredentialReadinessRecheckRequired: true, preliveNetworkRequests: 0, preliveCredentialRefreshCalls: 0,
  });
  const prospectiveSafetyEvidence = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v2.prospective-safety.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V2_STAGE,
    journalSchema: G2B_RECOVERY_EXECUTION_JOURNAL_CONTRACT, operationInstancePersistedBeforeRemoteBoundary: true,
    approvalConsumptionPersistedAtRemoteBoundary: true, requestStartPersistedAtRemoteBoundary: true,
    responseObservedPersistedWhenAvailable: true, httpStatusClassPersistedWhenAvailable: true,
    transportResultPersistedWhenAvailable: true, responseParseResultPersistedWhenAvailable: true,
    targetRoleEvaluationResultPersistedWhenAvailable: true, anchorComparisonResultPersistedWhenAvailable: true,
    classifierInputCompletenessPersisted: true, terminalRecoveryResultPersisted: true,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v2.execution-composite.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V2_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence),
    remoteOperations: 0, mutationReachable: false,
  });
  const approvalPacket = Object.freeze({
    schema: "myweb.g2b.generation-bound-recovery-v2.approval-packet.v1", stage: G2B_GENERATION_BOUND_RECOVERY_V2_STAGE,
    type: G2B_GENERATION_BOUND_RECOVERY_V2_TYPE, status: "APPROVAL_REQUIRED",
    purpose: "one fresh, separately approved, generation-bound read-only service-account IAM policy recovery read with durable privacy-safe interruption journaling",
    operationInstance: G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    firstRecoveryOperationReused: false, firstRecoveryApprovalReused: false, firstRecoveryRemoteCallReplayed: false,
    targetServiceAccount: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, existingVerifiedGenerationBoundRecoveryAnchor: true,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    recoveryCredentialRecordEqualsCurrentDirectRecord: true, recoveryAuthContextEqualsCurrentDirectContext: true,
    cachedCredentialOnly: true, implicitCredentialRefresh: false, automaticAuthRetry: 0, alternateAccountSelection: 0,
    serviceAccountImpersonation: 0, serviceAccountKey: 0, credentialFreshnessMarginSeconds: 120,
    recoveryServiceAccountIamPolicyReadsMax: 1, totalPhysicalRemoteRecoveryCallsMax: 1, projectIamReadsMax: 0,
    setIamPolicyCallsMax: 0, iamMutationsMax: 0, additionalHiddenPhysicalCalls: 0, authHiddenRemoteCalls: 0,
    automaticRetries: 0, secondRecoveryRead: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0,
    approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_RECOVERY_GET_IAM_POLICY_REQUEST_BEGINS",
    preliveLocalCredentialReadinessRecheckRequired: true, preliveLocalCheckBeforeApprovalConsumption: true,
    interruptionStateRereadSupported: true, resultDomain: Object.freeze(["RECOVERY_CONFIRMED_PRESENT", "RECOVERY_CONFIRMED_ABSENT", "RECOVERY_NOT_ESTABLISHED"]),
    rawPolicyPersisted: false, rawMemberPersisted: false, rawPrincipalPersisted: false, rawCredentialPersisted: false, rawTokenPersisted: false,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence),
    executionCompositeSha256: sha256Canonical(executionComposite), allRequiredLocalLocksMatch: true, recoveryPacketReproducible: true,
    recoveryPacketComplete: true, safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ ok: true, code: "GENERATION_BOUND_READ_ONLY_RECOVERY_V2_READY", sourceLockManifest, implementation, runtimeCapability, prospectiveSafetyEvidence, executionComposite, approvalPacket });
}

export function verifyG2BGenerationBoundReadOnlyRecoveryV2(value, options = {}) {
  try {
    const expected = prepareG2BGenerationBoundReadOnlyRecoveryV2(options);
    const actual = Object.freeze({ sourceLockManifest: value?.sourceLockManifest, implementation: value?.implementation, runtimeCapability: value?.runtimeCapability, prospectiveSafetyEvidence: value?.prospectiveSafetyEvidence, executionComposite: value?.executionComposite, approvalPacket: value?.approvalPacket });
    const canonical = Object.freeze({ sourceLockManifest: expected.sourceLockManifest, implementation: expected.implementation, runtimeCapability: expected.runtimeCapability, prospectiveSafetyEvidence: expected.prospectiveSafetyEvidence, executionComposite: expected.executionComposite, approvalPacket: expected.approvalPacket });
    return Object.freeze({ ok: expected.ok === true && canonicalJson(actual) === canonicalJson(canonical) });
  } catch { return Object.freeze({ ok: false }); }
}

/** The V2 executor has one injected read capability and no mutation, retry, refresh, or M4 path. */
export function createG2BGenerationBoundReadOnlyRecoveryV2Executor({ operationInstance = G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE, requireRecoveryContext = false } = {}) {
  let used = false;
  return Object.freeze({
    async execute({ enabled = false, authorizationPreconditionEstablished = false, consumeApproval, readPolicy, preliveReadiness, identityContext, secretProvider, store, recoveryContext, journal = createG2BRecoveryExecutionJournal() } = {}) {
      const counters = { recoveryServiceAccountIamPolicyReads: 0, totalPhysicalRemoteRecoveryCalls: 0, projectIamReads: 0, setIamPolicyCalls: 0, iamMutations: 0, retries: 0, secondRecoveryRead: 0, m4Mutations: 0, firestoreCalls: 0, credentialRefreshCalls: 0 };
      if (enabled !== true || authorizationPreconditionEstablished !== true || used || typeof consumeApproval !== "function" || typeof readPolicy !== "function") return result({ code: "RECOVERY_V2_BOUNDARY_REQUIRED", recoveryResult: "RECOVERY_NOT_ESTABLISHED", counters });
      const context = resolveExecutionContext({ recoveryContext, identityContext, secretProvider, store, operationInstance, strict: requireRecoveryContext });
      if (!context) return result({ code: "RECOVERY_V2_CONTEXT_INVALID", recoveryResult: "RECOVERY_NOT_ESTABLISHED", counters });
      const anchor = verifiedAnchor(context);
      if (!anchor || !fresh(preliveReadiness)) return result({ code: anchor ? "RECOVERY_V2_PRELIVE_CREDENTIAL_NOT_READY" : "RECOVERY_V2_ANCHOR_NOT_VERIFIED", recoveryResult: "RECOVERY_NOT_ESTABLISHED", counters });
      const prepared = journal.initialize(operationInstance);
      if (!prepared.ok || prepared.record.phase !== "PREPARED") return result({ code: "RECOVERY_V2_JOURNAL_NOT_PREPARED", recoveryResult: "RECOVERY_NOT_ESTABLISHED", counters });
      let approved = false;
      try { approved = await consumeApproval(); } catch { approved = false; }
      if (approved !== true) return result({ code: "RECOVERY_V2_APPROVAL_NOT_CONSUMED", recoveryResult: "RECOVERY_NOT_ESTABLISHED", journal: prepared, counters });
      let state = advance(journal, operationInstance, { phase: "APPROVAL_CONSUMED", approvalConsumed: true });
      if (!state) return result({ code: "RECOVERY_V2_APPROVAL_JOURNAL_FAILURE", recoveryResult: "RECOVERY_NOT_ESTABLISHED", counters });
      state = advance(journal, operationInstance, { phase: "REQUEST_STARTED_RESPONSE_UNKNOWN", requestBoundaryEntered: true, transportResult: "RESPONSE_UNKNOWN" });
      if (!state) return result({ code: "RECOVERY_V2_REQUEST_JOURNAL_FAILURE", recoveryResult: "RECOVERY_NOT_ESTABLISHED", journal: journal.load(operationInstance), counters });
      used = true;
      counters.recoveryServiceAccountIamPolicyReads = 1;
      counters.totalPhysicalRemoteRecoveryCalls = 1;
      let response;
      try { response = await readPolicy({ resource: G2B_TARGET_RESOURCE, role: G2B_TARGET_ROLE, authPathId: context.authContextId, account: context.account, member: context.member }); }
      catch { response = null; }
      const transport = safeTransport(response);
      if (response?.ok !== true || !response.policy || typeof response.policy !== "object") {
        state = advance(journal, operationInstance, { phase: "PROVIDER_FAILURE_OBSERVED", responseObserved: transport.responseObserved, httpStatusClass: transport.httpStatusClass, transportResult: transport.transportResult });
        if (!state) return result({ code: "RECOVERY_V2_RESPONSE_JOURNAL_FAILURE", recoveryResult: "RECOVERY_NOT_ESTABLISHED", journal: journal.load(operationInstance), counters });
        state = advance(journal, operationInstance, { phase: "TERMINAL_CLASSIFICATION_COMPLETE", terminalRecoveryResult: "RECOVERY_NOT_ESTABLISHED" });
        return result({ code: "RECOVERY_V2_POLICY_READ_FAILURE", recoveryResult: "RECOVERY_NOT_ESTABLISHED", journal: state || journal.load(operationInstance), counters });
      }
      state = advance(journal, operationInstance, { phase: "RESPONSE_OBSERVED_PARSE_PENDING", responseObserved: true, httpStatusClass: transport.httpStatusClass, transportResult: transport.transportResult, responseParseResult: "PENDING" });
      if (!state) return result({ code: "RECOVERY_V2_RESPONSE_JOURNAL_FAILURE", recoveryResult: "RECOVERY_NOT_ESTABLISHED", journal: journal.load(operationInstance), counters });
      let classified;
      try { classified = recoverG2BAnchorPolicy({ record: anchor.record, secretResult: anchor.secret, policyText: JSON.stringify(response.policy) }); }
      catch { classified = null; }
      const parsed = parseResult(classified);
      if (parsed !== "SUCCESS") {
        state = advance(journal, operationInstance, { phase: "PARSE_FAILED", responseParseResult: parsed });
        if (state) state = advance(journal, operationInstance, { phase: "TERMINAL_CLASSIFICATION_COMPLETE", terminalRecoveryResult: "RECOVERY_NOT_ESTABLISHED" });
        return result({ code: "RECOVERY_V2_POLICY_PARSE_FAILURE", recoveryResult: "RECOVERY_NOT_ESTABLISHED", journal: state || journal.load(operationInstance), counters });
      }
      state = advance(journal, operationInstance, { phase: "ANCHOR_COMPARISON_PENDING", responseParseResult: "SUCCESS", targetRoleEvaluationResult: "PENDING", anchorComparisonResult: "PENDING" });
      if (!state) return result({ code: "RECOVERY_V2_CLASSIFIER_JOURNAL_FAILURE", recoveryResult: "RECOVERY_NOT_ESTABLISHED", journal: journal.load(operationInstance), counters });
      const semantic = classified.semanticMatchCount;
      const terminal = classified.state === "PRESENT_CONFIRMED" ? "RECOVERY_CONFIRMED_PRESENT" : classified.state === "MEMBER_ABSENT_CONFIRMED" ? "RECOVERY_CONFIRMED_ABSENT" : "RECOVERY_NOT_ESTABLISHED";
      const targetRoleEvaluationResult = semantic === "ONE" ? "ROLE_PRESENT" : semantic === "ZERO" ? "ROLE_ABSENT" : "AMBIGUOUS";
      const anchorComparisonResult = semantic === "ONE" ? "MATCH_PRESENT" : semantic === "ZERO" ? "NO_MATCH" : classified.state === "ANCHOR_INVALID" ? "INVALID" : "AMBIGUOUS";
      state = advance(journal, operationInstance, { phase: "ANCHOR_COMPARISON_COMPLETE", targetRoleEvaluationResult, anchorComparisonResult, classifierInputComplete: true });
      if (state) state = advance(journal, operationInstance, { phase: "TERMINAL_CLASSIFICATION_COMPLETE", terminalRecoveryResult: terminal });
      return result({ code: terminal, recoveryResult: terminal, journal: state || journal.load(operationInstance), counters });
    },
    snapshot: () => Object.freeze({ operationInstance, used }),
  });
}

export function writeG2BGenerationBoundReadOnlyRecoveryV2(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("generation-bound-recovery-v2-not-ready");
  const paths = {};
  for (const [key, relative] of Object.entries(OUTPUTS)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("generation-bound-recovery-v2-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = relative;
  }
  return Object.freeze({ paths: Object.freeze(paths), sourceLockManifestSha256: sha256Canonical(value.sourceLockManifest), implementationAttestationSha256: sha256Canonical(value.implementation), runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(value.prospectiveSafetyEvidence), executionCompositeSha256: sha256Canonical(value.executionComposite), approvalPacketSha256: sha256Canonical(value.approvalPacket), approvalPacketRawSha256: safeHash(resolve(repositoryRoot, OUTPUTS.approvalPacket)) });
}
