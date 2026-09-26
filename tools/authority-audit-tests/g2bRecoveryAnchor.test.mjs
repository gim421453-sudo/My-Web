import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createG2BRecoveryAnchorStore, prepareG2BFutureM3Anchor, recoverG2BAnchorPolicy, G2B_TARGET_ROLE } from "../authority-audit/g2bRecoveryAnchor.mjs";

const root = mkdtempSync(join(tmpdir(), "myweb-anchor-test-"));
try {
  const secretResult = Object.freeze({ state: "READY", secret: Buffer.alloc(32, 0x5a), keyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
  const provider = Object.freeze({
    loadOrInitialize: () => secretResult,
    read: () => secretResult,
  });
  const store = createG2BRecoveryAnchorStore({ directory: join(root, "anchors") });
  const identity = { exactIamMember: "user:anchor-subject@example.invalid" };
  const prepared = prepareG2BFutureM3Anchor({ identityContext: identity, secretProvider: provider, store, operationGenerationId: "11111111-1111-4111-8111-111111111111", now: "2026-09-07T00:00:00.000Z" });
  assert.equal(prepared.mutationReachable, true);
  const loaded = store.load(prepared.operationGenerationId);
  assert.equal(loaded.record.anchorState, "ANCHOR_VERIFIED");
  assert.equal(JSON.stringify(loaded.record).includes("anchor-subject@example.invalid"), false);
  const policy = JSON.stringify({ etag: "synthetic", bindings: [{ role: G2B_TARGET_ROLE, members: ["user:anchor-subject@example.invalid"] }] });
  assert.equal(recoverG2BAnchorPolicy({ record: loaded.record, secretResult: provider.read(), policyText: policy }).state, "PRESENT_CONFIRMED");
  const changedActiveAccountPolicy = JSON.stringify({ etag: "synthetic", bindings: [{ role: G2B_TARGET_ROLE, members: ["user:other-active-account@example.invalid", "user:anchor-subject@example.invalid"] }] });
  assert.equal(recoverG2BAnchorPolicy({ record: loaded.record, secretResult: provider.read(), policyText: changedActiveAccountPolicy }).state, "PRESENT_CONFIRMED");
  assert.equal(recoverG2BAnchorPolicy({ record: { ...loaded.record, targetRole: "roles/viewer" }, secretResult: provider.read(), policyText: policy }).state, "ANCHOR_INVALID");
  assert.equal(recoverG2BAnchorPolicy({ record: { ...loaded.record, targetResource: "other@example.invalid" }, secretResult: provider.read(), policyText: policy }).state, "ANCHOR_INVALID");
  assert.equal(recoverG2BAnchorPolicy({ record: { ...loaded.record, operationGenerationId: "22222222-2222-4222-8222-222222222222" }, secretResult: provider.read(), policyText: policy }).state, "MEMBER_ABSENT_CONFIRMED");
  assert.equal(recoverG2BAnchorPolicy({ record: { ...loaded.record, domainVersion: "OTHER" }, secretResult: provider.read(), policyText: policy }).state, "ANCHOR_INVALID");
  assert.equal(recoverG2BAnchorPolicy({ record: loaded.record, secretResult: { state: "INVALID" }, policyText: policy }).state, "SECRET_UNAVAILABLE");
  assert.equal(prepareG2BFutureM3Anchor({ identityContext: identity, secretProvider: provider, store }).mutationReachable, false, "duplicate active anchor blocked");
} finally { rmSync(root, { recursive: true, force: true }); }
console.log("G2B recovery anchor HMAC/persistence/recovery matrix passed; local-only; remote operations=0");
