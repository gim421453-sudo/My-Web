import assert from "node:assert/strict";
import test from "node:test";
import { resolveSystemOwner } from "../src/authz/systemOwnerResolver.js";
import { resolveWorkspaceMembership } from "../src/authz/workspaceMembershipResolver.js";
import { WORKSPACE_ROLES } from "../src/authz/authorizationTypes.js";
import {
  FIXTURE_UID,
  FIXTURE_WORKSPACE,
  fixtureActor,
  membershipV1,
  ownerV1,
  readerFixture,
  throwingReader,
} from "./support/authzFixtures.js";

async function ownerState(data: Record<string, unknown> | undefined, exists = true) {
  return (await resolveSystemOwner(fixtureActor(), {
    reader: readerFixture({ exists, data }),
  })).state;
}

async function membershipState(data: Record<string, unknown> | undefined, exists = true) {
  return (await resolveWorkspaceMembership(fixtureActor(), FIXTURE_WORKSPACE, {
    reader: readerFixture({ exists, data }),
  })).state;
}

test("system owner valid v1 active resolves ACTIVE", async () => {
  assert.equal(await ownerState(ownerV1()), "ACTIVE");
});

test("system owner missing document resolves NOT_OWNER", async () => {
  assert.equal(await ownerState(undefined, false), "NOT_OWNER");
});

for (const status of ["inactive", "disabled", "revoked"]) {
  test(`system owner ${status} resolves DISABLED`, async () => {
    assert.equal(await ownerState(ownerV1({ status })), "DISABLED");
  });
}

test("system owner missing schema resolves MIGRATION_REQUIRED", async () => {
  const data = ownerV1();
  delete data.schemaVersion;
  assert.equal(await ownerState(data), "MIGRATION_REQUIRED");
});

test("system owner unsupported schema resolves MALFORMED", async () => {
  assert.equal(await ownerState(ownerV1({ schemaVersion: 2 })), "MALFORMED");
});

test("system owner missing status resolves MIGRATION_REQUIRED", async () => {
  const data = ownerV1();
  delete data.status;
  assert.equal(await ownerState(data), "MIGRATION_REQUIRED");
});

test("system owner missing source resolves MIGRATION_REQUIRED", async () => {
  const data = ownerV1();
  delete data.source;
  assert.equal(await ownerState(data), "MIGRATION_REQUIRED");
});

test("system owner unknown source resolves MIGRATION_REQUIRED", async () => {
  assert.equal(await ownerState(ownerV1({ source: "client" })), "MIGRATION_REQUIRED");
});

test("system owner unknown status resolves MALFORMED", async () => {
  assert.equal(await ownerState(ownerV1({ status: "unknown" })), "MALFORMED");
});

test("system owner malformed field type resolves MALFORMED", async () => {
  assert.equal(await ownerState(ownerV1({ status: true })), "MALFORMED");
});

test("system owner unexpected authority field resolves MALFORMED", async () => {
  assert.equal(await ownerState(ownerV1({ globalRole: "system_owner" })), "MALFORMED");
});

test("system owner UID mismatch resolves MALFORMED", async () => {
  assert.equal(await ownerState(ownerV1({ uid: "fixture-other" })), "MALFORMED");
});

test("system owner read failure remains READ_ERROR", async () => {
  assert.equal((await resolveSystemOwner(fixtureActor(), { reader: throwingReader() })).state, "READ_ERROR");
});

test("system owner resolver reads only canonical owner path", async () => {
  const paths: string[][] = [];
  await resolveSystemOwner(fixtureActor(), {
    reader: readerFixture({ exists: true, data: ownerV1() }, (path) => paths.push([...path])),
  });
  assert.deepEqual(paths, [["systemOwners", FIXTURE_UID]]);
});

test("client systemOwner property cannot change owner path or result", async () => {
  const actor = { ...fixtureActor(), systemOwner: true } as never;
  assert.equal((await resolveSystemOwner(actor, {
    reader: readerFixture({ exists: false }),
  })).state, "NOT_OWNER");
});

for (const role of WORKSPACE_ROLES) {
  test(`membership v1 ${role} resolves ACTIVE`, async () => {
    const result = await resolveWorkspaceMembership(fixtureActor(), FIXTURE_WORKSPACE, {
      reader: readerFixture({ exists: true, data: membershipV1(role) }),
    });
    assert.equal(result.state, "ACTIVE");
    if (result.state === "ACTIVE") assert.equal(result.role, role);
  });
}

test("missing membership resolves MISSING", async () => {
  assert.equal(await membershipState(undefined, false), "MISSING");
});

