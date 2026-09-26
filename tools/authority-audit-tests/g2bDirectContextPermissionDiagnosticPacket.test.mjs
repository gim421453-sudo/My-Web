import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildG2BDirectContextPermissionDiagnosticArtifacts,
  sha256Canonical,
  verifyG2BDirectContextPermissionDiagnosticArtifacts,
  writeG2BDirectContextPermissionDiagnosticArtifacts,
} from "../authority-audit/g2bDirectContextPermissionDiagnosticPacket.mjs";

const artifacts = buildG2BDirectContextPermissionDiagnosticArtifacts();
assert.equal(verifyG2BDirectContextPermissionDiagnosticArtifacts(artifacts).ok, true);
assert.equal(artifacts.sourceLockManifest.unboundDependencies, 0);
assert.equal(artifacts.sourceLockManifest.unboundRemoteCapabilities, 0);
assert.equal(artifacts.sourceLockManifest.unboundAuthCapabilities, 0);
assert.equal(artifacts.runtimeCapability.testIamPermissionsCallsMax, 1);
assert.equal(artifacts.runtimeCapability.totalPhysicalRemoteDiagnosticCallsMax, 1);
assert.equal(artifacts.runtimeCapability.additionalHiddenPhysicalCalls, 0);
assert.equal(artifacts.runtimeCapability.credentialRefreshCallsMax, 0);
assert.equal(artifacts.packet.permissionCount, 1);
assert.equal(artifacts.packet.diagnosticCredentialRecordEqualsDirectMutationRecord, true);
assert.equal(artifacts.packet.diagnosticAuthContextEqualsDirectMutationAuthContext, true);
assert.equal(artifacts.packet.diagnosticCredentialSourceEqualsDirectMutationCredentialSource, true);
assert.equal(artifacts.packet.diagnosticConfigurationContextEqualsDirectMutationConfigurationContext, true);
assert.equal(artifacts.packet.diagnosticProjectContextEqualsDirectMutationProjectContext, true);
assert.equal(artifacts.packet.refreshedRecordEqualsDirectMutationRecord, true);
assert.equal(artifacts.packet.refreshedRecordEqualsDirectDiagnosticRecord, true);
assert.equal(artifacts.packet.preLiveLocalFreshnessCheckOccursBeforeApprovalConsumption, true);
assert.equal(artifacts.packet.firstRemoteOperationCannotOccurBeforeApprovalConsumption, true);
assert.equal(artifacts.packet.approvalConsumptionMatchesFirstPhysicalRemoteCall, true);
assert.equal(artifacts.packet.extraPermissionsRequested, 0);
assert.equal(artifacts.packet.projectWideDiagnostic, false);
assert.equal(artifacts.packet.preLiveCachedCredentialReadinessRequired, true);
assert.equal(artifacts.packet.safeToContinueWithoutApproval, false);
const refreshedBinding = Object.freeze({
  operationInstance: "a5a8a69c-6b99-4670-a47d-53d435b3bab7",
  executionEvidencePath: "docs/evidence/fake-new-refresh-execution.json",
  executionEvidenceSha256: "a".repeat(64),
  resultDocumentPath: "docs/evidence/fake-new-refresh-result.json",
  resultDocumentSha256: "b".repeat(64),
});
const postRefreshArtifacts = buildG2BDirectContextPermissionDiagnosticArtifacts({ refreshBinding: refreshedBinding });
assert.equal(verifyG2BDirectContextPermissionDiagnosticArtifacts(postRefreshArtifacts, { refreshBinding: refreshedBinding }).ok, true);
assert.equal(postRefreshArtifacts.executionComposite.refreshExecutionEvidenceSha256, refreshedBinding.executionEvidenceSha256);
assert.equal(postRefreshArtifacts.packet.operationInstance, refreshedBinding.operationInstance);
const { directContextPermissionDiagnosticApprovalPacketSha256, ...unsignedPacket } = artifacts.packet;
assert.equal(directContextPermissionDiagnosticApprovalPacketSha256, sha256Canonical(unsignedPacket));

const tampered = structuredClone(artifacts);
tampered.runtimeCapability.additionalHiddenPhysicalCalls = 1;
assert.equal(verifyG2BDirectContextPermissionDiagnosticArtifacts(tampered).ok, false);

const root = mkdtempSync(join(tmpdir(), "myweb-direct-diagnostic-"));
try {
  const written = writeG2BDirectContextPermissionDiagnosticArtifacts(artifacts, { repositoryRoot: root });
  const bytes = readFileSync(join(root, written.path));
  assert.equal(bytes.length > 0, true);
  assert.match(written.rawSha256, /^[a-f0-9]{64}$/);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("G2B direct-context permission authority packet passed; fake/local only; remote operations=0");
