import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE, prepareG2BFutureM3Anchor } from "./g2bRecoveryAnchor.mjs";
import { G2B_REPAIRED_M3_DPAPI_REATTESTATION_STAGE, buildG2BRepairedM3DpapiRecoveryReattestation, verifyG2BRepairedM3DpapiRecoveryReattestation } from "./g2bRepairedM3DpapiRecoveryReattestation.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_REPAIRED_M3_AUTHORITY_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-REPAIRED-DIRECT-FINAL-AUTHORITY-PREPARATION";
const REATTESTATION_PATHS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-implementation-attestation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-runtime-capability-attestation-v1.json",
  composite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-dpapi-final-execution-composite-v1.json",
});
const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs",
  "tools/authority-audit/g2bM3CurrentLiveExecutor.mjs",
  "tools/authority-audit/g2bM3RecoveryAnchorRuntime.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/invokeWindowsDpapi.ps1",
  "tools/authority-audit/g2bRepairedM3DpapiRecoveryReattestation.mjs",
  "tools/authority-audit/g2bRepairedM3AuthorityPreparation.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit-tests/g2bLocalPinnedIdentityResolver.test.mjs",
  "tools/authority-audit-tests/g2bRepairedM3DpapiRecoveryReattestation.test.mjs",
  "tools/authority-audit-tests/windowsDpapiSecretProvider.test.mjs",
]);

function hash(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function sourceLocks(repositoryRoot) { return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hash(resolve(repositoryRoot, path)) }))); }
function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || ""); }
function persistedReattestationMatches(repositoryRoot, expected) {
  return Object.entries(REATTESTATION_PATHS).every(([key, relative]) => {
    const path = resolve(repositoryRoot, relative);
    return existsSync(path) && canonicalJson(JSON.parse(readFileSync(path, "utf8"))) === canonicalJson(expected[key]);
  });
}

