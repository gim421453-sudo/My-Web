import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyAdminApplication,
  planLegacyAdminApplicationMigration,
} from "../src/adminApplications/adminApplicationCompatibility.js";

const now = "fixture-time";

function canonical(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    applicationType: "WORKSPACE_ACCESS",
    applicantUid: "fixture-user",
    workspaceId: "fixture-workspace",
    requestedRole: "teacher",
    status: "pending",
    source: "trusted_ingress",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("canonical v1 access is classified exactly", () => {
  assert.equal(classifyAdminApplication(canonical()), "CANONICAL_V1_WORKSPACE_ACCESS");
});

test("canonical v1 bootstrap is classified but not treated as access", () => {
  assert.equal(classifyAdminApplication(canonical({
    applicationType: "WORKSPACE_BOOTSTRAP",
    workspaceId: null,
    requestedWorkspaceName: "Fixture School",
  })), "CANONICAL_V1_WORKSPACE_BOOTSTRAP");
});

test("explicit legacy bootstrap marker is a bootstrap candidate", () => {
  assert.equal(classifyAdminApplication({
    uid: "fixture-user",
    requestType: "workspace_bootstrap",
    requestedWorkspaceName: "Fixture School",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }), "LEGACY_BOOTSTRAP_CANDIDATE");
});

test("workspace-linked legacy record is an access candidate", () => {
  assert.equal(classifyAdminApplication({
    uid: "fixture-user",
    workspaceId: "fixture-workspace",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }), "LEGACY_ACCESS_CANDIDATE");
});

test("requestedWorkspaceName alone remains ambiguous", () => {
  assert.equal(classifyAdminApplication({
    uid: "fixture-user",
    requestedWorkspaceName: "Fixture School",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }), "LEGACY_AMBIGUOUS");
});

test("malformed legacy identity is rejected", () => {
  assert.equal(classifyAdminApplication({
    uid: "bad/path",
    requestedWorkspaceName: "Fixture School",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }), "MALFORMED");
});

test("canonical record needs no migration", () => {
  assert.equal(planLegacyAdminApplicationMigration(canonical()).status, "ALREADY_CANONICAL");
});

test("legacy access without workspace resolution is blocked", () => {
  const plan = planLegacyAdminApplicationMigration({
    uid: "fixture-user",
    applicationType: "workspace_access",
    requestedRole: "teacher",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  assert.equal(plan.status, "NEEDS_WORKSPACE_RESOLUTION");
});

test("legacy access without role resolution is blocked", () => {
  const plan = planLegacyAdminApplicationMigration({
    uid: "fixture-user",
    workspaceId: "fixture-workspace",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  assert.equal(plan.status, "NEEDS_ROLE_RESOLUTION");
});

test("ambiguous legacy application needs an explicit type", () => {
  const plan = planLegacyAdminApplicationMigration({
    uid: "fixture-user",
    requestedWorkspaceName: "Fixture School",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }, { requestedRole: "manager" });
  assert.equal(plan.status, "NEEDS_APPLICATION_TYPE_RESOLUTION");
});

test("explicit resolutions produce a read-only canonical preview", () => {
  const plan = planLegacyAdminApplicationMigration({
    uid: "fixture-user",
    requestedWorkspaceName: "Fixture School",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }, {
    applicationType: "WORKSPACE_ACCESS",
    workspaceId: "fixture-workspace",
    requestedRole: "teacher",
  });
  assert.equal(plan.status, "MIGRATABLE");
  assert.equal(plan.canonicalPreview?.applicantUid, "fixture-user");
  assert.equal(plan.canonicalPreview?.source, "trusted_migration");
});

test("conflicting explicit resolution fails closed", () => {
  const plan = planLegacyAdminApplicationMigration({
    uid: "fixture-user",
    workspaceId: "fixture-workspace",
    requestedRole: "teacher",
    status: "pending",
    createdAt: now,
    updatedAt: now,
  }, { workspaceId: "other-workspace" });
  assert.equal(plan.status, "CONFLICT");
});
