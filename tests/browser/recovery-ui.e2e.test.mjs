import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
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
  requireLoopback("FIREBASE_AUTH_EMULATOR_HOST", process.env.FIREBASE_AUTH_EMULATOR_HOST, 9099);
  requireLoopback("FIRESTORE_EMULATOR_HOST", process.env.FIRESTORE_EMULATOR_HOST, 8080);
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
    VITE_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    VITE_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
    VITE_ENABLE_NEW_AUTH_REQUIRE_AUTH: "true",
    PLAYWRIGHT_BROWSERS_PATH: "0",
  };
  viteProcess = spawn(process.execPath, [
    path.join(ROOT, "node_modules/vite/bin/vite.js"),
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

test("인증 후 런타임 오류와 비-loopback 요청이 없다", () => {
  assert.deepEqual(runtimeErrors, []);
  assert.ok([...blockedExternalOrigins].every((origin) => origin.startsWith("https://")), "외부 요청은 모두 loopback 차단 경계에서 중단되어야 합니다.");
});
