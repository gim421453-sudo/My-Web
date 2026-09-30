import { after, before, beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const firebaseConfig = JSON.parse(readFileSync(resolve(root, "firebase.json"), "utf8"));
const configuredRulesPath = resolve(root, firebaseConfig.firestore.rules);
const rules = readFileSync(configuredRulesPath, "utf8");
const PROJECT_ID = "demo-myweb-configured-rules-teacher-scope";
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

async function seedRole(uid, role, workspaceId = "wsA") {
  await seed(`users/${uid}`, {
    uid,
    email: `${uid}@example.test`,
    status: "active",
    globalRole: "user",
    currentWorkspaceId: workspaceId,
  });
  await seed(`workspaces/${workspaceId}/members/${uid}`, {
    uid,
    role,
    status: "active",
    workspaceId,
  });
}

async function seedSystemOwner(uid) {
  await seed(`users/${uid}`, {
    uid,
    email: `${uid}@example.test`,
    status: "active",
    globalRole: "user",
    currentWorkspaceId: null,
  });
  await seed(`systemOwners/${uid}`, { uid, createdAt: "seed" });
}

test("configured Rules deny teacher create on sensitive data without a scope-verified server path", async () => {
  await seedRole("teacher", "teacher");
  await assertFails(setDoc(doc(dbFor("teacher"), "workspaces/wsA/attendance/other-student"), {
    workspaceId: "wsA",
    studentUid: "other-student",
    teacherUid: "teacher",
    createdBy: "teacher",
    status: "present",
  }));
});

test("configured Rules deny teacher update even when a row is marked as teacher-created", async () => {
  await seedRole("teacher", "teacher");
  await seed("workspaces/wsA/records/other-student", {
    workspaceId: "wsA",
    studentUid: "other-student",
    createdBy: "teacher",
    status: "draft",
  });
  await assertFails(updateDoc(doc(dbFor("teacher"), "workspaces/wsA/records/other-student"), {
    status: "approved",
  }));
});

test("configured Rules deny teacher writes to administrator-only workspace settings", async () => {
  await seedRole("teacher", "teacher");
  await assertFails(setDoc(doc(dbFor("teacher"), "workspaces/wsA/settings/homepage"), {
    workspaceId: "wsA",
    title: "unauthorized teacher setting",
  }));
});

test("configured Rules deny inactive user profiles despite active workspace membership", async () => {
  for (const [uid, profile] of [
    ["pending", { status: "pending", disabled: false }],
    ["rejected", { status: "rejected", disabled: false }],
    ["disabled", { status: "disabled", disabled: true }],
    ["disabled-flag", { status: "active", disabled: true }],
  ]) {
    await seedRole(uid, "normal");
    await seed(`users/${uid}`, {
      uid,
      email: `${uid}@example.test`,
      globalRole: "user",
      currentWorkspaceId: "wsA",
      ...profile,
    });
    await assertFails(getDoc(doc(dbFor(uid), "workspaces/wsA/schedules/protected")));
    await assertFails(setDoc(doc(dbFor(uid), `workspaces/wsA/schedules/blocked-${uid}`), {
      workspaceId: "wsA",
      title: "inactive account write",
    }));
  }
});

test("configured Rules preserve manager writes for sensitive workspace data", async () => {
  await seedRole("manager", "manager");
  await assertSucceeds(setDoc(doc(dbFor("manager"), "workspaces/wsA/attendance/student-1"), {
    workspaceId: "wsA",
    studentUid: "student-1",
    status: "present",
  }));
});

test("configured Rules deny cross-workspace chat/support thread and message reads despite participant UID", async () => {
  await seedRole("member", "normal", "wsA");
  await seedRole("outsider", "normal", "wsB");
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
    senderRole: "normal",
    senderName: "outsider",
    message: "unauthorized reply",
    source: "main",
  }));
  await assertFails(setDoc(doc(outsiderDb, "supportThreads/support1/messages/message2"), {
    threadId: "support1",
    workspaceId: "wsA",
    authorUid: "outsider",
    authorRole: "normal",
    createdAt: new Date(),
    message: "unauthorized reply",
  }));
});

