import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createG2BRecoveryAnchorStore } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { prepareG2BRepairedM3Authority } from "../authority-audit/g2bRepairedM3AuthorityPreparation.mjs";

const directory = mkdtempSync(join(tmpdir(), "g2b-repaired-authority-"));
const context = { identityFingerprint: "a".repeat(64) };
Object.defineProperties(context, { exactPrincipal: { value: "operator@example.invalid" }, exactIamMember: { value: "user:operator@example.invalid" } });
try {
  const value = prepareG2BRepairedM3Authority({
    identityContext: context,
    secretProvider: { loadOrInitialize: () => ({ state: "READY", secret: Buffer.alloc(32, 7), keyId: "11111111-1111-4111-8111-111111111111" }) },
    store: createG2BRecoveryAnchorStore({ directory }),
    operationGenerationId: "22222222-2222-4222-8222-222222222222",
  });
  assert.equal(value.ok, true);
  assert.equal(value.approvalPacket.status, "APPROVAL_REQUIRED");
  assert.equal(value.approvalPacket.mutationAttemptsMax, 1);
  assert.equal(value.approvalPacket.testIamPermissionsAllowed, false);
  assert.equal(value.implementation.recoveryAnchorState, "ANCHOR_VERIFIED");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log("G2B repaired M3 authority preparation passed; local fixtures only; remote operations=0");
