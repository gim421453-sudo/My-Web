import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { G2B_INTERRUPTED_M3_GENERATION } from "./g2bGenerationBoundReadOnlyRecovery.mjs";
import { computeG2BCleanCasPolicyCanonicalDigest, verifyG2BCleanCasBaselineEvidence } from "./g2bCleanGenerationCasEvidenceCapture.mjs";
import { G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE } from "./g2bGenerationBoundReadOnlyRecoveryV3R2.mjs";
import { resolveG2BRecoveryV3R2Context } from "./g2bGenerationBoundReadOnlyRecoveryV3R2.mjs";
import { buildG2BHostAnchorAttestation, classifyG2BHostAnchorAttestationFreshness, g2bHostAnchorAttestationPath, g2bHostAnchorSourceFingerprint, readFreshG2BHostAnchorAttestation, verifyG2BHostAnchorAttestation, writeG2BHostAnchorAttestation } from "./g2bHostAnchorAttestation.mjs";
import { resolveG2BLocalPinnedIdentity } from "./g2bLocalPinnedIdentityResolver.mjs";
import { createWindowsDpapiSecretProvider } from "./windowsDpapiSecretProvider.mjs";
import { createG2BRecoveryAnchorStore, G2B_TARGET_RESOURCE, G2B_TARGET_ROLE, verifyG2BRecoveryAnchor } from "./g2bRecoveryAnchor.mjs";
import { hasExplicitRemoteExecutionIntent, validateG2BCurrentRunExecutionEnvelope } from "./g2bCurrentRunExecutionIntent.mjs";
import { G2B_CAS_SOURCE_PATHS, G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION, computeCanonicalSourceFingerprint } from "./g2bCanonicalSourceFingerprint.mjs";

