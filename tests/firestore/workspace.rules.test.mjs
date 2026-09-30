import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "demo-myweb-workspace-rules";
const rules = readFileSync(new URL("../../firestore.rules.next", import.meta.url), "utf8");
const emulatorAddress = String(process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080");
const emulatorMatch = /^(127\.0\.0\.1|localhost):([1-9][0-9]{0,4})$/.exec(emulatorAddress);
if (!emulatorMatch || Number(emulatorMatch[2]) > 65535) {
  throw new Error("FIRESTORE_EMULATOR_HOST must be a loopback host and valid port.");
}
const FIRESTORE_EMULATOR_HOST = emulatorMatch[1];
const FIRESTORE_EMULATOR_PORT = Number(emulatorMatch[2]);

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: FIRESTORE_EMULATOR_HOST,
      port: FIRESTORE_EMULATOR_PORT,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  if (testEnv) await testEnv.cleanup();
});

function dbFor(uid) {
  return testEnv.authenticatedContext(uid, { email: `${uid}@example.test` }).firestore();
}

async function seed(path, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

function userDoc(uid, overrides = {}) {
  return {
    uid,
    email: `${uid}@example.test`,
    displayName: uid,
    status: "active",
    globalRole: "user",
    currentWorkspaceId: null,
    createdAt: "seed",
    updatedAt: "seed",
    ...overrides,
  };
}

function memberDoc(uid, role, overrides = {}) {
  return {
    uid,
    email: `${uid}@example.test`,
    displayName: uid,
    role,
    status: "active",
    workspaceId: "wsA",
    joinedAt: "seed",
    updatedAt: "seed",
    ...overrides,
  };
}

async function seedWorkspace(workspaceId = "wsA") {
  await seed(`workspaces/${workspaceId}`, {
    workspaceId,
    name: workspaceId,
    ownerUid: "owner",
  });
}

async function seedWorkspaceRole(workspaceId, uid, role, membershipOverrides = {}) {
  await seed(`users/${uid}`, userDoc(uid, {
    currentWorkspaceId: workspaceId,
  }));
  await seedWorkspace(workspaceId);
  await seed(`workspaces/${workspaceId}/members/${uid}`, memberDoc(uid, role, {
    workspaceId,
    ...membershipOverrides,
  }));
}

async function seedSystemOwner(uid = "owner") {
  await seed(`users/${uid}`, userDoc(uid, {
    status: "active",
    globalRole: "system_owner",
  }));
  await seed(`systemOwners/${uid}`, { uid, createdAt: "seed" });
}

test("02. 일반 사용자가 자기 members 문서를 super_manager로 생성하는 요청은 거부된다", async () => {
  await seedWorkspace("wsA");
  await seed("users/normal", userDoc("normal", {
    currentWorkspaceId: "wsA",
  }));

  await assertFails(setDoc(doc(dbFor("normal"), "workspaces/wsA/members/normal"), {
    uid: "normal",
    role: "super_manager",
    status: "active",
    workspaceId: "wsA",
    joinedAt: "now",
    updatedAt: "now",
  }));
});

test("03. 일반 사용자는 자기 멤버 role을 수정할 수 없다", async () => {
  await seedWorkspaceRole("wsA", "normal", "normal");

  await assertFails(updateDoc(doc(dbFor("normal"), "workspaces/wsA/members/normal"), {
    role: "super_manager",
    updatedAt: "changed",
  }));
});

test("11. manager는 super_manager 멤버를 수정하거나 삭제할 수 없다", async () => {
  await seedWorkspaceRole("wsA", "manager", "manager");
  await seedWorkspaceRole("wsA", "super", "super_manager");

  await assertFails(updateDoc(doc(dbFor("manager"), "workspaces/wsA/members/super"), {
    role: "normal",
    updatedAt: "changed",
  }));
  await assertFails(deleteDoc(doc(dbFor("manager"), "workspaces/wsA/members/super")));
});

test("12. manager는 teacher 이하 역할의 멤버를 수정할 수 있다", async () => {
  await seedWorkspaceRole("wsA", "manager", "manager");
  await seedWorkspaceRole("wsA", "teacher", "teacher");

  await assertSucceeds(updateDoc(doc(dbFor("manager"), "workspaces/wsA/members/teacher"), {
    role: "normal",
    updatedAt: "changed",
  }));
});

test("13. viewer의 모든 쓰기 요청은 거부된다", async () => {
  await seedWorkspaceRole("wsA", "viewer", "viewer");

  await assertFails(setDoc(doc(dbFor("viewer"), "workspaces/wsA/schedules/schedule1"), {
    workspaceId: "wsA",
    title: "viewer write",
    authorUid: "viewer",
    updatedAt: "now",
  }));
});

test("14. print_account는 일반 데이터 쓰기를 할 수 없다", async () => {
  await seedWorkspaceRole("wsA", "print", "print_account");

  await assertFails(setDoc(doc(dbFor("print"), "workspaces/wsA/notices/notice1"), {
    workspaceId: "wsA",
    title: "print write",
    authorUid: "print",
    updatedAt: "now",
  }));
});

test("15. teacher는 담당 범위가 검증되는 서버 쓰기 경로가 없으면 민감 학사 데이터에 직접 쓸 수 없다", async () => {
  await seedWorkspaceRole("wsA", "teacher", "teacher");

  for (const collection of ["students", "attendance", "assignments", "lessons", "records", "exams"]) {
    await assertFails(setDoc(doc(dbFor("teacher"), `workspaces/wsA/${collection}/target-student`), {
      workspaceId: "wsA",
      studentUid: "target-student",
      teacherUid: "teacher",
      createdBy: "teacher",
      title: "out-of-scope write",
      updatedAt: "now",
    }));
  }
});

test("16. teacher는 관리자 전용 settings 컬렉션에 쓸 수 없다", async () => {
  await seedWorkspaceRole("wsA", "teacher", "teacher");

  await assertFails(setDoc(doc(dbFor("teacher"), "workspaces/wsA/settings/homepage"), {
    workspaceId: "wsA",
    title: "blocked",
    updatedAt: "now",
  }));
});

test("22. workspace_members 레거시 문서는 읽기 호환만 되고 권한 근거가 되지 않는다", async () => {
  await seedWorkspace("wsA");
  await seed("users/legacy", userDoc("legacy", {
    currentWorkspaceId: "wsA",
  }));
  await seed("workspace_members/wsA_legacy", {
    uid: "legacy",
    workspaceId: "wsA",
    role: "manager",
    status: "active",
  });
  await seed("workspaces/wsA/schedules/schedule1", {
    workspaceId: "wsA",
    title: "schedule",
  });

  await assertSucceeds(getDoc(doc(dbFor("legacy"), "workspace_members/wsA_legacy")));
  await assertFails(getDoc(doc(dbFor("legacy"), "workspaces/wsA/schedules/schedule1")));
});

test("23. workspaceMembers 레거시 문서도 읽기 호환만 되고 권한 근거가 되지 않는다", async () => {
  await seedWorkspace("wsA");
  await seed("users/legacyCamel", userDoc("legacyCamel", {
    currentWorkspaceId: "wsA",
  }));
  await seed("workspaceMembers/wsA_legacyCamel", {
    uid: "legacyCamel",
    workspaceId: "wsA",
    role: "manager",
    status: "active",
  });
  await seed("workspaces/wsA/schedules/schedule1", {
    workspaceId: "wsA",
    title: "schedule",
  });

  await assertSucceeds(getDoc(doc(dbFor("legacyCamel"), "workspaceMembers/wsA_legacyCamel")));
  await assertFails(getDoc(doc(dbFor("legacyCamel"), "workspaces/wsA/schedules/schedule1")));
});

test("24. nested members 기준으로 active 멤버는 워크스페이스 일반 데이터를 읽을 수 있다", async () => {
  await seedWorkspaceRole("wsA", "normal", "normal");
  await seed("workspaces/wsA/schedules/schedule1", {
    workspaceId: "wsA",
    title: "schedule",
  });

  await assertSucceeds(getDoc(doc(dbFor("normal"), "workspaces/wsA/schedules/schedule1")));
});

test("25. invitations update에서 workspaceId 변경 공격은 거부된다", async () => {
  await seedWorkspaceRole("wsA", "manager", "manager");
  await seedWorkspace("wsB");
  await seed("invitations/inv1", {
    workspaceId: "wsA",
    email: "target@example.test",
    status: "active",
    updatedAt: "seed",
  });

  await assertFails(updateDoc(doc(dbFor("manager"), "invitations/inv1"), {
    workspaceId: "wsB",
    updatedAt: "changed",
  }));
});

test("system_owner는 모든 워크스페이스 역할을 관리할 수 있다", async () => {
  await seedSystemOwner("owner");
  await seedWorkspace("wsA");

  for (const role of ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"]) {
    const uid = `owner-granted-${role}`;
    await assertSucceeds(setDoc(doc(dbFor("owner"), `workspaces/wsA/members/${uid}`), {
      uid,
      role,
      status: "active",
      workspaceId: "wsA",
      joinedAt: "now",
      updatedAt: "now",
    }));
  }

  await assertFails(setDoc(doc(dbFor("owner"), "workspaces/wsA/members/global-owner-role"), {
    uid: "global-owner-role",
    role: "system_owner",
    status: "active",
    workspaceId: "wsA",
    joinedAt: "now",
    updatedAt: "now",
  }));
});

test("7개 역할의 일반·설정·민감 데이터 CRUD 권한 matrix가 유지된다", async () => {
  await seedSystemOwner("owner");
  await seedWorkspace("wsA");

  const actors = [
    { uid: "owner", role: "system_owner" },
    { uid: "super", role: "super_manager" },
    { uid: "manager", role: "manager" },
    { uid: "teacher", role: "teacher" },
    { uid: "normal", role: "normal" },
    { uid: "viewer", role: "viewer" },
    { uid: "print", role: "print_account" },
  ];
  for (const actor of actors.slice(1)) {
    await seedWorkspaceRole("wsA", actor.uid, actor.role);
  }

  await seed("workspaces/wsA/schedules/role-matrix", {
    workspaceId: "wsA",
    title: "matrix schedule",
    authorUid: "matrix-owner",
  });
  await seed("workspaces/wsA/attendance/role-matrix", {
    workspaceId: "wsA",
    studentUid: "other-student",
    title: "private matrix attendance",
  });

  const normalWriteRoles = new Set(["system_owner", "super_manager", "manager", "teacher", "normal"]);
  const managerRoles = new Set(["system_owner", "super_manager", "manager"]);

  for (const actor of actors) {
    const db = dbFor(actor.uid);
    await assertSucceeds(getDoc(doc(db, "workspaces/wsA/schedules/role-matrix")));
    const settingsPath = `workspaces/wsA/settings/role-matrix-${actor.uid}`;
    await seed(settingsPath, {
      workspaceId: "wsA",
      title: "matrix settings",
    });
    await assertSucceeds(getDoc(doc(db, settingsPath)));

    const ownedSchedulePath = `workspaces/wsA/schedules/owned-${actor.uid}`;
    await seed(ownedSchedulePath, {
      workspaceId: "wsA",
      title: "owned schedule",
      authorUid: actor.uid,
    });
    const scheduleRef = doc(db, ownedSchedulePath);
    const scheduleWrite = normalWriteRoles.has(actor.role) ? assertSucceeds : assertFails;
    await scheduleWrite(setDoc(doc(db, `workspaces/wsA/schedules/created-${actor.uid}`), {
      workspaceId: "wsA",
      title: "role matrix create",
      authorUid: actor.uid,
    }));
    await scheduleWrite(updateDoc(scheduleRef, { title: "role matrix update" }));
    await scheduleWrite(deleteDoc(scheduleRef));

    const settingsWrite = managerRoles.has(actor.role) ? assertSucceeds : assertFails;
    await settingsWrite(updateDoc(doc(db, settingsPath), {
      title: `updated by ${actor.uid}`,
    }));
    await settingsWrite(deleteDoc(doc(db, settingsPath)));

    const attendanceRead = managerRoles.has(actor.role) ? assertSucceeds : assertFails;
    await attendanceRead(getDoc(doc(db, "workspaces/wsA/attendance/role-matrix")));
    const attendanceWrite = managerRoles.has(actor.role) ? assertSucceeds : assertFails;
    await attendanceWrite(setDoc(doc(db, `workspaces/wsA/attendance/created-${actor.uid}`), {
      workspaceId: "wsA",
      studentUid: "other-student",
      title: "role matrix sensitive write",
    }));

    if (actor.role === "viewer" || actor.role === "print_account") {
      for (const collection of ["friends", "portfolios", "mealApplications", "projects", "requests", "systemReports"]) {
        const path = `workspaces/wsA/${collection}/owned-${actor.uid}`;
        const ownedData = {
          workspaceId: "wsA",
          uid: actor.uid,
          ownerUid: actor.uid,
          authorUid: actor.uid,
          title: "read-only role must not mutate owned data",
        };
        await seed(path, ownedData);
        await assertFails(setDoc(doc(db, `workspaces/wsA/${collection}/created-${actor.uid}`), ownedData));
        await assertFails(updateDoc(doc(db, path), { title: "blocked update" }));
        await assertFails(deleteDoc(doc(db, path)));
      }
    }

    if (actor.role === "teacher") {
      const portfolioPath = "workspaces/wsA/portfolios/owned-teacher";
      await seed(portfolioPath, {
        workspaceId: "wsA",
        uid: "teacher",
        ownerUid: "teacher",
        title: "sensitive portfolio",
      });
      await assertFails(setDoc(doc(db, "workspaces/wsA/portfolios/created-teacher"), {
        workspaceId: "wsA",
        uid: "teacher",
        ownerUid: "teacher",
      }));
      await assertFails(updateDoc(doc(db, portfolioPath), { title: "blocked update" }));
      await assertFails(deleteDoc(doc(db, portfolioPath)));
    }

    if (actor.role === "normal") {
      const portfolioPath = "workspaces/wsA/portfolios/owned-normal";
      await seed(portfolioPath, {
        workspaceId: "wsA",
        uid: "normal",
        ownerUid: "normal",
        title: "owned portfolio",
      });
      await assertSucceeds(setDoc(doc(db, "workspaces/wsA/portfolios/created-normal"), {
        workspaceId: "wsA",
        uid: "normal",
        ownerUid: "normal",
        title: "normal-owned portfolio",
      }));
      await assertSucceeds(updateDoc(doc(db, portfolioPath), { title: "updated own portfolio" }));
      await assertSucceeds(deleteDoc(doc(db, portfolioPath)));
    }
  }
});

test("candidate Rules deny cross-workspace thread and message reads despite participant UID", async () => {
  await seedWorkspaceRole("wsA", "member", "normal");
  await seedWorkspaceRole("wsB", "outsider", "normal");
  await seed("chatThreads/chat1", {
    workspaceId: "wsA",
    createdByUid: "member",
    participantUids: ["member", "outsider"],
  });
  await seed("chatMessages/message1", {
    threadId: "chat1",
    workspaceId: "wsA",
  });
  await seed("supportThreads/support1", {
    workspaceId: "wsA",
    createdByUid: "member",
    participantUids: ["member", "outsider"],
  });
  await seed("supportThreads/support1/messages/message1", {
    threadId: "support1",
    workspaceId: "wsA",
  });

  const outsiderDb = dbFor("outsider");
  await assertFails(getDoc(doc(outsiderDb, "chatThreads/chat1")));
  await assertFails(getDoc(doc(outsiderDb, "chatMessages/message1")));
  await assertFails(getDoc(doc(outsiderDb, "supportThreads/support1")));
  await assertFails(getDoc(doc(outsiderDb, "supportThreads/support1/messages/message1")));
  await assertFails(setDoc(doc(outsiderDb, "chatMessages/message2"), {
    threadId: "chat1",
    workspaceId: "wsA",
    senderUid: "outsider",
  }));
  await assertFails(setDoc(doc(outsiderDb, "supportThreads/support1/messages/message2"), {
    threadId: "support1",
    workspaceId: "wsA",
    authorUid: "outsider",
  }));
});

test("candidate Rules deny regular participants from changing chat participant lists", async () => {
  await seedWorkspaceRole("wsA", "member", "normal");
  await seed("chatThreads/chat1", {
    workspaceId: "wsA",
    createdByUid: "member",
    participantUids: ["member"],
    participantRoles: ["normal"],
  });
  await seed("supportThreads/support1", {
    workspaceId: "wsA",
    createdByUid: "member",
    participantUids: ["member"],
    participantRoles: ["normal"],
  });

  const memberDb = dbFor("member");
  await assertFails(updateDoc(doc(memberDb, "chatThreads/chat1"), {
    participantUids: ["member", "outsider"],
  }));
  await assertFails(updateDoc(doc(memberDb, "supportThreads/support1"), {
    participantUids: ["member", "outsider"],
  }));
});

test("candidate Rules reject active-status memberships with disabled or inactive flags", async () => {
  await seedWorkspaceRole("wsA", "disabled", "normal", {
    disabled: true,
    active: false,
  });
  await seedWorkspaceRole("wsA", "inactive", "normal", {
    disabled: false,
    active: false,
  });
  await seed("workspaces/wsA/schedules/schedule1", {
    workspaceId: "wsA",
    title: "protected schedule",
  });

  await assertFails(getDoc(doc(dbFor("disabled"), "workspaces/wsA/schedules/schedule1")));
  await assertFails(getDoc(doc(dbFor("inactive"), "workspaces/wsA/schedules/schedule1")));
});
