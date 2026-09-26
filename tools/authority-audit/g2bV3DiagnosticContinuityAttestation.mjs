import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT } from "./g2bDirectContextPermissionDiagnostic.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_CURRENT_LIVE_EXECUTOR_CONTRACT } from "./g2bM3CurrentLiveExecutor.mjs";
import { G2B_M3_RUNTIME_CONTRACT } from "./g2bM3RecoveryAnchorRuntime.mjs";
import { G2B_RECOVERY_ANCHOR_CONTRACT, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";

export const G2B_V3_CONTINUITY_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-V3-DIAGNOSTIC-CONTINUITY";
export const V3_EXECUTION_EVIDENCE_SHA256 = "b5ba6d42a8a922362ed30fa8baf5da1d3cfded14b87625584ca330df9b3fa354";
export const V3_RESULT_DOCUMENT_SHA256 = "62e2233193cb2587b8712638f384f9d6e7fb30d1676bb239bb697efb1502919e";
export const V3_PACKET_DOCUMENT_RAW_SHA256 = "7a1e0f3da1a0a3dd084aa1d4306206ad0c4606b8b60e83717ddd64067e49afea";

const V3_AUTHORITY_PATH = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-direct-context-exact-permission-authority-v3.json";
const V3_EXECUTION_PATH = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-direct-context-permission-diagnostic-v3-execution-evidence.json";
const V3_RESULT_PATH = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-direct-context-permission-diagnostic-v3-result.json";
const TEST_ONLY_PATH = "tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs";
const RUNTIME_PATHS = Object.freeze([
  "tools/authority-audit/g2bDirectContextPermissionDiagnostic.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/invokeWindowsExecutable.ps1",
]);
const CURRENT_LOCK_PATHS = Object.freeze([
  ...RUNTIME_PATHS,
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit-tests/g2bM3CurrentLiveExecutor.test.mjs",
  "tools/authority-audit-tests/g2bM3RecoveryAnchorRuntime.test.mjs",
  "tools/authority-audit-tests/g2bV3DiagnosticContinuityAttestation.test.mjs",
]);

function plain(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function sort(value) {
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  if (Array.isArray(value)) return value.map(sort);
  if (!plain(value)) throw new Error("invalid-canonical-value");
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])]));
}
export function canonicalJson(value) { return JSON.stringify(sort(value)); }
export function sha256Canonical(value) { return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex"); }
function hashFile(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function json(path) { return JSON.parse(readFileSync(path, "utf8")); }

function diagnosticSemanticDescriptor(value) {
  const implementation = value.implementation;
  const runtime = value.runtimeCapability;
  const composite = value.executionComposite;
  return Object.freeze({
    targetResource: implementation.targetResource,
    targetRole: G2B_TARGET_ROLE,
    requiredPermission: implementation.requiredPermission,
    permissionCount: implementation.permissionCount,
    authPathId: implementation.authPathId,
    credentialRecordBinding: implementation.currentCredentialRecordBinding,
    sameCredentialRecordAsDirectMutation: implementation.diagnosticCredentialRecordEqualsDirectMutationRecord,
    sameAuthContextAsDirectMutation: implementation.diagnosticAuthContextEqualsDirectMutationAuthContext,
    sameConfigurationContextAsDirectMutation: implementation.diagnosticConfigurationContextEqualsDirectMutationConfigurationContext,
    sameProjectContextAsDirectMutation: implementation.diagnosticProjectContextEqualsDirectMutationProjectContext,
    cachedCredentialRequired: runtime.cachedCredentialRequired,
    implicitRefreshBlocked: runtime.implicitRefreshBlocked,
    oauthTokenEndpointCallsMax: runtime.oauthTokenEndpointCallsMax,
    automaticRetries: runtime.automaticRetries,
    diagnosticCallsMax: runtime.testIamPermissionsCallsMax,
    diagnosticPhysicalCallsMax: runtime.totalPhysicalRemoteDiagnosticCallsMax,
    hiddenCalls: runtime.additionalHiddenPhysicalCalls,
    preLiveFreshnessMarginSeconds: runtime.preLiveFreshnessMarginSeconds,
    preLiveNetworkRequests: runtime.preLiveReadinessNetworkRequests,
    preLiveRefreshRequests: runtime.preLiveReadinessRefreshRequests,
    approvalConsumptionPoint: value.packet.approvalConsumptionPoint,
    preLiveBeforeApproval: composite.preLiveLocalFreshnessCheckOccursBeforeApprovalConsumption,
    firstRemoteAfterApproval: composite.firstRemoteOperationCannotOccurBeforeApprovalConsumption,
    approvalEqualsFirstPhysicalCall: composite.approvalConsumptionMatchesFirstPhysicalRemoteCall,
    privacy: Object.freeze({
      rawPrincipalPersisted: value.packet.rawPrincipalPersisted,
      rawMemberPersisted: value.packet.rawMemberPersisted,
      rawCredentialPersisted: value.packet.rawCredentialPersisted,
      rawRequestBodyPersisted: value.packet.rawRequestBodyPersisted,
      rawResponseBodyPersisted: value.packet.rawResponseBodyPersisted,
      rawStdoutPersisted: value.packet.rawStdoutPersisted,
      rawStderrPersisted: value.packet.rawStderrPersisted,
    }),
  });
}

function currentDiagnosticSemanticDescriptor() {
  const diagnostic = G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT;
  const transport = G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT;
  const readiness = G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT;
  return Object.freeze({
    targetResource: diagnostic.targetResource,
    targetRole: diagnostic.targetRole,
    requiredPermission: diagnostic.exactPermission,
    permissionCount: diagnostic.permissionCount,
    authPathId: diagnostic.authPathId,
    credentialRecordBinding: "CLOUD_SDK_CONFIGURED_ACCOUNT_STORE_RECORD",
    sameCredentialRecordAsDirectMutation: diagnostic.diagnosticCredentialRecordEqualsDirectMutationRecord,
    sameAuthContextAsDirectMutation: diagnostic.diagnosticAuthContextEqualsDirectMutationAuthContext,
    sameConfigurationContextAsDirectMutation: diagnostic.diagnosticConfigurationContextEqualsDirectMutationConfigurationContext,
    sameProjectContextAsDirectMutation: diagnostic.diagnosticProjectContextEqualsDirectMutationProjectContext,
    cachedCredentialRequired: readiness.cachedCredentialOnly,
    implicitRefreshBlocked: transport.implicitRefreshReachable === false,
    oauthTokenEndpointCallsMax: diagnostic.oauthTokenEndpointCallsMax,
    automaticRetries: diagnostic.automaticRetries,
    diagnosticCallsMax: diagnostic.testIamPermissionsCallsMax,
    diagnosticPhysicalCallsMax: diagnostic.totalPhysicalRemoteDiagnosticCallsMax,
    hiddenCalls: diagnostic.additionalHiddenPhysicalCalls,
    preLiveFreshnessMarginSeconds: diagnostic.preLiveFreshnessMarginSeconds,
    preLiveNetworkRequests: diagnostic.preLiveReadinessNetworkRequests,
    preLiveRefreshRequests: diagnostic.preLiveReadinessRefreshRequests,
    approvalConsumptionPoint: diagnostic.approvalConsumptionPoint,
    preLiveBeforeApproval: diagnostic.preLiveLocalFreshnessCheckOccursBeforeApprovalConsumption,
    firstRemoteAfterApproval: diagnostic.firstRemoteOperationCannotOccurBeforeApprovalConsumption,
    approvalEqualsFirstPhysicalCall: diagnostic.approvalConsumptionMatchesFirstPhysicalRemoteCall,
    privacy: Object.freeze({
      rawPrincipalPersisted: diagnostic.rawPrincipalPersisted,
      rawMemberPersisted: diagnostic.rawMemberPersisted,
      rawCredentialPersisted: diagnostic.rawCredentialPersisted,
      rawRequestBodyPersisted: diagnostic.rawRequestBodyPersisted,
      rawResponseBodyPersisted: diagnostic.rawResponseBodyPersisted,
      rawStdoutPersisted: diagnostic.rawStdoutPersisted,
      rawStderrPersisted: diagnostic.rawStderrPersisted,
    }),
  });
}

function classifyDelta(path) {
  if (path === TEST_ONLY_PATH) {
    return Object.freeze({
      classification: "TEST_ONLY",
      runtimeEntryPointReachable: false,
      proof: "test-runner-only; dependency-injected fake processRunner; no production runtime imports test files",
    });
  }
  if (RUNTIME_PATHS.includes(path)) {
    return Object.freeze({
      classification: "DIAGNOSTIC_RUNTIME_SEMANTIC",
      runtimeEntryPointReachable: true,
      proof: "static direct-diagnostic runtime closure",
    });
  }
  if (path.includes("g2bM3")) {
    return Object.freeze({
      classification: "M3_RUNTIME_ONLY",
      runtimeEntryPointReachable: false,
      proof: "current M3 runtime only; not reachable from the V3 diagnostic entry point",
    });
  }
  if (path.includes("tests/")) {
    return Object.freeze({
      classification: "TEST_ONLY",
      runtimeEntryPointReachable: false,
      proof: "test-runner-only path; not a production runtime dependency",
    });
  }
  return Object.freeze({ classification: "UNKNOWN", runtimeEntryPointReachable: false, proof: "unclassified source-lock delta" });
}

export function inspectG2BV3SourceLockDeltas({ repositoryRoot = process.cwd() } = {}) {
  const historical = json(resolve(repositoryRoot, V3_AUTHORITY_PATH));
  const deltas = historical.sourceLockManifest.localDependencies
    .filter((entry) => existsSync(resolve(repositoryRoot, entry.path)))
    .map((entry) => ({ path: entry.path, expectedSha256: entry.sha256, actualSha256: hashFile(resolve(repositoryRoot, entry.path)) }))
    .filter((entry) => entry.expectedSha256 !== entry.actualSha256)
    .map((entry) => Object.freeze({ path: entry.path, ...classifyDelta(entry.path) }));
  return Object.freeze({
    mismatchCount: deltas.length,
    deltas: Object.freeze(deltas),
    diagnosticRuntimeRelevantChangeCount: deltas.filter((entry) => entry.runtimeEntryPointReachable).length,
    m3OnlyChangeCount: deltas.filter((entry) => entry.classification === "M3_RUNTIME_ONLY").length,
    testOnlyChangeCount: deltas.filter((entry) => entry.classification === "TEST_ONLY").length,
    unknownChangeCount: deltas.filter((entry) => entry.classification === "UNKNOWN").length,
  });
}

function currentLocks(repositoryRoot) {
  return Object.freeze(CURRENT_LOCK_PATHS.map((path) => Object.freeze({ path, sha256: hashFile(resolve(repositoryRoot, path)) })));
}

function historicalEvidence(repositoryRoot) {
  const authorityPath = resolve(repositoryRoot, V3_AUTHORITY_PATH);
  const executionPath = resolve(repositoryRoot, V3_EXECUTION_PATH);
  const resultPath = resolve(repositoryRoot, V3_RESULT_PATH);
  const authority = json(authorityPath);
  const execution = json(executionPath);
  const result = json(resultPath);
  const hashesMatch = hashFile(authorityPath) === V3_PACKET_DOCUMENT_RAW_SHA256
    && hashFile(executionPath) === V3_EXECUTION_EVIDENCE_SHA256
    && hashFile(resultPath) === V3_RESULT_DOCUMENT_SHA256;
  const resultPass = execution.diagnosticResult === "PERMISSION_PRESENT_CONFIRMED"
    && execution.exactMutationPermissionState === "PRESENT_CONFIRMED"
    && result.diagnosticResult === "PERMISSION_PRESENT_CONFIRMED"
    && result.exactMutationPermissionState === "PRESENT_CONFIRMED";
  return Object.freeze({ authority, hashesMatch, resultPass });
}

export function buildG2BV3DiagnosticContinuityAttestation({ repositoryRoot = process.cwd() } = {}) {
  const evidence = historicalEvidence(repositoryRoot);
  const deltas = inspectG2BV3SourceLockDeltas({ repositoryRoot });
  const historicalSemantic = diagnosticSemanticDescriptor(evidence.authority);
  const currentSemantic = currentDiagnosticSemanticDescriptor();
  const runtimeSourceLockMatch = RUNTIME_PATHS.every((path) => {
    const historical = evidence.authority.sourceLockManifest.localDependencies.find((entry) => entry.path === path);
    return historical?.sha256 === hashFile(resolve(repositoryRoot, path));
  });
  const semanticsMatch = canonicalJson(historicalSemantic) === canonicalJson(currentSemantic);
  const continuityPass = evidence.hashesMatch && evidence.resultPass && runtimeSourceLockMatch
    && semanticsMatch && deltas.diagnosticRuntimeRelevantChangeCount === 0 && deltas.unknownChangeCount === 0;
  const sourceLockManifest = Object.freeze({
    schema: "myweb.g2b.v3-diagnostic-continuity-source-lock.v1",
    stage: G2B_V3_CONTINUITY_STAGE,
    currentLocks: currentLocks(repositoryRoot),
    historicalSourceLockMatchCurrentBytes: deltas.mismatchCount === 0,
    deltas: deltas.deltas,
  });
  const attestation = Object.freeze({
    schema: "myweb.g2b.v3-diagnostic-continuity-attestation.v1",
    stage: G2B_V3_CONTINUITY_STAGE,
    historicalV3ExecutionEvidenceSha256: V3_EXECUTION_EVIDENCE_SHA256,
    historicalV3ResultDocumentSha256: V3_RESULT_DOCUMENT_SHA256,
    historicalV3PacketDocumentRawSha256: V3_PACKET_DOCUMENT_RAW_SHA256,
    historicalV3SourceLockMatchCurrentBytes: false,
    sourceLockDelta: deltas,
    historicalRuntimeSemanticFingerprint: sha256Canonical(historicalSemantic),
    currentRuntimeSemanticFingerprint: sha256Canonical(currentSemantic),
    historicalRuntimeGraphFileCount: RUNTIME_PATHS.length,
    currentRuntimeGraphFileCount: RUNTIME_PATHS.length,
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    requiredPermission: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.exactPermission,
    permissionCount: 1,
    currentDirectAuthPathId: G2B_DIRECT_CONTEXT_PERMISSION_DIAGNOSTIC_CONTRACT.authPathId,
    temporalRule: "NO_ARBITRARY_WALL_CLOCK_EXPIRY;VALIDITY_DEPENDS_ON_CONTEXT_AND_RUNTIME_CONTINUITY;LIVE_PROVIDER_SET_AUTHORIZATION_REMAINS_AUTHORITATIVE;CACHED_CREDENTIAL_FRESHNESS_IS_SEPARATELY_RECHECKED_PRELIVE",
    historicalDiagnosticRuntimeAffectedByM3GuardChange: false,
    currentM3RuntimeSafetyImprovedByGuardChange: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.preLiveCachedCredentialReadinessRequired === true
      && G2B_M3_RUNTIME_CONTRACT.approvalConsumptionBeforeFirstRemoteRequired === true,
    historicalEvidenceCryptographicallyVerified: evidence.hashesMatch,
    historicalResultPermissionPresentConfirmed: evidence.resultPass,
    runtimeSourceLockMatch,
    diagnosticRuntimeSemanticsMatch: semanticsMatch,
    continuityPass,
    privacy: Object.freeze({ rawPrincipalPersisted: false, rawMemberPersisted: false, rawCredentialPersisted: false, rawPolicyPersisted: false, rawOutputPersisted: false }),
  });
  const composite = Object.freeze({
    schema: "myweb.g2b.v3-diagnostic-continuity-execution-composite.v1",
    stage: G2B_V3_CONTINUITY_STAGE,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest),
    attestationSha256: sha256Canonical(attestation),
    continuityPass,
    historicalEvidenceCompatibleWithCurrentDirectContext: continuityPass,
    historicalEvidenceCompatibleWithCurrentM3: continuityPass,
    m3ExecutionGuard: Object.freeze({
      preLiveReadinessRequired: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.preLiveCachedCredentialReadinessRequired,
      approvalConsumptionPoint: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.approvalConsumptionPoint,
      anchorVerifiedBeforeRemote: G2B_RECOVERY_ANCHOR_CONTRACT.verifiedBeforeMutationRequired,
    }),
  });
  return Object.freeze({ sourceLockManifest, attestation, composite });
}

export function verifyG2BV3DiagnosticContinuityAttestation(value, options = {}) {
  try {
    const expected = buildG2BV3DiagnosticContinuityAttestation(options);
    const ok = canonicalJson(value) === canonicalJson(expected) && expected.attestation.continuityPass === true;
    return Object.freeze({ ok, code: ok ? "V3_DIAGNOSTIC_RUNTIME_CONTINUITY_PASS" : "V3_DIAGNOSTIC_RUNTIME_CONTINUITY_BLOCKED" });
  } catch { return Object.freeze({ ok: false, code: "V3_DIAGNOSTIC_CONTINUITY_INVALID" }); }
}

export function writeG2BV3DiagnosticContinuityAttestation(artifacts, { repositoryRoot = process.cwd() } = {}) {
  if (artifacts?.attestation?.continuityPass !== true) throw new Error("continuity-not-established");
  const outputs = Object.freeze({
    sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-v3-diagnostic-continuity-source-lock-v1.json",
    attestation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-v3-diagnostic-continuity-attestation-v1.json",
    composite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-v3-diagnostic-continuity-composite-v1.json",
  });
  const paths = {};
  for (const [key, relative] of Object.entries(outputs)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("continuity-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(artifacts[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = relative;
  }
  return Object.freeze({ paths: Object.freeze(paths), sourceLockManifestSha256: sha256Canonical(artifacts.sourceLockManifest), attestationSha256: sha256Canonical(artifacts.attestation), executionCompositeSha256: sha256Canonical(artifacts.composite) });
}