test("configured Rules deny regular participants from changing chat participant lists", async () => {
  await seedRole("member", "normal", "wsA");
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

test("configured Rules reject active-status memberships with disabled or inactive flags", async () => {
  await seedRole("disabled", "normal", "wsA");
  await seedRole("inactive", "normal", "wsA");
  await seed("workspaces/wsA/members/disabled", {
    uid: "disabled",
    role: "normal",
    status: "active",
    disabled: true,
    active: false,
    workspaceId: "wsA",
  });
  await seed("workspaces/wsA/members/inactive", {
    uid: "inactive",
    role: "normal",
    status: "active",
    disabled: false,
    active: false,
    workspaceId: "wsA",
  });
  await seed("workspaces/wsA/schedules/schedule1", {
    workspaceId: "wsA",
    title: "protected schedule",
  });

  await assertFails(getDoc(doc(dbFor("disabled"), "workspaces/wsA/schedules/schedule1")));
  await assertFails(getDoc(doc(dbFor("inactive"), "workspaces/wsA/schedules/schedule1")));
});

test("configured Rules dynamically verify all seven roles on workspace schedule and notice CRUD", async () => {
  const actors = [
    { uid: "owner", role: "system_owner" },
    { uid: "super", role: "super_manager" },
    { uid: "manager", role: "manager" },
    { uid: "teacher", role: "teacher" },
    { uid: "normal", role: "normal" },
    { uid: "viewer", role: "viewer" },
    { uid: "print", role: "print_account" },
  ];
  await seedSystemOwner("owner");
  for (const actor of actors.slice(1)) await seedRole(actor.uid, actor.role);

  const workspaceWriters = new Set(["system_owner", "super_manager", "manager", "teacher", "normal"]);
  const adminWriters = new Set(["system_owner", "super_manager", "manager"]);

  for (const actor of actors) {
    const db = dbFor(actor.uid);
    await seed(`workspaces/wsA/schedules/role-matrix-${actor.uid}`, {
      workspaceId: "wsA",
      title: "seed schedule",
      authorUid: actor.uid,
    });
    const scheduleRef = doc(db, `workspaces/wsA/schedules/role-matrix-${actor.uid}`);
    await assertSucceeds(getDoc(scheduleRef));
    const scheduleWrite = workspaceWriters.has(actor.role) ? assertSucceeds : assertFails;
    await scheduleWrite(setDoc(doc(db, `workspaces/wsA/schedules/create-${actor.uid}`), {
      workspaceId: "wsA",
      title: "role matrix schedule",
      authorUid: actor.uid,
    }));
    await scheduleWrite(updateDoc(scheduleRef, { title: "updated schedule" }));
    const scheduleDelete = adminWriters.has(actor.role) ? assertSucceeds : assertFails;
    await scheduleDelete(deleteDoc(scheduleRef));

    const noticePath = `workspaces/wsA/notices/role-matrix-${actor.uid}`;
    await seed(noticePath, {
      workspaceId: "wsA",
      title: "seed notice",
      authorUid: actor.uid,
    });
    const noticeRef = doc(db, noticePath);
    await assertSucceeds(getDoc(noticeRef));
    const noticeWrite = workspaceWriters.has(actor.role) ? assertSucceeds : assertFails;
    await noticeWrite(setDoc(doc(db, `workspaces/wsA/notices/create-${actor.uid}`), {
      workspaceId: "wsA",
      title: "role matrix notice",
      authorUid: actor.uid,
    }));
    await noticeWrite(updateDoc(noticeRef, { title: "updated notice" }));
    await noticeWrite(deleteDoc(noticeRef));
  }
});