test("disabled membership resolves DISABLED", async () => {
  assert.equal(await membershipState(membershipV1("manager", {
    status: "disabled", disabled: true, active: false,
  })), "DISABLED");
});

test("inactive membership resolves INACTIVE", async () => {
  assert.equal(await membershipState(membershipV1("manager", {
    status: "inactive", disabled: false, active: false,
  })), "INACTIVE");
});

test("membership missing schema resolves MIGRATION_REQUIRED", async () => {
  const data = membershipV1();
  delete data.schemaVersion;
  assert.equal(await membershipState(data), "MIGRATION_REQUIRED");
});

test("membership missing source resolves MIGRATION_REQUIRED", async () => {
  const data = membershipV1();
  delete data.source;
  assert.equal(await membershipState(data), "MIGRATION_REQUIRED");
});

for (const field of ["uid", "workspaceId", "role", "status", "disabled", "active"]) {
  test(`v1 membership missing ${field} resolves MALFORMED`, async () => {
    const data = membershipV1();
    delete data[field];
    assert.equal(await membershipState(data), "MALFORMED");
  });
}

test("membership unknown source resolves MIGRATION_REQUIRED", async () => {
  assert.equal(await membershipState(membershipV1("manager", { source: "client" })), "MIGRATION_REQUIRED");
});

test("membership wrong UID resolves WRONG_UID", async () => {
  assert.equal(await membershipState(membershipV1("manager", { uid: "fixture-other" })), "WRONG_UID");
});

test("membership wrong workspace resolves WRONG_WORKSPACE", async () => {
  assert.equal(await membershipState(membershipV1("manager", { workspaceId: "fixture-other" })), "WRONG_WORKSPACE");
});

for (const role of ["system_owner", "admin", "owner", "superadmin", "administrator", "unknown", "", null]) {
  test(`membership role ${String(role)} resolves UNKNOWN_ROLE`, async () => {
    assert.equal(await membershipState(membershipV1("manager", { role })), "UNKNOWN_ROLE");
  });
}

test("membership contradictory flags resolve MALFORMED", async () => {
  assert.equal(await membershipState(membershipV1("manager", { disabled: true })), "MALFORMED");
});

test("membership unexpected authority field resolves MALFORMED", async () => {
  assert.equal(await membershipState(membershipV1("manager", { permissions: ["write"] })), "MALFORMED");
});

test("accepted legacy membership resolves MIGRATION_REQUIRED", async () => {
  assert.equal(await membershipState(membershipV1("manager", { status: "accepted" })), "MIGRATION_REQUIRED");
});

test("membership read failure remains READ_ERROR", async () => {
  assert.equal((await resolveWorkspaceMembership(fixtureActor(), FIXTURE_WORKSPACE, {
    reader: throwingReader(),
  })).state, "READ_ERROR");
});

test("membership resolver reads only canonical nested path", async () => {
  const paths: string[][] = [];
  await resolveWorkspaceMembership(fixtureActor(), FIXTURE_WORKSPACE, {
    reader: readerFixture({ exists: true, data: membershipV1() }, (path) => paths.push([...path])),
  });
  assert.deepEqual(paths, [["workspaces", FIXTURE_WORKSPACE, "members", FIXTURE_UID]]);
});

test("legacy membership path data is never queried", async () => {
  const paths: string[][] = [];
  const result = await resolveWorkspaceMembership(fixtureActor(), FIXTURE_WORKSPACE, {
    reader: readerFixture({ exists: false }, (path) => paths.push([...path])),
  });
  assert.equal(result.state, "MISSING");
  assert.equal(paths.some((path) => path.includes("workspace_members") || path.includes("workspaceMembers")), false);
});

for (const workspaceId of ["", " ", ".", "..", "workspace/escape", " http://fixture.invalid "]) {
  test(`invalid workspace ${JSON.stringify(workspaceId)} is blocked before read`, async () => {
    let readCount = 0;
    const result = await resolveWorkspaceMembership(fixtureActor(), workspaceId, {
      reader: readerFixture({ exists: false }, () => { readCount += 1; }),
    });
    assert.equal(result.state, "MALFORMED");
    assert.equal(readCount, 0);
  });
}

test("client membership payload cannot change canonical read", async () => {
  const actor = { ...fixtureActor(), membership: { role: "super_manager" } } as never;
  assert.equal((await resolveWorkspaceMembership(actor, FIXTURE_WORKSPACE, {
    reader: readerFixture({ exists: false }),
  })).state, "MISSING");
});