export function prepareG2BRepairedM3Authority({
  repositoryRoot = process.cwd(), environment = process.env, identityContext,
  secretProvider, store, operationGenerationId = randomUUID(),
} = {}) {
  const reattestation = buildG2BRepairedM3DpapiRecoveryReattestation({ repositoryRoot });
  if (!verifyG2BRepairedM3DpapiRecoveryReattestation(reattestation, { repositoryRoot }).ok
    || !persistedReattestationMatches(repositoryRoot, reattestation)) {
    return Object.freeze({ ok: false, code: "REPAIRED_M3_REATTESTATION_NOT_CURRENT" });
  }
  if (!isUuid(operationGenerationId)) return Object.freeze({ ok: false, code: "OPERATION_GENERATION_INVALID" });
  const localIdentity = identityContext ? Object.freeze({ ok: true, context: identityContext }) : resolveG2BLocalPinnedIdentity({ environment });
  if (localIdentity.ok !== true || !localIdentity.context?.exactPrincipal || !localIdentity.context?.exactIamMember) {
    return Object.freeze({ ok: false, code: localIdentity.code || "LOCAL_IDENTITY_CONTEXT_UNAVAILABLE" });
  }
  const resolvedStore = store || createG2BRecoveryAnchorStore();
  if (typeof resolvedStore.activeCount !== "function" || resolvedStore.activeCount() !== 0) {
    return Object.freeze({ ok: false, code: "ACTIVE_RECOVERY_ANCHOR_EXISTS" });
  }
  const anchor = prepareG2BFutureM3Anchor({
    identityContext: localIdentity.context,
    secretProvider: secretProvider || createWindowsDpapiSecretProvider(),
    store: resolvedStore,
    operationGenerationId,
  });
  if (anchor.mutationReachable !== true || anchor.state !== "ANCHOR_VERIFIED") {
    return Object.freeze({ ok: false, code: anchor.code || "RECOVERY_ANCHOR_NOT_VERIFIED" });
  }
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.repaired-m3.authority-source-lock.v1", stage: G2B_REPAIRED_M3_AUTHORITY_STAGE, operationGenerationId, sourceLocks: sourceLocks(repositoryRoot) });
  const implementation = Object.freeze({
    schema: "myweb.g2b.repaired-m3.authority-implementation.v1", stage: G2B_REPAIRED_M3_AUTHORITY_STAGE,
    operationGenerationId, identityFingerprint: localIdentity.context.identityFingerprint, targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE,
    reattestationCompositeSha256: sha256Canonical(reattestation.composite),
    authorizationPreconditionEstablished: true, localIdentityDiscoveryUsed: 1, localIdentityDiscoveryRemoteCalls: 0,
    recoveryAnchorState: "ANCHOR_VERIFIED", anchorBoundToOperationGeneration: true,
    privacy: Object.freeze({ rawPrincipalPersisted: false, rawMemberPersisted: false, rawCredentialPersisted: false, rawAnchorSecretPersisted: false }),
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.repaired-m3.authority-runtime-capability.v1", stage: G2B_REPAIRED_M3_AUTHORITY_STAGE, operationGenerationId,
    freshPrestateRequired: true, prestateWriterIamPolicyReadsMax: 1, mutationAttemptsMax: 1, poststateWriterIamPolicyReadsMax: 1,
    presentResult: "MUTATION_0", absentResult: "SET_1_MAX", indeterminateResult: "POSTSTATE_0_RETRY_0_ROLLBACK_0_SEPARATE_RECOVERY_APPROVAL",
    approvalConsumptionPoint: "WHEN_FIRST_APPROVED_EXACT_WRITER_SERVICE_ACCOUNT_GET_IAM_POLICY_PRESTATE_REQUEST_BEGINS",
    preLiveCachedCredentialReadinessRequired: true, preLiveNetworkCallsMax: 0, credentialRefreshCallsMax: 0,
    projectIamReadsMax: 0, firestoreCallsMax: 0, m4MutationsMax: 0, testIamPermissionsCallsMax: 0, tokenCallsMax: 0, cloudLoggingCallsMax: 0,
    retriesMax: 0, rollbacksMax: 0, secondMutationReachable: false,
  });
  const composite = Object.freeze({
    schema: "myweb.g2b.repaired-m3.authority-final-execution-composite.v1", stage: G2B_REPAIRED_M3_AUTHORITY_STAGE, operationGenerationId,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationSha256: sha256Canonical(implementation), runtimeCapabilitySha256: sha256Canonical(runtimeCapability),
    authorityChain: "V3_PERMISSION_EVIDENCE->V3_RUNTIME_CONTINUITY->REPAIRED_DIRECT_M3_REATTESTATION->DPAPI_RECOVERY_REATTESTATION->LOCAL_PINNED_IDENTITY->GENERATION_BOUND_HMAC_ANCHOR",
    m3ExecutionReachableWithoutSeparateApproval: false, remoteOperations: 0,
  });
  const approvalPacket = Object.freeze({
    schema: "myweb.g2b.repaired-m3.approval-packet.v1", stage: G2B_REPAIRED_M3_AUTHORITY_STAGE, type: "REPAIRED_DIRECT_M3_TOKEN_CREATOR_BINDING", status: "APPROVAL_REQUIRED",
    purpose: "one exact direct SetIamPolicy operation only after approval is consumed at the fresh prestate request", operationGenerationId,
    targetResource: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, authorityCompositeSha256: sha256Canonical(composite),
    prestateRequired: true, prestateRemoteReadsMax: 1, mutationAttemptsMax: 1, poststateRequired: true, poststateRemoteReadsMax: 1, projectIamReadsMax: 0,
    retries: 0, rollbacks: 0, secondMutationReachable: false, indeterminatePolicy: runtimeCapability.indeterminateResult,
    m4Allowed: false, firestoreAllowed: false, accessTokenAllowed: false, cloudLoggingAllowed: false, testIamPermissionsAllowed: false, serviceAccountKeyAllowed: false,
    approvalConsumptionPoint: runtimeCapability.approvalConsumptionPoint, safeToContinueWithoutApproval: false,
    privacy: Object.freeze({ rawPrincipalPersisted: false, rawMemberPersisted: false, rawCredentialPersisted: false, rawPolicyPersisted: false }),
  });
  return Object.freeze({ ok: true, operationGenerationId, sourceLockManifest, implementation, runtimeCapability, composite, approvalPacket });
}

export function writeG2BRepairedM3AuthorityPreparation(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("repaired-m3-authority-preparation-blocked");
  const outputs = Object.freeze({
    sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-authority-source-lock-v1.json",
    implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-authority-implementation-v1.json",
    runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-authority-runtime-capability-v1.json",
    composite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-authority-final-composite-v1.json",
    approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-repaired-m3-live-approval-packet-v1.json",
  });
  const paths = {};
  for (const [key, relative] of Object.entries(outputs)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("repaired-m3-authority-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = relative;
  }
  return Object.freeze({ paths: Object.freeze(paths), approvalPacketSha256: sha256Canonical(value.approvalPacket), operationGenerationId: value.operationGenerationId });
}
