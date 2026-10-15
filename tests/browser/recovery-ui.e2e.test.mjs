import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { after, before, test } from "node:test";
import { chromium } from "playwright";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT_ID = "demo-myweb-recovery-e2e";
const PASSWORD = "RecoveryDemoOnly-2026!";
const WORKSPACE_A = "ws-recovery-e2e-a";
const WORKSPACE_B = "ws-recovery-e2e-b";
const APP_URL = "http://127.0.0.1:5179/";
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
const VITE_BIN = path.resolve(path.dirname(require.resolve("vite")), "../../bin/vite.js");
const FIXTURES = [
  ["owner", "system_owner"],
  ["super", "super_manager"],
  ["manager", "manager"],
  ["teacher", "teacher"],
  ["normal", "normal"],
  ["viewer", "viewer"],
  ["print", "print_account"],
];
const ACCOUNT_STATES = ["pending", "rejected", "disabled"];

let adminApp;
let adminAuth;
let adminDb;
let browser;
let viteProcess;
let viteOutput = "";
const runtimeErrors = [];
const blockedExternalOrigins = new Set();

function requireLoopback(name, value, expectedPort) {
  assert.match(String(value || ""), /^(127\.0\.0\.1|localhost):\d+$/, `${name}은 loopback이어야 합니다.`);
  if (expectedPort) assert.equal(Number(String(value).split(":").at(-1)), expectedPort, `${name} 포트가 예상과 다릅니다.`);
}

