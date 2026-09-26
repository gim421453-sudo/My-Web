import assert from "node:assert/strict";
import { buildG2BDirectCredentialRefreshArtifacts, verifyG2BDirectCredentialRefreshArtifacts } from "../authority-audit/g2bDirectCredentialRefreshPacket.mjs";

const expired = Object.freeze({
  result: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED",
  configuredIdentityContextResolved: true,
  credentialStoreRecordResolved: true,
  credentialObjectLoad: "PASS",
  cachedAccessTokenPresent: true,
  credentialExpiryMetadataPresent: true,
  credentialExpiryParseValid: true,
  credentialExpiryRelativeState: "EXPIRED",
  freshnessMarginSeconds: 120,
  credentialRecordMatchesConfiguredContext: true,
  credentialRecordMatchesDirectMutationAuthContext: true,
  credentialRecordMatchesDirectDiagnosticAuthContext: true,
  remoteOperations: 0,
  refreshMethodInvocations: 0,
  networkRequests: 0,
});
const artifacts = buildG2BDirectCredentialRefreshArtifacts({ preLiveReadiness: expired });
assert.equal(verifyG2BDirectCredentialRefreshArtifacts(artifacts).ok, true);
assert.equal(artifacts.runtimeCapability.totalPhysicalRemoteRefreshCallsMax, 1);
assert.equal(artifacts.runtimeCapability.additionalHiddenRefreshRemoteCalls, 0);
assert.equal(artifacts.packet.testIamPermissionsCallsMax, 0);
assert.equal(artifacts.packet.previousRefreshApprovalReusable, false);
assert.equal(artifacts.packet.previousDiagnosticApprovalReusableAfterRefresh, false);
assert.equal(artifacts.packet.postRefreshPermissionDiagnosticAllowed, true);
const tampered = structuredClone(artifacts);
tampered.runtimeCapability.automaticRetries = 1;
assert.equal(verifyG2BDirectCredentialRefreshArtifacts(tampered).ok, false);
console.log("G2B direct credential refresh authority packet fixtures passed; remote operations=0");
