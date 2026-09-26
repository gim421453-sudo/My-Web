import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  buildSourceLockedRecoveryApprovalArtifacts,
  verifySourceLockedRecoveryApprovalArtifacts,
} from "../authority-audit/g2bM3SourceLockedRecoveryApproval.mjs";

const artifacts = buildSourceLockedRecoveryApprovalArtifacts();
const { sourceLockManifest, implementation, runtimeCapability, composite, packet } = artifacts;
assert.equal(verifySourceLockedRecoveryApprovalArtifacts(artifacts).ok, true);
assert.equal(sourceLockManifest.activeRecoveryTransitiveDependencyCount, 14);
assert.equal(sourceLockManifest.runtimeAuthorityDependencyCount, 7);
assert.equal(sourceLockManifest.unboundActiveRecoveryDependencies, 0);
for (const lock of sourceLockManifest.dependencies) {
  assert.equal(createHash("sha256").update(readFileSync(lock.path)).digest("hex"), lock.sha256, lock.path);
}

for (const path of [
  "tools/authority-audit/g2bM3AnchorReadOnlyRecoveryExecutor.mjs",
  "tools/authority-audit/windowsGcloudProcessAdapter.mjs",
  "tools/authority-audit/windowsDpapiSecretProvider.mjs",
  "tools/authority-audit-tests/g2bM3AnchorReadOnlyRecoveryExecutor.test.mjs",
  "tools/authority-audit/m3l3R3CanonicalPolicyParser.mjs",
  "tools/authority-audit/g2bRecoveryAnchor.mjs",
]) assert.ok(sourceLockManifest.dependencies.some((entry) => entry.path === path), `${path} must be source locked`);

assert.equal(implementation.unboundRecoveryRemoteCapabilities, 0);
assert.equal(implementation.unboundRecoveryProcessCapabilities, 0);
assert.equal(runtimeCapability.recoveryRequiresNewOpA, false);
assert.equal(runtimeCapability.localIdentityDiscoveryMax, 0);
assert.equal(runtimeCapability.writerIamPolicyReadsMax, 1);
assert.equal(runtimeCapability.physicalRemotePolicyReadsMax, 1);
assert.equal(runtimeCapability.projectIamReadsMax, 0);
assert.equal(runtimeCapability.mutationsMax, 0);
assert.equal(runtimeCapability.m3MutationsMax, 0);
assert.equal(runtimeCapability.m4MutationsMax, 0);
assert.equal(runtimeCapability.retries, 0);
assert.equal(runtimeCapability.rollbacks, 0);
assert.equal(runtimeCapability.secondMutationAllowed, false);
assert.equal(composite.operationGeneration, packet.operationGeneration);
assert.equal(packet.supersededRecoveryApprovalPacketSha256, "f9ce876c72fb30feafd3813f995815b4352148db24f4bd29ff9db5cec83f4f98");
assert.equal(packet.safeToContinueWithoutApproval, false);

const reject = (mutate) => {
  const changed = structuredClone(artifacts);
  mutate(changed);
  assert.equal(verifySourceLockedRecoveryApprovalArtifacts(changed).ok, false);
};
reject((value) => { value.sourceLockManifest.dependencies.shift(); });
reject((value) => { value.sourceLockManifest.dependencies[0].sha256 = "0".repeat(64); });
reject((value) => { value.sourceLockManifest.dependencies[1].sha256 = "0".repeat(64); });
reject((value) => { value.sourceLockManifest.dependencies[3].sha256 = "0".repeat(64); });
reject((value) => { value.sourceLockManifest.dependencies[7].sha256 = "0".repeat(64); });
reject((value) => { value.sourceLockManifest.dependencies[5].sha256 = "0".repeat(64); });
reject((value) => { value.sourceLockManifest.dependencies[6].sha256 = "0".repeat(64); });
reject((value) => { value.packet.operationGeneration = "00000000-0000-0000-0000-000000000000"; });
reject((value) => { value.packet.targetResource = "legacy.invalid"; });
reject((value) => { value.packet.targetRole = "roles/owner"; });
reject((value) => { value.packet.recoveryRequiresNewOpA = true; });
reject((value) => { value.packet.localIdentityDiscoveryMax = 1; });
reject((value) => { value.packet.projectIamReadsMax = 1; });
reject((value) => { value.packet.physicalRemotePolicyReadsMax = 2; });
reject((value) => { value.packet.mutationsMax = 1; });
reject((value) => { value.packet.m4Allowed = true; });
reject((value) => { value.packet.firestoreAllowed = true; });
reject((value) => { value.packet.accessTokenAllowed = true; });
reject((value) => { value.packet.cloudLoggingAllowed = true; });
reject((value) => { value.packet.testIamPermissionsAllowed = true; });
reject((value) => { value.packet.serviceAccountKeyAllowed = true; });

const document = readFileSync("docs/p1-5-c2h2e3d-w1c-m3l3-g2b-m3-source-locked-read-only-anchor-recovery-approval.md", "utf8");
const fields = Object.fromEntries([...document.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map(([, key, value]) => [key, value]));
for (const [key, value] of Object.entries({
  STAGE: packet.stage,
  TYPE: packet.type,
  M3_OPERATION_GENERATION: packet.operationGeneration,
  M3_EXECUTION_EVIDENCE_SHA256: packet.executionEvidenceSha256,
  M3_RESULT_DOCUMENT_SHA256: packet.resultDocumentSha256,
  SUPERSEDED_RECOVERY_APPROVAL_PACKET_SHA256: packet.supersededRecoveryApprovalPacketSha256,
  RECOVERY_IMPLEMENTATION_ATTESTATION_SHA256: packet.recoveryImplementationAttestationSha256,
  RECOVERY_RUNTIME_CAPABILITY_ATTESTATION_SHA256: packet.recoveryRuntimeCapabilityAttestationSha256,
  RECOVERY_EXECUTION_COMPOSITE_SHA256: packet.recoveryExecutionCompositeSha256,
  ACTIVE_RECOVERY_SOURCE_LOCK_MANIFEST_SHA256: packet.activeRecoverySourceLockManifestSha256,
  RECOVERY_APPROVAL_PACKET_SHA256: packet.recoveryApprovalPacketSha256,
})) assert.equal(fields[key], value, key);

console.log("G2B source-locked read-only recovery authority chain passed; dependencies=14; remote operations=0");
