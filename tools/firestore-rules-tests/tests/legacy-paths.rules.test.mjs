import { beforeEach, describe, test } from "node:test";
import {
  MANAGER_UID,
  NORMAL_UID,
  OWNER_UID,
  TARGET_UID,
  WORKSPACE_ID,
  assertFails,
  authedDb,
  baseInvite,
  baseMembership,
  baseUser,
  deleteDoc,
  doc,
  resetFirestore,
  seedActors,
  seedFixtures,
  setDoc,
  updateDoc,
} from "./helpers.mjs";

describe("legacy role paths and overlapping matches", { concurrency: false }, () => {
  beforeEach(resetFirestore);

  for (const collectionName of ["workspace_members", "workspaceMembers"]) {
    test(`${collectionName} create, update, and delete are denied`, async () => {
      await seedActors();
      const path = `${collectionName}/${WORKSPACE_ID}_${TARGET_UID}`;
      const ref = doc(authedDb(OWNER_UID), path);
      await assertFails(setDoc(ref, baseMembership(TARGET_UID, "normal")));
      await seedFixtures([[path, baseMembership(TARGET_UID, "normal")]]);
      await assertFails(updateDoc(ref, { role: "manager" }));
      await assertFails(deleteDoc(ref));
    });
  }

  for (const [label, userFields] of [
    ["users.role", { role: "system_owner" }],
    ["users.globalRole", { globalRole: "system_owner" }],
  ]) {
    test(`${label} alone does not grant system owner workspace management`, async () => {
      await seedFixtures([
        [`users/${NORMAL_UID}`, baseUser(NORMAL_UID, userFields)],
        [`workspaces/${WORKSPACE_ID}`, { workspaceId: WORKSPACE_ID, name: "Fixture Workspace" }],
      ]);
      await assertFails(updateDoc(doc(authedDb(NORMAL_UID), "workspaces", WORKSPACE_ID), { name: "Escalated" }));
    });
  }

  test("canonical membership role system_owner does not become global system owner", async () => {
    await seedFixtures([
      [`workspaces/${WORKSPACE_ID}/members/${NORMAL_UID}`, baseMembership(NORMAL_UID, "system_owner")],
      [`workspaces/${WORKSPACE_ID}`, { workspaceId: WORKSPACE_ID, name: "Fixture Workspace" }],
    ]);
    await assertFails(updateDoc(doc(authedDb(NORMAL_UID), "workspaces", WORKSPACE_ID), { name: "Escalated" }));
  });

  test("legacy super manager role is not combined with a canonical normal role", async () => {
    await seedActors();
    await seedFixtures([
      [`workspace_members/${WORKSPACE_ID}_${NORMAL_UID}`, baseMembership(NORMAL_UID, "super_manager")],
    ]);
    const code = "legacy-highest-role";
    const payload = baseInvite(code, "manager", {
      createdBy: NORMAL_UID,
      inviterUid: NORMAL_UID,
      invitedBy: NORMAL_UID,
    });
    await assertFails(setDoc(doc(authedDb(NORMAL_UID), "invites", code), payload));
  });

  test("legacy manager role cannot update canonical membership", async () => {
    await seedFixtures([
      [`workspace_members/${WORKSPACE_ID}_${MANAGER_UID}`, baseMembership(MANAGER_UID, "manager")],
      [`workspaces/${WORKSPACE_ID}/members/${TARGET_UID}`, baseMembership(TARGET_UID, "normal")],
    ]);
    await assertFails(updateDoc(doc(authedDb(MANAGER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID), {
      role: "teacher",
      updatedBy: MANAGER_UID,
      updatedAt: baseMembership().updatedAt,
    }));
  });

  test("generic nested workspace match cannot allow membership delete", async () => {
    await seedActors();
    await seedFixtures([[`workspaces/${WORKSPACE_ID}/members/${TARGET_UID}`, baseMembership(TARGET_UID)]]);
    await assertFails(deleteDoc(doc(authedDb(OWNER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID)));
  });
});
