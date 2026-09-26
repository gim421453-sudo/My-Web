import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT, readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE, G2B_GENERATION_BOUND_RECOVERY_V2_STAGE, verifyG2BGenerationBoundReadOnlyRecoveryV2 } from "./g2bGenerationBoundReadOnlyRecoveryV2.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";

export const G2B_RECOVERY_V2_CREDENTIAL_REFRESH_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RECOVERY-V2-PATH-CURRENT-DIRECT-CONTEXT-CREDENTIAL-REFRESH";
export const G2B_RECOVERY_V2_CREDENTIAL_REFRESH_OPERATION_INSTANCE = "1a134e5d-ba14-440a-a6a5-74421c82de75";
export const G2B_RECOVERY_V2_CREDENTIAL_REFRESH_TYPE = "M3_RECOVERY_V2_PATH_CURRENT_DIRECT_CONTEXT_CREDENTIAL_REFRESH";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bRecoveryV2CredentialRefreshPreparation.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit-tests/g2bRecoveryV2CredentialRefreshPreparation.test.mjs",
]);
const OUTPUTS = Object.freeze({
  source: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-credential-refresh-source-lock-v1.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-credential-refresh-implementation-v1.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-credential-refresh-runtime-v1.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-credential-refresh-composite-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-recovery-v2-credential-refresh-approval-packet-v1.json",
});
const hashFile = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

function expired(value) {
  return value?.result === "CACHED_CREDENTIAL_EXPIRED_CONFIRMED"
    && value?.credentialExpiryRelativeState === "EXPIRED" && value?.freshnessMarginSeconds === 120
    && value?.networkRequests === 0 && value?.refreshMethodInvocations === 0;
}

export async function inspectG2BRecoveryV2CredentialRefreshContext({ transport } = {}) {
  const readiness = await readG2BDirectCachedCredentialReadiness({ transport });
  return Object.freeze({ ok: expired(readiness), readiness, remoteOperations: 0, credentialRefreshCalls: 0, recoveryIamReads: 0 });
}

function sourceLock(repositoryRoot) {
  return Object.freeze({ schema: "myweb.g2b.recovery-v2-credential-refresh.source-lock.v1", stage: G2B_RECOVERY_V2_CREDENTIAL_REFRESH_STAGE, sourceLocks: Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hashFile(resolve(repositoryRoot, path)) }))) });
}

function recoveryPacketShape(recovery) {
  const packet = recovery?.approvalPacket;
  return packet && packet.type === "M3_GENERATION_BOUND_READ_ONLY_RECOVERY_V2"
    && packet.operationInstance === G2B_GENERATION_BOUND_RECOVERY_V2_OPERATION_INSTANCE
    && packet.parentInterruptedM3Generation === G2B_INTERRUPTED_M3_GENERATION
    && packet.currentDirectAuthPathId === G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath
    && packet.recoveryCredentialRecordEqualsCurrentDirectRecord === true
    && packet.recoveryAuthContextEqualsCurrentDirectContext === true;
}

export function buildG2BRecoveryV2CredentialRefreshArtifacts({ repositoryRoot = process.cwd(), contextInspection, recoveryArtifacts, recoveryVerification } = {}) {
  if (!expired(contextInspection?.readiness) || recoveryVerification?.ok !== true || !recoveryPacketShape(recoveryArtifacts)) {
    throw new Error("recovery-v2-refresh-precondition-required");
  }
  const source = sourceLock(repositoryRoot);
  const implementation = Object.freeze({
    schema: "myweb.g2b.recovery-v2-credential-refresh.implementation.v1", stage: G2B_RECOVERY_V2_CREDENTIAL_REFRESH_STAGE,
    operationInstance: G2B_RECOVERY_V2_CREDENTIAL_REFRESH_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    refreshRecordEqualsCurrentDirectRecord: true, recoveryCredentialRecordEqualsCurrentDirectRecord: true,
    recoveryAuthContextEqualsCurrentDirectContext: true, refreshHttpMethod: "POST", implicitRefresh: false,
    automaticAuthRetry: 0, alternateAccountSelection: 0, serviceAccountImpersonation: 0, serviceAccountKey: 0,
    rawAccessTokenPersisted: false, rawRefreshTokenPersisted: false, rawCredentialPersisted: false,
    rawAuthorizationHeaderPersisted: false, rawRequestBodyPersisted: false, rawResponseBodyPersisted: false,
  });
  const runtimeCapability = Object.freeze({
    schema: "myweb.g2b.recovery-v2-credential-refresh.runtime-capability.v1", stage: G2B_RECOVERY_V2_CREDENTIAL_REFRESH_STAGE,
    credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1, totalPhysicalRemoteRefreshCallsMax: 1,
    additionalHiddenRefreshRemoteCalls: 0, automaticRetries: 0, secondRefreshRequest: 0, recoveryIamReadsMax: 0,
    setIamPolicyCallsMax: 0, iamMutationsMax: 0, testIamPermissionsCallsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0,
  });
  const executionComposite = Object.freeze({
    schema: "myweb.g2b.recovery-v2-credential-refresh.execution-composite.v1", stage: G2B_RECOVERY_V2_CREDENTIAL_REFRESH_STAGE,
    sourceLockSha256: sha256Canonical(source), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability),
    recoveryV2ApprovalPacketSha256: sha256Canonical(recoveryArtifacts.approvalPacket), remoteOperations: 0, recoveryReadReachable: false, mutationReachable: false,
  });
  const approvalPacket = Object.freeze({
    schema: "myweb.g2b.recovery-v2-credential-refresh.approval-packet.v1", stage: G2B_RECOVERY_V2_CREDENTIAL_REFRESH_STAGE,
    type: G2B_RECOVERY_V2_CREDENTIAL_REFRESH_TYPE, status: "APPROVAL_REQUIRED",
    purpose: "one fresh bounded credential refresh for the current direct cached credential record before the separately prepared recovery V2 IAM read",
    operationInstance: G2B_RECOVERY_V2_CREDENTIAL_REFRESH_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION,
    currentDirectAuthPathId: G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.sourcePath,
    refreshRecordEqualsCurrentDirectRecord: true, recoveryCredentialRecordEqualsCurrentDirectRecord: true, recoveryAuthContextEqualsCurrentDirectContext: true,
    preRefreshReadiness: Object.freeze({ result: contextInspection.readiness.result, credentialExpiryRelativeState: contextInspection.readiness.credentialExpiryRelativeState, freshnessMarginSeconds: 120, networkRequests: 0, refreshMethodInvocations: 0 }),
    approvalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS",
    credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1, totalPhysicalRemoteRefreshCallsMax: 1, additionalHiddenRefreshRemoteCalls: 0,
    automaticRetries: 0, secondRefreshRequest: 0, recoveryIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0,
    testIamPermissionsCallsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0, rawAccessTokenPersisted: false,
    rawRefreshTokenPersisted: false, rawCredentialPersisted: false, rawAuthorizationHeaderPersisted: false, rawRequestBodyPersisted: false, rawResponseBodyPersisted: false,
    sourceLockSha256: sha256Canonical(source), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), executionCompositeSha256: sha256Canonical(executionComposite),
    recoveryV2ApprovalPacketSha256: sha256Canonical(recoveryArtifacts.approvalPacket), allRequiredLocalLocksMatch: true, packetReproducible: true, packetComplete: true, safeToContinueWithoutApproval: false,
  });
  return Object.freeze({ source, implementation, runtimeCapability, executionComposite, approvalPacket });
}

