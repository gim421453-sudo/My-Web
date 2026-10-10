import { beforeEach, describe, test } from "node:test";
import { deleteField } from "firebase/firestore";
import {
  MANAGER_UID,
  NORMAL_UID,
  OWNER_UID,
  TARGET_UID,
  assertFails,
  assertSucceeds,
  authedDb,
  baseUser,
  doc,
  getDoc,
  now,
  resetFirestore,
  seedFixtures,
  setDoc,
  unauthenticatedDb,
  updateDoc,
} from "./helpers.mjs";

describe("users rules", { concurrency: false }, () => {
  beforeEach(resetFirestore);

  test("self read and safe profile fields are allowed", async () => {
    await seedFixtures([[`users/${NORMAL_UID}`, baseUser(NORMAL_UID)]]);
    const db = authedDb(NORMAL_UID);
    await assertSucceeds(getDoc(doc(db, "users", NORMAL_UID)));
    await assertSucceeds(updateDoc(doc(db, "users", NORMAL_UID), { displayName: "Updated" }));
    await assertSucceeds(updateDoc(doc(db, "users", NORMAL_UID), { preferences: { density: "compact" } }));
    await assertSucceeds(updateDoc(doc(db, "users", NORMAL_UID), { lastSeenAt: now(), updatedAt: now() }));
  });

  test("system owner can perform an approved user status update", async () => {
    await seedFixtures([
      [`systemOwners/${OWNER_UID}`, { status: "active" }],
      [`users/${OWNER_UID}`, baseUser(OWNER_UID)],
      [`users/${TARGET_UID}`, baseUser(TARGET_UID)],
    ]);
    await assertSucceeds(updateDoc(doc(authedDb(OWNER_UID), "users", TARGET_UID), {
      status: "disabled",
      disabled: true,
      updatedAt: now(),
    }));
  });

  test("unauthenticated user read and write are denied", async () => {
    await seedFixtures([[`users/${NORMAL_UID}`, baseUser(NORMAL_UID)]]);
    const db = unauthenticatedDb();
    await assertFails(getDoc(doc(db, "users", NORMAL_UID)));
    await assertFails(updateDoc(doc(db, "users", NORMAL_UID), { displayName: "No" }));
  });

  test("another user cannot update a user profile", async () => {
    await seedFixtures([[`users/${TARGET_UID}`, baseUser(TARGET_UID)]]);
    await assertFails(updateDoc(doc(authedDb(NORMAL_UID), "users", TARGET_UID), { displayName: "No" }));
  });

  const protectedMutations = [
    ["role", { role: "manager" }],
    ["globalRole", { globalRole: "system_owner" }],
    ["currentRole", { currentRole: "manager" }],
    ["workspaceRole", { workspaceRole: "manager" }],
    ["permissions", { permissions: ["admin"] }],
    ["extraPermissions", { extraPermissions: ["admin"] }],
    ["capabilities", { capabilities: { admin: true } }],
    ["status", { status: "active" }],
    ["disabled", { disabled: true }],
    ["workspaceId", { workspaceId: "workspace-other" }],
    ["departmentIds", { departmentIds: ["department-alpha"] }],
    ["classIds", { classIds: ["class-alpha"] }],
    ["subjectIds", { subjectIds: ["subject-alpha"] }],
    ["isAdmin", { isAdmin: true }],
    ["systemOwner", { systemOwner: true }],
    ["approved", { approved: true }],
    ["arbitrary field", { injected: "value" }],
  ];

  for (const [label, patch] of protectedMutations) {
    test(`self update denies ${label}`, async () => {
      await seedFixtures([[`users/${NORMAL_UID}`, baseUser(NORMAL_UID, { status: "pending" })]]);
      await assertFails(updateDoc(doc(authedDb(NORMAL_UID), "users", NORMAL_UID), patch));
    });
  }

  test("protected fields cannot be deleted or replaced with null", async () => {
    await seedFixtures([[`users/${NORMAL_UID}`, baseUser(NORMAL_UID)]]);
    const ref = doc(authedDb(NORMAL_UID), "users", NORMAL_UID);
    await assertFails(updateDoc(ref, { role: deleteField() }));
    await assertFails(updateDoc(ref, { globalRole: null }));
  });

  test("merge and full set cannot inject protected fields", async () => {
    await seedFixtures([[`users/${NORMAL_UID}`, baseUser(NORMAL_UID)]]);
    const ref = doc(authedDb(NORMAL_UID), "users", NORMAL_UID);
    await assertFails(setDoc(ref, { capabilities: { owner: true } }, { merge: true }));
    await assertFails(setDoc(ref, { ...baseUser(NORMAL_UID), isAdmin: true }));
  });

  test("profile timestamp and structured value types cannot be polluted", async () => {
    await seedFixtures([[`users/${NORMAL_UID}`, baseUser(NORMAL_UID)]]);
    const ref = doc(authedDb(NORMAL_UID), "users", NORMAL_UID);
    await assertFails(updateDoc(ref, { updatedAt: "2030-01-01T00:00:00Z" }));
    await assertFails(updateDoc(ref, { displayName: ["array"] }));
    await assertFails(updateDoc(ref, { preferences: ["array"] }));
  });

  test("user document role fields alone do not grant system owner access", async () => {
    await seedFixtures([
      [`users/${MANAGER_UID}`, baseUser(MANAGER_UID, { role: "system_owner" })],
      [`users/${TARGET_UID}`, baseUser(TARGET_UID)],
    ]);
    await assertFails(updateDoc(doc(authedDb(MANAGER_UID), "users", TARGET_UID), { status: "disabled" }));
  });

  test("user globalRole alone does not grant system owner access", async () => {
    await seedFixtures([
      [`users/${MANAGER_UID}`, baseUser(MANAGER_UID, { globalRole: "system_owner" })],
      [`users/${TARGET_UID}`, baseUser(TARGET_UID)],
    ]);
    await assertFails(updateDoc(doc(authedDb(MANAGER_UID), "users", TARGET_UID), { status: "disabled" }));
  });
});