async function seedDemoFixtures() {
  await Promise.all([
    adminDb.recursiveDelete(adminDb.doc(`workspaces/${WORKSPACE_A}`)),
    adminDb.recursiveDelete(adminDb.doc(`workspaces/${WORKSPACE_B}`)),
    adminDb.recursiveDelete(adminDb.doc("systemOwners/recovery-e2e-owner")),
    ...FIXTURES.map(([shortName]) => adminDb.recursiveDelete(adminDb.doc(`users/recovery-e2e-${shortName}`))),
    ...ACCOUNT_STATES.map((state) => adminDb.recursiveDelete(adminDb.doc(`users/recovery-e2e-state-${state}`))),
  ]);
  for (const [shortName] of FIXTURES) {
    const uid = `recovery-e2e-${shortName}`;
    try { await adminAuth.deleteUser(uid); } catch (error) { if (error.code !== "auth/user-not-found") throw error; }
  }
  for (const [shortName, role] of FIXTURES) {
    const uid = `recovery-e2e-${shortName}`;
    const email = `${uid}@example.test`;
    await adminAuth.createUser({ uid, email, password: PASSWORD, displayName: `E2E ${role}`, emailVerified: true, disabled: false });
    await adminDb.doc(`users/${uid}`).set({
      uid,
      email,
      displayName: `E2E ${role}`,
      status: "active",
      disabled: false,
      globalRole: "user",
      currentWorkspaceId: WORKSPACE_A,
      workspaceId: WORKSPACE_A,
      workspace_id: WORKSPACE_A,
      createdAt: "emulator-fixture",
      updatedAt: "emulator-fixture",
    });
    await adminDb.doc(`workspaces/${WORKSPACE_A}/members/${uid}`).set({
      uid,
      email,
      displayName: `E2E ${role}`,
      role,
      status: "active",
      workspaceId: WORKSPACE_A,
      joinedAt: "emulator-fixture",
      updatedAt: "emulator-fixture",
    });
  }
  await adminDb.doc(`users/recovery-e2e-owner`).set({ globalRole: "system_owner" }, { merge: true });
  await adminDb.doc(`systemOwners/recovery-e2e-owner`).set({ uid: "recovery-e2e-owner", status: "active", schemaVersion: 1 });
  await adminDb.doc(`workspaces/${WORKSPACE_A}`).set({ workspaceId: WORKSPACE_A, name: "Recovery E2E A", status: "active", ownerUid: "recovery-e2e-owner" });
  await adminDb.doc(`workspaces/${WORKSPACE_B}`).set({ workspaceId: WORKSPACE_B, name: "Recovery E2E B", status: "active", ownerUid: "recovery-e2e-owner" });
  await adminDb.doc(`workspaces/${WORKSPACE_A}/settings/app`).set({ systemNoticeEnabled: true });
  await adminDb.doc(`workspaces/${WORKSPACE_A}/schedules/e2e-seed-schedule`).set({
    id: "e2e-seed-schedule",
    workspaceId: WORKSPACE_A,
    title: "Recovery E2E seeded schedule",
    date: "2026-09-30",
    status: "예정",
    created_by: "recovery-e2e-fixture",
  });
  await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/e2e-seed-notice`).set({
    id: "e2e-seed-notice",
    workspaceId: WORKSPACE_A,
    workspace_id: WORKSPACE_A,
    title: "Recovery E2E seeded notice",
    content: "Emulator-only fixture",
    source: "학교",
    status: "active",
    visibility: "public",
    authorUid: "recovery-e2e-owner",
  });
  await adminDb.doc(`workspaces/${WORKSPACE_B}/notices/e2e-other-workspace-notice`).set({
    workspaceId: WORKSPACE_B,
    title: "Other workspace notice",
    content: "Must stay outside the selected workspace",
    authorUid: "recovery-e2e-owner",
    appNextManaged: true,
    createdFrom: "app-next",
  });
  await adminDb.doc(`workspaces/${WORKSPACE_B}/schedules/e2e-other-workspace`).set({
    id: "e2e-other-workspace",
    workspaceId: WORKSPACE_B,
    title: "Other workspace fixture",
  });
  for (const state of ACCOUNT_STATES) {
    const uid = `recovery-e2e-state-${state}`;
    const email = `${uid}@example.test`;
    await adminAuth.createUser({ uid, email, password: PASSWORD, displayName: `E2E ${state}`, emailVerified: true, disabled: state === "disabled" });
    await adminDb.doc(`users/${uid}`).set({
      uid, email, displayName: `E2E ${state}`, status: state, disabled: state === "disabled",
      globalRole: "user", currentWorkspaceId: WORKSPACE_A, workspaceId: WORKSPACE_A,
    });
    await adminDb.doc(`workspaces/${WORKSPACE_A}/members/${uid}`).set({
      uid, email, displayName: `E2E ${state}`, role: "normal", status: "active", workspaceId: WORKSPACE_A,
    });
  }
}

async function cleanupDemoFixtures() {
  if (!adminDb || !adminAuth) return;
  await Promise.all([
    adminDb.recursiveDelete(adminDb.doc(`workspaces/${WORKSPACE_A}`)),
    adminDb.recursiveDelete(adminDb.doc(`workspaces/${WORKSPACE_B}`)),
    adminDb.recursiveDelete(adminDb.doc("systemOwners/recovery-e2e-owner")),
    ...FIXTURES.map(([shortName]) => adminDb.recursiveDelete(adminDb.doc(`users/recovery-e2e-${shortName}`))),
    ...ACCOUNT_STATES.map((state) => adminDb.recursiveDelete(adminDb.doc(`users/recovery-e2e-state-${state}`))),
  ]);
  for (const [shortName] of FIXTURES) {
    try { await adminAuth.deleteUser(`recovery-e2e-${shortName}`); } catch (error) { if (error.code !== "auth/user-not-found") throw error; }
  }
  for (const state of ACCOUNT_STATES) {
    try { await adminAuth.deleteUser(`recovery-e2e-state-${state}`); } catch (error) { if (error.code !== "auth/user-not-found") throw error; }
  }
}

async function waitForVite() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (viteProcess.exitCode !== null) throw new Error(`Vite가 조기 종료되었습니다.\n${viteOutput}`);
    try {
      const response = await fetch(APP_URL);
      if (response.ok) return;
    } catch {}
    await delay(250);
  }
  throw new Error(`Vite 준비 시간 초과.\n${viteOutput}`);
}

before(async () => {
  assert.equal(process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT, PROJECT_ID, "Firebase project는 명시된 demo project여야 합니다.");
  requireLoopback("FIREBASE_AUTH_EMULATOR_HOST", AUTH_EMULATOR_HOST);
  requireLoopback("FIRESTORE_EMULATOR_HOST", FIRESTORE_EMULATOR_HOST);
  assert.ok(!process.env.FIREBASE_CONFIG || process.env.FIREBASE_CONFIG.includes("demo-myweb-recovery-e2e"), "Firebase CLI config가 demo project를 가리켜야 합니다.");

  adminApp = initializeApp({ projectId: PROJECT_ID }, "recovery-browser-e2e");
  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
  await seedDemoFixtures();

  const childEnv = {
    ...process.env,
    VITE_FIREBASE_API_KEY: "recovery-demo-only",
    VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
    VITE_FIREBASE_PROJECT_ID: PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: `${PROJECT_ID}.appspot.com`,
    VITE_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
    VITE_FIREBASE_APP_ID: "1:000000000000:web:recoverydemo",
    VITE_FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST,
    VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: FIRESTORE_EMULATOR_HOST,
    VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH: "true",
    PLAYWRIGHT_BROWSERS_PATH: "0",
  };
  viteProcess = spawn(process.execPath, [
    VITE_BIN,
    "--config", path.join(ROOT, "tests/browser/vite.recovery.config.cjs"),
    "--host", "127.0.0.1", "--port", "5179", "--strictPort",
  ], { cwd: ROOT, env: childEnv, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  viteProcess.stdout.on("data", (chunk) => { viteOutput = `${viteOutput}${chunk}`.slice(-8000); });
  viteProcess.stderr.on("data", (chunk) => { viteOutput = `${viteOutput}${chunk}`.slice(-8000); });
  await waitForVite();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (viteProcess && viteProcess.exitCode === null) {
    viteProcess.kill("SIGTERM");
    await Promise.race([new Promise((resolve) => viteProcess.once("exit", resolve)), delay(5000)]);
  }
  await cleanupDemoFixtures();
  if (adminApp) await adminApp.delete();
});

async function createPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (!["127.0.0.1", "localhost"].includes(url.hostname) && !["data:", "blob:"].includes(url.protocol)) {
      blockedExternalOrigins.add(url.origin);
      await route.abort("blockedbyclient");
      return;
    }
    await route.continue();
  });
  page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && /ReferenceError|Uncaught|Unhandled/i.test(message.text())) {
      runtimeErrors.push(`console: ${message.text()}`);
    }
  });
  return { context, page };
}

async function login(page, shortName) {
  await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(`recovery-e2e-${shortName}@example.test`);
  await page.locator("#password").fill(PASSWORD);
  await page.locator('#loginForm button[type="submit"]').click();
  await page.locator("#loginScreen").waitFor({ state: "hidden", timeout: 20_000 });
  await page.locator("#app").waitFor({ state: "visible", timeout: 10_000 });
}

async function loginAppNext(page, shortName) {
  await page.goto(`${APP_URL}app-next.html#/login`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "이메일/비밀번호 고급 옵션" }).click();
  await page.locator('input[type="email"]').fill(`recovery-e2e-${shortName}@example.test`);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator("form button[type=submit]").click();
  await page.waitForFunction(
    () => document.body.innerText.includes("signed_in")
      || document.body.innerText.includes("로그아웃")
      || document.body.innerText.includes("활성 계정")
      || document.body.innerText.includes("시스템 오너 계정")
      || Boolean(document.querySelector('[role="alert"]')),
    null,
    { timeout: 40_000 },
  );
  await page.goto(`${APP_URL}app-next.html#/notices`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "워크스페이스 공지" }).waitFor({ timeout: 30_000 });
  await page.getByText("Recovery E2E seeded notice", { exact: true }).waitFor({ timeout: 20_000 });
}

