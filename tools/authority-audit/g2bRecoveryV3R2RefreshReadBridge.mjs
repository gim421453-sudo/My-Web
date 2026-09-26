import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { readG2BDirectCachedCredentialReadiness } from "./g2bDirectCachedCredentialReadiness.mjs";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import {
  G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE,
  createG2BGenerationBoundReadOnlyRecoveryV3R2Executor,
  prepareG2BGenerationBoundReadOnlyRecoveryV3R2,
  resolveG2BRecoveryV3R2Context,
  verifyG2BGenerationBoundReadOnlyRecoveryV3R2,
} from "./g2bGenerationBoundReadOnlyRecoveryV3R2.mjs";
import { createG2BRecoveryExecutionJournal } from "./g2bRecoveryExecutionJournal.mjs";
import { G2B_TARGET_RESOURCE, G2B_TARGET_ROLE } from "./g2bRecoveryAnchor.mjs";
import { canonicalJson, sha256Canonical } from "./g2bV3DiagnosticContinuityAttestation.mjs";
import { validateG2BV3R2SourceLock } from "./g2bV3R2SourceLockValidator.mjs";

export const G2B_V3R2_REFRESH_READ_BRIDGE_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-RECOVERY-V3R2-BOUNDED-REFRESH-THEN-READ-BRIDGE";
export const G2B_V3R2_REFRESH_READ_BRIDGE_TYPE = "M3_RECOVERY_V3R2_BOUNDED_REFRESH_THEN_READ_BRIDGE";
export const G2B_V3R2_REFRESH_READ_BRIDGE_OPERATION_INSTANCE = "f9ddbb53-3106-40cd-a930-2fba2d9d2152";

const SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bRecoveryV3R2RefreshReadBridge.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R2.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs",
  "tools/authority-audit/g2bV3DiagnosticContinuityAttestation.mjs",
  "tools/authority-audit/g2bV3R2SourceLockValidator.mjs",
  "tools/authority-audit/prepareG2BV3R2RefreshReadBridge.mjs",
  "tools/authority-audit-tests/g2bRecoveryV3R2RefreshReadBridge.test.mjs",
  "tools/authority-audit-tests/g2bV3R2SourceLockValidator.test.mjs",
]);
const OUTPUTS = Object.freeze({
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-source-lock-v5.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-implementation-v5.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-runtime-v5.json",
  prospectiveSafetyEvidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-prospective-safety-v5.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-composite-v5.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-approval-packet-v5.json",
});
const PARENT = Object.freeze({
  source: "aa0ba983a3ff6ff7ede6bc5d4c14f7a09be1056854f0c714704ae76f045922f4",
  implementation: "b851da36d92e039975cd5367dd5c5dcaca46701f2dcff99b1b4a0205ef1aa11e",
  runtime: "9abcbcb654b41727bfaa32ac1a2f5b035a629d9e993f98f262ad77daabaa46d8",
  safety: "b91c44e09127a5881e41f65301f2184a15f1ea96b511d5a2b9369d1e3c9e65a7",
  composite: "526403be24b3e1c48e3e0ca1d4a762cef019fd22b074937c6a80efdd805e12fd",
});
const hash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fresh = (r) => r?.ok === true && r.result === "CACHED_CREDENTIAL_READY_CONFIRMED" && r.credentialExpiryRelativeState === "FRESH" && r.freshnessMarginSeconds === 120 && r.networkRequests === 0 && r.refreshMethodInvocations === 0;
const expired = (r) => r?.result === "CACHED_CREDENTIAL_EXPIRED_CONFIRMED" && r.remoteOperations === 0 && r.refreshMethodInvocations === 0;
const BRIDGE_PHASES = Object.freeze({ PREPARED: ["BRIDGE_APPROVAL_CONSUMED"], BRIDGE_APPROVAL_CONSUMED: ["REFRESH_REQUEST_STARTED_RESPONSE_UNKNOWN"], REFRESH_REQUEST_STARTED_RESPONSE_UNKNOWN: ["REFRESH_SUCCESS_CONFIRMED", "REFRESH_TERMINAL_FAILURE"], REFRESH_SUCCESS_CONFIRMED: ["MINIMAL_GATE_PASSED"], MINIMAL_GATE_PASSED: ["READ_DELEGATED"] });

function sourceLocks(repositoryRoot) {
  return Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: hash(resolve(repositoryRoot, path)) })));
}

