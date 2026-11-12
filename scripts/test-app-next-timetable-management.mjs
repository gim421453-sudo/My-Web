import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const utilsFile = path.join(root, "src/app-next/appNextTimetableManagementUtils.ts");
const utilsModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(utilsFile, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { module: utilsModule, exports: utilsModule.exports });
const utils = utilsModule.exports;

function makeHarness() {
  const cache = new Map();
  const data = new Map([
    ["workspaces/ws", { operationMode: "academy" }],
    ["workspaces/ws/settings/app", {}],
    ["workspaces/ws/timetableSets/set-a", { id: "set-a", name: "일반 시간표", kind: "general", visiblePeriodCount: 1, startDate: "2026-11-01", workspaceId: "ws" }],
    ["workspaces/ws/periodTimes/p1", { id: "p1", timetableSetId: "set-a", period: "1교시", start: "09:00", end: "09:50" }],
  ]);
  const writes = [];
  let beforeNextTransaction = null;
  const ref = (value) => ({ path: value, id: value.split("/").at(-1) });
  const snap = (r) => ({ id: r.id, exists: () => data.has(r.path), data: () => data.get(r.path), metadata: { fromCache: false, hasPendingWrites: false } });
  const sdk = {
    collection: (_db, ...parts) => ref(parts.join("/")),
    doc: (_db, ...parts) => parts.length === 1 ? ref(`${parts[0].path}/generated-${Math.random().toString(36).slice(2)}`) : ref(parts.join("/")),
    serverTimestamp: () => "server-time",
    getDocFromServer: async (r) => snap(r),
    getDocsFromServer: async (r) => ({ metadata: { fromCache: false, hasPendingWrites: false }, docs: [...data.keys()]
      .filter((key) => key.startsWith(`${r.path}/`) && key.split("/").length === r.path.split("/").length + 1).map((key) => snap(ref(key))) }),
    runTransaction: async (_db, callback) => {
      if (beforeNextTransaction) { const hook = beforeNextTransaction; beforeNextTransaction = null; hook(); }
      const staged = [];
      const tx = { get: async (r) => r.path.endsWith("/timetable")
        ? { docs: [...data.keys()].filter((key) => key.startsWith(`${r.path}/`) && key.split("/").length === r.path.split("/").length + 1).map((key) => snap(ref(key))) }
        : snap(r), set: (r, v) => staged.push(["set", r, v]), update: (r, v) => staged.push(["update", r, v]), delete: (r) => staged.push(["delete", r]) };
      const result = await callback(tx);
      for (const [type, r, value] of staged) {
        writes.push([type, r.path]);
        if (type === "set") data.set(r.path, value);
        else if (type === "update") data.set(r.path, { ...data.get(r.path), ...value });
        else data.delete(r.path);
      }
      return result;
    },
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const filename = path.resolve(root, file);
    const module = { exports: {} };
    const imports = (request) => request === "firebase/firestore" ? sdk
      : request.endsWith("firebaseProvider") ? { getFirebaseDb: () => ({}) }
        : request.endsWith("RowCrudUtils") ? load("src/app-next/appNextTimetableRowCrudUtils.ts")
          : request.endsWith("ReadonlyUtils") ? load("src/app-next/appNextTimetableReadonlyUtils.ts")
          : request.endsWith("ManagementUtils") ? utils : {};
    vm.runInNewContext(ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
      { module, exports: module.exports, require: imports });
    cache.set(file, module.exports); return module.exports;
  }
  return { service: load("src/app-next/appNextTimetableManagementService.ts"), data, writes,
    beforeTransaction(hook) { beforeNextTransaction = hook; } };
}

const session = { uid: "actor", status: "active", currentWorkspaceId: "ws", currentWorkspaceRole: "manager", globalRole: "user", isSystemOwner: false };
const context = { phase: "authenticated", session, workspaceId: "ws", operationMode: "academy" };
const results = [];
function test(name, run) { results.push([name, run]); }

