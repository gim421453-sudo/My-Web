import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT } from "./g2bExplicitSetIamPolicyAuthTransport.mjs";
import { G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT } from "./g2bExplicitSetIamPolicyTransport.mjs";
import { G2B_CURRENT_LIVE_EXECUTOR_CONTRACT } from "./g2bM3CurrentLiveExecutor.mjs";
import { G2B_M3_RUNTIME_CONTRACT } from "./g2bM3RecoveryAnchorRuntime.mjs";
import { G2B_LOCAL_PINNED_IDENTITY_RESOLVER_CONTRACT } from "./g2bLocalPinnedIdentityResolver.mjs";
import { G2B_RECOVERY_ANCHOR_CONTRACT, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { buildG2BV3DiagnosticContinuityAttestation, canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_REPAIRED_M3_REATTESTATION_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-REPAIRED-DIRECT-PROSPECTIVE-REATTESTATION";
const CONTINUITY_PATHS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-v3-diagnostic-continuity-source-lock-v1.json",
  attestation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-v3-diagnostic-continuity-attestation-v1.json",
  composite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-v3-diagnostic-continuity-composite-v1.json",
});
const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs",
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit-tests/g2bLocalPinnedIdentityResolver.test.mjs",
  "tools/authority-audit-tests/g2bM3CurrentLiveExecutor.test.mjs",
  "tools/authority-audit-tests/g2bM3RecoveryAnchorRuntime.test.mjs",
  "tools/authority-audit-tests/g2bV3DiagnosticContinuityAttestation.test.mjs",
]);

function hash(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function locks(repositoryRoot) { return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hash(resolve(repositoryRoot, path)) }))); }
function persistedContinuityMatches(repositoryRoot, expected) {
  return Object.entries(CONTINUITY_PATHS).every(([key, path]) => {
    const absolute = resolve(repositoryRoot, path);
    return existsSync(absolute) && canonicalJson(JSON.parse(readFileSync(absolute, "utf8"))) === canonicalJson(expected[key]);
  });
}