async function queryNoticeByTitle(title) {
  return adminDb.collection(`workspaces/${WORKSPACE_A}/notices`)
    .where("title", "==", title)
    .limit(1)
    .get();
}

async function expectBrowserRule(page, action, expectedCode) {
  const result = await page.evaluate(async ({ action, workspaceA, workspaceB }) => {
    const db = firebase.firestore();
    try {
      if (action === "same-workspace-write") {
        await db.doc(`workspaces/${workspaceA}/schedules/e2e-direct-write`).set({
          workspaceId: workspaceA,
          title: "Direct E2E write",
          created_by: firebase.auth().currentUser.email,
        });
      } else if (action === "other-workspace-read") {
        await db.doc(`workspaces/${workspaceB}/schedules/e2e-other-workspace`).get();
      } else if (action === "teacher-sensitive-write") {
        await db.doc(`workspaces/${workspaceA}/students/e2e-out-of-scope`).set({ workspaceId: workspaceA, title: "Forbidden" });
      } else if (action === "manager-sensitive-write") {
        await db.doc(`workspaces/${workspaceA}/attendance/e2e-manager-write`).set({ workspaceId: workspaceA, studentUid: "e2e-student", status: "present" });
      }
      return "allowed";
    } catch (error) {
      return error.code || error.message;
    }
  }, { action, workspaceA: WORKSPACE_A, workspaceB: WORKSPACE_B });
  assert.equal(result, expectedCode, `${action} 결과`);
}

