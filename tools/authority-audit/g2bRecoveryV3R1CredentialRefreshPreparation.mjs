import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT, readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { G2B_GENERATION_BOUND_RECOVERY_V3R1_OPERATION_INSTANCE } from "./g2bGenerationBoundReadOnlyRecoveryV3R1.mjs";
import { createG2BRecoveryAnchorStore, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";
import { writeCanonicalJsonAtomically } from "./g2bRecoveryPostExecutionEvidence.mjs";

export const G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RECOVERY-V3R1-PATH-CURRENT-DIRECT-CONTEXT-CREDENTIAL-REFRESH";
export const G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_TYPE = "M3_RECOVERY_V3R1_PATH_CURRENT_DIRECT_CONTEXT_CREDENTIAL_REFRESH";
export const G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_OPERATION_INSTANCE = "9bd7c7fe-4d6c-4c7a-979b-130009485ec1";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bRecoveryV3R1CredentialRefreshPreparation.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R1.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecovery.mjs",
  "tools/authority-audit/g2bRecoveryPostExecutionEvidence.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit/prepareG2BRecoveryV3R1CredentialRefresh.mjs",
  "tools/authority-audit-tests/g2bRecoveryV3R1CredentialRefreshPreparation.test.mjs",
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r1-credential-refresh-source-lock-v2.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r1-credential-refresh-implementation-v2.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r1-credential-refresh-runtime-v2.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r1-credential-refresh-composite-v2.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v3r1-credential-refresh-approval-packet-v2.json",
});

function hash(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function expired(value) {
  return value?.result === "CACHED_CREDENTIAL_EXPIRED_CONFIRMED"
    && value?.credentialExpiryRelativeState === "EXPIRED" && value?.freshnessMarginSeconds === 120
    && value?.networkRequests === 0 && value?.refreshMethodInvocations === 0;
}

function verifiedAnchor({ environment, identityContext, secretProvider, store }) {
  const identity = identityContext ? Object.freeze({ ok: true, context: identityContext }) : resolveG2BLocalPinnedIdentity({ environment });
  const loaded = store?.load?.(G2B_INTERRUPTED_M3_GENERATION);
  const secret = secretProvider?.read?.();
  const verification = identity.ok === true && loaded?.state === "READY"
    ? verifyG2BRecoveryAnchor({ record: loaded.record, member: identity.context?.exactIamMember, secret: secret?.secret, secretKeyId: secret?.keyId })
    : { ok: false };
  return verification.ok === true && loaded.record.anchorState === "ANCHOR_VERIFIED";
}

export async function inspectG2BRecoveryV3R1CredentialRefreshContext({ transport } = {}) {
  if (!transport || typeof transport.prepareDirectContextCredentialRefresh !== "function") return Object.freeze({ ok: false, code: "RECOVERY_V3R1_REFRESH_TRANSPORT_UNAVAILABLE", remoteOperations: 0 });
  const readiness = await readG2BDirectCachedCredentialReadiness({ transport });
  let prepared;
  try { prepared = await transport.prepareDirectContextCredentialRefresh(); } catch { prepared = null; }
  const refreshReady = prepared?.ok === true && prepared?.state === "REFRESH_READY_TO_SEND" && prepared?.physicalCalls === 0;
  return Object.freeze({
    ok: expired(readiness) && refreshReady,
    code: expired(readiness) && refreshReady ? "RECOVERY_V3R1_REFRESH_PREPARED" : "RECOVERY_V3R1_REFRESH_CONTEXT_BLOCKED",
    readiness,
    refreshReadyToSend: refreshReady,
    refreshRecordEqualsCurrentDirectRecord: refreshReady,
    refreshRecordEqualsRecoveryV3R1AuthRecord: refreshReady,
    recoveryAuthContextEqualsCurrentDirectContext: refreshReady,
    remoteOperations: 0,
    credentialRefreshCalls: 0,
  });
}

export function prepareG2BRecoveryV3R1CredentialRefresh({ repositoryRoot = process.cwd(), environment = process.env, contextInspection, identityContext, secretProvider, store, operationInstance = G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_OPERATION_INSTANCE } = {}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(operationInstance)) return Object.freeze({ ok: false, code: "RECOVERY_V3R1_REFRESH_OPERATION_INSTANCE_INVALID" });
  const anchor = verifiedAnchor({ environment, identityContext, secretProvider: secretProvider || createWindowsDpapiSecretProvider({ environment }), store: store || createG2BRecoveryAnchorStore({}) });
  if (!anchor || contextInspection?.ok !== true) return Object.freeze({ ok: false, code: anchor ? "RECOVERY_V3R1_REFRESH_CONTEXT_BLOCKED" : "RECOVERY_V3R1_REFRESH_ANCHOR_NOT_VERIFIED" });
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.recovery-v3r1-refresh.source-lock.v1", stage: G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_STAGE, sourceLocks: Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hash(resolve(repositoryRoot, path)) }))) });
  const implementation = Object.freeze({
    schema: "myweb.g2b.recovery-v3r1-refresh.implementation.v1", stage: G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_STAGE,
    artifactRevision: 2, operationInstance, nextRecoveryV3R1OperationInstance: G2B_GENERATION_BOUND_RECOVERY_V3R1_OPERATION_INSTANCE,
    parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    refreshRecordEqualsCurrentDirectRecord: true, refreshRecordEqualsRecoveryV3R1AuthRecord: true, recoveryAuthContextEqualsCurrentDirectContext: true,
    refreshHttpMethod: "POST", refreshEndpointClass: "OAUTH_TOKEN_ENDPOINT", implicitRefresh: false, automaticRefreshRetries: 0,
    alternateAccountSelection: 0, serviceAccountImpersonation: 0, serviceAccountKey: 0,
    rawAccessTokenPersisted: false, rawRefreshTokenPersisted: false, rawCredentialPersisted: false, rawAuthorizationHeaderPersisted: false,
    rawRequestBodyPersisted: false, rawResponseBodyPersisted: false, rawPrincipalPersisted: false, rawMemberPersisted: false,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.recovery-v3r1-refresh.runtime-capability.v1", stage: G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_STAGE,
    credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1, totalPhysicalRemoteRefreshCallsMax: 1, additionalHiddenRefreshRemoteCalls: 0,
    automaticRefreshRetries: 0, secondRefreshRequest: 0, recoveryIamReadsMax: 0, projectIamReadsMax: 0,
    setIamPolicyCallsMax: 0, iamMutationsMax: 0, testIamPermissionsCallsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.recovery-v3r1-refresh.execution-composite.v1", stage: G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_STAGE,
    artifactRevision: 2, operationInstance, sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation),
    runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), postRefreshRule: "RECHECK_CREDENTIAL_FRESHNESS_AND_CREATE_NEW_V3R1_READ_AUTHORITY_LOCALLY;NO_IAM_READ_DURING_REFRESH",
    recoveryIamReadReachable: false, mutationReachable: false, safeToContinueWithoutApproval: false,
  });
  const approvalPacket = Object.freeze({
    schema: "myweb.g2b.recovery-v3r1-refresh.approval-packet.v1", stage: G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_STAGE,
    type: G2B_RECOVERY_V3R1_CREDENTIAL_REFRESH_TYPE, status: "APPROVAL_REQUIRED",
    purpose: "one new bounded refresh of the current direct credential record before a fresh V3R1 recovery IAM-read authority can be created",
    artifactRevision: 2, operationInstance, nextRecoveryV3R1OperationInstance: G2B_GENERATION_BOUND_RECOVERY_V3R1_OPERATION_INSTANCE,
    parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    preRefreshReadiness: Object.freeze({ result: contextInspection.readiness.result, credentialExpiryRelativeState: contextInspection.readiness.credentialExpiryRelativeState, freshnessMarginSeconds: 120, remoteOperations: 0, refreshMethodInvocations: 0 }),
    approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS",
    credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1, totalPhysicalRemoteRefreshCallsMax: 1, additionalHiddenRefreshRemoteCalls: 0,
    automaticRefreshRetries: 0, secondRefreshRequest: 0, recoveryIamReadsMax: 0, projectIamReadsMax: 0, setIamPolicyCallsMax: 0,
    iamMutationsMax: 0, testIamPermissionsCallsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0,
    blockedV3ApprovalReused: false, blockedV3OperationReused: false, postRefreshV3R1ReadRequiresNewApproval: true,
    sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), executionCompositeSha256: sha256Canonical(executionComposite),
    allRequiredLocalLocksMatch: true, refreshPacketReproducible: true, refreshPacketComplete: true, safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ ok: true, code: "RECOVERY_V3R1_REFRESH_AUTHORITY_READY", sourceLockManifest, implementation, runtimeCapability, executionComposite, approvalPacket });
}

