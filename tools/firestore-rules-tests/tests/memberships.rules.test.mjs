import { beforeEach, describe, test } from "node:test";
import { deleteField } from "firebase/firestore";
import {
  MANAGER_UID,
  NORMAL_UID,
  OWNER_UID,
  PRINT_UID,
  SUPER_MANAGER_UID,
  TARGET_UID,
  TEACHER_UID,
  VIEWER_UID,
  WORKSPACE_ID,
  assertFails,
  assertSucceeds,
  authedDb,
  baseMembership,
  deleteDoc,
  doc,
  later,
  membershipPath,
  now,
  resetFirestore,
  seedActors,
  seedFixtures,
  setDoc,
  unauthenticatedDb,
  updateDoc,
} from "./helpers.mjs";

const createActors = [
  ["unauthenticated", null],
  ["target user", TARGET_UID],
  ["normal", NORMAL_UID],
  ["teacher", TEACHER_UID],
  ["manager", MANAGER_UID],
  ["super manager", SUPER_MANAGER_UID],
  ["system owner client", OWNER_UID],
];

describe("canonical membership rules", { concurrency: false }, () => {
  beforeEach(resetFirestore);

  for (const [label, uid] of createActors) {
    test(`direct membership create is denied for ${label}`, async () => {
      await seedActors();
      const db = uid ? authedDb(uid) : unauthenticatedDb();
      await assertFails(setDoc(doc(db, membershipPath(TARGET_UID)), baseMembership(TARGET_UID)));
    });
  }

  const createPayloads = [
    ["normal role", { role: "normal" }],
    ["teacher role", { role: "teacher" }],
    ["manager role", { role: "manager" }],
    ["super manager role", { role: "super_manager" }],
    ["system owner role", { role: "system_owner" }],
    ["inactive", { active: false, status: "disabled", disabled: true }],
    ["disabled", { disabled: true, active: false, status: "disabled" }],
    ["invite id", { invitationId: "invite-code" }],
    ["approval request id", { approvalRequestId: "request-alpha" }],
    ["isAdmin", { isAdmin: true }],
    ["capabilities", { capabilities: { admin: true } }],
    ["permissions", { permissions: ["admin"] }],
    ["scope", { scope: "all" }],
  ];

  for (const [label, overrides] of createPayloads) {
    test(`system owner client create remains denied with ${label}`, async () => {
      await seedActors();
      await assertFails(setDoc(
        doc(authedDb(OWNER_UID), membershipPath(TARGET_UID)),
        baseMembership(TARGET_UID, "normal", overrides),
      ));
    });
  }

  test("system owner can update an existing membership", async () => {
    await seedActors();
    await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID, "normal")]]);
    await assertSucceeds(updateDoc(doc(authedDb(OWNER_UID), membershipPath(TARGET_UID)), {
      role: "super_manager",
      updatedAt: now(),
      updatedBy: OWNER_UID,
    }));
  });

  for (const role of ["manager", "teacher", "normal", "viewer", "print_account"]) {
    test(`super manager can grant ${role} to an existing lower member`, async () => {
      await seedActors();
      await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID, "normal")]]);
      await assertSucceeds(updateDoc(doc(authedDb(SUPER_MANAGER_UID), membershipPath(TARGET_UID)), {
        role,
        updatedAt: now(),
        updatedBy: SUPER_MANAGER_UID,
      }));
    });
  }

  for (const role of ["teacher", "normal", "viewer", "print_account"]) {
    test(`manager can grant ${role} to an existing lower member`, async () => {
      await seedActors();
      await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID, "normal")]]);
      await assertSucceeds(updateDoc(doc(authedDb(MANAGER_UID), membershipPath(TARGET_UID)), {
        role,
        updatedAt: now(),
        updatedBy: MANAGER_UID,
      }));
    });
  }

  test("system owner can disable an existing membership with consistent state", async () => {
    await seedActors();
    await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID, "normal")]]);
    await assertSucceeds(updateDoc(doc(authedDb(OWNER_UID), membershipPath(TARGET_UID)), {
      status: "disabled",
      disabled: true,
      active: false,
      updatedAt: now(),
      updatedBy: OWNER_UID,
    }));
  });

  test("missing membership cannot be updated or merge-created", async () => {
    await seedActors();
    const ref = doc(authedDb(OWNER_UID), membershipPath(TARGET_UID));
    await assertFails(updateDoc(ref, { role: "normal", updatedAt: now(), updatedBy: OWNER_UID }));
    await assertFails(setDoc(ref, { role: "normal", updatedAt: now(), updatedBy: OWNER_UID }, { merge: true }));
  });

  const deniedRoleChanges = [
    [MANAGER_UID, "manager"],
    [MANAGER_UID, "super_manager"],
    [MANAGER_UID, "system_owner"],
    [SUPER_MANAGER_UID, "super_manager"],
    [SUPER_MANAGER_UID, "system_owner"],
    [TEACHER_UID, "manager"],
    [NORMAL_UID, "manager"],
    [VIEWER_UID, "manager"],
    [PRINT_UID, "manager"],
  ];

  for (const [actorUid, role] of deniedRoleChanges) {
    test(`${actorUid} cannot grant ${role}`, async () => {
      await seedActors();
      await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID, "normal")]]);
      await assertFails(updateDoc(doc(authedDb(actorUid), membershipPath(TARGET_UID)), {
        role,
        updatedAt: now(),
        updatedBy: actorUid,
      }));
    });
  }

  test("a member cannot raise their own role", async () => {
    await seedActors();
    await assertFails(updateDoc(doc(authedDb(NORMAL_UID), membershipPath(NORMAL_UID)), {
      role: "manager",
      updatedAt: now(),
      updatedBy: NORMAL_UID,
    }));
  });

  const immutableMutations = [
    ["uid", { uid: "other-user" }],
    ["workspaceId", { workspaceId: "workspace-other" }],
    ["createdAt", { createdAt: later() }],
    ["createdBy", { createdBy: MANAGER_UID }],
    ["invitationId", { invitationId: "changed" }],
    ["approvalRequestId", { approvalRequestId: "changed" }],
    ["source", { source: "changed" }],
  ];

  for (const [label, mutation] of immutableMutations) {
    test(`membership update denies immutable ${label}`, async () => {
      await seedActors();
      await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID, "normal", {
        invitationId: "invite-original",
        approvalRequestId: "request-original",
        source: "fixture",
      })]]);
      await assertFails(updateDoc(doc(authedDb(OWNER_UID), membershipPath(TARGET_UID)), {
        ...mutation,
        updatedAt: now(),
        updatedBy: OWNER_UID,
      }));
    });
  }

  test("membership immutable fields cannot be deleted", async () => {
    await seedActors();
    await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID)]]);
    const ref = doc(authedDb(OWNER_UID), membershipPath(TARGET_UID));
    await assertFails(updateDoc(ref, { createdAt: deleteField(), updatedAt: now(), updatedBy: OWNER_UID }));
    await assertFails(updateDoc(ref, { createdBy: deleteField(), updatedAt: now(), updatedBy: OWNER_UID }));
  });

  test("optional immutable membership fields cannot be added after creation", async () => {
    await seedActors();
    await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID)]]);
    await assertFails(updateDoc(doc(authedDb(OWNER_UID), membershipPath(TARGET_UID)), {
      invitationId: "late-invite",
      updatedAt: now(),
      updatedBy: OWNER_UID,
    }));
  });

  const injectedFields = [
    ["isAdmin", true],
    ["systemOwner", true],
    ["approved", true],
    ["permissions", ["admin"]],
    ["extraPermissions", ["admin"]],
    ["capabilities", { admin: true }],
    ["scope", "all"],
    ["scopes", ["all"]],
    ["departmentIds", ["department-alpha"]],
    ["classIds", ["class-alpha"]],
    ["subjectIds", ["subject-alpha"]],
    ["homeroomClassIds", ["class-alpha"]],
  ];

  for (const [field, value] of injectedFields) {
    test(`membership update denies ${field} injection`, async () => {
      await seedActors();
      await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID)]]);
      await assertFails(updateDoc(doc(authedDb(OWNER_UID), membershipPath(TARGET_UID)), {
        [field]: value,
        updatedAt: now(),
        updatedBy: OWNER_UID,
      }));
    });
  }

  test("membership state contradictions and forged audit values are denied", async () => {
    await seedActors();
    await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID)]]);
    const ref = doc(authedDb(OWNER_UID), membershipPath(TARGET_UID));
    await assertFails(updateDoc(ref, { status: "active", disabled: true, updatedAt: now(), updatedBy: OWNER_UID }));
    await assertFails(updateDoc(ref, { status: "disabled", active: true, updatedAt: now(), updatedBy: OWNER_UID }));
    await assertFails(updateDoc(ref, { updatedAt: now(), updatedBy: MANAGER_UID }));
    await assertFails(updateDoc(ref, { updatedAt: "2030-01-01T00:00:00Z", updatedBy: OWNER_UID }));
  });

  test("forbidden fields already present in the result document block update", async () => {
    await seedActors();
    await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID, "normal", { permissions: ["legacy"] })]]);
    await assertFails(updateDoc(doc(authedDb(OWNER_UID), membershipPath(TARGET_UID)), {
      role: "teacher",
      updatedAt: now(),
      updatedBy: OWNER_UID,
    }));
  });

  test("merge cannot bypass membership field validation", async () => {
    await seedActors();
    await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID)]]);
    await assertFails(setDoc(doc(authedDb(OWNER_UID), membershipPath(TARGET_UID)), {
      permissions: ["admin"],
      updatedAt: now(),
      updatedBy: OWNER_UID,
    }, { merge: true }));
  });

  for (const [label, actorUid] of [["system owner", OWNER_UID], ["super manager", SUPER_MANAGER_UID], ["manager", MANAGER_UID]]) {
    test(`membership delete is denied for ${label}`, async () => {
      await seedActors();
      await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID)]]);
      await assertFails(deleteDoc(doc(authedDb(actorUid), membershipPath(TARGET_UID))));
    });
  }

  test("failed delete does not bypass a separate absent membership create", async () => {
    await seedActors();
    await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID)]]);
    const ref = doc(authedDb(OWNER_UID), membershipPath(TARGET_UID));
    await assertFails(deleteDoc(ref));
    const absentUid = "absent-recreate-target-uid";
    await assertFails(setDoc(
      doc(authedDb(OWNER_UID), membershipPath(absentUid)),
      baseMembership(absentUid, "super_manager"),
    ));
  });

  test("set after a failed delete is evaluated as update, not create", async () => {
    await seedActors();
    await seedFixtures([[membershipPath(TARGET_UID), baseMembership(TARGET_UID)]]);
    const ref = doc(authedDb(OWNER_UID), membershipPath(TARGET_UID));
    await assertFails(deleteDoc(ref));
    await assertSucceeds(setDoc(ref, baseMembership(TARGET_UID, "teacher", {
      updatedAt: now(),
      updatedBy: OWNER_UID,
    })));
  });

  test("generic workspace match does not override canonical membership denies", async () => {
    await seedActors();
    const ref = doc(authedDb(OWNER_UID), "workspaces", WORKSPACE_ID, "members", TARGET_UID);
    await assertFails(setDoc(ref, baseMembership(TARGET_UID)));
  });
});