const expectedRoles = new Map(FIXTURES);
for (const [shortName, role] of FIXTURES) {
  test(`legacy UI ${role}: 로그인, 목록/상세, 역할별 작업, 격리, 로그아웃`, { timeout: 60_000 }, async () => {
    const { context, page } = await createPage();
    try {
      await login(page, shortName);
      const roleLabel = await page.locator("#roleLabel").innerText();
      assert.match(roleLabel, role === "system_owner" ? /시스템관리자/ : role === "super_manager" ? /최고관리자/ : role === "manager" ? /관리자/ : role === "print_account" ? /프린트 전용계정/ : /사용자/);
      const scheduleNav = page.locator('#nav .nav-btn[data-page="schedules"]');
      await expectBrowserRule(page, "other-workspace-read", role === "system_owner" ? "allowed" : "permission-denied");
      if (["viewer", "print_account"].includes(role)) {
        await expectBrowserRule(page, "same-workspace-write", "permission-denied");
      }
      if (role === "teacher") await expectBrowserRule(page, "teacher-sensitive-write", "permission-denied");
      if (role === "manager") await expectBrowserRule(page, "manager-sensitive-write", "allowed");
      if (role === "print_account") {
        await page.waitForTimeout(500);
        assert.equal(await scheduleNav.count(), 0);
        assert.match(await page.locator("#pageTitle").innerText(), /프린트|출력|시험/,
          `print_account이 print 화면에 도달해야 합니다. 현재 메뉴: ${await page.locator("#nav").innerText()}`);
      } else {
        await scheduleNav.click();
        await page.getByText("Recovery E2E seeded schedule", { exact: true }).waitFor({ timeout: 15_000 });
        const seededRow = page.getByRole("row").filter({ hasText: "Recovery E2E seeded schedule" });
        await seededRow.getByRole("button", { name: "보기" }).click();
        await page.locator("#messageDialog[open]").waitFor({ state: "visible" });
        assert.match(await page.locator("#messageBody").innerText(), /Recovery E2E seeded schedule/);
        await page.locator('#messageDialog button[value="ok"]').click();

        const createButton = page.locator("#content .panel-head button").filter({ hasText: "새 항목" }).first();
        const canCreateSchedule = ["system_owner", "super_manager", "manager", "teacher", "normal"].includes(role);
        assert.equal(await createButton.isEnabled(), canCreateSchedule, `${role} 일정 생성 UI 권한`);
        if (canCreateSchedule) {
          await createButton.click();
          await page.locator("#editorDialog[open]").waitFor({ state: "visible" });
          const title = `Recovery E2E created ${role}`;
          await page.locator('#editorFields [name="title"]').fill(title);
          await page.locator('#editorForm button[type="submit"]').click();
          await page.locator("#editorDialog").waitFor({ state: "hidden" });
          await page.getByText(title, { exact: true }).waitFor({ timeout: 10_000 });
          const serverQuery = adminDb.collection(`workspaces/${WORKSPACE_A}/schedules`).where("title", "==", title).limit(1);
          const deadline = Date.now() + 10_000;
          let serverRow;
          while (Date.now() < deadline) {
            serverRow = await serverQuery.get();
            if (!serverRow.empty) break;
            await delay(200);
          }
          assert.equal(serverRow?.empty, false, `${role} 일정 생성이 Emulator 서버에 반영되어야 합니다.`);
        }
      }
      if (await page.locator("#messageDialog[open]").count()) await page.locator('#messageDialog button[value="ok"]').click();
      await page.locator("#logoutBtn").click();
      await page.locator("#loginScreen").waitFor({ state: "visible" });
      await page.locator("#app").waitFor({ state: "hidden" });
    } finally {
      await context.close();
    }
  });
}

