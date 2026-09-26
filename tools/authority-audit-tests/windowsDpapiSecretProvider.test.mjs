import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { createWindowsDpapiSecretProvider, WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT } from "../authority-audit/windowsDpapiSecretProvider.mjs";
import { createG2BRecoveryAnchorStore, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";

const root = mkdtempSync(join(tmpdir(), "myweb-dpapi-test-"));
try {
  const path = join(root, "secret.json");
  const provider = createWindowsDpapiSecretProvider({ storagePath: path });
  const created = provider.loadOrInitialize({ anchorsExist: false });
  assert.equal(created.state, "READY");
  assert.equal(created.secret.length, 32);
  const reread = provider.read();
  assert.equal(reread.state, "READY");
  assert.equal(timingSafeEqual(created.secret, reread.secret), true);
  const freshProviderRead = createWindowsDpapiSecretProvider({ storagePath: path }).read();
  assert.equal(freshProviderRead.state, "READY");
  assert.equal(freshProviderRead.keyId, created.keyId);
  assert.equal(timingSafeEqual(created.secret, freshProviderRead.secret), true);
  const temporaryAnchor = prepareG2BFutureM3Anchor({
    identityContext: { exactIamMember: "user:temporary-anchor@example.invalid" },
    secretProvider: provider,
    store: createG2BRecoveryAnchorStore({ directory: join(root, "anchors") }),
    operationGenerationId: "22222222-2222-4222-8222-222222222222",
    now: "2026-09-12T00:00:00.000Z",
  });
  assert.equal(temporaryAnchor.mutationReachable, true);
  assert.equal(temporaryAnchor.state, "ANCHOR_VERIFIED");
  const persisted = readFileSync(path, "utf8");
  assert.equal(persisted.includes(created.secret.toString("base64")), false);
  assert.equal(createWindowsDpapiSecretProvider({ storagePath: join(root, "missing.json") }).loadOrInitialize({ anchorsExist: true }).state, "INVALID");
  const invalidPath = join(root, "invalid.json");
  writeFileSync(invalidPath, JSON.stringify({ schema: "invalid", protectedSecret: "not-a-secret" }));
  const invalid = createWindowsDpapiSecretProvider({ storagePath: invalidPath });
  const inspection = invalid.inspect();
  assert.equal(inspection.state, "INVALID");
  assert.equal(inspection.metadataPresent, true);
  assert.equal(inspection.parseState, "INVALID");
  assert.equal(inspection.blobPresent, true);
  assert.equal(inspection.unprotectResult, "NOT_ATTEMPTED");
  assert.equal(invalid.repairInvalidMetadata({ anchorsExist: true }).action, "BLOCKED");
  const repaired = invalid.repairInvalidMetadata({ anchorsExist: false, now: "2026-09-12T00:00:00.000Z" });
  assert.equal(repaired.state, "READY");
  assert.equal(repaired.action, "REPLACE_INVALID_WITH_NEW_CURRENTUSER_SECRET");
  const repairedReread = createWindowsDpapiSecretProvider({ storagePath: invalidPath }).read();
  assert.equal(repairedReread.state, "READY");
  assert.equal(repaired.keyId, repairedReread.keyId);
  const auditFiles = readdirSync(root).filter((name) => name.startsWith("m3-recovery-anchor-secret-repair-"));
  assert.equal(auditFiles.length, 1);
  const audit = readFileSync(join(root, auditFiles[0]), "utf8");
  assert.equal(audit.includes("not-a-secret"), false);
  assert.equal(audit.includes(repairedReread.secret.toString("base64")), false);
  assert.equal(invalid.repairInvalidMetadata({ anchorsExist: false }).action, "RECOVER_EXISTING");

  const validMetadataPath = join(root, "valid-metadata.json");
  writeFileSync(validMetadataPath, JSON.stringify({ schema: "myweb.m3.recovery-anchor.dpapi-secret.v1", keyId: randomUUID(), dpapiScope: "CurrentUser", protection: "WINDOWS_DPAPI", protectedSecret: Buffer.alloc(32, 7).toString("base64") }));
  const blockedProvider = createWindowsDpapiSecretProvider({ storagePath: validMetadataPath, processHost: () => ({ status: null, error: Object.assign(new Error("blocked"), { code: "EPERM" }) }) });
  const blocked = blockedProvider.inspect();
  assert.equal(blocked.state, "ENVIRONMENT_BLOCKED");
  assert.equal(blocked.unprotectResult, "ENVIRONMENT_BLOCKED");
  assert.equal(blocked.failureCategory, "EPERM");
  const actualFailureProvider = createWindowsDpapiSecretProvider({ storagePath: validMetadataPath, processHost: () => ({ status: 23, stdout: "MYWEB_DPAPI_UNPROTECT_FAILED_V1" }) });
  const actualFailure = actualFailureProvider.inspect();
  assert.equal(actualFailure.state, "INVALID");
  assert.equal(actualFailure.unprotectResult, "FAILURE");
  assert.equal(WINDOWS_DPAPI_SECRET_PROVIDER_CONTRACT.scope, "CurrentUser");
} finally { rmSync(root, { recursive: true, force: true }); }
console.log("Windows DPAPI current-user secret provider passed; local-only; remote operations=0");
