import { beforeEach, describe, test } from "node:test";
import {
  MANAGER_UID,
  NORMAL_UID,
  OWNER_UID,
  PRINT_UID,
  SUPER_MANAGER_UID,
  TEACHER_UID,
  VIEWER_UID,
  WORKSPACE_ID,
  assertFails,
  assertSucceeds,
  authedDb,
  baseInvite,
  collection,
  doc,
  getDoc,
  getDocs,
  resetFirestore,
  seedActors,
  seedFixtures,
  setDoc,
  unauthenticatedDb,
  updateDoc,
} from "./helpers.mjs";

const invitePaths = {
  root: (code) => `invites/${code}`,
  invitations: (code) => `invitations/${code}`,
  workspace: (code) => `workspaces/${WORKSPACE_ID}/inviteCodes/${code}`,
};

function inviteFor(actorUid, code, role, overrides = {}) {
  return baseInvite(code, role, {
    createdBy: actorUid,
    inviterUid: actorUid,
    inviterEmail: `${actorUid}@example.invalid`,
    invitedBy: actorUid,
    ...overrides,
  });
}

describe("invite rules", { concurrency: false }, () => {
  beforeEach(resetFirestore);

  for (const [pathLabel, pathFor] of Object.entries(invitePaths)) {
    test(`${pathLabel} allows manager to create a normal invite`, async () => {
      await seedActors();
      const code = `manager-normal-${pathLabel}`;
      await assertSucceeds(setDoc(
        doc(authedDb(MANAGER_UID), pathFor(code)),
        inviteFor(MANAGER_UID, code, "normal"),
      ));
    });
  }

  for (const role of ["manager", "teacher", "normal", "viewer", "print_account"]) {
    test(`super manager can create ${role} invite`, async () => {
      await seedActors();
      const code = `super-${role}`;
      await assertSucceeds(setDoc(
        doc(authedDb(SUPER_MANAGER_UID), invitePaths.root(code)),
        inviteFor(SUPER_MANAGER_UID, code, role),
      ));
    });
  }

  for (const role of ["teacher", "normal", "viewer", "print_account"]) {
    test(`manager can create ${role} invite`, async () => {
      await seedActors();
      const code = `manager-${role}`;
      await assertSucceeds(setDoc(
        doc(authedDb(MANAGER_UID), invitePaths.root(code)),
        inviteFor(MANAGER_UID, code, role),
      ));
    });
  }

  test("system owner can create a super manager invite", async () => {
    await seedActors();
    const code = "owner-super-manager";
    await assertSucceeds(setDoc(
      doc(authedDb(OWNER_UID), invitePaths.root(code)),
      inviteFor(OWNER_UID, code, "super_manager"),
    ));
  });

  for (const status of ["revoked", "expired"]) {
    test(`active invite can transition to ${status}`, async () => {
      await seedActors();
      const code = `transition-${status}`;
      await seedFixtures([[invitePaths.root(code), inviteFor(MANAGER_UID, code, "normal")]]);
      await assertSucceeds(updateDoc(doc(authedDb(MANAGER_UID), invitePaths.root(code)), { status }));
    });
  }

  for (const actorUid of [TEACHER_UID, NORMAL_UID, VIEWER_UID, PRINT_UID]) {
    test(`${actorUid} cannot create invites`, async () => {
      await seedActors();
      const code = `denied-${actorUid}`;
      await assertFails(setDoc(
        doc(authedDb(actorUid), invitePaths.root(code)),
        inviteFor(actorUid, code, "normal"),
      ));
    });
  }

  for (const [actorUid, role] of [
    [MANAGER_UID, "manager"],
    [MANAGER_UID, "super_manager"],
    [SUPER_MANAGER_UID, "super_manager"],
    [OWNER_UID, "system_owner"],
  ]) {
    test(`${actorUid} cannot create a ${role} invite`, async () => {
      await seedActors();
      const code = `denied-${actorUid}-${role}`;
      await assertFails(setDoc(
        doc(authedDb(actorUid), invitePaths.root(code)),
        inviteFor(actorUid, code, role),
      ));
    });
  }

  const forbiddenFields = [
    ["capabilities", { admin: true }],
    ["extraPermissions", ["admin"]],
    ["permissions", ["admin"]],
    ["scope", "all"],
    ["scopes", ["all"]],
    ["isAdmin", true],
    ["systemOwner", true],
    ["approved", true],
  ];

  for (const [field, value] of forbiddenFields) {
    test(`invite create denies ${field}`, async () => {
      await seedActors();
      const code = `field-${field}`;
      await assertFails(setDoc(
        doc(authedDb(MANAGER_UID), invitePaths.root(code)),
        inviteFor(MANAGER_UID, code, "normal", { [field]: value }),
      ));
    });
  }

  const immutableUpdates = [
    ["workspace", { workspaceId: "workspace-other" }],
    ["role", { role: "teacher" }],
    ["target uid", { targetUid: "target-user-uid" }],
    ["target email", { email: "other@example.invalid" }],
    ["expiration", { expiresAt: 1_999_999_999_999 }],
    ["creator", { createdBy: OWNER_UID }],
    ["usedBy", { usedBy: NORMAL_UID }],
    ["usedAt", { usedAt: "2030-01-01T00:00:00Z" }],
  ];

  for (const [label, mutation] of immutableUpdates) {
    test(`invite update denies ${label} change`, async () => {
      await seedActors();
      const code = `update-${label.replace(/\s+/g, "-")}`;
      await seedFixtures([[invitePaths.root(code), inviteFor(MANAGER_UID, code, "normal")]]);
      await assertFails(updateDoc(doc(authedDb(MANAGER_UID), invitePaths.root(code)), mutation));
    });
  }

  for (const [fromStatus, toStatus] of [["revoked", "active"], ["expired", "active"], ["accepted", "active"]]) {
    test(`${fromStatus} invite cannot be restored to ${toStatus}`, async () => {
      await seedActors();
      const code = `${fromStatus}-restore`;
      await seedFixtures([[invitePaths.root(code), inviteFor(MANAGER_UID, code, "normal", { status: fromStatus })]]);
      await assertFails(updateDoc(doc(authedDb(MANAGER_UID), invitePaths.root(code)), { status: toStatus }));
    });
  }

  test("invite create rejects string timestamp and unknown fields", async () => {
    await seedActors();
    const stringCode = "string-timestamp";
    await assertFails(setDoc(
      doc(authedDb(MANAGER_UID), invitePaths.root(stringCode)),
      inviteFor(MANAGER_UID, stringCode, "normal", { createdAt: "2030-01-01T00:00:00Z" }),
    ));
    const unknownCode = "unknown-field";
    await assertFails(setDoc(
      doc(authedDb(MANAGER_UID), invitePaths.root(unknownCode)),
      inviteFor(MANAGER_UID, unknownCode, "normal", { unexpected: true }),
    ));
  });

  test("usedUsers cannot be created or updated", async () => {
    await seedActors();
    const code = "used-users";
    await seedFixtures([[invitePaths.root(code), inviteFor(MANAGER_UID, code, "normal")]]);
    const ref = doc(authedDb(OWNER_UID), "invites", code, "usedUsers", NORMAL_UID);
    await assertFails(setDoc(ref, { uid: NORMAL_UID }));
    await seedFixtures([[`invites/${code}/usedUsers/${NORMAL_UID}`, { uid: NORMAL_UID }]]);
    await assertFails(updateDoc(ref, { usedAt: "now" }));
  });

  test("root invite metadata get requires authentication but not workspace membership", async () => {
    await seedActors();
    const code = "metadata-active";
    await seedFixtures([[invitePaths.root(code), inviteFor(MANAGER_UID, code, "normal")]]);
    await assertFails(getDoc(doc(unauthenticatedDb(), invitePaths.root(code))));
    await assertSucceeds(getDoc(doc(authedDb(NORMAL_UID), invitePaths.root(code))));
    await assertSucceeds(getDoc(doc(authedDb("other-workspace-user"), invitePaths.root(code))));
  });

  for (const status of ["expired", "revoked", "accepted"]) {
    test(`root invite metadata get denies ${status} status`, async () => {
      await seedActors();
      const code = `metadata-${status}`;
      await seedFixtures([[invitePaths.root(code), inviteFor(MANAGER_UID, code, "normal", { status })]]);
      await assertFails(getDoc(doc(authedDb(NORMAL_UID), invitePaths.root(code))));
    });
  }

  test("workspace invite metadata exposes only active documents to authenticated code holders", async () => {
    await seedActors();
    const code = "workspace-metadata-active";
    await seedFixtures([[invitePaths.workspace(code), inviteFor(MANAGER_UID, code, "normal")]]);
    await assertSucceeds(getDoc(doc(authedDb("other-workspace-user"), invitePaths.workspace(code))));
  });

  for (const status of ["used", "accepted", "expired", "revoked"]) {
    test(`workspace invite metadata denies ${status}`, async () => {
      await seedActors();
      const code = `workspace-metadata-${status}`;
      await seedFixtures([[invitePaths.workspace(code), inviteFor(MANAGER_UID, code, "normal", { status })]]);
      await assertFails(getDoc(doc(authedDb(NORMAL_UID), invitePaths.workspace(code))));
    });
  }

  test("workspace invite metadata list remains denied", async () => {
    await seedActors();
    const code = "workspace-list-denied";
    await seedFixtures([[invitePaths.workspace(code), inviteFor(MANAGER_UID, code, "normal")]]);
    await assertFails(getDocs(collection(
      authedDb("other-workspace-user"),
      "workspaces",
      WORKSPACE_ID,
      "inviteCodes",
    )));
  });
});