test("로그아웃 후 역할 전환 시 이전 관리자 메뉴와 권한이 남지 않는다", { timeout: 60_000 }, async () => {
  const { context, page } = await createPage();
  try {
    await login(page, "manager");
    const managerMenus = await page.locator("#nav .nav-btn").evaluateAll((nodes) => nodes.map((node) => node.dataset.page));
    await page.locator("#logoutBtn").click();
    await page.locator("#loginScreen").waitFor({ state: "visible" });
    await login(page, "viewer");
    await page.waitForTimeout(750);
    const viewerMenus = await page.locator("#nav .nav-btn").evaluateAll((nodes) => nodes.map((node) => node.dataset.page));
    const privilegedMenus = new Set(["people", "accounts", "admin", "system", "budget", "site"]);
    assert.deepEqual(viewerMenus.filter((menu) => privilegedMenus.has(menu)), []);
    await page.locator('#nav .nav-btn[data-page="schedules"]').click();
    assert.equal(await page.locator('#content .panel-head button').filter({ hasText: "새 항목" }).isEnabled(), false);
    assert.ok(Array.isArray(managerMenus));
    await expectBrowserRule(page, "same-workspace-write", "permission-denied");
  } finally {
    await context.close();
  }
});

test("pending/rejected/disabled 계정은 Emulator UI 업무 메뉴에서 fail-closed 된다", { timeout: 60_000 }, async () => {
  for (const state of ACCOUNT_STATES) {
    const { context, page } = await createPage();
    try {
      await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
      await page.locator("#email").fill(`recovery-e2e-state-${state}@example.test`);
      await page.locator("#password").fill(PASSWORD);
      await page.locator('#loginForm button[type="submit"]').click();
      if (state === "disabled") {
        await page.locator("#loginError").waitFor({ state: "visible", timeout: 10_000 });
        assert.match(await page.locator("#loginError").innerText(), /비활성|로그인/);
        assert.equal(await page.locator("#app:not(.hidden)").count(), 0);
      } else {
        await page.locator("#app").waitFor({ state: "visible", timeout: 15_000 });
        await page.waitForTimeout(400);
        assert.equal(await page.locator('#nav .nav-btn[data-page="schedules"]').count(), 0, `${state} 계정에서 일정 메뉴가 차단되어야 합니다.`);
        assert.equal(await page.locator('#nav .nav-btn[data-page="accounts"]').count(), 0);
      }
    } finally {
      await context.close();
    }
  }
});

