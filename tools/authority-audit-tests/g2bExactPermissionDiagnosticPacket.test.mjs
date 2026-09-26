import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildG2BExactPermissionDiagnosticArtifacts,
  verifyG2BExactPermissionDiagnosticArtifacts,
} from "../authority-audit/g2bExactPermissionDiagnosticPacket.mjs";

const artifacts = buildG2BExactPermissionDiagnosticArtifacts();
assert.equal(verifyG2BExactPermissionDiagnosticArtifacts(artifacts).ok, true);
assert.equal(artifacts.implementation.exactPermissionDerivation, "PROVEN");
assert.equal(artifacts.implementation.authTransportBound, true);
assert.equal(artifacts.implementation.credentialRefreshBlocked, true);
assert.equal(artifacts.implementation.safeFailureMetadataBound, true);
assert.equal(artifacts.implementation.correctedDiagnosticCallReachable, true);
assert.equal(artifacts.implementation.historicalV1RetryAllowed, false);
assert.equal(artifacts.sourceLockManifest.unboundDependencies, 0);
assert.equal(artifacts.sourceLockManifest.unboundRemoteCapabilities, 0);
assert.equal(artifacts.sourceLockManifest.unboundProcessCapabilities, 0);
assert.equal(artifacts.runtimeCapability.testIamPermissionsCallsMax, 1);
assert.equal(artifacts.runtimeCapability.totalPhysicalRemoteDiagnosticCallsMax, 1);
assert.equal(artifacts.runtimeCapability.iamPolicyReadsMax, 0);
assert.equal(artifacts.runtimeCapability.projectIamReadsMax, 0);
assert.equal(artifacts.runtimeCapability.cloudLoggingReadsMax, 0);
assert.equal(artifacts.runtimeCapability.secondDiagnosticCallWithinApproval, 0);
assert.deepEqual(artifacts.runtimeCapability.safeFailureMetadata, [
  "failureStage",
  "httpStatusClass",
  "httpStatusCodeSafe",
  "transportExceptionClassSafe",
  "safeProviderErrorIdentifier",
  "timeout",
]);
assert.deepEqual(artifacts.runtimeCapability.safeFailureStages, [
  "BEFORE_HTTP_SEND",
  "DURING_HTTP_SEND",
  "AFTER_HTTP_RESPONSE",
  "RESPONSE_HANDLING",
  "PROCESS_OR_TRANSPORT_TERMINATION",
]);
assert.equal(artifacts.runtimeCapability.mutationsMax, undefined);
assert.equal(artifacts.packet.status, "PASS");
assert.equal(artifacts.packet.packetComplete, true);
assert.equal(artifacts.packet.safeToContinueWithoutApproval, false);
assert.equal(artifacts.packet.supersedesConsumedDiagnosticPacketSha256, "34891d23ee91160cb1f83f5084917ba21ab0b3a94bc5ebaf0e1f5be8dbe974b8");
assert.equal(artifacts.packet.correctedV2TestIamPermissionsCallReachable, true);
assert.equal(artifacts.packet.v1RetryAllowed, false);
assert.equal(artifacts.packet.v1ReplayAllowed, false);
assert.equal(artifacts.packet.secondDiagnosticCallWithinV2Approval, 0);

const historicalV2 = {
  sourceLockManifest: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-exact-permission-sourceLock-v4.json",
  implementation: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-exact-permission-implementation-v4.json",
  runtimeCapability: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-exact-permission-runtime-v4.json",
  executionComposite: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-exact-permission-composite-v4.json",
  packet: "docs/evidence/p1-5-c2h2e3d-w1c-m3l3-g2b-exact-permission-approval-v4.json",
};
const historicalArtifacts = Object.fromEntries(
  Object.entries(historicalV2).map(([key, path]) => [key, JSON.parse(readFileSync(path, "utf8"))]),
);
assert.equal(historicalArtifacts.packet.stage, "P1.5-C2H2E3D-W1C-M3L3-G2B-M3-EXACT-SERVICE-ACCOUNT-PERMISSION-DIAGNOSTIC-V2");
assert.equal(historicalArtifacts.packet.diagnosticApprovalPacketSha256, "42f7225e61c63a16840b3a7cfbbde26c761d636cc998c2347c616b2de4e36325");
assert.equal(historicalArtifacts.packet.correctedV2TestIamPermissionsCallReachable, true);
assert.equal(historicalArtifacts.runtimeCapability.safeFailureStages.includes("DURING_HTTP_SEND"), true);
assert.equal(historicalArtifacts.runtimeCapability.safeFailureStages.includes("AFTER_HTTP_RESPONSE"), true);

for (const mutate of [
  (v) => { v.packet.targetResource = "projects/wrong/serviceAccounts/wrong"; },
  (v) => { v.packet.exactMutationRequiredPermission = "iam.serviceAccounts.getIamPolicy"; },
  (v) => { v.packet.diagnosticPermissionCount = 2; },
  (v) => { v.runtimeCapability.permissions.push("iam.serviceAccounts.getIamPolicy"); },
  (v) => { v.runtimeCapability.iamPolicyReadsMax = 1; },
  (v) => { v.runtimeCapability.cloudLoggingReadsMax = 1; },
  (v) => { v.packet.mutations = 1; },
  (v) => { v.packet.m3Mutations = 1; },
  (v) => { v.packet.m4Mutations = 1; },
  (v) => { v.packet.testIamPermissionsCallsMax = 2; },
  (v) => { v.packet.retries = 1; },
  (v) => { v.packet.accessTokenGenerationAllowed = true; },
  (v) => { v.sourceLockManifest.localDependencies[0].sha256 = "0".repeat(64); },
  (v) => { v.implementation.requestBuilderBound = false; },
  (v) => { v.implementation.responseParserBound = false; },
  (v) => { v.implementation.authTransportBound = false; },
]) {
  const changed = structuredClone(artifacts);
  mutate(changed);
  assert.equal(verifyG2BExactPermissionDiagnosticArtifacts(changed).ok, false);
}

console.log("G2B exact permission packet and tamper matrix passed; remote operations=0");
