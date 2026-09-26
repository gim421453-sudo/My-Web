import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createG2BRecoveryAnchorStore, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { createG2BRecoveryV3R2CredentialRefreshExecutor, inspectG2BRecoveryV3R2CredentialRefreshContext, prepareG2BRecoveryV3R2CredentialRefresh, verifyG2BRecoveryV3R2CredentialRefresh } from "../authority-audit/g2bRecoveryV3R2CredentialRefreshPreparation.mjs";

const root = mkdtempSync(join(tmpdir(), "g2b-v3r2-refresh-"));
const context = Object.freeze(Object.defineProperties({}, { exactIamMember: { value: "user:refresh-v3r2@example.invalid", enumerable: false } }));
const secret = Object.freeze({ state: "READY", secret: randomBytes(32), keyId: randomUUID() });
const secretProvider = Object.freeze({ read: () => secret, loadOrInitialize: () => secret });
const store = createG2BRecoveryAnchorStore({ directory: join(root, "anchor") });
const transport = Object.freeze({ readLocalCachedCredentialReadiness: async () => Object.freeze({ ok: true, state: "CACHED_CREDENTIAL_EXPIRED_CONFIRMED", physicalCalls: 0, configuredIdentityContextResolved: true, credentialStoreRecordResolved: true, credentialObjectLoad: "SUCCESS", cachedAccessTokenPresent: true, credentialExpiryMetadataPresent: true, credentialExpiryParseValid: true, credentialExpiryRelativeState: "EXPIRED", freshnessMarginSeconds: 120 }), prepareDirectContextCredentialRefresh: async () => Object.freeze({ ok: true, state: "REFRESH_READY_TO_SEND", physicalCalls: 0 }) });
try {
  assert.equal(prepareG2BFutureM3Anchor({ identityContext: context, secretProvider, store, operationGenerationId: "8b30e1da-8d4d-4ded-ad94-cf62aabcc981" }).mutationReachable, true);
  const inspected = await inspectG2BRecoveryV3R2CredentialRefreshContext({ transport });
  assert.equal(inspected.ok, true);
  const authority = prepareG2BRecoveryV3R2CredentialRefresh({ contextInspection: inspected, identityContext: context, secretProvider, store });
  assert.equal(authority.ok, true);
  assert.equal(verifyG2BRecoveryV3R2CredentialRefresh(authority, { contextInspection: inspected, identityContext: context, secretProvider, store }).ok, true);
  assert.equal(authority.approvalPacket.credentialRefreshCallsMax, 1);
  assert.equal(authority.approvalPacket.recoveryIamReadsMax, 0);
  let calls = 0;
  const executor = createG2BRecoveryV3R2CredentialRefreshExecutor();
  const output = await executor.execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => true, transport: { executeDirectContextCredentialRefresh: async () => { calls += 1; return { ok: true, state: "REFRESH_SUCCESS_CONFIRMED", physicalCalls: 1 }; } } });
  assert.equal(output.ok, true); assert.equal(calls, 1); assert.equal(output.counters.recoveryIamReads, 0);
  const blocked = await createG2BRecoveryV3R2CredentialRefreshExecutor().execute({ enabled: true, authorizationPreconditionEstablished: true, consumeApproval: async () => false, transport: { executeDirectContextCredentialRefresh: async () => { throw new Error("must-not-run"); } } });
  assert.equal(blocked.code, "RECOVERY_V3R2_REFRESH_APPROVAL_NOT_CONSUMED");
} finally { rmSync(root, { recursive: true, force: true }); }
console.log("G2B V3R2 credential refresh preparation passed; fake fixtures only; remote operations=0");