export const G2B_CAS_READ_OPERATION_INSTANCE = "6f8ccf99-a488-4d71-815c-13528feed0ad";
export const G2B_CAS_READ_STAGE = "P1.5-C2H2E3D-W1C-M3L3-G2B-CAS-EVIDENCE-READ";
export const G2B_CAS_MUTATION_PACKET_SCHEMA = "myweb.g2b.cas-mutation-approval-packet.v2";
const PARENT_BRIDGE_OPERATION = "f9ddbb53-3106-40cd-a930-2fba2d9d2152";
const PARENT_SOURCE_SNAPSHOT_DIGEST = "852764abb7e811db23060204be0d36f721594cd70d9a74c4235df4199bb89b91";
const PARENT_BRIDGE_APPROVAL_RAW_SHA256 = "bc0abb9d33653813e114abd9743a4bb7c730aa8f774eeadc3016af26ddecaf5f";
const PARENT_V3R2_CANONICAL_HASHES = Object.freeze({
  source: "aa0ba983a3ff6ff7ede6bc5d4c14f7a09be1056854f0c714704ae76f045922f4",
  implementation: "b851da36d92e039975cd5367dd5c5dcaca46701f2dcff99b1b4a0205ef1aa11e",
  runtime: "9abcbcb654b41727bfaa32ac1a2f5b035a629d9e993f98f262ad77daabaa46d8",
  safety: "b91c44e09127a5881e41f65301f2184a15f1ea96b511d5a2b9369d1e3c9e65a7",
  composite: "526403be24b3e1c48e3e0ca1d4a762cef019fd22b074937c6a80efdd805e12fd",
});
const PARENT_BRIDGE_EVIDENCE = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-execution-evidence-f9ddbb53-3106-40cd-a930-2fba2d9d2152-attempt-2.json";
const PARENT_BRIDGE_RESULT = "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-result-f9ddbb53-3106-40cd-a930-2fba2d9d2152-attempt-2.json";
const PARENT_ARTIFACTS = Object.freeze([
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-source-lock-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-implementation-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-runtime-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-prospective-safety-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-composite-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-source-lock-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-implementation-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-runtime-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-prospective-safety-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-composite-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-approval-packet-v5.json",
]);
const SOURCE_PATHS = G2B_CAS_SOURCE_PATHS;
const RETRY_SOURCE_PATHS = Object.freeze([
  "tools/authority-audit/g2bCasEvidenceCapture.mjs",
  "tools/authority-audit-tests/g2bCasEvidenceCapture.test.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/g2bExplicitSetIamPolicyTransport.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/g2bLocalPinnedIdentityResolver.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/g2bDirectCachedCredentialReadiness.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R2.mjs",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV2.mjs",
  "tools/authority-audit/g2bRecoveryExecutionJournal.mjs",
  PARENT_BRIDGE_EVIDENCE,
  PARENT_BRIDGE_RESULT,
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-approval-packet-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-refresh-read-bridge-composite-v5.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-composite-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-generation-bound-recovery-v3r2-approval-packet-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-approval-packet-v1.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-source-lock-v1.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-approval-packet-v2.json",
  "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-source-lock-v2.json",
]);
const CAS_OUTPUTS = Object.freeze({
  evidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-result-v1.json",
  approvalPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-approval-packet-v1.json",
  mutationPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-mutation-approval-packet-v1.json",
  resultSummary: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-result-summary-v1.json",
});
const CAS_RETRY_OUTPUTS = Object.freeze({
  sourceLock: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-source-lock-v5.json",
  packet: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-approval-packet-v5.json",
  evidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-evidence-v5.json",
  failure: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-failure-evidence-v5.json",
  resultSummary: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-result-v5.json",
  mutationPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-mutation-approval-packet-v5.json",
});
const CAS_READ_V2_OUTPUTS = Object.freeze({
  sourceLock: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-source-lock-v3.json",
  packet: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-approval-packet-v3.json",
  evidence: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-result-v3.json",
  failure: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-failure-v3.json",
  resultSummary: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-evidence-read-result-summary-v3.json",
  mutationPacket: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-mutation-approval-packet-v3.json",
});
export function createG2BCasEvidenceReadArtifactPaths(operationInstance, schemaVersion = 3) {
  if (!UUID.test(operationInstance || "") || !Number.isSafeInteger(schemaVersion) || schemaVersion < 1) throw new Error("cas-artifact-path-input-invalid");
  const prefix = `docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-v${schemaVersion}-${operationInstance}`;
  return Object.freeze({
    sourceLock: `${prefix}-source-lock.json`,
    packet: `${prefix}-approval-packet.json`,
    evidence: `${prefix}-evidence.json`,
    failure: `${prefix}-failure-evidence.json`,
    resultSummary: `${prefix}-result-summary.json`,
    mutationPacket: `${prefix}-mutation-approval-packet.json`,
  });
}
function validOperationArtifactPaths(paths, operationInstance) {
  const expected = ["sourceLock", "packet", "evidence", "failure", "resultSummary", "mutationPacket"];
  return paths && typeof paths === "object" && Object.keys(paths).length === expected.length
    && expected.every((key) => typeof paths[key] === "string" && paths[key].split(/[\\/]/).at(-1).includes(operationInstance))
    && new Set(expected.map((key) => paths[key])).size === expected.length;
}
function validExecutionArtifactPaths(paths, operationInstance) {
  const expected = ["evidence", "failure", "resultSummary", "mutationPacket"];
  return paths && expected.every((key) => typeof paths[key] === "string" && paths[key].split(/[\\/]/).at(-1).includes(operationInstance))
    && new Set(expected.map((key) => paths[key])).size === expected.length;
}
const REPAIRED_PARENT_SOURCE_PATHS = new Set([
  "tools/authority-audit/g2bCasEvidenceCapture.mjs",
  "tools/authority-audit-tests/g2bCasEvidenceCapture.test.mjs",
  "tools/authority-audit/g2bExplicitSetIamPolicyAuthTransport.mjs",
  "tools/authority-audit-tests/g2bExplicitSetIamPolicyAuthTransport.test.mjs",
  "tools/authority-audit/g2b_explicit_set_iam_policy_transport.py",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit/invokeWindowsDpapi.ps1",
  "tools/authority-audit/g2bGenerationBoundReadOnlyRecoveryV3R2.mjs",
  "tools/authority-audit-tests/windowsDpapiSecretProvider.test.mjs",
  "tools/authority-audit-tests/g2bGenerationBoundReadOnlyRecoveryV3R2.test.mjs",
]);
const ROOT_POLICY_KEYS = new Set(["version", "etag", "bindings", "auditConfigs"]);
const MEMBER = /^(?:user|serviceAccount):[^\s@]+@[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const ACCOUNT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const canonical = (value, ancestors = new Set()) => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite-json-number");
    return JSON.stringify(value);
  }
  if (typeof value === "bigint" || value === undefined || typeof value === "function" || typeof value === "symbol") throw new TypeError("unsupported-json-value");
  if (typeof value !== "object" || ancestors.has(value)) throw new TypeError("circular-or-invalid-json-value");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => canonical(item, ancestors)).join(",")}]`;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError("non-plain-json-object");
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key], ancestors)}`).join(",")}}`;
  } finally { ancestors.delete(value); }
};
export function serializeG2BCasJson(value) {
  const bytes = `${canonical(value)}\n`;
  if (canonical(JSON.parse(bytes)) !== bytes.trimEnd()) throw new Error("cas-json-roundtrip-failed");
  return bytes;
}
export function buildG2BCasEvidenceReadSourceLock({ repositoryRoot = process.cwd(), operationInstance = randomUUID() } = {}) {
  if (!UUID.test(operationInstance) || operationInstance === G2B_CAS_READ_OPERATION_INSTANCE) return Object.freeze({ ok: false, code: "CAS_SOURCE_LOCK_OPERATION_INVALID" });
  try {
    const root = resolve(repositoryRoot);
    const sourceLock = Object.freeze({ schema: "myweb.g2b.cas-evidence-read.source-lock.v3", operationInstance,
      parentBridgeOperationInstance: PARENT_BRIDGE_OPERATION,
      sourceLocks: Object.freeze(SOURCE_PATHS.map((path) => Object.freeze({ path, sha256: rawHash(resolve(root, path)) }))) });
    return Object.freeze({ ok: true, sourceLock, sourceLockDigest: digest(sourceLock), sourceLockFileCount: sourceLock.sourceLocks.length,
      sourceFingerprint: computeCanonicalSourceFingerprint(sourceLock.sourceLocks) });
  } catch { return Object.freeze({ ok: false, code: "CAS_SOURCE_LOCK_BUILD_FAILED" }); }
}
export function writeG2BCasEvidenceReadSourceLock(value, { repositoryRoot = process.cwd(), path = CAS_READ_V2_OUTPUTS.sourceLock } = {}) {
  if (value?.ok !== true || value.sourceLock?.schema !== "myweb.g2b.cas-evidence-read.source-lock.v3") throw new Error("cas-evidence-read-source-lock-not-ready");
  const absolute = resolve(repositoryRoot, path);
  atomicCreate(absolute, value.sourceLock);
  const persisted = readFileSync(absolute, "utf8");
  const parsed = JSON.parse(persisted);
  if (canonical(parsed) !== persisted.trimEnd() || digest(parsed) !== value.sourceLockDigest) throw new Error("cas-evidence-read-source-lock-roundtrip-failed");
  return Object.freeze({ path, rawSha256: rawHash(absolute), sourceLockDigest: digest(parsed), sourceLockFileCount: parsed.sourceLocks.length });
}
const digest = (value) => createHash("sha256").update(typeof value === "string" ? value : canonical(value), "utf8").digest("hex");
const rawHash = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fingerprint = (value) => digest(`myweb.g2b.cas-private-value.v1\n${value}`);

function validRecoveryContext(context, operationInstance, packet) {
  return context && typeof context === "object"
    && context.operationInstance === operationInstance
    && context.parentInterruptedM3Generation === (packet.generationBinding || packet.generationId)
    && context.targetResource === packet.targetResource && context.targetRole === packet.targetRole
    && context.authContextId === "g2b-explicit-direct-set-iam-policy-cached-credential-v2"
    && context.recoveryAnchorVerified === true
    && ACCOUNT.test(context.account || "") && MEMBER.test(context.member || "")
    && context.identityContext?.exactPrincipal === context.account
    && context.identityContext?.exactIamMember === context.member
    && typeof context.secretProvider?.read === "function"
    && typeof context.store?.load === "function";
}

function contextForCasRead(context, operationInstance) {
  return context && typeof context === "object"
    && context.operationInstance === operationInstance
    && context.parentInterruptedM3Generation === G2B_INTERRUPTED_M3_GENERATION
    && context.targetResource === G2B_TARGET_RESOURCE && context.targetRole === G2B_TARGET_ROLE
    && context.authContextId === "g2b-explicit-direct-set-iam-policy-cached-credential-v2"
    && context.recoveryAnchorVerified === true
    && ACCOUNT.test(context.account || "") && MEMBER.test(context.member || "")
    && context.identityContext?.exactPrincipal === context.account
    && context.identityContext?.exactIamMember === context.member
    && typeof context.secretProvider?.read === "function"
    && typeof context.store?.load === "function";
}

function validCondition(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).every((key) => ["expression", "title", "description", "location"].includes(key))
    && Object.values(value).every((item) => typeof item === "string");
}

function normalizePolicy(policy) {
  if (!policy || typeof policy !== "object" || Array.isArray(policy)
    || Object.keys(policy).some((key) => !ROOT_POLICY_KEYS.has(key))
    || !Number.isSafeInteger(policy.version) || ![0, 1, 3].includes(policy.version)
    || typeof policy.etag !== "string" || policy.etag.length === 0 || policy.etag.length > 512 || /[\s\u0000-\u001f\u007f]/.test(policy.etag)
    || !Array.isArray(policy.bindings)
    || (policy.auditConfigs !== undefined && !Array.isArray(policy.auditConfigs))) return null;
  const bindings = [];
  for (const binding of policy.bindings) {
    if (!binding || typeof binding !== "object" || Array.isArray(binding)
      || Object.keys(binding).some((key) => !["role", "members", "condition"].includes(key))
      || typeof binding.role !== "string" || !binding.role
      || !Array.isArray(binding.members) || !binding.members.every((member) => typeof member === "string" && MEMBER.test(member))
      || new Set(binding.members).size !== binding.members.length
      || (binding.condition !== undefined && !validCondition(binding.condition))
      || (policy.version < 3 && (binding.condition !== undefined || /_withcond_/i.test(binding.role)))) return null;
    bindings.push({ role: binding.role, members: [...new Set(binding.members)].sort(), ...(binding.condition === undefined ? {} : { condition: binding.condition }) });
  }
  let auditConfigs;
  if (policy.auditConfigs !== undefined) {
    auditConfigs = [];
    for (const config of policy.auditConfigs) {
      if (!config || typeof config !== "object" || Array.isArray(config)
        || Object.keys(config).some((key) => !["service", "auditLogConfigs"].includes(key))
        || typeof config.service !== "string" || !Array.isArray(config.auditLogConfigs)) return null;
      const entries = [];
      for (const entry of config.auditLogConfigs) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)
          || Object.keys(entry).some((key) => !["logType", "exemptedMembers"].includes(key))
          || typeof entry.logType !== "string"
          || (entry.exemptedMembers !== undefined && (!Array.isArray(entry.exemptedMembers) || !entry.exemptedMembers.every((m) => typeof m === "string" && MEMBER.test(m))))) return null;
        entries.push({ logType: entry.logType, ...(entry.exemptedMembers === undefined ? {} : { exemptedMembers: [...new Set(entry.exemptedMembers)].sort() }) });
      }
      auditConfigs.push({ service: config.service, auditLogConfigs: entries });
    }
  }
  return { version: policy.version, etag: policy.etag, bindings, ...(auditConfigs === undefined ? {} : { auditConfigs }) };
}

function policyDigests(policy, targetMember, targetRole) {
  const relevant = policy.bindings.filter((binding) => binding.role === targetRole).map((binding) => ({
    role: binding.role,
    memberFingerprints: binding.members.map(fingerprint).sort(),
    ...(binding.condition === undefined ? {} : { conditionDigest: digest(binding.condition) }),
  }));
  const unchanged = policy.bindings.filter((binding) => binding.role !== targetRole).map((binding) => ({
    role: binding.role,
    memberFingerprints: binding.members.map(fingerprint).sort(),
    ...(binding.condition === undefined ? {} : { conditionDigest: digest(binding.condition) }),
  }));
  const directBindings = policy.bindings.filter((binding) => binding.role === targetRole && binding.condition === undefined);
  const conditionalBindingCount = policy.bindings.filter((binding) => binding.role === targetRole && binding.condition !== undefined).length;
  const conditionalTargetMatch = policy.bindings.some((binding) => binding.role === targetRole && binding.condition !== undefined && binding.members.includes(targetMember));
  const auditConfigs = (policy.auditConfigs || []).map((config) => ({
    service: config.service,
    auditLogConfigs: config.auditLogConfigs.map((entry) => ({
      logType: entry.logType,
      ...(entry.exemptedMembers === undefined ? {} : { memberFingerprints: entry.exemptedMembers.map(fingerprint).sort() }),
    })),
  }));
  const policyBodyDigest = digest({ version: policy.version, bindings: [...relevant, ...unchanged].sort((a, b) => canonical(a).localeCompare(canonical(b))), auditConfigs });
  return Object.freeze({
    relevantBindingCount: relevant.length,
    relevantBindingsDigest: digest(relevant),
    unchangedBindingsDigest: digest(unchanged),
    targetBindingPresent: directBindings.some((binding) => binding.members.includes(targetMember)),
    conditionalTargetMatch,
    conditionalBindingCount,
    policyBodyDigest,
    directTargetRoleBindingCount: directBindings.length,
  });
}

export function captureG2BCasEvidence({ policy, provenance, iamResource = G2B_TARGET_RESOURCE, targetRole = G2B_TARGET_ROLE, targetPrincipal, generationId = G2B_INTERRUPTED_M3_GENERATION, sourceSnapshotDigest, sourceLockDigest, readTimestamp }) {
  const normalized = normalizePolicy(policy);
  if (!normalized || iamResource !== G2B_TARGET_RESOURCE || targetRole !== G2B_TARGET_ROLE
    || typeof targetPrincipal !== "string" || !MEMBER.test(targetPrincipal)
    || generationId !== G2B_INTERRUPTED_M3_GENERATION || sourceSnapshotDigest !== PARENT_SOURCE_SNAPSHOT_DIGEST
    || !SHA256.test(sourceLockDigest || "")
    || !Number.isFinite(Date.parse(readTimestamp || ""))
    || provenance?.kind !== "APPROVED_GENERATION_BOUND_LIVE_READ"
    || !UUID.test(provenance?.operationInstance || "")
    || provenance?.parentOperationInstance !== PARENT_BRIDGE_OPERATION
    || provenance?.approvalConsumed !== true || provenance?.requestStarted !== true
    || provenance?.httpStatus !== 200 || provenance?.fixture === true
    || provenance?.requestedPolicyVersion !== 3 || provenance?.returnedPolicyVersion !== normalized?.version
    || provenance?.versionSourceLayer !== "PYTHON_MESSAGE_TO_DICT") return Object.freeze({ ok: false, code: "CAS_EVIDENCE_PROVENANCE_OR_POLICY_INVALID" });
  const summary = policyDigests(normalized, targetPrincipal, targetRole);
  const policyWithTarget = structuredClone(normalized);
  const direct = policyWithTarget.bindings.find((binding) => binding.role === targetRole && binding.condition === undefined);
  if (direct) direct.members = [...new Set([...direct.members, targetPrincipal])].sort();
  else policyWithTarget.bindings.push({ role: targetRole, members: [targetPrincipal] });
  policyWithTarget.bindings.sort((a, b) => canonical(a).localeCompare(canonical(b)));
  const evidence = Object.freeze({
    schema: "myweb.g2b.cas-evidence.v1",
    evidenceClass: "ACTUAL_APPROVED_GENERATION_BOUND_READ",
    operationInstance: provenance.operationInstance,
    parentOperationInstance: provenance.parentOperationInstance,
    approvalPacketSha256: SHA256.test(provenance.approvalPacketSha256 || "") ? provenance.approvalPacketSha256 : null,
    iamResource,
    policyVersion: normalized.version,
    requestedPolicyVersion: provenance.requestedPolicyVersion,
    returnedPolicyVersion: provenance.returnedPolicyVersion,
    policyVersionSourceLayer: provenance.versionSourceLayer,
    etag: normalized.etag,
    targetRole,
    targetPrincipalDigest: fingerprint(targetPrincipal),
    targetBindingPresent: summary.targetBindingPresent,
    targetBindingState: summary.targetBindingPresent ? "PRESENT" : "ABSENT",
    relevantBindingCount: summary.relevantBindingCount,
    relevantBindingsDigest: summary.relevantBindingsDigest,
    unchangedBindingsDigest: summary.unchangedBindingsDigest,
    currentPolicyBodyDigest: summary.policyBodyDigest,
    policyShapeDigest: digest({ version: normalized.version, bindingCount: normalized.bindings.length,
      conditionalBindingCount: normalized.bindings.filter((binding) => binding.condition !== undefined).length,
      auditConfigCount: normalized.auditConfigs?.length || 0 }),
    directTargetRoleBindingCount: summary.directTargetRoleBindingCount,
    conditionalTargetMatch: summary.conditionalTargetMatch,
    conditionalBindingCount: summary.conditionalBindingCount,
    casBasisCaptured: true,
    casState: "CAS_BASIS_CAPTURED_FRESH_PRESTATE_RECHECK_REQUIRED",
    policyDriftStatus: summary.conditionalTargetMatch || summary.directTargetRoleBindingCount > 1 || summary.conditionalBindingCount > 0
      ? "TARGET_ROLE_CONFLICT_REQUIRES_REVIEW"
      : "NO_PRIOR_FULL_POLICY_BASELINE; FRESH_PRESTATE_MUST_MATCH_CAPTURED_DIGESTS",
    unexpectedBindingsClassification: "NOT_COMPARABLE_WITHOUT_PRIOR_FULL_POLICY_BASELINE",
    generationId,
    readTimestamp,
    sourceSnapshotDigest,
    sourceLockDigest,
    credentialRefreshCalls: Number.isSafeInteger(provenance.credentialRefreshCalls) ? provenance.credentialRefreshCalls : null,
    iamPolicyReadCalls: Number.isSafeInteger(provenance.iamPolicyReadCalls) ? provenance.iamPolicyReadCalls : null,
    totalPhysicalRemoteCalls: Number.isSafeInteger(provenance.totalPhysicalRemoteCalls) ? provenance.totalPhysicalRemoteCalls : null,
    setIamPolicyCalls: Number.isSafeInteger(provenance.setIamPolicyCalls) ? provenance.setIamPolicyCalls : null,
    iamMutations: Number.isSafeInteger(provenance.iamMutations) ? provenance.iamMutations : null,
    firestoreCalls: Number.isSafeInteger(provenance.firestoreCalls) ? provenance.firestoreCalls : null,
    storageWrites: Number.isSafeInteger(provenance.storageWrites) ? provenance.storageWrites : null,
    productionWrites: Number.isSafeInteger(provenance.productionWrites) ? provenance.productionWrites : null,
    approvalConsumed: provenance.approvalConsumed === true,
    nextStage: summary.targetBindingPresent ? "IAM_POST_READ_COMPLETION" : "FRESH_IAM_MUTATION_APPROVAL_REQUIRED",
    transportDiagnostics: safeTransportDiagnostics(provenance?.transportDiagnostics),
    expectedFinalStateDigest: digest(policyWithTarget),
    privacy: Object.freeze({ rawPolicyPersisted: false, rawPrincipalPersisted: false, rawCredentialPersisted: false, rawTokenPersisted: false }),
  });
  return Object.freeze({ ok: true, code: "CAS_EVIDENCE_CAPTURED", evidence, transientPolicy: normalized, targetPrincipal });
}

const SAFE_TRANSPORT_FAILURES = new Set(["NONE", "TRANSPORT_EXEC_FAILED", "TRANSPORT_TIMEOUT", "TRANSPORT_SIGNALLED", "TRANSPORT_NONZERO_EXIT", "TRANSPORT_PROVIDER_NONZERO_EXIT", "TRANSPORT_EMPTY_STDOUT", "TRANSPORT_INVALID_JSON", "TRANSPORT_SCHEMA_INVALID", "TRANSPORT_RESOURCE_MISMATCH", "TRANSPORT_REQUEST_RESOURCE_MISMATCH", "TRANSPORT_RESOURCE_VALIDATION_FAILED", "TRANSPORT_PROVIDER_POLICY_SCHEMA_INVALID", "TRANSPORT_POLICY_SCHEMA_INVALID", "TRANSPORT_SERIALIZATION_FAILED", "TRANSPORT_HELPER_INPUT_INVALID", "TRANSPORT_HELPER_UNHANDLED_EXCEPTION", "TRANSPORT_HELPER_UNKNOWN", "TRANSPORT_HELPER_ARG_PARSE_FAILED", "TRANSPORT_HELPER_STDIN_EMPTY", "TRANSPORT_HELPER_STDIN_READ_FAILED", "TRANSPORT_HELPER_INPUT_JSON_PARSE_FAILED", "TRANSPORT_HELPER_INPUT_SCHEMA_FAILED", "TRANSPORT_HELPER_REQUIRED_FIELD_MISSING", "TRANSPORT_HELPER_FIELD_TYPE_INVALID", "TRANSPORT_HELPER_ENVIRONMENT_CONTRACT_FAILED", "TRANSPORT_HELPER_LOCAL_CLIENT_SETUP_FAILED", "TRANSPORT_HELPER_ENTRYPOINT_EXCEPTION", "TRANSPORT_HELPER_DIAGNOSTIC_STATE_INCONSISTENT", "TRANSPORT_PERMISSION_DENIED", "TRANSPORT_AUTH_FAILURE", "TRANSPORT_RATE_LIMIT", "TRANSPORT_SERVER_ERROR", "TRANSPORT_NETWORK_ERROR", "TRANSPORT_TRUNCATED_OUTPUT", "TRANSPORT_ENCODING_ERROR", "TRANSPORT_ETAG_MISSING", "TRANSPORT_POLICY_VERSION_MISSING", "TRANSPORT_AMBIGUOUS_RESPONSE", "TRANSPORT_UNKNOWN"]);
function safeTransportDiagnostics(value) {
  const source = value && typeof value === "object" ? value : {};
  const failureClass = SAFE_TRANSPORT_FAILURES.has(source.failureClass) ? source.failureClass : "TRANSPORT_UNKNOWN";
  const safePhase = (phase) => typeof phase === "string" && /^PHASE_(?:0[1-9]|1[01])_[A-Z_]+$/.test(phase) ? phase : null;
  const rawVersionDiagnostic = source.versionDiagnostic || source.failureVersionDiagnostic;
  const inputContract = source.inputContract && typeof source.inputContract === "object" ? source.inputContract : null;
  const safeInputContract = inputContract ? Object.freeze({
    argvCount: Number.isSafeInteger(inputContract.argvCount) && inputContract.argvCount >= 0 ? inputContract.argvCount : null,
    argvShapeValid: typeof inputContract.argvShapeValid === "boolean" ? inputContract.argvShapeValid : null,
    stdinEncoding: inputContract.stdinEncoding === "UTF8" ? "UTF8" : null,
    stdinByteLength: Number.isSafeInteger(inputContract.stdinByteLength) && inputContract.stdinByteLength >= 0 ? inputContract.stdinByteLength : null,
    stdinBomPresent: typeof inputContract.stdinBomPresent === "boolean" ? inputContract.stdinBomPresent : null,
    stdinNewlineKind: ["NONE", "LF", "CRLF", "CR"].includes(inputContract.stdinNewlineKind) ? inputContract.stdinNewlineKind : null,
    stdinJsonParseSucceeded: typeof inputContract.stdinJsonParseSucceeded === "boolean" ? inputContract.stdinJsonParseSucceeded : null,
    stdinSchemaValidationSucceeded: typeof inputContract.stdinSchemaValidationSucceeded === "boolean" ? inputContract.stdinSchemaValidationSucceeded : null,
    helperInputObjectType: ["NOT_PARSED", "OBJECT", "ARRAY", "STRING", "BOOLEAN", "INTEGER", "FLOAT", "NULL"].includes(inputContract.helperInputObjectType) ? inputContract.helperInputObjectType : "UNKNOWN",
    helperInputKeyCount: Number.isSafeInteger(inputContract.helperInputKeyCount) && inputContract.helperInputKeyCount >= 0 ? inputContract.helperInputKeyCount : null,
    helperInputSafeKeys: Array.isArray(inputContract.helperInputSafeKeys) ? inputContract.helperInputSafeKeys.filter((key) => ["resource", "member", "account", "policy"].includes(key)) : [],
    requiredFieldsPresent: typeof inputContract.requiredFieldsPresent === "boolean" ? inputContract.requiredFieldsPresent : null,
    missingRequiredFields: Array.isArray(inputContract.missingRequiredFields) ? inputContract.missingRequiredFields.filter((key) => ["resource", "member", "account", "policy"].includes(key)) : [],
    fieldTypeSummary: inputContract.fieldTypeSummary && typeof inputContract.fieldTypeSummary === "object" ? Object.fromEntries(Object.entries(inputContract.fieldTypeSummary).filter(([key, type]) => ["resource", "member", "account", "policy"].includes(key) && ["NULL", "OBJECT", "ARRAY", "STRING", "BOOLEAN", "INTEGER", "FLOAT"].includes(type))) : {},
    environmentContractValid: typeof inputContract.environmentContractValid === "boolean" ? inputContract.environmentContractValid : null,
    requestBuildState: typeof inputContract.requestBuildState === "string" && /^[A-Z_]{1,48}$/.test(inputContract.requestBuildState) ? inputContract.requestBuildState : "UNKNOWN",
  }) : null;
  const safeVersionDiagnostic = (diagnostic) => diagnostic && typeof diagnostic === "object" ? Object.freeze({
    versionFieldPresent: diagnostic.versionFieldPresent === true,
    versionRawType: ["MISSING", "NULL", "BOOLEAN", "INTEGER", "FLOAT", "STRING", "OTHER"].includes(diagnostic.versionRawType) ? diagnostic.versionRawType : "UNKNOWN",
    versionRawPrimitiveValue: diagnostic.versionRawPrimitiveValue === null || Number.isSafeInteger(diagnostic.versionRawPrimitiveValue) && Math.abs(diagnostic.versionRawPrimitiveValue) <= 1000 || typeof diagnostic.versionRawPrimitiveValue === "string" && /^[0-9]{1,8}$/.test(diagnostic.versionRawPrimitiveValue) ? diagnostic.versionRawPrimitiveValue : null,
    versionAllowedSet: Array.isArray(diagnostic.versionAllowedSet) && JSON.stringify(diagnostic.versionAllowedSet) === "[0,1,3]" ? [0, 1, 3] : null,
    versionNormalizationResult: ["VALID", "INVALID", "MISSING"].includes(diagnostic.versionNormalizationResult) ? diagnostic.versionNormalizationResult : "UNKNOWN",
    versionNormalizationFailureReason: typeof diagnostic.versionNormalizationFailureReason === "string" && /^[A-Z_]{1,40}$/.test(diagnostic.versionNormalizationFailureReason) ? diagnostic.versionNormalizationFailureReason : "UNKNOWN",
    versionSource: ["MAPPING_KEY", "MESSAGE_TO_DICT", "MESSAGE_ATTRIBUTE", "MISSING"].includes(diagnostic.versionSource) ? diagnostic.versionSource : "MISSING",
  }) : null;
  return Object.freeze({
    failureClass,
    exitCode: Number.isInteger(source.exitCode) ? source.exitCode : null,
    signal: typeof source.signal === "string" && /^[A-Z0-9_-]{1,32}$/.test(source.signal) ? source.signal : null,
    timedOut: source.timedOut === true,
    spawnAttempted: source.spawnAttempted === true,
    childStarted: source.childStarted === true,
    stdoutPresent: source.stdoutPresent === true,
    stderrPresent: source.stderrPresent === true,
    stdoutByteLength: Number.isSafeInteger(source.stdoutByteLength) ? source.stdoutByteLength : 0,
    stderrByteLength: Number.isSafeInteger(source.stderrByteLength) ? source.stderrByteLength : 0,
    stdoutTruncated: source.stdoutTruncated === true,
    stderrTruncated: source.stderrTruncated === true,
    stdoutSha256: SHA256.test(source.stdoutSha256 || "") ? source.stdoutSha256 : null,
    stderrSha256: SHA256.test(source.stderrSha256 || "") ? source.stderrSha256 : null,
    stdoutDigest: SHA256.test(source.stdoutDigest || "") ? source.stdoutDigest : null,
    stderrDigest: SHA256.test(source.stderrDigest || "") ? source.stderrDigest : null,
    transportType: source.transportType === "CHILD_PROCESS" ? source.transportType : "UNKNOWN",
    targetResourceDigest: SHA256.test(source.targetResourceDigest || "") ? source.targetResourceDigest : null,
    jsonParseSucceeded: source.jsonParseSucceeded === true,
    schemaValidationSucceeded: source.schemaValidationSucceeded === true,
    resourceValidationSucceeded: typeof source.resourceValidationSucceeded === "boolean" ? source.resourceValidationSucceeded : null,
    stdinEncoding: source.stdinEncoding === "UTF8" ? "UTF8" : null,
    stdinWriteAttempted: typeof source.stdinWriteAttempted === "boolean" ? source.stdinWriteAttempted : null,
    stdinByteLength: Number.isSafeInteger(source.stdinByteLength) && source.stdinByteLength >= 0 ? source.stdinByteLength : null,
    stdinWritten: typeof source.stdinWritten === "boolean" ? source.stdinWritten : null,
    stdinBomPresent: typeof source.stdinBomPresent === "boolean" ? source.stdinBomPresent : null,
    stdinNewlineKind: ["NONE", "LF", "CRLF", "CR"].includes(source.stdinNewlineKind) ? source.stdinNewlineKind : null,
    stdinWriteCompleted: typeof source.stdinWriteCompleted === "boolean" ? source.stdinWriteCompleted : null,
    stdinClosed: typeof source.stdinClosed === "boolean" ? source.stdinClosed : null,
    errorClass: typeof source.errorClass === "string" && /^[A-Z0-9_-]{1,40}$/.test(source.errorClass) ? source.errorClass : "UNKNOWN",
    errorCode: typeof source.errorCode === "string" && /^[A-Z0-9_-]{1,40}$/.test(source.errorCode) ? source.errorCode : "UNCLASSIFIED",
    httpStatus: Number.isInteger(source.httpStatus) ? source.httpStatus : null,
    requestStarted: typeof source.requestStarted === "boolean" ? source.requestStarted : null,
    providerRequestPrepared: source.providerRequestPrepared === true,
    providerRequestStarted: typeof source.providerRequestStarted === "boolean" ? source.providerRequestStarted : null,
    policyVersionState: source.policyVersionState === "PRESENT" ? "PRESENT" : "UNKNOWN",
    versionDiagnostic: safeVersionDiagnostic(rawVersionDiagnostic),
    failureVersionDiagnostic: safeVersionDiagnostic(source.failureVersionDiagnostic),
    inputContract: safeInputContract,
    policyExtractionPath: ["DIRECT_POLICY_MAPPING", "KNOWN_PROVIDER_WRAPPER_POLICY", "SDK_POLICY_MESSAGE"].includes(source.policyExtractionPath) ? source.policyExtractionPath : null,
    providerResponseObjectType: ["MAPPING", "MESSAGE", "OBJECT", "NONE", "LIST", "TUPLE", "STR", "INT", "FLOAT", "BOOL"].includes(source.providerResponseObjectType) ? source.providerResponseObjectType : null,
    providerResponseReceived: typeof source.providerResponseReceived === "boolean" ? source.providerResponseReceived : null,
    httpStatusKnown: source.httpStatusKnown === true,
    lastCompletedPhase: safePhase(source.lastCompletedPhase),
    failedPhase: safePhase(source.failedPhase),
    helperFailureCode: typeof source.helperFailureCode === "string" && /^HELPER_[A-Z0-9_]{1,48}$/.test(source.helperFailureCode) ? source.helperFailureCode : null,
    unknownReason: typeof source.unknownReason === "string" && /^[A-Z0-9_-]{1,64}$/.test(source.unknownReason) ? source.unknownReason : "DIAGNOSTIC_METADATA_INCOMPLETE",
    timestamp: typeof source.timestamp === "string" && Number.isFinite(Date.parse(source.timestamp)) ? source.timestamp : null,
  });
}

export function buildG2BCasMutationApprovalPacket({ evidence, transientPolicy, targetPrincipal, operationInstance = randomUUID(), now = new Date().toISOString() } = {}) {
  if (evidence?.schema === "myweb.g2b.clean-generation-cas-read-evidence.v2") {
    const cleanValid = verifyG2BCleanCasBaselineEvidence(evidence)
      && evidence.baselineCapable === true && evidence.casState === "RESOLVED"
      && evidence.targetResource === G2B_TARGET_RESOURCE && evidence.targetRole === G2B_TARGET_ROLE
      && evidence.targetMember === targetPrincipal && evidence.targetBindingState === "ABSENT"
      && evidence.returnedPolicyVersionState === "UNSET" && evidence.returnedPolicyVersionValue === null
      && evidence.bindingsCount === 0 && evidence.relevantBindingCount === 0
      && evidence.conditionBindingCount === 0 && evidence.withcondMarkerCount === 0
      && evidence.conditionsPresent === false && evidence.etagPresent === true
      && SHA256.test(evidence.etagSha256 || "") && SHA256.test(evidence.policyCanonicalDigest || "")
      && SHA256.test(evidence.fullBindingsCanonicalDigest || "") && SHA256.test(evidence.conditionCanonicalDigest || "")
      && SHA256.test(evidence.relevantBindingsDigest || "") && SHA256.test(evidence.sourceFingerprint || "")
      && SHA256.test(evidence.sourceLockDigest || "") && UUID.test(evidence.generationId || "")
      && UUID.test(evidence.operationId || "") && UUID.test(operationInstance)
      && Number.isFinite(Date.parse(now));
    if (!cleanValid) return Object.freeze({ ok: false, code: "CLEAN_GENERATION_BASELINE_MUTATION_PACKET_BLOCKED" });
    const targetPrincipalDigest = fingerprint(targetPrincipal);
    const exactAddDelta = Object.freeze({ role: G2B_TARGET_ROLE, memberDigest: targetPrincipalDigest,
      addMemberToExistingBinding: false, createBinding: true });
    const packet = Object.freeze({
      schema: G2B_CAS_MUTATION_PACKET_SCHEMA, status: "APPROVAL_REQUIRED", basisType: "CLEAN_GENERATION_BASELINE_V2",
      operationInstance, mutationOperationInstance: operationInstance,
      parentReadOperationInstance: evidence.operationId, parentCasReadOperationInstance: evidence.operationId,
      generationId: evidence.generationId, sourceFingerprint: evidence.sourceFingerprint,
      sourceLockDigest: evidence.sourceLockDigest, targetResource: evidence.targetResource,
      targetRole: evidence.targetRole, targetPrincipalDigest,
      targetBindingCurrentState: "ABSENT", policyVersionState: "UNSET", policyVersion: null,
      currentPolicyVersion: null, returnedPolicyVersionState: "UNSET", returnedPolicyVersion: null,
      currentEtag: null, currentEtagSha256: evidence.etagSha256,
      requestedPolicyVersion: evidence.requestedPolicyVersion,
      baselineOperationId: evidence.operationId, baselineIdDigest: evidence.baselineIdDigest,
      baselineEvidenceIntegrityDigest: evidence.evidenceIntegrityDigest,
      baselinePolicyCanonicalDigest: evidence.policyCanonicalDigest,
      baselineFullBindingsCanonicalDigest: evidence.fullBindingsCanonicalDigest,
      baselineConditionCanonicalDigest: evidence.conditionCanonicalDigest,
      baselineRelevantBindingsDigest: evidence.relevantBindingsDigest,
      preReadRequired: true, preReadSemanticMatchRequired: true,
      setPolicyEffectiveVersion: null, setPolicyEffectiveVersionState: "UNSET", policyHasConditions: false,
      currentRelevantBindingsDigest: evidence.relevantBindingsDigest,
      unchangedBindingsDigest: evidence.fullBindingsCanonicalDigest,
      currentPolicyBodyDigest: evidence.policyCanonicalDigest,
      policyDriftStatus: "FRESH_PRE_READ_SEMANTIC_EQUALITY_REQUIRED",
      casState: "BASELINE_MATCH_AND_FRESH_ETAG_CAS_REQUIRED",
      exactAddDelta, exactRemoveDelta: Object.freeze([]),
      expectedFinalStateDigest: digest({ schema: "myweb.g2b.clean-generation-mutation-final-state.v1",
        baselinePolicyCanonicalDigest: evidence.policyCanonicalDigest, exactAddDelta }),
      credentialRefreshMax: 1, preMutationReadMax: 1, setIamPolicyMax: 1,
      postMutationVerificationReadMax: 1, totalPhysicalRemoteCallsMax: 4,
      budgets: Object.freeze({ credentialRefreshMax: 1, preMutationIamReadMax: 1,
        setIamPolicyMax: 1, verificationReadMax: 1, totalPhysicalRemoteCallsMax: 4,
        firestoreMax: 0, storageMax: 0 }),
      automaticRetryMax: 0, rollbackStrategy: "NO_AUTOMATIC_ROLLBACK; STOP_ON_UNKNOWN_SET_RESULT",
      recoveryStrategy: "SEPARATE_FRESH_READ_ONLY_RECOVERY_APPROVAL",
      mutationReachable: false, approvalOneTimeSemantics: true,
      idempotencyKey: digest(`myweb.g2b.clean-generation-mutation.v1\n${operationInstance}\n${evidence.operationId}\n${evidence.policyCanonicalDigest}`),
      createdAt: now,
    });
    return Object.freeze({ ok: true, code: "MUTATION_APPROVAL_PACKET_READY", packet });
  }
  const policy = normalizePolicy(transientPolicy);
  const summary = policy && typeof targetPrincipal === "string" ? policyDigests(policy, targetPrincipal, G2B_TARGET_ROLE) : null;
  if (!evidence || evidence.schema !== "myweb.g2b.cas-evidence.v1" || evidence.evidenceClass !== "ACTUAL_APPROVED_GENERATION_BOUND_READ"
    || evidence.casBasisCaptured !== true || evidence.generationId !== G2B_INTERRUPTED_M3_GENERATION
    || evidence.iamResource !== G2B_TARGET_RESOURCE || evidence.targetRole !== G2B_TARGET_ROLE
    || !SHA256.test(evidence.sourceSnapshotDigest || "") || !SHA256.test(evidence.sourceLockDigest || "")
    || evidence.targetBindingState !== "ABSENT" || evidence.targetBindingPresent !== false
    || evidence.targetPrincipalDigest !== fingerprint(targetPrincipal) || !policy
    || summary.targetBindingPresent || summary.conditionalTargetMatch || summary.directTargetRoleBindingCount > 1 || summary.conditionalBindingCount > 0
    || evidence.etag !== policy.etag || evidence.policyVersion !== policy.version
    || evidence.requestedPolicyVersion !== 3 || evidence.returnedPolicyVersion !== policy.version
    || evidence.policyVersionSourceLayer !== "PYTHON_MESSAGE_TO_DICT"
    || evidence.relevantBindingsDigest !== summary.relevantBindingsDigest
    || evidence.unchangedBindingsDigest !== summary.unchangedBindingsDigest
    || evidence.currentPolicyBodyDigest !== summary.policyBodyDigest
    || !Number.isFinite(Date.parse(evidence.readTimestamp || ""))
    || !Number.isFinite(Date.parse(now))
    || Date.parse(now) - Date.parse(evidence.readTimestamp) > 10 * 60_000
    || Date.parse(evidence.readTimestamp) - Date.parse(now) > 60_000
    || !UUID.test(operationInstance)) return Object.freeze({ ok: false, code: "CAS_MUTATION_PACKET_BLOCKED" });
  const existingDirect = policy.bindings.find((binding) => binding.role === G2B_TARGET_ROLE && binding.condition === undefined);
  const hasConditions = policy.bindings.some((binding) => binding.condition !== undefined);
  if (policy.version < 3 && (hasConditions || policy.bindings.some((binding) => /_withcond_/i.test(binding.role)))) {
    return Object.freeze({ ok: false, code: "CAS_POLICY_VERSION_CONDITION_SAFETY_BLOCKED" });
  }
  const setPolicyEffectiveVersion = hasConditions ? 3 : policy.version;
  const packet = Object.freeze({
    schema: G2B_CAS_MUTATION_PACKET_SCHEMA,
    status: "APPROVAL_REQUIRED",
    operationInstance,
    parentReadOperationInstance: evidence.operationInstance,
    parentBridgeOperationInstance: PARENT_BRIDGE_OPERATION,
    parentV3R2Artifact: PARENT_ARTIFACTS[4],
    targetResource: evidence.iamResource,
    targetRole: evidence.targetRole,
    targetPrincipalDigest: evidence.targetPrincipalDigest,
    currentEtag: evidence.etag,
    policyVersion: evidence.policyVersion,
    requestedPolicyVersion: evidence.requestedPolicyVersion,
    returnedPolicyVersion: evidence.returnedPolicyVersion,
    setPolicyEffectiveVersion,
    policyHasConditions: hasConditions,
    currentRelevantBindingsDigest: evidence.relevantBindingsDigest,
    unchangedBindingsDigest: evidence.unchangedBindingsDigest,
    currentPolicyBodyDigest: evidence.currentPolicyBodyDigest,
    policyDriftStatus: evidence.policyDriftStatus,
    unexpectedBindingsClassification: evidence.unexpectedBindingsClassification,
    casState: "FRESH_PRESTATE_RECHECK_AND_ETAG_CAS_REQUIRED",
    targetBindingCurrentState: "ABSENT",
    currentPolicyVersion: evidence.policyVersion,
    exactAddDelta: Object.freeze({ role: G2B_TARGET_ROLE, memberDigest: evidence.targetPrincipalDigest, addMemberToExistingBinding: Boolean(existingDirect), createBinding: !existingDirect }),
    exactRemoveDelta: Object.freeze([]),
    expectedFinalStateDigest: evidence.expectedFinalStateDigest,
    sourceSnapshotDigest: evidence.sourceSnapshotDigest,
    casReadSourceLockDigest: evidence.sourceLockDigest,
    sourceLockDigest: evidence.sourceLockDigest,
    parentCasReadOperationInstance: evidence.operationInstance,
    mutationOperationInstance: operationInstance,
    generationId: evidence.generationId,
    casRequirement: "FRESH_PRESTATE_ETAG_AND_POLICY_VERSION_MUST_MATCH_APPROVED_CAS_BASIS",
    CASRequirement: "FRESH_PRESTATE_ETAG_AND_POLICY_VERSION_MUST_MATCH_APPROVED_CAS_BASIS",
    credentialRefreshMax: 1,
    preMutationReadMax: 1,
    setIamPolicyMax: 1,
    postMutationVerificationReadMax: 1,
    totalPhysicalRemoteCallsMax: 4,
    budgets: Object.freeze({ credentialRefreshMax: 1, preMutationIamReadMax: 1, setIamPolicyMax: 1, verificationReadMax: 1, totalPhysicalRemoteCallsMax: 4, firestoreMax: 0, storageMax: 0 }),
    rollbackStrategy: "NO_AUTOMATIC_ROLLBACK; STOP_ON_UNKNOWN_SET_RESULT_AND_REQUIRE_SEPARATE_READ_ONLY_RECOVERY_APPROVAL",
    recoveryStrategy: "GENERATION_BOUND_READ_ONLY_RECOVERY_WITH_SEPARATE_FRESH_APPROVAL",
    stopMatrix: Object.freeze(["ETAG_MISMATCH", "POLICY_VERSION_MISMATCH", "RESOURCE_MISMATCH", "TARGET_PRESENT", "POLICY_DRIFT", "CAS_AMBIGUOUS", "GENERATION_MISMATCH", "SOURCE_LOCK_MISMATCH", "READ_FAILURE"]),
    approvalOneTimeSemantics: true,
    idempotencyKey: digest(`myweb.g2b.cas-mutation.v1\n${operationInstance}\n${evidence.operationInstance}\n${evidence.etag}\n${evidence.expectedFinalStateDigest}`),
    mutationReachable: false,
    createdAt: now,
  });
  return Object.freeze({ ok: true, code: "MUTATION_APPROVAL_PACKET_READY", packet });
}

export function verifyG2BCasMutationApprovalPacket(packet) {
  if (packet?.basisType === "CLEAN_GENERATION_BASELINE_V2") {
    return Object.freeze({ ok: packet.schema === G2B_CAS_MUTATION_PACKET_SCHEMA
      && packet.status === "APPROVAL_REQUIRED" && packet.mutationReachable === false
      && UUID.test(packet.operationInstance || "") && packet.mutationOperationInstance === packet.operationInstance
      && UUID.test(packet.parentReadOperationInstance || "") && packet.parentCasReadOperationInstance === packet.parentReadOperationInstance
      && UUID.test(packet.generationId || "") && SHA256.test(packet.sourceFingerprint || "")
      && SHA256.test(packet.sourceLockDigest || "") && packet.targetResource === G2B_TARGET_RESOURCE
      && packet.targetRole === G2B_TARGET_ROLE && SHA256.test(packet.targetPrincipalDigest || "")
      && packet.targetBindingCurrentState === "ABSENT" && packet.policyVersionState === "UNSET"
      && packet.policyVersion === null && packet.currentPolicyVersion === null
      && packet.returnedPolicyVersionState === "UNSET" && packet.returnedPolicyVersion === null
      && packet.currentEtag === null && SHA256.test(packet.currentEtagSha256 || "")
      && packet.preReadRequired === true && packet.preReadSemanticMatchRequired === true
      && packet.setPolicyEffectiveVersionState === "UNSET" && packet.setPolicyEffectiveVersion === null
      && packet.requestedPolicyVersion === 3 && packet.preMutationReadMax === 1
      && packet.setIamPolicyMax === 1 && packet.postMutationVerificationReadMax === 1
      && packet.totalPhysicalRemoteCallsMax === 4 && packet.budgets?.setIamPolicyMax === 1
      && packet.budgets?.preMutationIamReadMax === 1 && packet.budgets?.verificationReadMax === 1
      && packet.automaticRetryMax === 0 && packet.exactAddDelta?.role === G2B_TARGET_ROLE
      && packet.exactAddDelta?.createBinding === true && packet.exactRemoveDelta?.length === 0
      && SHA256.test(packet.baselinePolicyCanonicalDigest || "")
      && SHA256.test(packet.baselineFullBindingsCanonicalDigest || "")
      && SHA256.test(packet.baselineConditionCanonicalDigest || "")
      && SHA256.test(packet.baselineRelevantBindingsDigest || "")
      && SHA256.test(packet.baselineEvidenceIntegrityDigest || "")
      && SHA256.test(packet.baselineIdDigest || "") && SHA256.test(packet.idempotencyKey || "") });
  }
  return Object.freeze({ ok: packet?.schema === G2B_CAS_MUTATION_PACKET_SCHEMA
    && packet.status === "APPROVAL_REQUIRED" && packet.mutationReachable === false
    && packet.targetResource === G2B_TARGET_RESOURCE && packet.targetRole === G2B_TARGET_ROLE
    && packet.parentV3R2Artifact === PARENT_ARTIFACTS[4] && packet.credentialRefreshMax === 1
    && packet.exactAddDelta?.role === G2B_TARGET_ROLE
    && packet.budgets?.setIamPolicyMax === 1 && packet.budgets?.preMutationIamReadMax === 1
    && packet.budgets?.verificationReadMax === 1 && packet.exactRemoveDelta?.length === 0
    && typeof packet.currentEtag === "string" && packet.currentEtag.length > 0
    && packet.currentPolicyVersion === packet.policyVersion && Number.isSafeInteger(packet.currentPolicyVersion)
    && [0, 1, 3].includes(packet.currentPolicyVersion)
    && packet.setPolicyEffectiveVersion === (packet.policyHasConditions === true ? 3 : packet.returnedPolicyVersion)
    && (packet.policyHasConditions !== true || packet.setPolicyEffectiveVersion === 3)
    && packet.requestedPolicyVersion === 3 && packet.returnedPolicyVersion === packet.currentPolicyVersion
    && packet.parentCasReadOperationInstance === packet.parentReadOperationInstance
    && packet.preMutationReadMax === 1 && packet.setIamPolicyMax === 1
    && packet.postMutationVerificationReadMax === 1 && packet.totalPhysicalRemoteCallsMax === 4
    && packet.rollbackStrategy?.startsWith("NO_AUTOMATIC_ROLLBACK")
    && packet.exactAddDelta && SHA256.test(packet.expectedFinalStateDigest || "")
    && packet.sourceLockDigest === packet.casReadSourceLockDigest
    && packet.CASRequirement === packet.casRequirement
    && packet.targetBindingCurrentState === "ABSENT"
    && SHA256.test(packet.idempotencyKey || "") });
}

export function completeG2BCasEvidenceRead({ readResult, provenance, targetPrincipal, sourceSnapshotDigest = PARENT_SOURCE_SNAPSHOT_DIGEST, sourceLockDigest, operationInstance = randomUUID(), now = new Date().toISOString() } = {}) {
  if (readResult?.ok !== true || !readResult.policy || readResult.physicalCalls !== 1) return Object.freeze({ ok: false, code: "CAS_READ_FAILED_NO_MUTATION_PACKET" });
  const captured = captureG2BCasEvidence({ policy: readResult.policy, iamResource: G2B_TARGET_RESOURCE, provenance: { ...provenance,
    requestedPolicyVersion: readResult.requestedPolicyVersion, returnedPolicyVersion: readResult.returnedPolicyVersion,
    versionSourceLayer: readResult.versionSourceLayer, transportDiagnostics: readResult.safeTransportMetadata }, targetPrincipal, sourceSnapshotDigest, sourceLockDigest, readTimestamp: now });
  if (!captured.ok) return Object.freeze({ ok: false, code: captured.code });
  if (captured.evidence.targetBindingPresent) return Object.freeze({ ok: true, code: "ALREADY_TARGET_STATE", evidence: captured.evidence, mutationRequired: false, mutationPacket: null });
  const packet = buildG2BCasMutationApprovalPacket({ evidence: captured.evidence, transientPolicy: captured.transientPolicy, targetPrincipal, operationInstance, now });
  if (!packet.ok) return Object.freeze({ ok: false, code: packet.code, evidence: captured.evidence, mutationRequired: true, mutationPacket: null });
  return Object.freeze({ ok: true, code: "MUTATION_REQUIRED_FRESH_APPROVAL", evidence: captured.evidence, mutationRequired: true, mutationPacket: packet.packet });
}

export function prepareG2BCasEvidenceReadApproval({ repositoryRoot = process.cwd(), operationInstance = randomUUID(), outputPaths, recoveryContext, purpose = "CAS_EVIDENCE_READ_AFTER_EXECUTION_INTENT_PRECEDENCE_REPAIR" } = {}) {
  const root = resolve(repositoryRoot);
  outputPaths ||= createG2BCasEvidenceReadArtifactPaths(operationInstance);
  try {
    if (!UUID.test(operationInstance) || operationInstance === G2B_CAS_READ_OPERATION_INSTANCE
      || !validOperationArtifactPaths(outputPaths, operationInstance)
      || Object.values(outputPaths).some((path) => existsSync(resolve(root, path)))) return Object.freeze({ ok: false, code: "ARTIFACT_PATH_COLLISION" });
    const existingSourceLockPath = resolve(root, outputPaths.sourceLock);
    if (existsSync(existingSourceLockPath)) return Object.freeze({ ok: false, code: "ARTIFACT_PATH_COLLISION" });
    const resolvedContext = recoveryContext
      ? { ok: true, context: recoveryContext }
      : resolveG2BRecoveryV3R2Context({ operationInstance });
    if (!resolvedContext.ok || !contextForCasRead(resolvedContext.context, operationInstance)) return Object.freeze({ ok: false, code: resolvedContext.code || "CAS_READ_CANONICAL_IDENTITY_UNAVAILABLE" });
    const bridgeEvidence = JSON.parse(readFileSync(resolve(root, PARENT_BRIDGE_EVIDENCE), "utf8"));
    const bridgeResult = JSON.parse(readFileSync(resolve(root, PARENT_BRIDGE_RESULT), "utf8"));
    const v3r2Paths = PARENT_ARTIFACTS.slice(0, 5);
    const v3r2 = Object.fromEntries(v3r2Paths.map((path) => [path, JSON.parse(readFileSync(resolve(root, path), "utf8"))]));
    const v3r2Source = v3r2[v3r2Paths[0]];
    const v3r2Impl = v3r2[v3r2Paths[1]];
    const v3r2Runtime = v3r2[v3r2Paths[2]];
    const v3r2Safety = v3r2[v3r2Paths[3]];
    const v3r2Composite = v3r2[v3r2Paths[4]];
    const v3r2CanonicalHashes = [digest(v3r2Source), digest(v3r2Impl), digest(v3r2Runtime), digest(v3r2Safety), digest(v3r2Composite)];
    if (v3r2CanonicalHashes.join(":") !== Object.values(PARENT_V3R2_CANONICAL_HASHES).join(":")) return Object.freeze({ ok: false, code: "CAS_PARENT_V3R2_ARTIFACT_MISMATCH" });
    const parentV3R2SourceLocks = v3r2Source?.sourceLocks;
    if (!Array.isArray(parentV3R2SourceLocks) || parentV3R2SourceLocks.length !== 15
      || parentV3R2SourceLocks.some((entry) => typeof entry.path !== "string"
        || (!REPAIRED_PARENT_SOURCE_PATHS.has(entry.path) && rawHash(resolve(root, entry.path)) !== entry.sha256))) return Object.freeze({ ok: false, code: "CAS_PARENT_V3R2_SOURCE_LOCK_MISMATCH" });
    const bridgePaths = PARENT_ARTIFACTS.slice(5);
    const bridgeArtifacts = Object.fromEntries(bridgePaths.map((path) => [path, JSON.parse(readFileSync(resolve(root, path), "utf8"))]));
    const bridgeSourceLock = bridgeArtifacts[bridgePaths[0]];
    const bridgeImplementation = bridgeArtifacts[bridgePaths[1]];
    const bridgeRuntime = bridgeArtifacts[bridgePaths[2]];
    const bridgeSafety = bridgeArtifacts[bridgePaths[3]];
    const bridgeComposite = bridgeArtifacts[bridgePaths[4]];
    const bridgePacket = bridgeArtifacts[bridgePaths[5]];
    if (!Array.isArray(bridgeSourceLock.sourceLocks) || bridgeSourceLock.sourceLocks.length !== 14
      || bridgeSourceLock.sourceLocks.some((entry) => typeof entry.path !== "string"
        || (!REPAIRED_PARENT_SOURCE_PATHS.has(entry.path) && rawHash(resolve(root, entry.path)) !== entry.sha256))
      || digest(bridgeSourceLock) !== bridgeComposite.sourceLockManifestSha256
      || digest(bridgeImplementation) !== bridgeComposite.implementationAttestationSha256
      || digest(bridgeRuntime) !== bridgeComposite.runtimeCapabilityAttestationSha256
      || digest(bridgeSafety) !== bridgeComposite.prospectiveSafetyEvidenceSha256
      || digest(bridgeComposite) !== bridgePacket.executionCompositeSha256
      || rawHash(resolve(root, PARENT_ARTIFACTS[10])) !== PARENT_BRIDGE_APPROVAL_RAW_SHA256
      || bridgePacket.operationInstance !== PARENT_BRIDGE_OPERATION || bridgePacket.totalPhysicalRemoteCallsMax !== 2
      || bridgePacket.setIamPolicyCallsMax !== 0 || bridgePacket.iamMutationsMax !== 0) return Object.freeze({ ok: false, code: "CAS_PARENT_BRIDGE_ARTIFACT_MISMATCH" });
    if (bridgeEvidence.operationInstance !== PARENT_BRIDGE_OPERATION || bridgeEvidence.approvalConsumed !== true
      || bridgeEvidence.iamStateClassification !== "RECOVERY_CONFIRMED_ABSENT"
      || bridgeEvidence.physicalRemoteCalls?.total !== 2 || bridgeEvidence.setIamPolicyCalls !== 0
      || bridgeEvidence.iamMutations !== 0 || bridgeEvidence.firestoreCalls !== 0
      || bridgeEvidence.sourceSnapshotDigest !== PARENT_SOURCE_SNAPSHOT_DIGEST
      || bridgeEvidence.approvalPacketSha256 !== PARENT_BRIDGE_APPROVAL_RAW_SHA256
      || bridgeEvidence.recoveryFinalization?.ok !== true
      || bridgeEvidence.recoveryFinalization?.executionEvidenceCanonicalSha256 !== bridgeEvidence.recoveryFinalization?.independentlyRecomputedExecutionEvidenceCanonicalSha256
      || bridgeResult.operationInstance !== PARENT_BRIDGE_OPERATION || bridgeResult.currentExactBindingClassification !== "ABSENT"
      || bridgeResult.approvalPacketSha256 !== PARENT_BRIDGE_APPROVAL_RAW_SHA256
      || bridgeResult.setIamPolicyCalls !== 0 || bridgeResult.iamMutations !== 0 || bridgeResult.firestoreCalls !== 0) return Object.freeze({ ok: false, code: "CAS_PARENT_EVIDENCE_INVALID" });
    const builtSourceLock = buildG2BCasEvidenceReadSourceLock({ repositoryRoot: root, operationInstance });
    if (!builtSourceLock.ok) return builtSourceLock;
    const sourceLock = builtSourceLock.sourceLock;
    const sourceLockDigest = builtSourceLock.sourceLockDigest;
    const parentV3R2ArtifactRawHashes = Object.fromEntries(PARENT_ARTIFACTS.slice(0, 5).map((path) => [path, rawHash(resolve(root, path))]));
    const parentBridgeAuthorityArtifactRawHashes = Object.fromEntries(PARENT_ARTIFACTS.slice(5).map((path) => [path, rawHash(resolve(root, path))]));
    const parentSnapshotDigest = PARENT_SOURCE_SNAPSHOT_DIGEST;
    const packet = Object.freeze({
      schema: "myweb.g2b.cas-evidence-read.approval-packet.v3",
      stage: `${G2B_CAS_READ_STAGE}-V3`,
      type: "CAS_EVIDENCE_CAPTURE_ONLY",
      status: "APPROVAL_REQUIRED",
      operationInstance,
      parentOperationInstance: PARENT_BRIDGE_OPERATION,
      parentRecoveryOperationInstance: G2B_GENERATION_BOUND_RECOVERY_V3R2_OPERATION_INSTANCE,
      generationId: G2B_INTERRUPTED_M3_GENERATION,
      purpose,
      targetResource: G2B_TARGET_RESOURCE,
      targetRole: G2B_TARGET_ROLE,
      targetAccountFingerprint: fingerprint(resolvedContext.context.account),
      targetMemberFingerprint: fingerprint(resolvedContext.context.member),
      expectedTargetBindingState: "ABSENT",
      requestedPolicyVersion: 3,
      parentBridgeExecutionEvidenceRawSha256: rawHash(resolve(root, PARENT_BRIDGE_EVIDENCE)),
      parentBridgeResultRawSha256: rawHash(resolve(root, PARENT_BRIDGE_RESULT)),
      parentV3R2ArtifactRawHashes,
      parentBridgeAuthorityArtifactRawHashes,
      parentSourceSnapshotDigest: parentSnapshotDigest,
      sourceSnapshotDigest: parentSnapshotDigest,
      sourceLockArtifact: outputPaths.sourceLock,
      sourceLockDigest,
      sourceLock,
      sourceFingerprintSchemaVersion: G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION,
      sourceFingerprint: builtSourceLock.sourceFingerprint,
      credentialRefreshMax: 1,
      iamPolicyReadMax: 1,
      totalPhysicalRemoteCallsMax: 2,
      setIamPolicyMax: 0,
      iamMutationMax: 0,
      firestoreMax: 0,
      storageMax: 0,
      productionWriteMax: 0,
      retryMax: 0,
      expectedEvidenceFields: Object.freeze(["iamResource", "requestedPolicyVersion", "returnedPolicyVersion", "policyVersionSourceLayer", "policyShapeDigest", "policyVersion", "etag", "targetRole", "targetPrincipalDigest", "targetBindingPresent", "relevantBindingCount", "relevantBindingsDigest", "unchangedBindingsDigest", "currentPolicyBodyDigest", "casBasisCaptured", "casState", "policyDriftStatus", "unexpectedBindingsClassification", "generationId", "readTimestamp", "sourceSnapshotDigest", "sourceLockDigest"]),
      expectedSuccessSchema: Object.freeze({ requestedPolicyVersion: 3, returnedPolicyVersion: "actual-provider-value-0-1-or-3", versionSourceLayer: "PYTHON_MESSAGE_TO_DICT", etag: "non-empty-string", policyShapeDigest: "sha256", targetBindingState: "known", relevantBindingsDigest: "sha256", rawPolicyPersisted: false }),
      evidencePolicy: "persist etag and policy version; persist digests/counts only for principal/binding data; never persist raw policy/member/token/credential",
      approvalConsumptionBoundary: "BEFORE_THE_FIRST_AND_ONLY_CREDENTIAL_REFRESH_REMOTE_REQUEST",
      idempotencyKey: digest(`myweb.g2b.cas-read.v3\n${operationInstance}\n${PARENT_BRIDGE_OPERATION}\n${parentSnapshotDigest}\n${sourceLockDigest}`),
      stopConditions: Object.freeze(["SOURCE_LOCK_MISMATCH", "APPROVAL_MISMATCH", "REFRESH_FAILURE", "READ_FAILURE", "READ_TIMEOUT", "PERMISSION_DENIED", "RESOURCE_MISMATCH", "ETAG_MISSING", "POLICY_VERSION_MISSING", "TARGET_PRESENT", "CONDITIONAL_TARGET_CONFLICT", "POLICY_SHAPE_AMBIGUOUS"]),
      automaticRetries: 0,
      secondOperationReachable: false,
      mutationReachable: false,
      safeToContinueWithoutApproval: false,
      supersedesParentSourceLocksOnlyFor: Object.freeze([...REPAIRED_PARENT_SOURCE_PATHS]),
      readOnlyFallback: true,
    });
    return Object.freeze({ ok: true, sourceLock, packet, sourceLockDigest, packetRawSha256: createHash("sha256").update(`${canonical(packet)}\n`, "utf8").digest("hex"), parentBridgeEvidence: bridgeEvidence, parentBridgeResult: bridgeResult, outputPaths });
  } catch { return Object.freeze({ ok: false, code: "CAS_APPROVAL_PREPARATION_FAILED" }); }
}

export function writeG2BCasEvidenceReadApproval(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("cas-evidence-read-not-ready");
  const root = resolve(repositoryRoot);
  const outputs = { sourceLock: value.outputPaths.sourceLock, packet: value.outputPaths.packet };
  const hashes = {};
  for (const [key, path] of Object.entries(outputs)) {
    const absolute = resolve(root, path);
    atomicCreate(absolute, value[key]);
    hashes[key] = createHash("sha256").update(readFileSync(absolute)).digest("hex");
    const persisted = readFileSync(absolute, "utf8");
    if (canonical(JSON.parse(persisted)) !== persisted.trimEnd()) throw new Error("cas-read-approval-persisted-json-invalid");
  }
  return Object.freeze({ paths: outputs, rawSha256: hashes, sourceLockDigest: value.sourceLockDigest });
}

export function prepareG2BCasEvidenceReadRetryApproval({ repositoryRoot = process.cwd(), operationInstance = randomUUID(), now = () => new Date().toISOString(), priorJournalRecord } = {}) {
  const root = resolve(repositoryRoot);
  const priorPacketPath = resolve(root, CAS_OUTPUTS.approvalPacket);
  const priorPacketRawSha256 = "51cf6abcdae7a14d344b51db8dd218969f65409498e3d1067f655538e9f11ed9";
  const priorJournal = priorJournalRecord
    ? Object.freeze({ state: "READY", record: priorJournalRecord })
    : createG2BCasEvidenceReadJournal().load(G2B_CAS_READ_OPERATION_INSTANCE);
  try {
    const priorPacketBytes = readFileSync(priorPacketPath);
    if (rawHash(priorPacketPath) !== priorPacketRawSha256) return Object.freeze({ ok: false, code: "FAILED_READ_APPROVAL_HASH_MISMATCH" });
    const prior = JSON.parse(priorPacketBytes.toString("utf8"));
    if (prior.operationInstance !== G2B_CAS_READ_OPERATION_INSTANCE || prior.sourceLockDigest !== "cbbf49a9846c64cd827aaec862920578def3ad08207876ff8c17b6c2ccbb79f2"
      || prior.credentialRefreshMax !== 1 || prior.iamPolicyReadMax !== 1 || prior.totalPhysicalRemoteCallsMax !== 2
      || prior.setIamPolicyMax !== 0 || prior.iamMutationMax !== 0 || prior.firestoreMax !== 0
      || priorJournal.state !== "READY" || priorJournal.record.phase !== "TERMINAL"
      || priorJournal.record.approvalConsumed !== true || priorJournal.record.refreshRequestStarted !== true
      || priorJournal.record.readRequestStarted !== true || priorJournal.record.approvalPacketRawSha256 !== priorPacketRawSha256
      || !UUID.test(operationInstance) || operationInstance === G2B_CAS_READ_OPERATION_INSTANCE) return Object.freeze({ ok: false, code: "FAILED_READ_TERMINAL_STATE_NOT_PROVEN" });
    const sourceLocks = RETRY_SOURCE_PATHS.map((path) => {
      const expectedHash = rawHash(resolve(root, path));
      return Object.freeze({ relativePath: path, expectedHash, path, sha256: expectedHash });
    });
    const sourceLockBase = { schemaVersion: 4, bindingVersion: "G2B_CAS_READ_RETRY_SOURCE_BINDING_V4", hashAlgorithm: "SHA-256", canonicalRoot: "MY_WEB_REPOSITORY_ROOT", expectedFileCount: sourceLocks.length, operationInstance, parentFailedOperationInstance: G2B_CAS_READ_OPERATION_INSTANCE, sourceLocks };
    const sourceSnapshotDigest = digest(sourceLocks.map(({ relativePath, expectedHash }) => ({ relativePath, expectedHash })));
    const sourceLock = Object.freeze({ ...sourceLockBase, sourceSnapshotDigest });
    const sourceLockDigest = digest(sourceLock);
    const packet = Object.freeze({
      schema: "myweb.g2b.cas-read-retry.approval-packet.v4",
      stage: "P1.5-C2H2E3D-W1C-M3L3-G2B-CAS-EVIDENCE-READ-RETRY",
      type: "READ_ONLY_WITH_BOUNDED_CREDENTIAL_REFRESH",
      status: "APPROVAL_REQUIRED",
      operationInstance,
      parentFailedOperationInstance: G2B_CAS_READ_OPERATION_INSTANCE,
      parentFailedPacketRawSha256: priorPacketRawSha256,
      parentFailedExecutionPhase: "READ_STARTED_THEN_TERMINAL_WITHOUT_POLICY_CAPTURE",
      purpose: "CAS_EVIDENCE_READ_RETRY_AFTER_TRANSPORT_REPAIR",
      targetResource: prior.targetResource,
      targetRole: prior.targetRole,
      parentV3R2Artifact: PARENT_ARTIFACTS[4],
      expectedTargetBindingState: "ABSENT",
      sourceLock,
      sourceLockArtifact: CAS_RETRY_OUTPUTS.sourceLock,
      sourceLockDigest,
      sourceSnapshotDigest: prior.parentSourceSnapshotDigest,
      transportImplementationDigest: digest(RETRY_SOURCE_PATHS.filter((path) => /g2bExplicitSetIamPolicyAuthTransport|g2b_explicit_set_iam_policy_transport|windowsGcloudProcessAdapter/.test(path)).map((path) => sourceLock.sourceLocks.find((entry) => entry.path === path))),
      expectedEvidenceFields: Object.freeze([...prior.expectedEvidenceFields, "approvalPacketSha256", "credentialRefreshCalls", "iamPolicyReadCalls", "totalPhysicalRemoteCalls", "setIamPolicyCalls", "iamMutations", "firestoreCalls", "storageWrites", "productionWrites", "approvalConsumed", "nextStage", "failureClass"]),
      expectedSuccessSchema: Object.freeze({ iamResource: "exact-target-resource", etag: "non-empty-string", policyVersion: "positive-safe-integer", bindings: "validated-in-memory-only", targetBindingPresent: "boolean", relevantBindingCount: "non-negative-integer", relevantBindingsDigest: "sha256", casBasisCaptured: true, generationId: G2B_INTERRUPTED_M3_GENERATION, readTimestamp: "ISO-8601", targetResourceMatchRequired: true }),
      generationBinding: G2B_INTERRUPTED_M3_GENERATION,
      failureClassificationVersion: "G2B_TRANSPORT_FAILURE_CLASSIFICATION_V3",
      supersededLocalDraftArtifacts: [
        "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-approval-packet-v2.json",
        "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-cas-read-retry-source-lock-v2.json",
      ].map((path) => Object.freeze({ path, sha256: rawHash(resolve(root, path)) })),
      credentialRefreshMax: 1,
      iamPolicyReadMax: 1,
      totalPhysicalRemoteCallsMax: 2,
      setIamPolicyMax: 0,
      iamMutationMax: 0,
      firestoreMax: 0,
      storageWriteMax: 0,
      productionWriteMax: 0,
      deployMax: 0,
      retryMax: 0,
      approvalConsumptionBoundary: "BEFORE_THE_FIRST_AND_ONLY_CREDENTIAL_REFRESH_REMOTE_REQUEST",
      stopConditions: Object.freeze(["SOURCE_LOCK_MISMATCH", "APPROVAL_MISMATCH", "REFRESH_FAILURE", "READ_FAILURE", "TRANSPORT_CLASSIFICATION_FAILURE", "RESOURCE_MISMATCH", "ETAG_MISSING", "POLICY_VERSION_MISSING", "TARGET_PRESENT", "POLICY_DRIFT", "CAS_AMBIGUITY"]),
      idempotencyKey: digest(`myweb.g2b.cas-read-retry.v1\n${operationInstance}\n${G2B_CAS_READ_OPERATION_INSTANCE}\n${sourceLockDigest}`),
      automaticRetries: 0,
      mutationReachable: false,
      safeToContinueWithoutApproval: false,
      createdAt: now(),
    });
    return Object.freeze({ ok: true, sourceLock, sourceLockDigest, packet, packetRawSha256: createHash("sha256").update(`${canonical(packet)}\n`, "utf8").digest("hex"), paths: CAS_RETRY_OUTPUTS });
  } catch { return Object.freeze({ ok: false, code: "CAS_READ_RETRY_PREPARATION_FAILED" }); }
}

export function writeG2BCasEvidenceReadRetryApproval(value, { repositoryRoot = process.cwd() } = {}) {
  if (value?.ok !== true) throw new Error("cas-read-retry-not-ready");
  const root = resolve(repositoryRoot);
  const outputs = { sourceLock: CAS_RETRY_OUTPUTS.sourceLock, packet: CAS_RETRY_OUTPUTS.packet };
  const hashes = {};
  for (const key of Object.keys(outputs)) {
    const path = resolve(root, outputs[key]);
    const bytes = `${canonical(value[key])}\n`;
    if (existsSync(path)) {
      if (readFileSync(path, "utf8") !== bytes) throw new Error("cas-read-retry-artifact-conflict");
    } else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, bytes, { encoding: "utf8", flag: "wx", mode: 0o600 });
    }
    hashes[key] = rawHash(path);
  }
  return Object.freeze({ paths: outputs, rawSha256: hashes, packetRawSha256: hashes.packet, sourceLockDigest: value.sourceLockDigest, sourceLockFileCount: value.sourceLock.sourceLocks.length });
}

function atomicCreate(path, value) {
  const bytes = serializeG2BCasJson(value);
  if (existsSync(path)) throw new Error("ARTIFACT_PATH_COLLISION");
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(temp, "wx", 0o600);
    writeFileSync(fd, bytes, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    try { linkSync(temp, path); } catch (error) {
      if (error?.code === "EEXIST") throw new Error("ARTIFACT_PATH_COLLISION");
      throw error;
    }
    unlinkSync(temp);
    const persisted = readFileSync(path, "utf8");
    if (canonical(JSON.parse(persisted)) !== persisted.trimEnd()) throw new Error("cas-evidence-persisted-json-invalid");
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temp)) unlinkSync(temp);
  }
}

function atomicReplace(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  const serialized = serializeG2BCasJson(value);
  const temp = `${path}.${randomUUID()}.tmp`;
  let fd;
  try {
    fd = openSync(temp, "wx", 0o600);
    writeFileSync(fd, serialized, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    renameSync(temp, path);
    const persisted = readFileSync(path, "utf8");
    if (canonical(JSON.parse(persisted)) !== persisted.trimEnd()) throw new Error("cas-evidence-persisted-json-invalid");
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (existsSync(temp)) unlinkSync(temp);
  }
}

export function createG2BCasEvidenceReadJournal({ directory = process.env.LOCALAPPDATA ? resolve(process.env.LOCALAPPDATA, "MY-WEB", "authority-audit", "g2b-cas-evidence-read-v1") : null, now = () => new Date().toISOString() } = {}) {
  if (typeof directory !== "string" || !directory) throw new Error("cas-journal-directory-required");
  const pathFor = (operationInstance) => resolve(directory, `${operationInstance}.json`);
  const load = (operationInstance) => {
    if (!UUID.test(operationInstance) || !existsSync(pathFor(operationInstance))) return Object.freeze({ state: "MISSING" });
    try {
      const record = JSON.parse(readFileSync(pathFor(operationInstance), "utf8"));
      if (record.schema !== "myweb.g2b.cas-evidence-read-journal.v1" || record.operationInstance !== operationInstance
        || !["PREPARED", "APPROVAL_CONSUMED", "REFRESH_STARTED", "REFRESH_CONFIRMED", "READ_STARTED", "READ_COMPLETED", "TERMINAL"].includes(record.phase)
        || typeof record.approvalConsumed !== "boolean" || typeof record.refreshRequestStarted !== "boolean"
        || typeof record.readRequestStarted !== "boolean" || !SHA256.test(record.approvalPacketRawSha256 || "")) return Object.freeze({ state: "INVALID" });
      return Object.freeze({ state: "READY", record: Object.freeze(record) });
    } catch { return Object.freeze({ state: "INVALID" }); }
  };
  const persist = (record) => atomicReplace(pathFor(record.operationInstance), record);
  return Object.freeze({
    load,
    prepare(operationInstance, approvalPacketRawSha256) {
      const existing = load(operationInstance);
      if (existing.state !== "MISSING") return Object.freeze({ ok: false, code: "CAS_JOURNAL_NOT_FRESH" });
      if (!SHA256.test(approvalPacketRawSha256 || "")) return Object.freeze({ ok: false, code: "CAS_JOURNAL_PACKET_HASH_INVALID" });
      const record = Object.freeze({ schema: "myweb.g2b.cas-evidence-read-journal.v1", operationInstance, approvalPacketRawSha256, phase: "PREPARED", approvalConsumed: false, refreshRequestStarted: false, readRequestStarted: false, createdAt: now(), updatedAt: now() });
      try { persist(record); return Object.freeze({ ok: true, record }); } catch { return Object.freeze({ ok: false, code: "CAS_JOURNAL_PERSISTENCE_FAILED" }); }
    },
    transition(operationInstance, phase, flags = {}) {
      const current = load(operationInstance);
      const allowed = { PREPARED: ["APPROVAL_CONSUMED"], APPROVAL_CONSUMED: ["REFRESH_STARTED"], REFRESH_STARTED: ["REFRESH_CONFIRMED", "TERMINAL"], REFRESH_CONFIRMED: ["READ_STARTED", "TERMINAL"], READ_STARTED: ["READ_COMPLETED", "TERMINAL"], READ_COMPLETED: ["TERMINAL"] };
      if (current.state !== "READY" || !allowed[current.record.phase]?.includes(phase)) return Object.freeze({ ok: false, code: "CAS_JOURNAL_TRANSITION_BLOCKED" });
      const record = Object.freeze({ ...current.record, ...flags, phase, updatedAt: now() });
      try { persist(record); return Object.freeze({ ok: true, record }); } catch { return Object.freeze({ ok: false, code: "CAS_JOURNAL_PERSISTENCE_FAILED" }); }
    },
  });
}

function verifyApprovedCasPacket({ packetPath, sourceLockPath, expectedPacketRawSha256, repositoryRoot }) {
  try {
    const root = resolve(repositoryRoot);
    const packetBytes = readFileSync(resolve(root, packetPath));
    if (createHash("sha256").update(packetBytes).digest("hex") !== expectedPacketRawSha256) return null;
    const packet = JSON.parse(packetBytes.toString("utf8"));
    const sourceLock = JSON.parse(readFileSync(resolve(root, sourceLockPath), "utf8"));
    if (packet.schema === "myweb.g2b.cas-evidence-read.approval-packet.v3") {
      if (packet.type !== "CAS_EVIDENCE_CAPTURE_ONLY" || packet.status !== "APPROVAL_REQUIRED"
        || !UUID.test(packet.operationInstance || "") || packet.parentOperationInstance !== PARENT_BRIDGE_OPERATION
        || packet.generationId !== G2B_INTERRUPTED_M3_GENERATION || packet.targetResource !== G2B_TARGET_RESOURCE
        || packet.requestedPolicyVersion !== 3
        || packet.targetRole !== G2B_TARGET_ROLE || packet.expectedTargetBindingState !== "ABSENT"
        || !SHA256.test(packet.targetAccountFingerprint || "") || !SHA256.test(packet.targetMemberFingerprint || "")
        || packet.sourceSnapshotDigest !== PARENT_SOURCE_SNAPSHOT_DIGEST || packet.totalPhysicalRemoteCallsMax !== 2
        || packet.credentialRefreshMax !== 1 || packet.iamPolicyReadMax !== 1 || packet.setIamPolicyMax !== 0
        || packet.iamMutationMax !== 0 || packet.firestoreMax !== 0 || packet.storageMax !== 0
        || packet.productionWriteMax !== 0 || packet.retryMax !== 0 || packet.automaticRetries !== 0
        || packet.mutationReachable !== false || packet.sourceLockArtifact !== sourceLockPath
        || packet.sourceLockDigest !== digest(sourceLock) || canonical(packet.sourceLock) !== canonical(sourceLock)
        || packet.sourceFingerprintSchemaVersion !== G2B_SOURCE_FINGERPRINT_SCHEMA_VERSION
        || packet.sourceFingerprint !== computeCanonicalSourceFingerprint(sourceLock.sourceLocks)
        || sourceLock.schema !== "myweb.g2b.cas-evidence-read.source-lock.v3"
        || sourceLock.operationInstance !== packet.operationInstance || sourceLock.parentBridgeOperationInstance !== PARENT_BRIDGE_OPERATION
        || !Array.isArray(sourceLock.sourceLocks) || sourceLock.sourceLocks.length !== SOURCE_PATHS.length
        || sourceLock.sourceLocks.some((entry, index) => entry.path !== SOURCE_PATHS[index] || !SHA256.test(entry.sha256 || ""))
        || packet.idempotencyKey !== digest(`myweb.g2b.cas-read.v3\n${packet.operationInstance}\n${PARENT_BRIDGE_OPERATION}\n${PARENT_SOURCE_SNAPSHOT_DIGEST}\n${packet.sourceLockDigest}`)) return null;
      for (const entry of sourceLock.sourceLocks) if (rawHash(resolve(root, entry.path)) !== entry.sha256) return null;
      return packet;
    }
    if (packet.schema !== "myweb.g2b.cas-read-retry.approval-packet.v4"
      || packet.type !== "READ_ONLY_WITH_BOUNDED_CREDENTIAL_REFRESH"
      || packet.status !== "APPROVAL_REQUIRED" || !UUID.test(packet.operationInstance || "")
      || packet.operationInstance === G2B_CAS_READ_OPERATION_INSTANCE
      || packet.parentFailedOperationInstance !== G2B_CAS_READ_OPERATION_INSTANCE
      || packet.parentFailedPacketRawSha256 !== "51cf6abcdae7a14d344b51db8dd218969f65409498e3d1067f655538e9f11ed9"
      || packet.purpose !== "CAS_EVIDENCE_READ_RETRY_AFTER_TRANSPORT_REPAIR"
      || packet.targetResource !== G2B_TARGET_RESOURCE || packet.targetRole !== G2B_TARGET_ROLE
      || packet.expectedTargetBindingState !== "ABSENT" || packet.credentialRefreshMax !== 1
      || packet.iamPolicyReadMax !== 1 || packet.totalPhysicalRemoteCallsMax !== 2
      || packet.setIamPolicyMax !== 0 || packet.iamMutationMax !== 0 || packet.firestoreMax !== 0
      || packet.storageWriteMax !== 0 || packet.productionWriteMax !== 0 || packet.retryMax !== 0
      || packet.automaticRetries !== 0 || packet.mutationReachable !== false
      || packet.failureClassificationVersion !== "G2B_TRANSPORT_FAILURE_CLASSIFICATION_V3"
      || packet.sourceSnapshotDigest !== PARENT_SOURCE_SNAPSHOT_DIGEST
      || packet.approvalConsumptionBoundary !== "BEFORE_THE_FIRST_AND_ONLY_CREDENTIAL_REFRESH_REMOTE_REQUEST"
      || packet.sourceLockDigest !== digest(sourceLock) || canonical(packet.sourceLock) !== canonical(sourceLock)
      || packet.sourceLockArtifact !== CAS_RETRY_OUTPUTS.sourceLock || packet.deployMax !== 0
      || packet.generationBinding !== G2B_INTERRUPTED_M3_GENERATION
      || !packet.expectedSuccessSchema || packet.parentV3R2Artifact !== PARENT_ARTIFACTS[4]
      || sourceLock.schemaVersion !== 4 || sourceLock.bindingVersion !== "G2B_CAS_READ_RETRY_SOURCE_BINDING_V4"
      || sourceLock.hashAlgorithm !== "SHA-256" || sourceLock.canonicalRoot !== "MY_WEB_REPOSITORY_ROOT"
      || sourceLock.expectedFileCount !== RETRY_SOURCE_PATHS.length
      || sourceLock.sourceSnapshotDigest !== digest(sourceLock.sourceLocks.map(({ relativePath, expectedHash }) => ({ relativePath, expectedHash })))
      || sourceLock.operationInstance !== packet.operationInstance || !Array.isArray(sourceLock.sourceLocks)
      || sourceLock.parentFailedOperationInstance !== G2B_CAS_READ_OPERATION_INSTANCE
      || sourceLock.sourceLocks.length !== RETRY_SOURCE_PATHS.length
      || sourceLock.sourceLocks.some((entry, index) => entry.path !== RETRY_SOURCE_PATHS[index] || entry.relativePath !== entry.path
        || entry.expectedHash !== entry.sha256 || !SHA256.test(entry.sha256 || ""))) return null;
    for (const entry of sourceLock.sourceLocks) if (rawHash(resolve(root, entry.path)) !== entry.sha256) return null;
    const transportDigest = digest(RETRY_SOURCE_PATHS.filter((path) => /g2bExplicitSetIamPolicyAuthTransport|g2b_explicit_set_iam_policy_transport|windowsGcloudProcessAdapter/.test(path)).map((path) => sourceLock.sourceLocks.find((entry) => entry.path === path)));
    if (packet.transportImplementationDigest !== transportDigest) return null;
    return packet;
  } catch { return null; }
}

export function createG2BCasEvidenceReadExecutor({ journal = createG2BCasEvidenceReadJournal(), repositoryRoot = process.cwd(), outputPaths, now = () => new Date().toISOString(), resolveRecoveryContext = resolveG2BRecoveryV3R2Context, executionAttestationGate = runG2BExecutionAttestationLifecycle, inspectExecutionAttestation } = {}) {
  let used = false;
  return Object.freeze({
    async execute({ executionEnvelope, enabled = false, approvedPacketRawSha256, packetPath = CAS_READ_V2_OUTPUTS.packet, sourceLockPath = CAS_READ_V2_OUTPUTS.sourceLock, consumeApproval, transport, targetPrincipal, recoveryContext, sourceSnapshotDigest = PARENT_SOURCE_SNAPSHOT_DIGEST } = {}) {
      const counters = { credentialRefreshLogicalAttempts: 0, credentialRefreshPhysicalRemoteCalls: 0, iamReadLogicalAttempts: 0, iamReadChildProcessStarted: 0, iamReadHttpStarted: 0, iamPolicyReadCalls: 0, totalPhysicalRemoteCalls: 0, totalPhysicalRemoteCallsUpperBound: 0, physicalCallAccounting: "EXACT", setIamPolicyCalls: 0, iamMutations: 0, firestoreCalls: 0, storageCalls: 0, retries: 0 };
      if (!hasExplicitRemoteExecutionIntent(executionEnvelope)) return Object.freeze({ ok: false, code: "CURRENT_REMOTE_EXECUTION_INTENT_REQUIRED", counters: Object.freeze(counters) });
      const packet = verifyApprovedCasPacket({ packetPath, sourceLockPath, expectedPacketRawSha256: approvedPacketRawSha256, repositoryRoot });
      if (!packet) return Object.freeze({ ok: false, code: "CAS_READ_APPROVAL_OR_BOUNDARY_BLOCKED", counters: Object.freeze(counters) });
      const artifactPaths = outputPaths || createG2BCasEvidenceReadArtifactPaths(packet.operationInstance);
      if (!validExecutionArtifactPaths(artifactPaths, packet.operationInstance)) return Object.freeze({ ok: false, code: "ARTIFACT_PATH_COLLISION", counters: Object.freeze(counters) });
      const currentRunAuthorization = validateG2BCurrentRunExecutionEnvelope({
        executionEnvelope,
        operationInstance: packet.operationInstance,
        packetRawSha256: approvedPacketRawSha256,
        sourceLockDigest: packet.sourceLockDigest,
        packet,
      });
      if (!currentRunAuthorization.ok) return Object.freeze({ ok: false, code: currentRunAuthorization.code, counters: Object.freeze(counters) });
      if (enabled !== true || used || !packet || packet.sourceSnapshotDigest !== sourceSnapshotDigest || packet.totalPhysicalRemoteCallsMax !== 2
        || typeof consumeApproval !== "function" || typeof transport?.prepareDirectContextCredentialRefresh !== "function"
        || typeof transport?.executeDirectContextCredentialRefresh !== "function"
        || typeof transport?.readGenerationBoundRecoveryPolicy !== "function" || !MEMBER.test(targetPrincipal || "")
        || !validRecoveryContext(recoveryContext, packet.operationInstance, packet)
        || fingerprint(recoveryContext.account) !== packet.targetAccountFingerprint
        || fingerprint(recoveryContext.member) !== packet.targetMemberFingerprint
        || recoveryContext.account !== recoveryContext.identityContext.exactPrincipal
        || recoveryContext.member !== recoveryContext.identityContext.exactIamMember
        || recoveryContext.member !== targetPrincipal
        || recoveryContext.targetResource !== packet.targetResource || recoveryContext.targetRole !== packet.targetRole
        || recoveryContext.parentInterruptedM3Generation !== (packet.generationBinding || packet.generationId)) {
        return Object.freeze({ ok: false, code: "CAS_READ_APPROVAL_OR_BOUNDARY_BLOCKED", counters: Object.freeze(counters) });
      }
      let resolvedPreflightContext;
      try { resolvedPreflightContext = resolveRecoveryContext({ operationInstance: packet.operationInstance, allowExpiredAttestationForExecution: true }); } catch { resolvedPreflightContext = null; }
      const activeContext = resolvedPreflightContext?.context;
      if (resolvedPreflightContext?.ok !== true || !validRecoveryContext(activeContext, packet.operationInstance, packet)
        || fingerprint(activeContext.account) !== packet.targetAccountFingerprint
        || fingerprint(activeContext.member) !== packet.targetMemberFingerprint
        || activeContext.account !== recoveryContext.account || activeContext.member !== recoveryContext.member
        || activeContext.targetResource !== packet.targetResource || activeContext.targetRole !== packet.targetRole
        || activeContext.parentInterruptedM3Generation !== (packet.generationBinding || packet.generationId)) {
        return Object.freeze({ ok: false, code: "CAS_READ_CONTEXT_PRECHECK_BLOCKED", counters: Object.freeze(counters) });
      }
      if (!sourceLocksMatch(packet, repositoryRoot)
        || packet.sourceFingerprint !== g2bHostAnchorSourceFingerprint({ repositoryRoot })) {
        return Object.freeze({ ok: false, code: "CAS_READ_SOURCE_FINGERPRINT_MISMATCH", counters: Object.freeze(counters) });
      }
      let refreshReadiness;
      try { refreshReadiness = await transport.prepareDirectContextCredentialRefresh(); } catch { refreshReadiness = null; }
      if (refreshReadiness?.ok !== true || refreshReadiness.state !== "REFRESH_READY_TO_SEND" || refreshReadiness.physicalCalls !== 0
        || !sourceLocksMatch(packet, repositoryRoot)) {
        return Object.freeze({ ok: false, code: "CAS_READ_REFRESH_PREFLIGHT_BLOCKED", counters: Object.freeze(counters) });
      }
      const preAttestationSourceSnapshot = sourceStatSnapshot(packet, repositoryRoot);
      const anchor = activeContext.store.load(packet.generationId);
      const attestationIdentity = activeContext.identityContext;
      const inspectAttestation = () => {
        if (typeof inspectExecutionAttestation === "function") return inspectExecutionAttestation(activeContext);
        if (anchor?.state !== "READY" || !attestationIdentity?.exactPrincipal || !attestationIdentity?.exactIamMember) return { state: "UNKNOWN_BINDING_STATE", bindingStatus: "MISMATCH" };
        const state = classifyG2BHostAnchorAttestationFreshness({ secretKeyId: anchor.record.secretKeyId, generationId: anchor.record.operationGenerationId,
          account: attestationIdentity.exactPrincipal, member: attestationIdentity.exactIamMember, anchorRecord: anchor.record, repositoryRoot });
        return { ...state, bindingStatus: ["FRESH", "ATTESTATION_EXPIRED_ONLY"].includes(state.state) ? "MATCH" : "MISMATCH" };
      };
      const attestationGate = await executionAttestationGate({
        inspect: inspectAttestation,
        refresh: async () => refreshExecutionHostAttestation(activeContext, repositoryRoot),
        finalFastGate: async () => sourceStatSnapshotMatches(preAttestationSourceSnapshot, repositoryRoot)
          ? { ok: true } : { ok: false, code: "FINAL_SOURCE_CHANGED" },
      });
      counters.attestationTelemetry = attestationGate?.telemetry || null;
      if (attestationGate?.ok !== true || !sourceStatSnapshotMatches(preAttestationSourceSnapshot, repositoryRoot)) {
        return Object.freeze({ ok: false, code: attestationGate?.code || "FINAL_FAST_GATE_FAILED", counters: Object.freeze(counters) });
      }
      const prepared = journal.prepare(packet.operationInstance, approvedPacketRawSha256);
      if (!prepared.ok) return Object.freeze({ ok: false, code: prepared.code, counters: Object.freeze(counters) });
      let consumed = false;
      try { consumed = await consumeApproval(Object.freeze({ operationInstance: packet.operationInstance, packetRawSha256: approvedPacketRawSha256 })); } catch { consumed = false; }
      if (consumed !== true) return Object.freeze({ ok: false, code: "CAS_READ_APPROVAL_NOT_CONSUMED", counters: Object.freeze(counters) });
      if (!journal.transition(packet.operationInstance, "APPROVAL_CONSUMED", { approvalConsumed: true }).ok
        || !journal.transition(packet.operationInstance, "REFRESH_STARTED", { refreshRequestStarted: true }).ok) return Object.freeze({ ok: false, code: "CAS_READ_JOURNAL_BLOCKED", counters: Object.freeze(counters) });
      let attestationAtRefreshStart = inspectAttestation();
      if (!sourceStatSnapshotMatches(preAttestationSourceSnapshot, repositoryRoot)) {
        journal.transition(packet.operationInstance, "TERMINAL", { terminalClassification: "CAS_READ_FINAL_FAST_GATE_BLOCKED" });
        return Object.freeze({ ok: false, code: "CAS_READ_FINAL_FAST_GATE_BLOCKED", counters: Object.freeze(counters) });
      }
      if (attestationAtRefreshStart.state !== "FRESH" || attestationAtRefreshStart.bindingStatus !== "MATCH"
        || !Number.isFinite(attestationAtRefreshStart.ageMs)) {
        journal.transition(packet.operationInstance, "TERMINAL", { terminalClassification: "CAS_READ_FINAL_FAST_GATE_BLOCKED" });
        return Object.freeze({ ok: false, code: "CAS_READ_FINAL_FAST_GATE_BLOCKED", counters: Object.freeze(counters) });
      }
      if (attestationAtRefreshStart.ageMs >= 30_000) {
        if (counters.attestationTelemetry?.executionRefreshPerformed === true) {
          journal.transition(packet.operationInstance, "TERMINAL", { terminalClassification: "CAS_READ_EXECUTION_REFRESH_BUDGET_EXHAUSTED" });
          return Object.freeze({ ok: false, code: "CAS_READ_EXECUTION_REFRESH_BUDGET_EXHAUSTED", counters: Object.freeze(counters) });
        }
        const lastRefresh = refreshExecutionHostAttestation(activeContext, repositoryRoot);
        if (lastRefresh?.ok !== true || lastRefresh.bindingStatus !== "MATCH" || lastRefresh.physicalCalls !== 0
          || !sourceStatSnapshotMatches(preAttestationSourceSnapshot, repositoryRoot)) {
          journal.transition(packet.operationInstance, "TERMINAL", { terminalClassification: "CAS_READ_FINAL_ATTESTATION_REFRESH_FAILED" });
          return Object.freeze({ ok: false, code: lastRefresh?.code || "CAS_READ_FINAL_ATTESTATION_REFRESH_FAILED", counters: Object.freeze(counters) });
        }
        attestationAtRefreshStart = inspectAttestation();
        if (attestationAtRefreshStart.state !== "FRESH" || attestationAtRefreshStart.bindingStatus !== "MATCH"
          || !Number.isFinite(attestationAtRefreshStart.ageMs) || attestationAtRefreshStart.ageMs >= 30_000
          || !sourceStatSnapshotMatches(preAttestationSourceSnapshot, repositoryRoot)) {
          journal.transition(packet.operationInstance, "TERMINAL", { terminalClassification: "CAS_READ_FINAL_ATTESTATION_REFRESH_INVALID" });
          return Object.freeze({ ok: false, code: "CAS_READ_FINAL_ATTESTATION_REFRESH_INVALID", counters: Object.freeze(counters) });
        }
        counters.attestationTelemetry = Object.freeze({ ...counters.attestationTelemetry, executionRefreshPerformed: true,
          attestationAgeImmediatelyAfterRefresh: attestationAtRefreshStart.ageMs,
          attestationAgeAtCredentialRefreshStart: attestationAtRefreshStart.ageMs });
      } else {
        counters.attestationTelemetry = Object.freeze({ ...counters.attestationTelemetry,
          attestationAgeAtCredentialRefreshStart: attestationAtRefreshStart.ageMs });
      }
      used = true;
      counters.credentialRefreshLogicalAttempts = 1;
      counters.totalPhysicalRemoteCallsUpperBound = 1;
      let refresh;
      try { refresh = await transport.executeDirectContextCredentialRefresh(executionEnvelope); } catch { refresh = null; }
      if (Number.isInteger(refresh?.physicalCalls) && refresh.physicalCalls >= 0 && refresh.physicalCalls <= 1) {
        counters.credentialRefreshPhysicalRemoteCalls = refresh.physicalCalls;
        counters.totalPhysicalRemoteCalls += refresh.physicalCalls;
        counters.totalPhysicalRemoteCallsUpperBound = counters.totalPhysicalRemoteCalls;
      } else {
        counters.physicalCallAccounting = "INDETERMINATE";
      }
      if (refresh?.ok !== true || refresh.state !== "REFRESH_SUCCESS_CONFIRMED" || refresh.physicalCalls !== 1) {
        counters.attestationTelemetry = Object.freeze({ ...counters.attestationTelemetry,
          failedPhase: "PHASE_CREDENTIAL_REFRESH" });
        journal.transition(packet.operationInstance, "TERMINAL", { terminalClassification: "CAS_READ_REFRESH_FAILED_NO_IAM_READ" });
        return Object.freeze({ ok: false, code: "CAS_READ_REFRESH_FAILED_NO_IAM_READ", counters: Object.freeze(counters) });
      }
      counters.attestationTelemetry = Object.freeze({ ...counters.attestationTelemetry,
        lastCompletedPhase: "PHASE_CREDENTIAL_REFRESH" });
      if (!journal.transition(packet.operationInstance, "REFRESH_CONFIRMED").ok || !sourceStatSnapshotMatches(preAttestationSourceSnapshot, repositoryRoot)) {
        journal.transition(packet.operationInstance, "TERMINAL");
        return Object.freeze({ ok: false, code: "CAS_READ_POST_REFRESH_LOCK_FAILED", counters: Object.freeze(counters) });
      }
      const nextContext = activeContext;
      const postRefreshAttestation = inspectAttestation();
      if (!validRecoveryContext(nextContext, packet.operationInstance, packet)
        || fingerprint(nextContext.account) !== packet.targetAccountFingerprint
        || fingerprint(nextContext.member) !== packet.targetMemberFingerprint
        || nextContext.targetResource !== packet.targetResource || nextContext.targetRole !== packet.targetRole
        || nextContext.parentInterruptedM3Generation !== (packet.generationBinding || packet.generationId)
        || nextContext.recoveryAnchorVerified !== true || postRefreshAttestation.state !== "FRESH"
        || postRefreshAttestation.bindingStatus !== "MATCH" || postRefreshAttestation.ageMs >= 30_000
        || !sourceStatSnapshotMatches(preAttestationSourceSnapshot, repositoryRoot)) {
        counters.attestationTelemetry = Object.freeze({ ...counters.attestationTelemetry,
          failedPhase: "PHASE_POST_CREDENTIAL_ATTESTATION_VALIDATION" });
        journal.transition(packet.operationInstance, "TERMINAL", { terminalClassification: "CAS_READ_POST_REFRESH_IDENTITY_OR_ANCHOR_BLOCKED" });
        return Object.freeze({ ok: false, code: "CAS_READ_POST_REFRESH_IDENTITY_OR_ANCHOR_BLOCKED", counters: Object.freeze(counters) });
      }
      counters.attestationTelemetry = Object.freeze({ ...counters.attestationTelemetry,
        attestationAgeAtCredentialRefreshStart: counters.attestationTelemetry?.attestationAgeAtCredentialRefreshStart ?? null,
        attestationAgeAtIamReadStart: postRefreshAttestation.ageMs,
        phases: Object.freeze([...(counters.attestationTelemetry?.phases || []), "PHASE_POST_CREDENTIAL_ATTESTATION_VALIDATION"]),
        lastCompletedPhase: "PHASE_POST_CREDENTIAL_ATTESTATION_VALIDATION" });
      if (!journal.transition(packet.operationInstance, "READ_STARTED", { readRequestStarted: true }).ok) return Object.freeze({ ok: false, code: "CAS_READ_JOURNAL_BLOCKED", counters: Object.freeze(counters) });
      counters.attestationTelemetry = Object.freeze({ ...counters.attestationTelemetry,
        phases: Object.freeze([...counters.attestationTelemetry.phases, "PHASE_IAM_POLICY_READ"]) });
      counters.iamReadLogicalAttempts = 1;
      counters.totalPhysicalRemoteCallsUpperBound = counters.credentialRefreshPhysicalRemoteCalls + 1;
      let read;
      try { read = await transport.readGenerationBoundRecoveryPolicy({
        targetResource: packet.targetResource, targetRole: packet.targetRole,
        account: nextContext.account, member: nextContext.member,
        executionEnvelope,
      }); } catch { read = null; }
      if (read?.childProcessStarted === true) counters.iamReadChildProcessStarted = 1;
      const requestStarted = read?.requestStarted === true || read?.safeTransportMetadata?.requestStarted === true
        || read?.failureEvidence?.requestStarted === true;
      if (requestStarted) {
        counters.iamReadHttpStarted = 1;
        counters.iamPolicyReadCalls = 1;
        counters.totalPhysicalRemoteCalls += 1;
        counters.totalPhysicalRemoteCallsUpperBound = counters.totalPhysicalRemoteCalls;
      } else if (read?.requestStarted === false || read?.safeTransportMetadata?.requestStarted === false
        || read?.failureEvidence?.requestStarted === false || read?.childProcessStarted === false) {
        counters.totalPhysicalRemoteCallsUpperBound = counters.totalPhysicalRemoteCalls;
      } else {
        counters.physicalCallAccounting = "INDETERMINATE";
      }
      if (read?.ok !== true || read.physicalCalls !== 1 || !read.policy || !requestStarted) {
        const metadata = safeTransportDiagnostics(read?.failureEvidence);
        const failureClass = metadata?.failureClass && metadata.failureClass !== "NONE" ? metadata.failureClass : "TRANSPORT_UNKNOWN";
        const failurePath = artifactPaths.failure;
        const summaryPath = artifactPaths.resultSummary;
        const failure = Object.freeze({ schema: "myweb.g2b.cas-read-failure-evidence.v3", operationInstance: packet.operationInstance, parentOperationInstance: packet.parentOperationInstance, approvalPacketRawSha256: approvedPacketRawSha256, sourceLockDigest: packet.sourceLockDigest, sourceSnapshotDigest: packet.sourceSnapshotDigest, targetResourceDigest: digest(packet.targetResource), classificationVersion: "G2B_TRANSPORT_FAILURE_CLASSIFICATION_V4", failureClass, terminalState: "READ_FAILED_NO_MUTATION_PACKET", failureEvidenceFile: failurePath, resultSummaryFile: summaryPath, transportDiagnostics: metadata, attestationTelemetry: counters.attestationTelemetry, approvalConsumed: true, credentialRefreshCalls: counters.credentialRefreshPhysicalRemoteCalls, iamPolicyReadCalls: counters.iamPolicyReadCalls, totalPhysicalRemoteCalls: counters.totalPhysicalRemoteCalls, physicalRemoteCallsUpperBound: counters.totalPhysicalRemoteCallsUpperBound, physicalCallAccounting: counters.physicalCallAccounting, setIamPolicyCalls: 0, iamMutations: 0, firestoreCalls: 0, storageCalls: 0, productionWrites: 0, retries: 0, timestamp: now() });
        let summary;
        try {
          atomicCreate(resolve(repositoryRoot, failurePath), failure);
          const persistedFailure = JSON.parse(readFileSync(resolve(repositoryRoot, failurePath), "utf8"));
          const failureSha256 = rawHash(resolve(repositoryRoot, failurePath));
          if (persistedFailure.operationInstance !== packet.operationInstance || persistedFailure.failureClass !== failureClass
            || persistedFailure.terminalState !== "READ_FAILED_NO_MUTATION_PACKET") throw new Error("cas-failure-roundtrip-invalid");
          summary = Object.freeze({ schema: "myweb.g2b.cas-read-result-summary.v2", operationInstance: packet.operationInstance, parentOperationInstance: packet.parentOperationInstance, terminalState: persistedFailure.terminalState, status: persistedFailure.terminalState, failureClass, failureEvidenceFile: failurePath, failureEvidenceRawSha256: failureSha256, physicalRemoteCalls: counters.totalPhysicalRemoteCalls, physicalRemoteCallsUpperBound: counters.totalPhysicalRemoteCallsUpperBound, physicalCallAccounting: counters.physicalCallAccounting, attestationTelemetry: counters.attestationTelemetry, approvalConsumed: true, setIamPolicyCalls: 0, iamMutations: 0, firestoreCalls: 0, storageCalls: 0, nextStage: "FRESH_CAS_EVIDENCE_READ_RECOVERY_APPROVAL_REQUIRED" });
          atomicCreate(resolve(repositoryRoot, summaryPath), summary);
          const persistedSummary = JSON.parse(readFileSync(resolve(repositoryRoot, summaryPath), "utf8"));
          if (persistedSummary.operationInstance !== persistedFailure.operationInstance
            || persistedSummary.failureClass !== persistedFailure.failureClass
            || persistedSummary.failureEvidenceRawSha256 !== rawHash(resolve(repositoryRoot, failurePath))
            || persistedSummary.terminalState !== persistedFailure.terminalState
            || persistedSummary.physicalRemoteCalls !== persistedFailure.totalPhysicalRemoteCalls) throw new Error("cas-result-summary-cross-reference-invalid");
        } catch (error) {
          const code = error?.message === "ARTIFACT_PATH_COLLISION" ? "ARTIFACT_PATH_COLLISION" : "CAS_READ_FAILURE_EVIDENCE_PERSISTENCE_FAILED";
          journal.transition(packet.operationInstance, "TERMINAL", { terminalClassification: code });
          return Object.freeze({ ok: false, code, failureClass, counters: Object.freeze(counters) });
        }
        journal.transition(packet.operationInstance, "TERMINAL", { terminalClassification: "CAS_READ_FAILED_NO_MUTATION_PACKET", failureClass });
        return Object.freeze({ ok: false, code: "CAS_READ_FAILED_NO_MUTATION_PACKET", failureClass, failure, result: summary, counters: Object.freeze(counters) });
      }
      const completed = completeG2BCasEvidenceRead({ readResult: read, targetPrincipal, sourceSnapshotDigest: packet.sourceSnapshotDigest, sourceLockDigest: packet.sourceLockDigest, operationInstance: randomUUID(), provenance: { kind: "APPROVED_GENERATION_BOUND_LIVE_READ", operationInstance: packet.operationInstance, parentOperationInstance: PARENT_BRIDGE_OPERATION, approvalPacketSha256: approvedPacketRawSha256, credentialRefreshCalls: counters.credentialRefreshPhysicalRemoteCalls, iamPolicyReadCalls: counters.iamPolicyReadCalls, totalPhysicalRemoteCalls: counters.totalPhysicalRemoteCalls, setIamPolicyCalls: counters.setIamPolicyCalls, iamMutations: counters.iamMutations, firestoreCalls: counters.firestoreCalls, storageWrites: counters.storageCalls, productionWrites: 0, nextStage: "FRESH_IAM_MUTATION_APPROVAL_REQUIRED", approvalConsumed: true, requestStarted: true, httpStatus: 200 }, now: now() });
      if (!completed.ok) {
        journal.transition(packet.operationInstance, "TERMINAL");
        return Object.freeze({ ok: false, code: completed.code, counters: Object.freeze(counters) });
      }
      const evidence = completed.evidence;
      const result = Object.freeze({ schema: "myweb.g2b.cas-evidence-read.result.v1", operationInstance: packet.operationInstance, parentOperationInstance: packet.parentOperationInstance, terminalClassification: completed.code, mutationRequired: completed.mutationRequired, evidenceSha256: digest(evidence), attestationTelemetry: counters.attestationTelemetry, approvalConsumed: true, physicalRemoteCalls: Object.freeze({ credentialRefresh: 1, iamPolicyRead: 1, total: 2 }), setIamPolicyCalls: 0, iamMutations: 0, firestoreCalls: 0, storageCalls: 0, sourceSnapshotDigest, nextStage: completed.mutationRequired ? "FRESH_IAM_MUTATION_APPROVAL_REQUIRED" : "IAM_POST_READ_COMPLETION" });
      try {
        atomicCreate(resolve(repositoryRoot, artifactPaths.evidence), evidence);
        if (completed.mutationPacket) atomicCreate(resolve(repositoryRoot, artifactPaths.mutationPacket), completed.mutationPacket);
        atomicCreate(resolve(repositoryRoot, artifactPaths.resultSummary), result);
      } catch (error) {
        journal.transition(packet.operationInstance, "TERMINAL");
        return Object.freeze({ ok: false, code: error?.message === "ARTIFACT_PATH_COLLISION" ? "ARTIFACT_PATH_COLLISION" : "CAS_READ_LOCAL_ARTIFACT_PERSISTENCE_FAILED", counters: Object.freeze(counters) });
      }
      journal.transition(packet.operationInstance, "READ_COMPLETED");
      journal.transition(packet.operationInstance, "TERMINAL");
      return Object.freeze({ ok: true, code: completed.code, evidence, mutationPacket: completed.mutationPacket, result, counters: Object.freeze(counters) });
    },
  });
}

function sourceLocksMatch(packet, repositoryRoot) {
  try { return packet.sourceLock.sourceLocks.every((entry) => rawHash(resolve(repositoryRoot, entry.path)) === entry.sha256); }
  catch { return false; }
}

export async function runG2BExecutionAttestationLifecycle({ inspect, refresh, finalFastGate, now = () => Date.now(), timingThresholdMs = 30_000 } = {}) {
  const telemetry = { state: "BLOCKED", attestationAgeAtSlowPreflightStart: null, attestationAgeBeforeExecutionRefresh: null,
    executionRefreshPerformed: false, attestationAgeImmediatelyAfterRefresh: null, attestationAgeAtCredentialRefreshStart: null,
    attestationAgeAtIamReadStart: null, phases: [], failedPhase: null, lastCompletedPhase: null };
  const phase = (name) => {
    telemetry.phases.push(name);
  };
  const complete = (name) => { telemetry.lastCompletedPhase = name; };
  const fail = (name, code) => {
    telemetry.failedPhase = name;
    return Object.freeze({ ok: false, code, telemetry: Object.freeze({ ...telemetry, phases: Object.freeze([...telemetry.phases]) }) });
  };
  try {
    if (typeof inspect !== "function" || typeof refresh !== "function" || typeof finalFastGate !== "function") return fail("PHASE_HOST_ATTESTATION_REFRESH", "EXECUTION_ATTESTATION_LIFECYCLE_UNBOUND");
    phase("PHASE_FINAL_SOURCE_VALIDATION");
    let current = await inspect();
    if (!current || !["FRESH", "ATTESTATION_EXPIRED_ONLY"].includes(current.state)
      || current.bindingStatus !== "MATCH") return fail("PHASE_FINAL_SOURCE_VALIDATION", "HOST_ATTESTATION_BINDING_OR_FRESHNESS_FAILED");
    complete("PHASE_FINAL_SOURCE_VALIDATION");
    telemetry.attestationAgeAtSlowPreflightStart = Number.isFinite(current.ageMs) ? current.ageMs : null;
    telemetry.attestationAgeBeforeExecutionRefresh = telemetry.attestationAgeAtSlowPreflightStart;
    let needsRefresh = current.state === "ATTESTATION_EXPIRED_ONLY" || !Number.isFinite(current.ageMs) || current.ageMs >= timingThresholdMs;
    if (needsRefresh) {
      phase("PHASE_HOST_ATTESTATION_REFRESH");
      const refreshed = await refresh();
      if (refreshed?.ok !== true || refreshed.bindingStatus !== "MATCH" || refreshed.physicalCalls !== 0) return fail("PHASE_HOST_ATTESTATION_REFRESH", refreshed?.code || "HOST_ATTESTATION_REFRESH_FAILED");
      telemetry.executionRefreshPerformed = true;
      current = await inspect();
      telemetry.attestationAgeImmediatelyAfterRefresh = Number.isFinite(current?.ageMs) ? current.ageMs : null;
      if (!current || current.state !== "FRESH" || current.bindingStatus !== "MATCH") return fail("PHASE_HOST_ATTESTATION_REFRESH", "HOST_ATTESTATION_REFRESH_NOT_FRESH");
      complete("PHASE_HOST_ATTESTATION_REFRESH");
    }
    phase("PHASE_FINAL_ATTESTATION_VALIDATION");
    if (!current || current.state !== "FRESH" || current.bindingStatus !== "MATCH"
      || !Number.isFinite(current.ageMs) || current.ageMs < 0 || current.ageMs >= timingThresholdMs
      || current.ageMs > 120_000) return fail("PHASE_FINAL_ATTESTATION_VALIDATION", "HOST_ATTESTATION_FINAL_FAST_GATE_FAILED");
    const fast = await finalFastGate();
    if (fast?.ok !== true) return fail("PHASE_FINAL_ATTESTATION_VALIDATION", fast?.code || "FINAL_FAST_GATE_FAILED");
    complete("PHASE_FINAL_ATTESTATION_VALIDATION");
    telemetry.attestationAgeAtCredentialRefreshStart = current.ageMs;
    telemetry.attestationAgeAtIamReadStart = current.ageMs;
    phase("PHASE_CREDENTIAL_REFRESH");
    telemetry.state = "PASS";
    return Object.freeze({ ok: true, code: "EXECUTION_ATTESTATION_GATE_PASS", telemetry: Object.freeze({ ...telemetry, phases: Object.freeze([...telemetry.phases]) }) });
  } catch {
    return fail("PHASE_HOST_ATTESTATION_REFRESH", "EXECUTION_ATTESTATION_LIFECYCLE_FAILED_CLOSED");
  }
}

function sourceStatSnapshot(packet, repositoryRoot) {
  return packet.sourceLock.sourceLocks.map(({ path }) => {
    const stat = statSync(resolve(repositoryRoot, path));
    return Object.freeze({ path, size: stat.size, mtimeMs: stat.mtimeMs });
  });
}

function sourceStatSnapshotMatches(snapshot, repositoryRoot) {
  try {
    return snapshot.every(({ path, size, mtimeMs }) => {
      const stat = statSync(resolve(repositoryRoot, path));
      return stat.size === size && stat.mtimeMs === mtimeMs;
    });
  } catch { return false; }
}

function refreshExecutionHostAttestation(context, repositoryRoot) {
  const identity = context?.identityContext || resolveG2BLocalPinnedIdentity({});
  const store = context?.store || createG2BRecoveryAnchorStore({});
  const provider = context?.secretProvider || createWindowsDpapiSecretProvider({});
  if (!identity?.exactPrincipal || !identity?.exactIamMember) return Object.freeze({ ok: false, code: "PINNED_IDENTITY_UNAVAILABLE", physicalCalls: 0 });
  const loaded = store.load(G2B_INTERRUPTED_M3_GENERATION);
  if (loaded?.state !== "READY" || loaded.record?.anchorState !== "ANCHOR_VERIFIED"
    || loaded.record?.targetResource !== G2B_TARGET_RESOURCE || loaded.record?.targetRole !== G2B_TARGET_ROLE) {
    return Object.freeze({ ok: false, code: "RECOVERY_ANCHOR_BINDING_MISMATCH", physicalCalls: 0 });
  }
  const secret = provider.read();
  if (secret?.state !== "READY" || secret.keyId !== loaded.record.secretKeyId) return Object.freeze({ ok: false, code: "CURRENTUSER_DPAPI_SECRET_UNAVAILABLE", physicalCalls: 0 });
  try {
    const anchor = verifyG2BRecoveryAnchor({ record: loaded.record, member: identity.exactIamMember, secret: secret.secret, secretKeyId: secret.keyId });
    if (!anchor.ok) return Object.freeze({ ok: false, code: "RECOVERY_ANCHOR_VALIDATION_FAILED", physicalCalls: 0 });
    const current = classifyG2BHostAnchorAttestationFreshness({ secretKeyId: secret.keyId, generationId: loaded.record.operationGenerationId,
      account: identity.exactPrincipal, member: identity.exactIamMember, anchorRecord: loaded.record, repositoryRoot });
    if (!["FRESH", "ATTESTATION_EXPIRED_ONLY"].includes(current.state)) return Object.freeze({ ok: false, code: current.code || "HOST_ATTESTATION_BINDING_MISMATCH", physicalCalls: 0 });
    const built = buildG2BHostAnchorAttestation({ secret: secret.secret, secretKeyId: secret.keyId,
      generationId: loaded.record.operationGenerationId, account: identity.exactPrincipal, member: identity.exactIamMember,
      anchorRecord: loaded.record, repositoryRoot });
    if (built?.ok !== true) return Object.freeze({ ok: false, code: built?.code || "HOST_ATTESTATION_BUILD_FAILED", physicalCalls: 0 });
    const output = g2bHostAnchorAttestationPath({ generationId: loaded.record.operationGenerationId, validationId: built.attestation.validationId });
    writeG2BHostAnchorAttestation(built.attestation, output);
    const verified = readFreshG2BHostAnchorAttestation({ secretKeyId: secret.keyId, generationId: loaded.record.operationGenerationId,
      account: identity.exactPrincipal, member: identity.exactIamMember, anchorRecord: loaded.record, repositoryRoot });
    if (!verified.ok || verifyG2BHostAnchorAttestation(verified.attestation, { secretKeyId: secret.keyId,
      generationId: loaded.record.operationGenerationId, account: identity.exactPrincipal, member: identity.exactIamMember,
      anchorRecord: loaded.record, repositoryRoot }).ok !== true) return Object.freeze({ ok: false, code: "HOST_ATTESTATION_POST_REFRESH_VALIDATION_FAILED", physicalCalls: 0 });
    return Object.freeze({ ok: true, bindingStatus: "MATCH", physicalCalls: 0, validationId: verified.attestation.validationId,
      ageMs: Date.now() - Date.parse(verified.attestation.validatedAt), sourceFingerprint: g2bHostAnchorSourceFingerprint({ repositoryRoot }) });
  } finally {
    if (Buffer.isBuffer(secret.secret)) secret.secret.fill(0);
  }
}

export const G2B_CAS_EVIDENCE_CONTRACT = Object.freeze({
  rawPolicyPersisted: false,
  rawPrincipalPersisted: false,
  etagPersisted: true,
  policyVersionPersisted: true,
  policyMutationReachable: false,
  readRetryReachable: false,
  futureMutationRequiresFreshPrestateRead: true,
  futureMutationRequiresSeparateApproval: true,
});