export function verifyG2BRecoveryV2CredentialRefreshArtifacts(value, options = {}) {
  try {
    const expected = buildG2BRecoveryV2CredentialRefreshArtifacts(options);
    const actual = Object.freeze({ source: value?.source, implementation: value?.implementation, runtimeCapability: value?.runtimeCapability, executionComposite: value?.executionComposite, approvalPacket: value?.approvalPacket });
    return Object.freeze({ ok: canonicalJson(actual) === canonicalJson(expected) });
  } catch { return Object.freeze({ ok: false }); }
}

export function createG2BRecoveryV2CredentialRefreshExecutor({ operationInstance = G2B_RECOVERY_V2_CREDENTIAL_REFRESH_OPERATION_INSTANCE } = {}) {
  let used = false;
  return Object.freeze({
    async execute({ enabled = false, authorizationPreconditionEstablished = false, consumeApproval, transport } = {}) {
      const counters = { credentialRefreshCalls: 0, oauthTokenEndpointCalls: 0, totalPhysicalRemoteRefreshCalls: 0, retries: 0, secondRefreshRequest: 0, recoveryIamReads: 0, setIamPolicyCalls: 0, iamMutations: 0, m4Mutations: 0, firestoreCalls: 0 };
      if (enabled !== true || authorizationPreconditionEstablished !== true || used || operationInstance !== G2B_RECOVERY_V2_CREDENTIAL_REFRESH_OPERATION_INSTANCE || typeof consumeApproval !== "function" || typeof transport?.executeDirectContextCredentialRefresh !== "function") return Object.freeze({ ok: false, code: "RECOVERY_V2_REFRESH_BOUNDARY_REQUIRED", counters: Object.freeze(counters) });
      let approved = false;
      try { approved = await consumeApproval(); } catch { approved = false; }
      if (approved !== true) return Object.freeze({ ok: false, code: "RECOVERY_V2_REFRESH_APPROVAL_NOT_CONSUMED", counters: Object.freeze(counters) });
      used = true;
      counters.credentialRefreshCalls = 1; counters.oauthTokenEndpointCalls = 1; counters.totalPhysicalRemoteRefreshCalls = 1;
      let refreshed;
      try { refreshed = await transport.executeDirectContextCredentialRefresh(); } catch { refreshed = null; }
      return Object.freeze({ ok: refreshed?.ok === true && refreshed?.state === "REFRESH_SUCCESS_CONFIRMED" && refreshed?.physicalCalls === 1, code: refreshed?.ok === true ? "REFRESH_SUCCESS_CONFIRMED" : "REFRESH_INDETERMINATE", counters: Object.freeze(counters) });
    },
    snapshot: () => Object.freeze({ operationInstance, used }),
  });
}

export function writeG2BRecoveryV2CredentialRefreshArtifacts(value, { repositoryRoot = process.cwd(), contextInspection, recoveryArtifacts, recoveryVerification } = {}) {
  if (!verifyG2BRecoveryV2CredentialRefreshArtifacts(value, { repositoryRoot, contextInspection, recoveryArtifacts, recoveryVerification }).ok) throw new Error("recovery-v2-refresh-artifacts-invalid");
  const paths = {};
  for (const [key, relative] of Object.entries(OUTPUTS)) {
    const path = resolve(repositoryRoot, relative);
    if (existsSync(path)) throw new Error("recovery-v2-refresh-artifact-already-exists");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value[key], null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    paths[key] = relative;
  }
  return Object.freeze({ paths: Object.freeze(paths), sourceLockSha256: sha256Canonical(value.source), implementationAttestationSha256: sha256Canonical(value.implementation), runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability), executionCompositeSha256: sha256Canonical(value.executionComposite), approvalPacketSha256: sha256Canonical(value.approvalPacket), approvalPacketRawSha256: hashFile(resolve(repositoryRoot, OUTPUTS.approvalPacket)) });
}
