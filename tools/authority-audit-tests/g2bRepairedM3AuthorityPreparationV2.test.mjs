import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createG2BRecoveryAnchorStore, prepareG2BFutureM3Anchor } from "../authority-audit/g2bRecoveryAnchor.mjs";
import { prepareG2BRepairedM3AuthorityV2, verifyG2BRepairedM3AuthorityV2 } from "../authority-audit/g2bRepairedM3AuthorityPreparationV2.mjs";

const root = mkdtempSync(join(tmpdir(), "g2b-repaired-authority-v2-"));
const generation = "8b30e1da-8d4d-4ded-ad94-cf62aabcc981";
const secret = Object.freeze({ state: "READY", secret: Buffer.alloc(32, 9), keyId: "11111111-1111-4111-8111-111111111111" });
const provider = Object.freeze({ read: () => secret, loadOrInitialize: () => secret });
const context = {};
Object.defineProperties(context, {
  exactPrincipal: { value: "operator@example.invalid" }, exactIamMember: { value: "user:operator@example.invalid" }, identityFingerprint: { value: "a".repeat(64) },
});
try {
  const store = createG2BRecoveryAnchorStore({ directory: root });
  assert.equal(prepareG2BFutureM3Anchor({ identityContext: context, secretProvider: provider, store, operationGenerationId: generation }).mutationReachable, true);
  const value = prepareG2BRepairedM3AuthorityV2({ identityContext: context, secretProvider: provider, store, operationGenerationId: generation });
  assert.equal(value.ok, true);
  assert.equal(verifyG2BRepairedM3AuthorityV2(value, { identityContext: context, secretProvider: provider, store, operationGenerationId: generation }).ok, true);
  const required = Object.keys(value.approvalPacket);
  for (const field of required) {
    const copy = structuredClone(value);
    delete copy.approvalPacket[field];
    assert.equal(verifyG2BRepairedM3AuthorityV2(copy, { identityContext: context, secretProvider: provider, store, operationGenerationId: generation }).ok, false, `omitted ${field}`);
    const changed = structuredClone(value);
    changed.approvalPacket[field] = typeof changed.approvalPacket[field] === "boolean" ? !changed.approvalPacket[field] : "TAMPERED";
    assert.equal(verifyG2BRepairedM3AuthorityV2(changed, { identityContext: context, secretProvider: provider, store, operationGenerationId: generation }).ok, false, `tampered ${field}`);
  }
} finally { rmSync(root, { recursive: true, force: true }); }
console.log("G2B repaired M3 authority V2 field-binding/tamper matrix passed; local fixtures only; remote operations=0");
