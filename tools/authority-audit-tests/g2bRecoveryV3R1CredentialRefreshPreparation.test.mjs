import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createG2BRecoveryAnchorStore, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { inspectG2BRecoveryV3R1CredentialRefreshContext, prepareG2BRecoveryV3R1CredentialRefresh, verifyG2BRecoveryV3R1CredentialRefresh } from "../authority-audit/g2bRecoveryV3R1CredentialRefreshPreparation.mjs";

const root = mkdtempSync(join(tmpdir(), "g2b-v3r1-refresh-"));
const secret = Object.freeze({ state: "READY", secret: randomBytes(32), keyId: randomUUID() });
const secretProvider = Object.freeze({ read: () => secret, loadOrInitialize: () => secret });
const context = Object.freeze(Object.defineProperties({}, { exactIamMember: { value: "user:refresh-v3r1@example.invalid", enumerable: false } }));
const store = createG2BRecoveryAnchorStore({ directory: join(root, "anchor") });
assert.equal(prepareG2BFutureM3Anchor({ identityContext: context, secretProvider, store, operationGenerationId: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981" }).mutationReachable, true);

try {
  const transport = Object.freeze({
    readLocalCachedCredentialReadiness: async () => Object.freeze({ ok: true, state: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED", physicalCalls: 0, configuredIdentityContextResolved: true, credentialStoreRecordResolved: true, credentialObjectLoad: "SUCCESS", cachedAccessTokenPresent: true, credentialExpiryMetadataPresent: true, credentialExpiryParseValid: true, credentialExpiryRelativeState: "EXPIRED", freshnessMarginSeconds: 120 }),
    prepareDirectContextCredentialRefresh: async () => Object.freeze({ ok: true, state: "REFRESH_READY_TO_SEND", physicalCalls: 0 }),
  });
  const inspected = await inspectG2BRecoveryV3R1CredentialRefreshContext({ transport });
  assert.equal(inspected.ok, true);
  assert.equal(inspected.remoteOperations, 0);
  const authority = prepareG2BRecoveryV3R1CredentialRefresh({ contextInspection: inspected, identityContext: context, secretProvider, store });
  assert.equal(authority.ok, true);
  assert.equal(authority.approvalPacket.credentialRefreshCallsMax, 1);
  assert.equal(authority.approvalPacket.recoveryIamReadsMax, 0);
  assert.equal(verifyG2BRecoveryV3R1CredentialRefresh(authority, { contextInspection: inspected, identityContext: context, secretProvider, store }).ok, true);
  const notExpired = { ...inspected, readiness: { ...inspected.readiness, result: "CACHED_CREDENTIAL_READY_CONFIRMED", credentialExpiryRelativeState: "FRESH" }, ok: false };
  assert.equal(prepareG2BRecoveryV3R1CredentialRefresh({ contextInspection: notExpired, identityContext: context, secretProvider, store }).ok, false);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log("G2B V3R1 credential-refresh preparation matrix passed; fake local fixtures only; remote operations=0");