export function buildG2BRepairedM3ProspectiveSafetyReattestation({ repositoryRoot = process.cwd() } = {}) {
  const continuity = buildG2BV3DiagnosticContinuityAttestation({ repositoryRoot });
  // Historical V3 files are evidence, while the current byte-for-byte runtime
  // graph is verified by the continuity verifier. Do not require rewriting the
  // historical continuity artifacts after a M3-only safety improvement.
  const continuityCurrentAndPersisted = continuity.attestation.continuityPass === true;
  const sourceLocks = locks(repositoryRoot);
  const implementation = Object.freeze({
    schema: "myweb.g2b.repaired-m3.implementation-attestation.v1",
    stage: G2B_REPAIRED_M3_REATTESTATION_STAGE,
    continuityAttestationSha256: sha256Canonical(continuity.attestation),
    targetResource: G2B_TARGET_RESOURCE,
    targetRole: G2B_TARGET_ROLE,
    authorizationPrecondition: "V3_EXACT_DIRECT_CONTEXT_PERMISSION_PRESENT_WITH_CURRENT_RUNTIME_CONTINUITY",
    currentDirectTransport: "EXPLICIT_DIRECT_SET_IAM_POLICY_CACHED_CREDENTIAL",
    oldGcloudMutationReachability: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.oldGcloudMutationReachability,
    oldGcloudFallbackReachability: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.oldGcloudMutationFallbackReachability,
    localIdentity: G2B_LOCAL_PINNED_IDENTITY_RESOLVER_CONTRACT,
    privacy: Object.freeze({ rawPrincipalPersisted: false, rawMemberPersisted: false, rawCredentialPersisted: false, rawPolicyPersisted: false, rawOutputPersisted: false }),
    sourceLocks,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.repaired-m3.runtime-capability-attestation.v1",
    stage: G2B_REPAIRED_M3_REATTESTATION_STAGE,
    budgets: Object.freeze({
      localIdentityDiscoveryMax: 1,
      preLiveLocalCredentialReadinessMax: 1,
      preLiveNetworkCallsMax: 0,
      preLiveCredentialRefreshCallsMax: 0,
      freshPrestateWriterIamPolicyReadsMax: 1,
      directSetIamPolicyCallsMax: 1,
      poststateWriterIamPolicyReadsMax: 1,
      totalPhysicalProviderCallsMax: 3,
      retriesMax: 0,
      rollbacksMax: 0,
      secondMutationReachable: false,
      projectIamReadsMax: 0,
      testIamPermissionsCallsMax: 0,
      firestoreCallsMax: 0,
      tokenCallsMax: 0,
      m4MutationsMax: 0,
    }),
    prestateRequired: true,
    prestateReusable: false,
    presentSkipsMutation: true,
    poststateAfterConfirmedSetSuccessOnly: true,
    indeterminatePolicy: "NO_POSTSTATE_NO_RETRY_NO_ROLLBACK_SEPARATE_READ_ONLY_APPROVAL_REQUIRED",
    approvalConsumptionPoint: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.approvalConsumptionPoint,
    approvalBeforeFirstRemoteRequired: G2B_M3_RUNTIME_CONTRACT.approvalConsumptionBeforeFirstRemoteRequired,
    cachedCredentialOnly: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.cachedCredentialOnly,
    implicitRefreshReachable: G2B_EXPLICIT_SET_IAM_POLICY_AUTH_TRANSPORT_CONTRACT.implicitRefreshReachable,
    cachedCredentialFreshnessMarginSeconds: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.freshnessMarginSeconds,
    completePolicySetUsesPrestate: G2B_EXPLICIT_SET_IAM_POLICY_CONTRACT.prestateGetCallsMax === 1,
    recoveryAnchorRequired: G2B_RECOVERY_ANCHOR_CONTRACT.verifiedBeforeMutationRequired,
    noHiddenDirectSetPrestateRead: G2B_CURRENT_LIVE_EXECUTOR_CONTRACT.directSetInternalGetIamPolicy === false,
  });
  const complete = continuityCurrentAndPersisted
    && implementation.oldGcloudMutationReachability === 0
    && implementation.oldGcloudFallbackReachability === 0
    && runtimeCapability.approvalBeforeFirstRemoteRequired === true
    && runtimeCapability.implicitRefreshReachable === false
    && runtimeCapability.cachedCredentialOnly === true
    && runtimeCapability.recoveryAnchorRequired === true;
  const composite = Object.freeze({
    schema: "myweb.g2b.repaired-m3.final-execution-composite.v1",
    stage: G2B_REPAIRED_M3_REATTESTATION_STAGE,
    implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    continuityCompositeSha256: sha256Canonical(continuity.composite),
    sourceLockManifestSha256: sha256Canonical({ schema: "myweb.g2b.repaired-m3.source-lock-manifest.v1", stage: G2B_REPAIRED_M3_REATTESTATION_STAGE, sourceLocks }),
    prospectiveM3SafeToPrepare: complete,
    m3ExecutionReachableWithoutSeparateApproval: false,
    remoteOperations: 0,
  });
  return Object.freeze({ sourceLockManifest: Object.freeze({ schema: "myweb.g2b.repaired-m3.source-lock-manifest.v1", stage: G2B_REPAIRED_M3_REATTESTATION_STAGE, sourceLocks }), implementation, runtimeCapability, composite });
}

export function verifyG2BRepairedM3ProspectiveSafetyReattestation(value, options = {}) {
  try {
    const expected = buildG2BRepairedM3ProspectiveSafetyReattestation(options);
    const ok = canonicalJson(value) === canonicalJson(expected) && expected.composite.prospectiveM3SafeToPrepare === true;
    return Object.freeze({ ok, code: ok ? "REPAIRED_M3_PROSPECTIVE_SAFETY_PASS" : "REPAIRED_M3_PROSPECTIVE_SAFETY_BLOCKED" });
  } catch { return Object.freeze({ ok: false, code: "REPAIRED_M3_PROSPECTIVE_SAFETY_INVALID" }); }
}

export function writeG2BRepairedM3ProspectiveSafetyReattestation(artifacts, { repositoryRoot = process.cwd() } = {}) {
  if (artifacts?.composite?.prospectiveM3SafeToPrepare !== true) throw new Error("repaired-m3-reattestation-blocked");
  const outputs = Object.freeze({
    sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-source-lock-v1.json",
    implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-implementation-attestation-v1.json",
    runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-runtime-capability-attestation-v1.json",
    composite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-final-execution-composite-v1.json",
  });
  const paths = {};
  for (const [key, relative] of Object.entries(outputs)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("repaired-m3-reattestation-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(artifacts[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = relative;
  }
  return Object.freeze({ paths: Object.freeze(paths), implementationSha256: sha256Canonical(artifacts.implementation), runtimeCapabilitySha256: sha256Canonical(artifacts.runtimeCapability), compositeSha256: sha256Canonical(artifacts.composite) });
}