function parentArtifactMatches(repositoryRoot) {
  const root = resolve(repositoryRoot, "docs/evidence");
  const files = Object.freeze({
    source: "p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-source-lock-v2.json",
    implementation: "p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-implementation-v2.json",
    runtime: "p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-runtime-v2.json",
    safety: "p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-prospective-safety-v2.json",
    composite: "p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-composite-v2.json",
  });
  try {
    const values = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, JSON.parse(readFileSync(resolve(root, file), "utf8"))]));
    const sourceLock = validateG2BV3R2SourceLock({ manifest: values.source, repositoryRoot });
    return Object.freeze({ ok: sourceLock.ok === true && sha256Canonical(values.source) === PARENT.source && sha256Canonical(values.implementation) === PARENT.implementation && sha256Canonical(values.runtime) === PARENT.runtime && sha256Canonical(values.safety) === PARENT.safety && sha256Canonical(values.composite) === PARENT.composite, values, sourceLock });
  } catch { return Object.freeze({ ok: false }); }
}

/** A bridge journal prevents a process interruption from silently permitting a second refresh. */
export function createG2BV3R2RefreshReadBridgeJournal({ directory = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "MY-WEB", "authority-audit", "g2b-refresh-read-bridge-v1") : null, now = () => new Date().toISOString() } = {}) {
  if (!directory) throw new Error("v3r2-bridge-journal-directory-required");
  const pathFor = (operationInstance) => join(directory, `${operationInstance}.json`);
  const load = (operationInstance) => {
    if (!existsSync(pathFor(operationInstance))) return Object.freeze({ state: "MISSING" });
    try { const record = JSON.parse(readFileSync(pathFor(operationInstance), "utf8")); return record?.operationInstance === operationInstance && typeof record.phase === "string" ? Object.freeze({ state: "READY", record: Object.freeze(record) }) : Object.freeze({ state: "INVALID" }); } catch { return Object.freeze({ state: "INVALID" }); }
  };
  const write = (path, value) => { mkdirSync(dirname(path), { recursive: true }); const temporary = `${path}.${randomUUID()}.tmp`; try { writeFileSync(temporary, `${canonicalJson(value)}\n`, { encoding: "utf8", mode: 0o600 }); renameSync(temporary, path); } finally { if (existsSync(temporary)) unlinkSync(temporary); } };
  return Object.freeze({
    load,
    initialize(operationInstance) { const existing = load(operationInstance); if (existing.state === "READY") return Object.freeze({ ok: true, record: existing.record }); if (existing.state !== "MISSING") return Object.freeze({ ok: false, code: "V3R2_BRIDGE_JOURNAL_INVALID" }); const record = Object.freeze({ operationInstance, parentV3R2ReadOperation: G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE, phase: "PREPARED", bridgeApprovalConsumed: false, refreshRequestBoundaryEntered: false, updatedAt: now() }); try { write(pathFor(operationInstance), record); return Object.freeze({ ok: true, record }); } catch { return Object.freeze({ ok: false, code: "V3R2_BRIDGE_JOURNAL_WRITE_FAILED" }); } },
    transition(operationInstance, phase) { const current = load(operationInstance); if (current.state !== "READY" || BRIDGE_PHASES[current.record.phase]?.includes(phase) !== true) return Object.freeze({ ok: false, code: "V3R2_BRIDGE_JOURNAL_TRANSITION_BLOCKED" }); const record = Object.freeze({ ...current.record, phase, bridgeApprovalConsumed: phase === "BRIDGE_APPROVAL_CONSUMED" || current.record.bridgeApprovalConsumed, refreshRequestBoundaryEntered: phase === "REFRESH_REQUEST_STARTED_RESPONSE_UNKNOWN" || current.record.refreshRequestBoundaryEntered, updatedAt: now() }); try { write(pathFor(operationInstance), record); return Object.freeze({ ok: true, record }); } catch { return Object.freeze({ ok: false, code: "V3R2_BRIDGE_JOURNAL_WRITE_FAILED" }); } },
  });
}

export async function inspectG2BV3R2RefreshReadBridgeContext({ transport } = {}) {
  const readiness = await readG2BDirectCachedCredentialReadiness({ transport });
  const context = resolveG2BRecoveryV3R2Context();
  const journal = createG2BRecoveryExecutionJournal().load(G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE);
  return Object.freeze({ ok: expired(readiness) && context.ok === true && journal.state === "READY" && journal.record?.phase === "PREPARED" && journal.record?.approvalConsumed === false && journal.record?.requestBoundaryEntered === false, readiness, context, journal, remoteOperations: 0 });
}

