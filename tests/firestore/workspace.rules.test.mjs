import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "personal-management-rules-workspace-test";
const rules = readFileSync(new URL("../../firestore.rules.next", import.meta.url), "utf8");

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
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

async function seedWorkspaceRole(workspaceId, uid, role) {
  await seed(`users/${uid}`, userDoc(uid, {
    currentWorkspaceId: workspaceId,
  }));
  await seedWorkspace(workspaceId);
  await seed(`workspaces/${workspaceId}/members/${uid}`, memberDoc(uid, role, { workspaceId }));
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

test("15. teacher는 수업·과제·출결·시험 관련 컬렉션에 쓸 수 있다", async () => {
  await seedWorkspaceRole("wsA", "teacher", "teacher");

  await assertSucceeds(setDoc(doc(dbFor("teacher"), "workspaces/wsA/attendance/attendance1"), {
    workspaceId: "wsA",
    studentUid: "student1",
    status: "present",
    updatedAt: "now",
  }));
  await assertSucceeds(setDoc(doc(dbFor("teacher"), "workspaces/wsA/assignments/assignment1"), {
    workspaceId: "wsA",
    title: "assignment",
    updatedAt: "now",
  }));
  await assertSucceeds(setDoc(doc(dbFor("teacher"), "workspaces/wsA/exams/exam1"), {
    workspaceId: "wsA",
    title: "exam",
    updatedAt: "now",
  }));
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

  await assertSucceeds(setDoc(doc(dbFor("owner"), "workspaces/wsA/members/super"), {
    uid: "super",
    role: "super_manager",
    status: "active",
    workspaceId: "wsA",
    joinedAt: "now",
    updatedAt: "now",
  }));
});
