import assert from "node:assert/strict";
import test from "node:test";
import { createCanonicalAuthorityRepositories } from "../src/repositories/canonicalAuthorityRepositories.js";
import { fixtureActor, membershipV1, ownerV1 } from "./support/authzFixtures.js";
import { MemoryTransactionRunner } from "./support/trustedTransactionFixture.js";

test("canonical repositories resolve only canonical owner and nested membership", async () => {
  const runner = new MemoryTransactionRunner({
    "systemOwners/fixture-actor": ownerV1(),
    "workspaces/fixture-workspace/members/fixture-actor": membershipV1(),
    "workspace_members/fixture-workspace_fixture-actor": membershipV1("super_manager"),
    "workspaceMembers/fixture-workspace_fixture-actor": membershipV1("super_manager"),
  });
  await runner.run(async (transaction) => {
    const repositories = createCanonicalAuthorityRepositories(transaction);
    assert.equal((await repositories.systemOwners.resolve(fixtureActor())).state, "ACTIVE");
    assert.equal((await repositories.workspaceMemberships.resolve(
      fixtureActor(),
      "fixture-workspace",
    )).state, "ACTIVE");
  });
  assert.deepEqual(runner.reads, [
    "systemOwners/fixture-actor",
    "workspaces/fixture-workspace/members/fixture-actor",
  ]);
});

test("users.role cannot grant system owner authority", async () => {
  const runner = new MemoryTransactionRunner({
    "users/fixture-actor": { role: "system_owner", status: "active" },
  });
  await runner.run(async (transaction) => {
    const repositories = createCanonicalAuthorityRepositories(transaction);
    assert.equal((await repositories.systemOwners.resolve(fixtureActor())).state, "NOT_OWNER");
  });
  assert.deepEqual(runner.reads, ["systemOwners/fixture-actor"]);
});

test("legacy-only membership cannot grant workspace authority", async () => {
  const runner = new MemoryTransactionRunner({
    "workspace_members/fixture-workspace_fixture-actor": membershipV1("super_manager"),
  });
  await runner.run(async (transaction) => {
    const repositories = createCanonicalAuthorityRepositories(transaction);
    assert.equal((await repositories.workspaceMemberships.resolve(
      fixtureActor(),
      "fixture-workspace",
    )).state, "MISSING");
  });
  assert.deepEqual(runner.reads, ["workspaces/fixture-workspace/members/fixture-actor"]);
});

test("invitation repository reads and writes only canonical invitation paths", async () => {
  const runner = new MemoryTransactionRunner({
    "authorityInvitations/fixture-invitation": { schemaVersion: 1 },
    "invitationCodeIndex/fixture-code-hash": {
      schemaVersion: 1,
      invitationId: "fixture-invitation",
    },
  });
  await runner.run(async (transaction) => {
    const invitations = createCanonicalAuthorityRepositories(transaction).invitations;
    assert.equal((await invitations.get("fixture-invitation", "fixture-request")).exists, true);
    assert.equal((await invitations.getCodeIndex("fixture-code-hash", "fixture-request")).exists, true);
    assert.equal((await invitations.getRedemption(
      "fixture-invitation",
      "fixture-redeemer",
      "fixture-request",
    )).exists, false);
    invitations.createRedemption("fixture-invitation", "fixture-redeemer", {
      schemaVersion: 1,
    }, "fixture-request");
  });
  assert.deepEqual(runner.reads, [
    "authorityInvitations/fixture-invitation",
    "invitationCodeIndex/fixture-code-hash",
    "authorityInvitations/fixture-invitation/redemptions/fixture-redeemer",
  ]);
  assert.equal(runner.store.has(
    "authorityInvitations/fixture-invitation/redemptions/fixture-redeemer",
  ), true);
  assert.equal(runner.reads.some((path) => /(^|\/)(invites|invitations|inviteCodes)(\/|$)/.test(path)), false);
});
