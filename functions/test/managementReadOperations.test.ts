import assert from "node:assert/strict";
import test from "node:test";
import type { VerifiedActor } from "../src/auth/verifiedActor.js";
import type { AuthorityDocumentSnapshot } from "../src/authz/authorizationTypes.js";
import {
  trustedListAdminApplications,
  trustedListInvitations,
  trustedListManagementUsers,
  trustedListOwnerWorkspaces,
  trustedListWorkspaceJoinRequests,
  trustedListWorkspaceMembers,
} from "../src/management/managementReadOperations.js";
import type {
  ManagementReadDocument,
  ManagementReadPageRequest,
  ManagementReadStore,
} from "../src/management/managementReadStore.js";
import { OperationError } from "../src/operations/operationErrors.js";
import { fixtureActor, membershipV1, ownerV1 } from "./support/authzFixtures.js";

const OWNER = "fixture-management-owner";
const MANAGER = "fixture-management-manager";
const NORMAL = "fixture-management-normal";
const WORKSPACE = "fixture-management-workspace";

class MemoryReadStore implements ManagementReadStore {
  readonly reads: string[] = [];
  constructor(readonly documents: Map<string, Readonly<Record<string, unknown>>>) {}

  async getDocument(path: readonly string[]): Promise<AuthorityDocumentSnapshot> {
    const key = path.join("/");
    this.reads.push(key);
    const data = this.documents.get(key);
    return Object.freeze({ exists: Boolean(data), data });
  }

  async listCollection(path: readonly string[], request: ManagementReadPageRequest) {
    const collection = path.join("/");
    const prefix = `${collection}/`;
    this.reads.push(collection);
    const rows: ManagementReadDocument[] = [...this.documents.entries()]
      .filter(([key, data]) => key.startsWith(prefix)
        && !key.slice(prefix.length).includes("/")
        && (request.filters || []).every((filter) => data[filter.field] === filter.value))
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(request.offset, request.offset + request.limit)
      .map(([key, data]) => Object.freeze({ id: key.slice(prefix.length), data }));
    return Object.freeze(rows);
  }
}

function fixtures() {
  return new Map<string, Readonly<Record<string, unknown>>>(Object.entries({
    [`systemOwners/${OWNER}`]: ownerV1({ uid: OWNER }),
    [`workspaces/${WORKSPACE}`]: { workspaceId: WORKSPACE, name: "Fixture School", status: "active", operationMode: "school" },
    [`workspaces/${WORKSPACE}/members/${MANAGER}`]: membershipV1("manager", { uid: MANAGER, workspaceId: WORKSPACE }),
    [`workspaces/${WORKSPACE}/members/${NORMAL}`]: membershipV1("normal", { uid: NORMAL, workspaceId: WORKSPACE }),
    [`users/${OWNER}`]: { uid: OWNER, email: "owner@example.invalid", displayName: "Owner", status: "active", role: "system_owner" },
    [`users/${MANAGER}`]: { uid: MANAGER, email: "manager@example.invalid", displayName: "Manager", status: "active", role: "system_owner" },
    "adminApplications/canonical-app": {
      schemaVersion: 1, applicationType: "WORKSPACE_ACCESS", applicantUid: NORMAL,
      workspaceId: WORKSPACE, requestedRole: "normal", status: "pending", source: "trusted_ingress",
    },
    "adminApplications/legacy-app": { uid: NORMAL, role: "super_manager", status: "pending" },
    "workspaceJoinRequests/join-request": {
      schemaVersion: 1, requestType: "WORKSPACE_JOIN", applicantUid: NORMAL,
      workspaceId: WORKSPACE, invitationId: "secret-invitation", requestedRole: "normal",
      status: "pending", source: "trusted_ingress", inviteCode: "must-not-leak",
    },
    "authorityInvitations/invitation-one": {
      schemaVersion: 1, workspaceId: WORKSPACE, targetRole: "normal", status: "active",
      maxUses: 5, usedCount: 1, codeHash: "must-not-leak", code: "must-not-leak",
    },
    [`workspace_members/${WORKSPACE}_${OWNER}`]: {
      uid: OWNER, workspaceId: WORKSPACE, role: "super_manager", status: "active",
    },
  }));
}

function input(operation: string, kind: string, id = "all", workspaceId: string | null = null, payload = {}) {
  return { operation, target: { kind, id, workspaceId }, payload };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => error instanceof OperationError && error.code === code);
}

test("system owner receives bounded redacted canonical management DTOs", async () => {
  const store = new MemoryReadStore(fixtures());
  const actor = fixtureActor(OWNER);
  const applications = await trustedListAdminApplications(actor, input(
    "management.admin_applications.list", "admin_applications",
  ), { store });
  assert.equal(applications.items.length, 2);
  assert.equal(applications.items[0]?.classification, "CANONICAL");
  assert.equal(applications.items[1]?.classification, "LEGACY_REVIEW_REQUIRED");
  assert.equal(applications.items[1]?.status, "legacy_review_required");

  const joins = await trustedListWorkspaceJoinRequests(actor, input(
    "management.workspace_join_requests.list", "workspace_join_requests",
  ), { store });
  assert.equal(joins.items.length, 1);
  assert.equal("invitationId" in joins.items[0]!, false);
  assert.equal("inviteCode" in joins.items[0]!, false);

  const users = await trustedListManagementUsers(actor, input(
    "management.users.list", "management_users",
  ), { store });
  assert.equal(users.items.length, 2);
  assert.equal("role" in users.items[0]!, false);
});

