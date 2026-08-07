import { beforeEach, describe, test } from "node:test";
import {
  MANAGER_UID,
  TARGET_UID,
  WORKSPACE_ID,
  assertFails,
  assertSucceeds,
  authedDb,
  baseMembership,
  doc,
  getDoc,
  now,
  resetFirestore,
  seedActors,
  seedFixtures,
  updateDoc,
} from "./helpers.mjs";

describe("canonical membership compatibility fixtures", { concurrency: false }, () => {
  beforeEach(resetFirestore);

  test("current canonical membership is readable and administratively updateable", async () => {
    await seedActors();
    await seedFixtures([[`workspaces/${WORKSPACE_ID}/members/${TARGET_UID}`, baseMembership(TARGET_UID)]]);
    const ref = doc(authedDb(MANAGER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID);
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { role: "teacher", updatedAt: now(), updatedBy: MANAGER_UID }));
  });

  for (const [field, value] of [
    ["departmentIds", ["department-alpha"]],
    ["classIds", ["class-alpha"]],
    ["subjectIds", ["subject-alpha"]],
    ["legacyRole", "manager"],
    ["permissions", ["legacy"]],
    ["extraPermissions", ["legacy"]],
  ]) {
    test(`legacy canonical document with ${field} stays readable but blocks normal update`, async () => {
      await seedActors();
      await seedFixtures([[
        `workspaces/${WORKSPACE_ID}/members/${TARGET_UID}`,
        baseMembership(TARGET_UID, "normal", { [field]: value }),
      ]]);
      const ref = doc(authedDb(MANAGER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID);
      await assertSucceeds(getDoc(ref));
      await assertFails(updateDoc(ref, { role: "teacher", updatedAt: now(), updatedBy: MANAGER_UID }));
    });
  }

  test("legacy string createdAt stays readable but cannot pass immutable timestamp validation", async () => {
    await seedActors();
    await seedFixtures([[
      `workspaces/${WORKSPACE_ID}/members/${TARGET_UID}`,
      baseMembership(TARGET_UID, "normal", { createdAt: "2030-01-01T00:00:00Z" }),
    ]]);
    const ref = doc(authedDb(MANAGER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID);
    await assertSucceeds(getDoc(ref));
    await assertFails(updateDoc(ref, { role: "teacher", updatedAt: now(), updatedBy: MANAGER_UID }));
  });

  test("legacy string updatedAt can be repaired in an otherwise valid update", async () => {
    await seedActors();
    await seedFixtures([[
      `workspaces/${WORKSPACE_ID}/members/${TARGET_UID}`,
      baseMembership(TARGET_UID, "normal", { updatedAt: "2030-01-01T00:00:00Z" }),
    ]]);
    const ref = doc(authedDb(MANAGER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID);
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { role: "teacher", updatedAt: now(), updatedBy: MANAGER_UID }));
  });

  test("inconsistent active status stays readable but blocks unrelated update", async () => {
    await seedActors();
    await seedFixtures([[
      `workspaces/${WORKSPACE_ID}/members/${TARGET_UID}`,
      baseMembership(TARGET_UID, "normal", { status: "active", disabled: true }),
    ]]);
    const ref = doc(authedDb(MANAGER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID);
    await assertSucceeds(getDoc(ref));
    await assertFails(updateDoc(ref, { role: "teacher", updatedAt: now(), updatedBy: MANAGER_UID }));
  });

  test("inconsistent disabled status stays readable but blocks unrelated update", async () => {
    await seedActors();
    await seedFixtures([[
      `workspaces/${WORKSPACE_ID}/members/${TARGET_UID}`,
      baseMembership(TARGET_UID, "normal", { status: "disabled", disabled: true, active: true }),
    ]]);
    const ref = doc(authedDb(MANAGER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID);
    await assertSucceeds(getDoc(ref));
    await assertFails(updateDoc(ref, { role: "teacher", updatedAt: now(), updatedBy: MANAGER_UID }));
  });
});
