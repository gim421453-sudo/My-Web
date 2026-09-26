import assert from "node:assert/strict";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createFirestoreReadOnlyAuthorityStore } from "../authority-audit/firestoreReadOnlyStore.mjs";
import { runAuthorityInventory } from "../authority-audit/authorityInventory.mjs";

const projectId = "demo-myweb-authority-audit";
if (process.env.PM_AUTHORITY_AUDIT_PROJECT_ID !== projectId) throw new Error("UNSAFE_EMULATOR_PROJECT");
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "";
const emulatorMatch = emulatorHost.match(/^127\.0\.0\.1:(\d{1,5})$/);
const emulatorPort = Number(emulatorMatch?.[1]);
if (!emulatorMatch || emulatorPort < 1 || emulatorPort > 65535) throw new Error("UNSAFE_EMULATOR_HOST");
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error("CREDENTIALS_FORBIDDEN_IN_EMULATOR_TEST");

const app = initializeApp({ projectId }, `authority-audit-test-${Date.now()}`);
const db = getFirestore(app);
const fixtureWrites = [
  db.doc("systemOwners/valid-owner").set({ schemaVersion: 1, uid: "valid-owner", status: "active", source: "trusted_migration" }),
  db.doc("systemOwners/legacy-owner").set({ status: "active" }),
  db.doc("systemOwners/malformed-owner").set({ schemaVersion: 1, uid: "wrong", status: "active", source: "trusted_migration" }),
  db.doc("workspaces/workspace-a/members/member-a").set({ schemaVersion: 1, uid: "member-a", workspaceId: "workspace-a", role: "teacher", status: "active", disabled: false, active: true, source: "trusted_migration" }),
  db.doc("workspaces/workspace-a/members/unknown-role").set({ schemaVersion: 1, uid: "unknown-role", workspaceId: "workspace-a", role: "owner", status: "active", disabled: false, active: true, source: "trusted_migration" }),
  db.doc("workspaces/workspace-b/members/wrong-workspace").set({ schemaVersion: 1, uid: "wrong-workspace", workspaceId: "workspace-a", role: "manager", status: "active", disabled: false, active: true, source: "trusted_migration" }),
  db.doc("workspace_members/workspace-a_member-a").set({ uid: "member-a", workspaceId: "workspace-a", role: "teacher" }),
  db.doc("workspaceMembers/workspace-b_legacy").set({ uid: "legacy", workspaceId: "workspace-b", role: "manager" }),
];

try {
  await Promise.all(fixtureWrites);
  const summary = await runAuthorityInventory(createFirestoreReadOnlyAuthorityStore(db), {
    limits: { pageSize: 2, maxDocsPerScope: 20, maxTotalDocs: 80 },
  });
  assert.equal(summary.status, "COMPLETE");
  assert.equal(summary.totalReads, 8);
  assert.equal(summary.writes, 0);
  assert.equal(summary.owners.classifications.VALID_V1_ACTIVE, 1);
  assert.equal(summary.owners.classifications.MIGRATION_REQUIRED, 1);
  assert.equal(summary.owners.classifications.MALFORMED, 1);
  assert.equal(summary.memberships.classifications.VALID_V1_ACTIVE, 1);
  assert.equal(summary.memberships.classifications.UNKNOWN_ROLE, 1);
  assert.equal(summary.memberships.classifications.WRONG_WORKSPACE, 1);
  process.stdout.write(JSON.stringify({
    emulatorReads: summary.totalReads,
    emulatorFixtureWrites: fixtureWrites.length,
    auditWriteCount: summary.writes,
    rawIdentifiersReported: summary.rawIdentifiersIncluded,
  }, null, 2) + "\n");
} finally {
  await deleteApp(app);
}