test("canonical manager can list only scoped canonical members and invitations", async () => {
  const store = new MemoryReadStore(fixtures());
  const actor = fixtureActor(MANAGER);
  const members = await trustedListWorkspaceMembers(actor, input(
    "management.workspace_members.list", "workspace_members", WORKSPACE, WORKSPACE,
  ), { store });
  assert.equal(members.items.length, 2);
  assert.equal(members.items.some((row) => row.uid === OWNER), false);
  assert.equal(store.reads.some((path) => path === "workspace_members" || path === "workspaceMembers"), false);

  const invitations = await trustedListInvitations(actor, input(
    "management.invitations.list", "invitations", WORKSPACE, WORKSPACE,
  ), { store });
  assert.equal(invitations.items.length, 1);
  assert.equal("code" in invitations.items[0]!, false);
  assert.equal("codeHash" in invitations.items[0]!, false);
});

test("unauthenticated, normal, users-role spoof and legacy membership spoof are denied", async () => {
  const store = new MemoryReadStore(fixtures());
  const unauthenticated = {
    ...fixtureActor(NORMAL),
    auth: { ...fixtureActor(NORMAL).auth, tokenVerified: false },
  } as unknown as VerifiedActor;
  await expectCode(trustedListOwnerWorkspaces(unauthenticated, input(
    "management.owner_workspaces.list", "owner_workspaces",
  ), { store }), "UNAUTHENTICATED");
  await expectCode(trustedListWorkspaceMembers(fixtureActor(NORMAL), input(
    "management.workspace_members.list", "workspace_members", WORKSPACE, WORKSPACE,
  ), { store }), "FORBIDDEN");
  await expectCode(trustedListOwnerWorkspaces(fixtureActor(MANAGER), input(
    "management.owner_workspaces.list", "owner_workspaces",
  ), { store }), "FORBIDDEN");
});

test("inactive and malformed canonical managers fail closed", async () => {
  const inactiveFixtures = fixtures();
  inactiveFixtures.set(`workspaces/${WORKSPACE}/members/${MANAGER}`, membershipV1("manager", {
    uid: MANAGER, workspaceId: WORKSPACE, status: "disabled", disabled: true, active: false,
  }));
  await expectCode(trustedListInvitations(fixtureActor(MANAGER), input(
    "management.invitations.list", "invitations", WORKSPACE, WORKSPACE,
  ), { store: new MemoryReadStore(inactiveFixtures) }), "FORBIDDEN");

  const malformedFixtures = fixtures();
  malformedFixtures.set(`workspaces/${WORKSPACE}/members/${MANAGER}`, membershipV1("manager", {
    uid: MANAGER, workspaceId: WORKSPACE, role: "owner",
  }));
  await expectCode(trustedListInvitations(fixtureActor(MANAGER), input(
    "management.invitations.list", "invitations", WORKSPACE, WORKSPACE,
  ), { store: new MemoryReadStore(malformedFixtures) }), "FORBIDDEN");
});

test("pagination is bounded, deterministic and rejects malformed inputs", async () => {
  const data = fixtures();
  for (let index = 0; index < 4; index += 1) {
    data.set(`workspaces/ws-page-${index}`, { name: `Workspace ${index}`, status: "active" });
  }
  const store = new MemoryReadStore(data);
  const first = await trustedListOwnerWorkspaces(fixtureActor(OWNER), input(
    "management.owner_workspaces.list", "owner_workspaces", "all", null, { limit: 2 },
  ), { store });
  assert.equal(first.items.length, 2);
  assert.equal(typeof first.nextCursor, "string");
  const second = await trustedListOwnerWorkspaces(fixtureActor(OWNER), input(
    "management.owner_workspaces.list", "owner_workspaces", "all", null,
    { limit: 2, cursor: first.nextCursor },
  ), { store });
  assert.notEqual(first.items[0]?.workspaceId, second.items[0]?.workspaceId);

  await expectCode(trustedListOwnerWorkspaces(fixtureActor(OWNER), input(
    "management.owner_workspaces.list", "owner_workspaces", "all", null, { limit: 101 },
  ), { store }), "INVALID_ARGUMENT");
  await expectCode(trustedListOwnerWorkspaces(fixtureActor(OWNER), input(
    "management.owner_workspaces.list", "owner_workspaces", "all", null, { cursor: "bad!" },
  ), { store }), "INVALID_ARGUMENT");
  await expectCode(trustedListOwnerWorkspaces(fixtureActor(OWNER), {
    ...input("management.owner_workspaces.list", "owner_workspaces"),
    payload: { sortBy: "email" },
  }, { store }), "INVALID_ARGUMENT");
});
