import assert from "node:assert/strict";
import {
  G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT,
  readG2BDirectCachedCredentialReadiness,
} from "../authority-audit/g2bDirectCachedCredentialReadiness.mjs";

function readinessTransport(state = "CACHED_CREDENTIAL_READY_CONFIRMED") {
  return {
    readLocalCachedCredentialReadiness: async () => ({
      ok: true, state, physicalCalls: 0,
      configuredIdentityContextResolved: true, credentialStoreRecordResolved: true,
      credentialObjectLoad: "PASS", cachedAccessTokenPresent: state !== "CACHED_CREDENTIAL_MISSING",
      credentialExpiryMetadataPresent: state !== "CACHED_CREDENTIAL_METADATA_INVALID",
      credentialExpiryParseValid: state !== "CACHED_CREDENTIAL_METADATA_INVALID",
      credentialExpiryRelativeState: state === "CACHED_CREDENTIAL_EXPIRED_CONFIRMED" ? "EXPIRED"
        : state === "CACHED_CREDENTIAL_TOO_CLOSE_TO_EXPIRY" ? "TOO_CLOSE_TO_EXPIRY" : "FRESH",
      freshnessMarginSeconds: 120,
    }),
  };
}

for (const state of [
  "CACHED_CREDENTIAL_READY_CONFIRMED", "CACHED_CREDENTIAL_EXPIRED_CONFIRMED",
  "CACHED_CREDENTIAL_TOO_CLOSE_TO_EXPIRY", "CACHED_CREDENTIAL_MISSING",
  "CACHED_CREDENTIAL_METADATA_INVALID",
]) {
  const result = await readG2BDirectCachedCredentialReadiness({ transport: readinessTransport(state) });
  assert.equal(result.result, state);
  assert.equal(result.ok, state === "CACHED_CREDENTIAL_READY_CONFIRMED");
  assert.equal(result.networkRequests, 0);
}

assert.equal((await readG2BDirectCachedCredentialReadiness({ transport: {
  readLocalCachedCredentialReadiness: async () => ({ ok: false, code: "LOCAL_PRIVACY_GUARD", physicalCalls: 0 }),
} })).result, "CACHED_CREDENTIAL_CONTEXT_MISMATCH");
assert.equal((await readG2BDirectCachedCredentialReadiness({ transport: {
  readLocalCachedCredentialReadiness: async () => ({ ok: true, state: "CACHED_CREDENTIAL_READY_CONFIRMED", physicalCalls: 1 }),
} })).result, "CACHED_CREDENTIAL_READINESS_UNKNOWN");

assert.equal(G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.cachedCredentialOnly, true);
assert.equal(G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.implicitRefreshAllowed, false);
assert.equal(G2B_DIRECT_CACHED_CREDENTIAL_READINESS_CONTRACT.networkRequests, 0);
console.log("G2B direct cached-credential readiness matrix passed; remote operations=0");
