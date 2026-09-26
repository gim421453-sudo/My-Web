import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AUTHORITY_SCOPES,
  classifyCanonicalMembership,
  classifySystemOwner,
  renderSanitizedReport,
  runAuthorityInventory,
} from "../authority-audit/authorityInventory.mjs";

const ownerV1 = (overrides = {}) => ({
  schemaVersion: 1,
  status: "active",
  source: "trusted_migration",
  uid: "owner-fixture",
  ...overrides,
});
const membershipV1 = (overrides = {}) => ({
  schemaVersion: 1,
  uid: "member-fixture",
  workspaceId: "workspace-fixture",
  role: "teacher",
  status: "active",
  disabled: false,
  active: true,
  source: "trusted_migration",
  ...overrides,
});

function memoryStore(fixtures) {
  return Object.freeze({
    async listPage(scope, { cursor, limit }) {
      const offset = cursor === null ? 0 : Number(cursor);
      const rows = (fixtures[scope] || []).slice(offset, offset + limit);
      const nextOffset = offset + rows.length;
      return {
        documents: rows,
        nextCursor: nextOffset < (fixtures[scope] || []).length ? nextOffset : null,
        nextCursorToken: String(nextOffset),
      };
    },
  });
}

test("owner inventory classifier distinguishes strict, legacy, and malformed states", () => {
  assert.equal(classifySystemOwner("owner-fixture", ownerV1()).classification, "VALID_V1_ACTIVE");
  assert.equal(classifySystemOwner("owner-fixture", ownerV1({ status: "disabled" })).classification, "VALID_V1_DISABLED");
  assert.equal(classifySystemOwner("owner-fixture", { status: "active" }).classification, "MIGRATION_REQUIRED");
  assert.equal(classifySystemOwner("owner-fixture", ownerV1({ schemaVersion: 2 })).classification, "UNSUPPORTED_SCHEMA");
  assert.equal(classifySystemOwner("owner-fixture", ownerV1({ source: "client" })).classification, "UNKNOWN_SOURCE");
  assert.equal(classifySystemOwner("owner-fixture", ownerV1({ profile: {} })).classification, "MALFORMED");
});

test("membership classifier preserves strict failures without granting authority", () => {
  assert.equal(classifyCanonicalMembership("workspace-fixture", "member-fixture", membershipV1()).classification, "VALID_V1_ACTIVE");
  assert.equal(classifyCanonicalMembership("workspace-fixture", "member-fixture", membershipV1({ role: "owner" })).classification, "UNKNOWN_ROLE");
  assert.equal(classifyCanonicalMembership("workspace-fixture", "member-fixture", membershipV1({ uid: "wrong" })).classification, "WRONG_UID");
  assert.equal(classifyCanonicalMembership("workspace-fixture", "member-fixture", membershipV1({ workspaceId: "wrong" })).classification, "WRONG_WORKSPACE");
  assert.equal(classifyCanonicalMembership("workspace-fixture", "member-fixture", membershipV1({ status: "accepted" })).classification, "MIGRATION_REQUIRED");
});

test("bounded inventory paginates four approved scopes and reports aggregate-only output", async () => {
  const summary = await runAuthorityInventory(memoryStore({
    systemOwners: [
      { pathUid: "owner-fixture", data: ownerV1() },
      { pathUid: "legacy-owner", data: { status: "active" } },
      { pathUid: "bad-owner", data: ownerV1({ uid: "mismatch" }) },
    ],
    canonicalMemberships: [
      { pathWorkspaceId: "workspace-fixture", pathUid: "member-fixture", data: membershipV1() },
      { pathWorkspaceId: "workspace-fixture", pathUid: "unknown-role", data: membershipV1({ uid: "unknown-role", role: "owner" }) },
      { pathWorkspaceId: "workspace-two", pathUid: "wrong-workspace", data: membershipV1({ uid: "wrong-workspace" }) },
    ],
    workspace_members: [
      { data: { uid: "member-fixture", workspaceId: "workspace-fixture", role: "teacher" } },
    ],
    workspaceMembers: [
      { data: { uid: "legacy-only", workspaceId: "workspace-two", role: "manager" } },
    ],
  }), { limits: { pageSize: 2, maxDocsPerScope: 10, maxTotalDocs: 20 } });

  assert.equal(summary.totalReads, 8);
  assert.equal(summary.writes, 0);
  assert.equal(summary.owners.classifications.VALID_V1_ACTIVE, 1);
  assert.equal(summary.owners.classifications.MIGRATION_REQUIRED, 1);
  assert.equal(summary.memberships.classifications.VALID_V1_ACTIVE, 1);
  assert.equal(summary.memberships.classifications.UNKNOWN_ROLE, 1);
  assert.equal(summary.canonicalLegacy.CANONICAL_V1_WINS, 1);
  const report = renderSanitizedReport(summary, { projectFingerprint: "deadbeef" });
  assert.doesNotMatch(report, /owner-fixture|member-fixture|workspace-fixture|legacy-only/);
  assert.match(report, /Production Firestore writes: 0/);
});

test("hard cap stops without expanding scope", async () => {
  const summary = await runAuthorityInventory(memoryStore({
    systemOwners: Array.from({ length: 5 }, (_, index) => ({
      pathUid: `fixture-${index}`,
      data: ownerV1({ uid: `fixture-${index}` }),
    })),
  }), { limits: { pageSize: 2, maxDocsPerScope: 4, maxTotalDocs: 4 } });
  assert.equal(summary.status, "BLOCKED");
  assert.equal(summary.blocker, "INVENTORY_INCOMPLETE_CAP_REACHED");
  assert.equal(summary.totalReads, 4);
});

test("production audit source exposes no Firestore write API", () => {
  const files = [
    "tools/authority-audit/authorityInventory.mjs",
    "tools/authority-audit/firestoreReadOnlyStore.mjs",
    "tools/authority-audit/runProductionInventory.mjs",
  ];
  const forbiddenSymbols = /\bwriteBatch\b|FieldValue\.delete|\bbulkWriter\b|\brunTransaction\b/;
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, "utf8"), forbiddenSymbols, file);
  }
  const storeSource = readFileSync("tools/authority-audit/firestoreReadOnlyStore.mjs", "utf8");
  assert.doesNotMatch(storeSource, /\.(?:set|create|update|delete|add|batch)\s*\(/);
  assert.match(storeSource, /import \{ FieldPath \} from "firebase-admin\/firestore"/);
  const runnerSource = readFileSync("tools/authority-audit/runProductionInventory.mjs", "utf8");
  assert.match(runnerSource, /import \{ getFirestore \} from "firebase-admin\/firestore"/);
  assert.doesNotMatch(runnerSource, /applicationDefault|cert\s*\(|refreshToken\s*\(/);
  assert.deepEqual(AUTHORITY_SCOPES, [
    "systemOwners", "canonicalMemberships", "workspace_members", "workspaceMembers",
  ]);
});
