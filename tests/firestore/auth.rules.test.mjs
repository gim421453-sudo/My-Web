import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const PROJECT_ID = "demo-myweb-auth-rules";
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

function anonDb() {
  return testEnv.unauthenticatedContext().firestore();
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
    joinedAt: "seed",
    updatedAt: "seed",
    ...overrides,
  };
}

async function seedWorkspaceRole(workspaceId, uid, role, userOverrides = {}) {
  await seed(`users/${uid}`, userDoc(uid, {
    currentWorkspaceId: workspaceId,
    ...userOverrides,
  }));
  await seed(`workspaces/${workspaceId}`, {
    workspaceId,
    name: workspaceId,
    ownerUid: "owner",
  });
  await seed(`workspaces/${workspaceId}/members/${uid}`, memberDoc(uid, role, { workspaceId }));
}

async function seedSystemOwner(uid = "owner", userOverrides = {}, ownerOverrides = {}) {
  await seed(`users/${uid}`, userDoc(uid, {
    status: "active",
    globalRole: "system_owner",
    ...userOverrides,
  }));
  await seed(`systemOwners/${uid}`, { uid, createdAt: "seed", ...ownerOverrides });
}

test("01. 미로그인 사용자는 기본 사용자 문서를 읽을 수 없다", async () => {
  await seed("users/normal", userDoc("normal"));

  await assertFails(getDoc(doc(anonDb(), "users/normal")));
});

test("04. pending 사용자는 자기 status를 active로 변경할 수 없다", async () => {
  await seed("users/pendingUser", userDoc("pendingUser", {
    status: "pending",
  }));

  await assertFails(updateDoc(doc(dbFor("pendingUser"), "users/pendingUser"), {
    status: "active",
    updatedAt: "changed",
  }));
});

test("05. disabled 사용자는 disabled=false로 자기 계정을 복구할 수 없다", async () => {
  await seed("users/disabledUser", userDoc("disabledUser", {
    status: "disabled",
    disabled: true,
  }));

  await assertFails(updateDoc(doc(dbFor("disabledUser"), "users/disabledUser"), {
    disabled: false,
    status: "active",
    updatedAt: "changed",
  }));
});

test("06. 일반 사용자는 자기 globalRole을 변경할 수 없다", async () => {
  await seed("users/normal", userDoc("normal"));

  await assertFails(updateDoc(doc(dbFor("normal"), "users/normal"), {
    globalRole: "system_owner",
    updatedAt: "changed",
  }));
});

test("07. 일반 사용자는 레거시 currentRole 필드를 추가하거나 변경할 수 없다", async () => {
  await seed("users/normal", userDoc("normal"));

  await assertFails(updateDoc(doc(dbFor("normal"), "users/normal"), {
    currentRole: "super_manager",
    updatedAt: "changed",
  }));
});

test("08. 검증되지 않은 currentWorkspaceId 변경은 거부된다", async () => {
  await seed("users/normal", userDoc("normal"));
  await seed("workspaces/wsA", { workspaceId: "wsA", name: "Workspace A" });

  await assertFails(updateDoc(doc(dbFor("normal"), "users/normal"), {
    currentWorkspaceId: "wsA",
    updatedAt: "changed",
  }));
});

test("09. manager는 users 문서의 globalRole을 system_owner로 변경할 수 없다", async () => {
  await seedWorkspaceRole("wsA", "manager", "manager");
  await seed("users/target", userDoc("target", {
    currentWorkspaceId: "wsA",
  }));

  await assertFails(updateDoc(doc(dbFor("manager"), "users/target"), {
    globalRole: "system_owner",
    updatedAt: "changed",
  }));
});

test("10. manager는 users/{uid} 문서를 삭제할 수 없다", async () => {
  await seedWorkspaceRole("wsA", "manager", "manager");
  await seed("users/target", userDoc("target", {
    currentWorkspaceId: "wsA",
  }));

  await assertFails(deleteDoc(doc(dbFor("manager"), "users/target")));
});

test("17. active system_owner는 시스템 전용 문서에 접근할 수 있다", async () => {
  await seedSystemOwner("owner");

  await assertSucceeds(setDoc(doc(dbFor("owner"), "systemNotices/notice1"), {
    title: "system",
    body: "notice",
    createdAt: "now",
  }));
});

test("18. disabled system_owner는 systemOwners 문서가 있어도 권한이 거부된다", async () => {
  await seedSystemOwner("disabledOwner", {
    status: "disabled",
    disabled: true,
  }, {
    status: "disabled",
    disabled: true,
  });

  await assertFails(setDoc(doc(dbFor("disabledOwner"), "systemNotices/notice1"), {
    title: "blocked",
    body: "blocked",
    createdAt: "now",
  }));
});

test("19. workspace 없는 active 사용자는 자기 users 문서만 읽을 수 있다", async () => {
  await seed("users/workspaceLess", userDoc("workspaceLess", {
    status: "active",
    currentWorkspaceId: null,
  }));

  await assertSucceeds(getDoc(doc(dbFor("workspaceLess"), "users/workspaceLess")));
  await assertFails(getDoc(doc(dbFor("workspaceLess"), "workspaces/wsA")));
});

test("20. user_devices 생성은 workspaceId가 null이어도 로그인 후처리용으로 허용된다", async () => {
  await seed("users/workspaceLess", userDoc("workspaceLess", {
    status: "active",
    currentWorkspaceId: null,
  }));

  await assertSucceeds(setDoc(doc(dbFor("workspaceLess"), "user_devices/device1"), {
    uid: "workspaceLess",
    workspaceId: null,
    userAgent: "rules-test",
    updatedAt: "now",
  }));
});

test("21. notifications 생성은 workspaceId가 null이어도 로그인 후처리용으로 허용된다", async () => {
  await seed("users/workspaceLess", userDoc("workspaceLess", {
    status: "active",
    currentWorkspaceId: null,
  }));

  await assertSucceeds(setDoc(doc(dbFor("workspaceLess"), "notifications/notification1"), {
    uid: "workspaceLess",
    workspaceId: null,
    title: "welcome",
    createdAt: "now",
  }));
});