test("권한은 활성 manager와 workspace, 알려진 비학교 모드에서만 허용한다", () => {
  for (const role of ["viewer", "print_account", "teacher", "normal"]) {
    assert.equal(utils.timetableManagementPolicy({ ...context, session: { ...session, currentWorkspaceRole: role } }).canManage, false);
  }
  assert.equal(utils.timetableManagementPolicy({ ...context, operationMode: "school" }).canManage, false);
  assert.equal(utils.timetableManagementPolicy({ ...context, workspaceId: "other" }).canManage, false);
  assert.equal(utils.timetableManagementPolicy({ ...context, session: { ...session, status: "disabled" } }).canManage, false);
  assert.equal(utils.timetableManagementPolicy({ ...context, session: { ...session, isSystemOwner: true, globalRole: "system_owner", currentWorkspaceRole: "viewer" } }).canManage, true);
});
test("세트 날짜와 lifecycle을 안전하게 판정한다", () => {
  const draft = { name: "가을", kind: "general", startDate: "2026-09-01", endDate: "", memo: "" };
  assert.equal(utils.validateTimetableSetDraft(draft), null);
  assert.equal(utils.validateTimetableSetDraft({ ...draft, endDate: "2026-08-01" }), "date-range-invalid");
  assert.equal(utils.validateTimetableSetDraft({ ...draft, startDate: "2026-02-30" }), "date-range-invalid");
  assert.equal(utils.timetableLifecycle({ status: "archived" }), "archived");
  assert.equal(utils.timetableLifecycle({ startDate: "2026-12-01" }, new Date("2026-11-12T00:00:00Z")), "scheduled");
  assert.equal(utils.timetableLifecycle({ endDate: "2026-11-11" }, new Date("2026-11-12T00:00:00Z")), "ended");
});
test("교시 입력은 유효한 시각·고유 번호·겹치지 않는 구간만 허용한다", () => {
  const periods = [{ period: 1, start: "09:00", end: "09:50" }];
  assert.equal(utils.validatePeriodDraft({ period: 2, start: "09:45", end: "10:30" }, periods), "period-time-overlap");
  assert.equal(utils.validatePeriodDraft({ period: 1, start: "10:00", end: "10:30" }, periods), "period-duplicate");
  assert.equal(utils.validatePeriodDraft({ period: 2, start: "12:00", end: "11:00" }, periods), "period-time-invalid");
  assert.equal(utils.validatePeriodDraft({ period: 2, start: "10:00", end: "10:50" }, periods), null);
});
test("세트 생성은 고유 이름, metadata 및 서버 목록 확인 후 반환한다", async () => {
  const h = makeHarness();
  const result = await h.service.createAppNextTimetableSet({ ...context, name: "새 시간표", kind: "general", startDate: "2026-11-12", endDate: "", memo: "" });
  const created = h.data.get(`workspaces/ws/timetableSets/${result.id}`);
  assert.equal(created.name, "새 시간표"); assert.equal(created.status, "active"); assert.equal(created.createdByUid, "actor");
  assert.equal(h.writes.length, 1);
  await assert.rejects(h.service.createAppNextTimetableSet({ ...context, name: "새 시간표", kind: "general", startDate: "2026-11-12", endDate: "", memo: "" }), { code: "set-name-duplicate" });
});
test("세트 lifecycle은 row를 보존하며 상태를 서버 확인한다", async () => {
  const h = makeHarness(); h.data.set("workspaces/ws/timetable/row-1", { id: "row-1", setId: "set-a", period: "1교시", subject: "수학" });
  await h.service.changeAppNextTimetableSetLifecycle({ ...context, setId: "set-a", action: "archive" });
  assert.equal(h.data.get("workspaces/ws/timetableSets/set-a").archived, true);
  assert.equal(h.data.get("workspaces/ws/timetable/row-1").subject, "수학");
  await h.service.changeAppNextTimetableSetLifecycle({ ...context, setId: "set-a", action: "unarchive" });
  assert.equal(h.data.get("workspaces/ws/timetableSets/set-a").archived, false);
});
test("교시 삭제는 legacy 임의 ID writer 경쟁 상태를 막기 위해 fail closed 하며 데이터를 보존한다", async () => {
  const h = makeHarness();
  await h.service.saveAppNextTimetablePeriod({ ...context, setId: "set-a", draft: { period: 2, start: "10:00", end: "10:50" } });
  const legacyRowPath = "workspaces/ws/timetable/legacy-arbitrary-id";
  h.data.set(legacyRowPath, { id: "legacy-arbitrary-id", setId: "set-a", day: "화", period: "2교시", subject: "보존할 legacy 수업" });
  const writesBeforeDeleteAttempt = h.writes.length;
  await assert.rejects(h.service.deleteAppNextTimetablePeriod({ ...context, setId: "set-a", period: 2 }), { code: "period-delete-blocked" });
  assert.equal(h.data.get(legacyRowPath).subject, "보존할 legacy 수업");
  assert.equal(h.data.has("workspaces/ws/periodTimes/periodTime_set-a_02"), true);
  assert.equal(h.data.get("workspaces/ws/timetableSets/set-a").visiblePeriodCount, 2);
  assert.equal(h.writes.length, writesBeforeDeleteAttempt);
});

for (const [name, run] of results) { await run(); console.log(`PASS ${name}`); }
console.log(`${results.length}/${results.length} timetable management tests passed`);