test("App Next 보호 direct URL은 로그아웃·비소유자에서 차단되고 canonical system_owner만 미리보기에 접근한다", { timeout: 60_000 }, async () => {
  {
    const { context, page } = await createPage();
    try {
      await page.goto(`${APP_URL}app-next.html#/admin-preview`, { waitUntil: "domcontentloaded" });
      await page.getByText("로그인이 필요합니다", { exact: true }).first().waitFor({ timeout: 15_000 });
      const diagnostics = await page.locator("#root").innerText();
      assert.match(diagnostics, /signed_out/);
    } finally {
      await context.close();
    }
  }

  for (const [shortName, expectedText] of [["manager", "Owner Preview access blocked"], ["owner", "Admin Access Preview"]]) {
    const { context, page } = await createPage();
    try {
      await page.goto(`${APP_URL}app-next.html#/login`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "이메일/비밀번호 고급 옵션" }).click();
      await page.locator('input[type="email"]').fill(`recovery-e2e-${shortName}@example.test`);
      await page.locator('input[type="password"]').fill(PASSWORD);
      await page.locator("form button[type=submit]").click();
      await page.waitForFunction(() => document.body.innerText.includes("signed_in") || document.body.innerText.includes("로그아웃") || document.body.innerText.includes("활성 계정") || document.body.innerText.includes("시스템 오너 계정") || Boolean(document.querySelector('[role="alert"]')), null, { timeout: 40_000 })
        .catch(async () => { throw new Error(`App Next 로그인 상태 전환 시간 초과. role=${shortName} body=${(await page.locator("#root").innerText()).slice(0, 1600)}`); });
      await page.goto(`${APP_URL}app-next.html#/admin-preview`, { waitUntil: "domcontentloaded" });
      await page.getByText(expectedText, { exact: true }).waitFor({ timeout: 20_000 });
      if (shortName === "owner") {
        assert.match(await page.locator("#root").innerText(), /accessAllowed\s+true/);
      }
    } finally {
      await context.close();
    }
  }
});