export function prepareG2BV3R2RefreshReadBridge({ repositoryRoot = process.cwd(), contextInspection, operationInstance = G2B_V3R2_REFRESH_READ_BRIDGE_OPERATION_INSTANCE } = {}) {
  const parent = parentArtifactMatches(repositoryRoot);
  if (!/^[0-9a-f-]{36}$/.test(operationInstance) || contextInspection?.ok !== true || parent.ok !== true) return Object.freeze({ ok: false, code: "V3R2_BRIDGE_CONTEXT_BLOCKED" });
  const sourceLockManifest = Object.freeze({ schema: "myweb.g2b.v3r2-refresh-read-bridge.source-lock.v1", stage: G2B_V3R2_REFRESH_READ_BRIDGE_STAGE, operationInstance, sourceLocks: sourceLocks(repositoryRoot) });
  const implementation = Object.freeze({ schema: "myweb.g2b.v3r2-refresh-read-bridge.implementation.v1", stage: G2B_V3R2_REFRESH_READ_BRIDGE_STAGE, operationInstance, parentV3R2ReadOperation: G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, targetServiceAccount: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, currentDirectAuthPathId: "g2b-explicit-direct-set-iam-policy-cached-credential-v2", phaseA: "DIRECT_CONTEXT_CREDENTIAL_REFRESH", phaseB: "READ_GENERATION_BOUND_RECOVERY_POLICY", parentSourceLockIndependentRecomputation: true, parentSourceLockSchema: "myweb.g2b.generation-bound-recovery-v3r2.source-lock.v1", parentSourceLockBindingVersion: "v3r2-static-binding-v1", parentSourceLockHashAlgorithm: "sha256", parentSourceLockExpectedPathCount: 15, sourceLockMismatchPolicy: "BLOCK_NO_REBIND_OR_REGENERATION", alternateAccountSelection: 0, serviceAccountImpersonation: 0, serviceAccountKey: 0, rawCredentialPersisted: false, rawPolicyPersisted: false, rawMemberPersisted: false, rawPrincipalPersisted: false });
  const runtimeCapability = Object.freeze({ schema: "myweb.g2b.v3r2-refresh-read-bridge.runtime-capability.v1", stage: G2B_V3R2_REFRESH_READ_BRIDGE_STAGE, credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1, recoveryIamReadsMax: 1, totalPhysicalRemoteCallsMax: 2, additionalHiddenRemoteCalls: 0, automaticRefreshRetries: 0, automaticRecoveryRetries: 0, secondRefreshRequest: 0, secondRecoveryRead: 0, projectIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0 });
  const prospectiveSafetyEvidence = Object.freeze({ schema: "myweb.g2b.v3r2-refresh-read-bridge.prospective-safety.v1", stage: G2B_V3R2_REFRESH_READ_BRIDGE_STAGE, bridgeApprovalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS", parentSourceLockVerifiedBeforeRefresh: true, parentSourceLockVerifiedAfterRefreshBeforeRead: true, parentSourceLockMismatchBlocksBeforeRemoteBoundary: true, parentSourceLockRebindingOrRegeneration: false, phaseBRequiresConfirmedRefreshAndMinimalLocalGate: true, heavyValidationBetweenRefreshAndRead: false, v3r2JournalBoundaryRemainsDurable: true, postexecEvidenceWriterSourceLocked: true, resultDocumentWriterSourceLocked: true, localFinalizationResumerSourceLocked: true, mutationReachable: false, rawCredentialPersisted: false, rawPolicyPersisted: false });
  const executionComposite = Object.freeze({ schema: "myweb.g2b.v3r2-refresh-read-bridge.execution-composite.v1", stage: G2B_V3R2_REFRESH_READ_BRIDGE_STAGE, sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence), parentV3R2Authority: PARENT, unboundRemoteCapabilities: 0, mutationReachable: false, remoteOperations: 0 });
  const approvalPacket = Object.freeze({ schema: "myweb.g2b.v3r2-refresh-read-bridge.approval-packet.v1", stage: G2B_V3R2_REFRESH_READ_BRIDGE_STAGE, type: G2B_V3R2_REFRESH_READ_BRIDGE_TYPE, status: "APPROVAL_REQUIRED", operationInstance, parentV3R2ReadOperation: G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE, parentInterruptedM3Generation: G2B_INTERRUPTED_M3_GENERATION, targetServiceAccount: G2B_TARGET_RESOURCE, targetRole: G2B_TARGET_ROLE, currentDirectAuthPathId: "g2b-explicit-direct-set-iam-policy-cached-credential-v2", bridgeApprovalConsumptionPoint: "WHEN_FIRST_AND_ONLY_APPROVED_CREDENTIAL_REFRESH_REMOTE_REQUEST_BEGINS", credentialRefreshCallsMax: 1, oauthTokenEndpointCallsMax: 1, recoveryIamReadsMax: 1, totalPhysicalRemoteCallsMax: 2, additionalHiddenRemoteCalls: 0, automaticRefreshRetries: 0, automaticRecoveryRetries: 0, secondRefreshRequest: 0, secondRecoveryRead: 0, projectIamReadsMax: 0, setIamPolicyCallsMax: 0, iamMutationsMax: 0, m4MutationsMax: 0, firestoreCallsMax: 0, testIamPermissionsCallsMax: 0, postRefreshMinimalGateOnly: true, v3r2JournalRequired: "PREPARED_AND_NOT_ENTERED", sourceLockManifestSha256: sha256Canonical(sourceLockManifest), implementationAttestationSha256: sha256Canonical(implementation), runtimeCapabilityAttestationSha256: sha256Canonical(runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(prospectiveSafetyEvidence), executionCompositeSha256: sha256Canonical(executionComposite), allRequiredLocalLocksMatch: true, bridgePacketReproducible: true, bridgePacketComplete: true, safeToContinueWithoutApproval: false });
  return Object.freeze({ ok: true, sourceLockManifest, implementation, runtimeCapability, prospectiveSafetyEvidence, executionComposite, approvalPacket });
}

export function verifyG2BV3R2RefreshReadBridge(value, options = {}) {
  try {
    const expected = prepareG2BV3R2RefreshReadBridge(options);
    const actual = { sourceLockManifest: value?.sourceLockManifest, implementation: value?.implementation, runtimeCapability: value?.runtimeCapability, prospectiveSafetyEvidence: value?.prospectiveSafetyEvidence, executionComposite: value?.executionComposite, approvalPacket: value?.approvalPacket };
    const wanted = { sourceLockManifest: expected.sourceLockManifest, implementation: expected.implementation, runtimeCapability: expected.runtimeCapability, prospectiveSafetyEvidence: expected.prospectiveSafetyEvidence, executionComposite: expected.executionComposite, approvalPacket: expected.approvalPacket };
    return Object.freeze({ ok: expected.ok === true && canonicalJson(actual) === canonicalJson(wanted) });
  } catch { return Object.freeze({ ok: false }); }
}

export async function verifyG2BV3R2BridgeMinimalPostRefreshGate({ transport, repositoryRoot = process.cwd() } = {}) {
  const readiness = await readG2BDirectCachedCredentialReadiness({ transport });
  const context = resolveG2BRecoveryV3R2Context();
  const journal = createG2BRecoveryExecutionJournal().load(G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE);
  const parent = parentArtifactMatches(repositoryRoot);
  return Object.freeze({ ok: fresh(readiness) && context.ok === true && parent.ok === true && journal.state === "READY" && journal.record?.phase === "PREPARED" && journal.record?.approvalConsumed === false && journal.record?.requestBoundaryEntered === false, readiness, context, journal, parent, remoteOperations: 0 });
}

export function createG2BV3R2RefreshReadBridgeExecutor({ inspectContext = inspectG2BV3R2RefreshReadBridgeContext, minimalGate = verifyG2BV3R2BridgeMinimalPostRefreshGate, createReadExecutor = createG2BGenerationBoundReadOnlyRecoveryV3R2Executor } = {}) {
  let used = false;
  return Object.freeze({ async execute({ enabled = false, authorizationPreconditionEstablished = false, consumeBridgeApproval, transport, bridgeJournal = createG2BV3R2RefreshReadBridgeJournal(), repositoryRoot = process.cwd() } = {}) {
    const counters = { credentialRefreshCalls: 0, recoveryIamReads: 0, totalPhysicalRemoteCalls: 0, setIamPolicyCalls: 0, iamMutations: 0, retries: 0, secondRefreshRequest: 0, secondRecoveryRead: 0, m4Mutations: 0, firestoreCalls: 0 };
    const inspected = await inspectContext({ transport });
    const authority = prepareG2BV3R2RefreshReadBridge({ repositoryRoot, contextInspection: inspected });
    if (enabled !== true || authorizationPreconditionEstablished !== true || used || typeof consumeBridgeApproval !== "function" || typeof transport?.executeDirectContextCredentialRefresh !== "function" || typeof transport?.readGenerationBoundRecoveryPolicy !== "function" || !authority.ok || !verifyG2BV3R2RefreshReadBridge(authority, { repositoryRoot, contextInspection: inspected }).ok) return Object.freeze({ ok: false, code: "V3R2_BRIDGE_BOUNDARY_REQUIRED", counters: Object.freeze(counters) });
    const prepared = bridgeJournal.initialize(G2B_V3R2_REFRESH_READ_BRIDGE_OPERATION_INSTANCE);
    if (!prepared.ok || prepared.record?.phase !== "PREPARED") return Object.freeze({ ok: false, code: "V3R2_BRIDGE_JOURNAL_NOT_PREPARED", counters: Object.freeze(counters) });
    if (await consumeBridgeApproval() !== true) return Object.freeze({ ok: false, code: "V3R2_BRIDGE_APPROVAL_NOT_CONSUMED", counters: Object.freeze(counters) });
    if (!bridgeJournal.transition(G2B_V3R2_REFRESH_READ_BRIDGE_OPERATION_INSTANCE, "BRIDGE_APPROVAL_CONSUMED").ok || !bridgeJournal.transition(G2B_V3R2_REFRESH_READ_BRIDGE_OPERATION_INSTANCE, "REFRESH_REQUEST_STARTED_RESPONSE_UNKNOWN").ok) return Object.freeze({ ok: false, code: "V3R2_BRIDGE_JOURNAL_BOUNDARY_FAILED", counters: Object.freeze(counters) });
    used = true; counters.credentialRefreshCalls = 1; counters.totalPhysicalRemoteCalls = 1;
    let refreshed; try { refreshed = await transport.executeDirectContextCredentialRefresh(); } catch { refreshed = null; }
    if (refreshed?.ok !== true || refreshed?.state !== "REFRESH_SUCCESS_CONFIRMED" || refreshed?.physicalCalls !== 1) { bridgeJournal.transition(G2B_V3R2_REFRESH_READ_BRIDGE_OPERATION_INSTANCE, "REFRESH_TERMINAL_FAILURE"); return Object.freeze({ ok: false, code: "V3R2_BRIDGE_REFRESH_INDETERMINATE", counters: Object.freeze(counters) }); }
    if (!bridgeJournal.transition(G2B_V3R2_REFRESH_READ_BRIDGE_OPERATION_INSTANCE, "REFRESH_SUCCESS_CONFIRMED").ok) return Object.freeze({ ok: false, code: "V3R2_BRIDGE_REFRESH_JOURNAL_FAILED", counters: Object.freeze(counters) });
    const gate = await minimalGate({ transport, repositoryRoot });
    if (!gate.ok) return Object.freeze({ ok: false, code: "V3R2_BRIDGE_MINIMAL_GATE_BLOCKED", counters: Object.freeze(counters) });
    if (!bridgeJournal.transition(G2B_V3R2_REFRESH_READ_BRIDGE_OPERATION_INSTANCE, "MINIMAL_GATE_PASSED").ok || !bridgeJournal.transition(G2B_V3R2_REFRESH_READ_BRIDGE_OPERATION_INSTANCE, "READ_DELEGATED").ok) return Object.freeze({ ok: false, code: "V3R2_BRIDGE_READ_JOURNAL_FAILED", counters: Object.freeze(counters) });
    const recovery = await createReadExecutor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, transport, recoveryContext: gate.context.context, preliveReadiness: gate.readiness });
    counters.recoveryIamReads = recovery.counters.recoveryServiceAccountIamPolicyReads;
    counters.totalPhysicalRemoteCalls += recovery.counters.totalPhysicalRemoteRecoveryCalls;
    return Object.freeze({ ok: recovery.recoveryResult !== "RECOVERY_NOT_ESTABLISHED", code: recovery.code, recoveryResult: recovery.recoveryResult, counters: Object.freeze(counters), postExecutionFinalization: recovery.postExecutionFinalization || null });
  } });
}

export function writeG2BV3R2RefreshReadBridge(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("v3r2-refresh-read-bridge-not-ready");
  const paths = {};
  for (const [key, relative] of Object.entries(OUTPUTS)) {
    const path = resolve(repositoryRoot, relative); const bytes = `${canonicalJson(value[key])}\n`;
    if (existsSync(path) && readFileSync(path, "utf8") !== bytes) throw new Error("v3r2-refresh-read-bridge-artifact-conflict");
    if (!existsSync(path)) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, bytes, { encoding: "utf8", mode: 0o600 }); }
    paths[key] = relative;
  }
  return Object.freeze({ paths, sourceLockManifestSha256: sha256Canonical(value.sourceLockManifest), implementationAttestationSha256: sha256Canonical(value.implementation), runtimeCapabilityAttestationSha256: sha256Canonical(value.runtimeCapability), prospectiveSafetyEvidenceSha256: sha256Canonical(value.prospectiveSafetyEvidence), executionCompositeSha256: sha256Canonical(value.executionComposite), approvalPacketSha256: sha256Canonical(value.approvalPacket), approvalPacketRawSha256: hash(resolve(repositoryRoot, OUTPUTS.approvalPacket)) });
}
