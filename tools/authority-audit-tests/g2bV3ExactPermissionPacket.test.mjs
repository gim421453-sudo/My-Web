import assert from "node:assert/strict";
import {
  buildG2BV3ExactPermissionArtifacts,
  verifyG2BV3ExactPermissionArtifacts,
} from "../authority-audit/g2bV3ExactPermissionPacket.mjs";

const artifacts = buildG2BV3ExactPermissionArtifacts();
assert.equal(verifyG2BV3ExactPermissionArtifacts(artifacts).ok, true);
assert.equal(artifacts.runtimeCapability.testIamPermissionsCallsMax, 1);
assert.equal(artifacts.runtimeCapability.credentialRefreshCallsMax, 0);
assert.equal(artifacts.runtimeCapability.oauthTokenEndpointCallsMax, 0);
assert.equal(artifacts.runtimeCapability.iamMutationsMax, 0);
assert.equal(artifacts.sourceLockManifest.unboundDependencies, 0);
assert.equal(artifacts.sourceLockManifest.unboundRemoteCapabilities, 0);
assert.equal(artifacts.packet.packetComplete, true);
assert.equal(artifacts.packet.safeToContinueWithoutApproval, false);

for (const mutate of [
  (value) => { value.packet.testIamPermissionsCallsMax = 2; },
  (value) => { value.runtimeCapability.credentialRefreshCallsMax = 1; },
  (value) => { value.implementation.credentialRefreshAllowed = true; },
  (value) => { value.sourceLockManifest.unboundDependencies = 1; },
]) {
  const changed = structuredClone(artifacts);
  mutate(changed);
  assert.equal(verifyG2BV3ExactPermissionArtifacts(changed).ok, false);
}

console.log("G2B V3 exact permission packet and tamper matrix passed; remote operations=0");