test("App Next 공지 CRUD 역할별 UI와 Firestore 서버 상태를 확인한다", { timeout: 300_000 }, async () => {
  const roles = [
    ["owner", "system_owner", "all"],
    ["super", "super_manager", "all"],
    ["manager", "manager", "all"],
    ["teacher", "teacher", "own"],
    ["normal", "normal", "own"],
    ["viewer", "viewer", "read"],
    ["print", "print_account", "read"],
  ];

  for (const [shortName, role, access] of roles) {
      const uid = `recovery-e2e-${shortName}`;
      const foreignId = `app-next-foreign-${shortName}`;
      const ownId = `app-next-own-${shortName}`;
      const foreignTitle = `App Next foreign ${role}`;
      const ownTitle = `App Next own ${role}`;
      await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${foreignId}`).set({
        workspaceId: WORKSPACE_A,
        title: foreignTitle,
        content: "Marked App Next fixture",
        authorUid: "recovery-e2e-owner",
        appNextManaged: true,
        createdFrom: "app-next",
      });
      if (access === "own") {
        await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${ownId}`).set({
          workspaceId: WORKSPACE_A,
          title: ownTitle,
          content: "Own marked fixture",
          authorUid: uid,
          appNextManaged: true,
          createdFrom: "app-next",
        });
      }

      const { context, page } = await createPage();
      try {
        await loginAppNext(page, shortName);
        assert.equal(await page.locator(".app-next-notice-crud").count(), access === "read" ? 0 : 1,
          `${role} CRUD 섹션 표시`);
        assert.equal(await page.getByText("Other workspace notice", { exact: true }).count(), 0,
          `${role} 다른 워크스페이스 공지 격리`);
        assert.equal(await page.getByRole("button", { name: "수정" }).count(), access === "read" ? 0 : 1,
          `${role} 관리 가능한 표식 공지 수`);

        if (access === "read") {
          await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${foreignId}`).delete();
          return;
        }

        const manageList = page.locator(".app-next-notice-manage-list");
        assert.equal(await manageList.locator("li").filter({ hasText: "Recovery E2E seeded notice" }).count(), 0,
          `${role} 표식 없는 legacy 공지에는 관리 버튼이 없어야 합니다.`);
        const visibleForeignRow = manageList.locator("li").filter({ hasText: foreignTitle });
        assert.equal(await visibleForeignRow.count(), access === "all" ? 1 : 0,
          `${role} 타 작성자 표식 공지 관리 범위`);
        if (access === "own") {
          assert.equal(await manageList.locator("li").filter({ hasText: ownTitle }).count(), 1,
            `${role} 본인 작성 공지가 관리 목록에 표시되어야 합니다.`);
        }

        if (access === "all") {
          await visibleForeignRow.getByRole("button", { name: "수정" }).click();
          await page.getByLabel("제목").fill(`${foreignTitle} edited`);
          await page.getByLabel("내용").fill("server-confirmed foreign update");
          await page.getByRole("button", { name: "수정 저장" }).click();
          await page.getByRole("status").filter({ hasText: "수정" }).waitFor();
          assert.equal((await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${foreignId}`).get()).get("title"), `${foreignTitle} edited`);
          const editedForeignRow = manageList.locator("li").filter({ hasText: `${foreignTitle} edited` });
          page.once("dialog", (dialog) => dialog.accept());
          await editedForeignRow.getByRole("button", { name: "삭제" }).click();
          await page.getByRole("status").filter({ hasText: "공지 삭제를 서버에서 확인했습니다." }).waitFor();
          assert.equal((await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${foreignId}`).get()).exists, false);
        }

        const title = `App Next created ${role}`;
        await page.getByLabel("제목").fill(title);
        await page.getByLabel("내용").fill(`Created by ${role}`);
        await page.getByRole("button", { name: "공지 등록" }).click();
        await page.getByRole("status").filter({ hasText: "등록을 서버에서 확인" }).waitFor({ timeout: 20_000 });
        let created = await queryNoticeByTitle(title);
        assert.equal(created.size, 1, `${role} 생성 문서가 Emulator 서버에서 조회되어야 합니다.`);
        const createdId = created.docs[0].id;
        assert.equal(created.docs[0].get("authorUid"), uid);
        assert.equal(created.docs[0].get("appNextManaged"), true);

        const createdRow = manageList.locator("li").filter({ hasText: title });
        await createdRow.getByRole("button", { name: "수정" }).click();
        await page.getByLabel("제목").fill(`${title} edited`);
        await page.getByLabel("내용").fill(`Updated by ${role}`);
        await page.getByRole("button", { name: "수정 저장" }).click();
        await page.getByRole("status").filter({ hasText: "수정" }).waitFor({ timeout: 20_000 });
        const updated = await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${createdId}`).get();
        assert.equal(updated.get("title"), `${title} edited`);
        assert.equal(updated.get("content"), `Updated by ${role}`);

        const updatedRow = manageList.locator("li").filter({ hasText: `${title} edited` });
        page.once("dialog", (dialog) => dialog.accept());
        await updatedRow.getByRole("button", { name: "삭제" }).click();
        await page.getByRole("status").filter({ hasText: "공지 삭제를 서버에서 확인했습니다." }).waitFor({ timeout: 20_000 });
        assert.equal((await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${createdId}`).get()).exists, false);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.getByRole("heading", { name: "워크스페이스 공지" }).waitFor({ timeout: 20_000 });
        assert.equal(await page.getByText(`${title} edited`, { exact: true }).count(), 0,
          `${role} 새로고침 후 삭제된 문서가 없어야 합니다.`);
      } finally {
        await context.close();
        await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${foreignId}`).delete().catch(() => {});
        await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${ownId}`).delete().catch(() => {});
        const created = await adminDb.collection(`workspaces/${WORKSPACE_A}/notices`)
          .where("title", "==", `App Next created ${role}`)
          .get();
        await Promise.all(created.docs.map((item) => item.ref.delete()));
      }
  }
});

test("App Next 공지 CRUD 오류·검증·서버 확인 지연 상태를 처리한다", { timeout: 120_000 }, async () => {
  const ownedId = "app-next-error-owned-teacher";
  const ownedTitle = "App Next error-owned teacher";
  await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${ownedId}`).set({
    workspaceId: WORKSPACE_A,
    title: ownedTitle,
    content: "permission fixture",
    authorUid: "recovery-e2e-teacher",
    appNextManaged: true,
    createdFrom: "app-next",
  });
  const { context, page } = await createPage();
  try {
    await loginAppNext(page, "teacher");
    const manageList = page.locator(".app-next-notice-manage-list");
    assert.equal(await manageList.locator("li").filter({ hasText: "Recovery E2E seeded notice" }).count(), 0);

    await page.getByLabel("제목").fill("  ");
    await page.getByLabel("내용").fill("invalid draft");
    await page.getByRole("button", { name: "공지 등록" }).click();
    await page.getByRole("alert").filter({ hasText: "제목을 입력" }).waitFor();
    assert.equal((await queryNoticeByTitle("  ")).size, 0);

    await adminDb.doc(`workspaces/${WORKSPACE_A}/members/recovery-e2e-teacher`).update({ status: "disabled" });
    const ownedRow = manageList.locator("li").filter({ hasText: ownedTitle });
    page.once("dialog", (dialog) => dialog.accept());
    await ownedRow.getByRole("button", { name: "삭제" }).click();
    await page.getByRole("alert").filter({ hasText: "권한이 없습니다" }).waitFor({ timeout: 15_000 });
    assert.equal((await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${ownedId}`).get()).exists, true);
  } finally {
    await context.close();
    await adminDb.doc(`workspaces/${WORKSPACE_A}/members/recovery-e2e-teacher`).update({ status: "active" });
    await adminDb.doc(`workspaces/${WORKSPACE_A}/notices/${ownedId}`).delete();
  }

  const { context: networkContext, page: networkPage } = await createPage();
  try {
    await loginAppNext(networkPage, "manager");
    let firestoreRequestSeen;
    const firestoreRequest = new Promise((resolve) => { firestoreRequestSeen = resolve; });
    let firstFirestoreRequest = true;
    const firestoreEmulatorOrigin = `http://${FIRESTORE_EMULATOR_HOST}`;
    await networkPage.route(`${firestoreEmulatorOrigin}/**`, async (route) => {
      if (firstFirestoreRequest) {
        firstFirestoreRequest = false;
        firestoreRequestSeen(route.request());
        await delay(1200);
      }
      await route.continue();
    });
    const title = "App Next confirmation delay";
    await networkPage.getByLabel("제목").fill(title);
    await networkPage.getByLabel("내용").fill("wait for server confirmation");
    await networkPage.getByRole("button", { name: "공지 등록" }).click();
    await Promise.race([
      firestoreRequest,
      delay(15_000).then(() => { throw new Error(`Firestore Emulator 요청을 관찰하지 못했습니다: ${firestoreEmulatorOrigin}`); }),
    ]);
    assert.equal(await networkPage.getByRole("status").filter({ hasText: "등록을 서버에서 확인" }).count(), 0,
      "서버 확인 전에는 성공 상태가 없어야 합니다.");
    assert.equal(await networkPage.getByRole("button", { name: "서버 확인 중" }).isDisabled(), true,
      "서버 확인 중 중복 제출을 막아야 합니다.");
    await networkPage.evaluate(() => document.querySelector(".app-next-notice-form button[type=submit]")?.click());
    await networkPage.getByRole("status").filter({ hasText: "등록을 서버에서 확인" }).waitFor({ timeout: 20_000 });
    assert.equal((await queryNoticeByTitle(title)).size, 1, "빠른 이중 입력에도 공지는 한 건만 생성되어야 합니다.");

  } finally {
    await networkContext.close();
    const docs = await adminDb.collection(`workspaces/${WORKSPACE_A}/notices`)
      .where("title", "==", "App Next confirmation delay")
      .get();
    await Promise.all(docs.docs.map((item) => item.ref.delete()));
  }
});

test("인증 후 런타임 오류와 비-loopback 요청이 없다", () => {
  assert.deepEqual(runtimeErrors, []);
  assert.ok([...blockedExternalOrigins].every((origin) => origin.startsWith("https://")), "외부 요청은 모두 loopback 차단 경계에서 중단되어야 합니다.");
});