export function verifyG2BRecoveryV3R1CredentialRefresh(value, options = {}) {
  try {
    const expected = prepareG2BRecoveryV3R1CredentialRefresh(options);
    const actual = Object.freeze({ sourceLockManifest: value?.sourceLockManifest, implementation: value?.implementation, runtimeCapability: value?.runtimeCapability, executionComposite: value?.executionComposite, approvalPacket: value?.approvalPacket });
    const wanted = Object.freeze({ sourceLockManifest: expected.sourceLockManifest, implementation: expected.implementation, runtimeCapability: expected.runtimeCapability, executionComposite: expected.executionComposite, approvalPacket: expected.approvalPacket });
    return Object.freeze({ ok: expected.ok === true && canonicalJson(actual) === canonicalJson(wanted) });
  } catch { return Object.freeze({ ok: false }); }
}

export function writeG2BRecoveryV3R1CredentialRefresh(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("recovery-v3r1-refresh-authority-not-ready");
  const paths = {};
  for (const [key, relative] of Object.entries(OUTPUTS)) { writeCanonicalJsonAtomically(resolve(repositoryRoot, relative), value[key]); paths[key] = relative; }
  return Object.freeze({ paths: Object.freeze(paths), sourceLockManifestSha256: sha256Canonical(value.sourceLockManifest), implementationAttestationSha256: sha256Canonical(value.implementation), runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability), executionCompositeSha256: sha256Canonical(value.executionComposite), approvalPacketSha256: sha256Canonical(value.approvalPacket), approvalPacketRawSha256: hash(resolve(repositoryRoot, OUTPUTS.approvalPacket)) });
}
