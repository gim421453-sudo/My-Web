import assert from "node:assert/strict";
import {
  G2B_POST_REFRESH_DIAGNOSTIC_CONTINUATION_CONTRACT,
  prepareG2BPostRefreshDiagnosticAuthority,
} from "../authority-audit/g2bDirectCredentialRefreshContinuation.mjs";

const fresh = Object.freeze({
  ok: true,
  result: "CACHED_CREDENTIAL_READY_CONFIRMED",
  credentialExpiryRelativeState: "FRESH",
  freshnessMarginSeconds: 120,
  configuredIdentityContextResolved: true,
  credentialStoreRecordResolved: true,
  credentialRecordMatchesConfiguredContext: true,
  credentialRecordMatchesDirectMutationAuthContext: true,
  credentialRecordMatchesDirectDiagnosticAuthContext: true,
  remoteOperations: 0,
  refreshMethodInvocations: 0,
  networkRequests: 0,
});
const binding = Object.freeze({
  operationInstance: "a5a8a69c-6b99-4670-a47d-53d435b3bab7",
  executionEvidencePath: "docs/evidence/fake-refresh-execution.json",
  executionEvidenceSha256: "a".repeat(64),
  resultDocumentPath: "docs/evidence/fake-refresh-result.json",
  resultDocumentSha256: "b".repeat(64),
});

let builds = 0;
const success = await prepareG2BPostRefreshDiagnosticAuthority({
  readFreshness: async () => fresh,
  buildDiagnosticArtifacts: ({ refreshBinding }) => { builds += 1; return { refreshBinding }; },
  verifyDiagnosticArtifacts: (artifacts, { refreshBinding }) => ({ ok: artifacts.refreshBinding === refreshBinding }),
  refreshBinding: binding,
});
assert.equal(success.ok, true);
assert.equal(success.result, "POST_REFRESH_DIAGNOSTIC_AUTHORITY_PREPARED");
assert.equal(success.remoteOperations, 0);
assert.equal(builds, 1);

const expired = await prepareG2BPostRefreshDiagnosticAuthority({
  readFreshness: async () => ({ ...fresh, ok: false, result: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED", credentialExpiryRelativeState: "EXPIRED" }),
  buildDiagnosticArtifacts: () => { throw new Error("must-not-build"); },
  verifyDiagnosticArtifacts: () => ({ ok: true }),
  refreshBinding: binding,
});
assert.equal(expired.result, "POST_REFRESH_CREDENTIAL_NOT_FRESH");
assert.equal(G2B_POST_REFRESH_DIAGNOSTIC_CONTINUATION_CONTRACT.remoteOperationsAfterRefresh, 0);
assert.equal(G2B_POST_REFRESH_DIAGNOSTIC_CONTINUATION_CONTRACT.testIamPermissionsCalls, 0);
console.log("G2B post-refresh local diagnostic authority preparation passed; remote operations=0");
