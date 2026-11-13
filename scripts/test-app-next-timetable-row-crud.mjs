import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function pureLoader(file) {
  const filename = path.resolve(root, file);
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    module, exports: module.exports, require: (request) => pureLoader(path.resolve(path.dirname(filename), `${request}.ts`)),
  });
  return module.exports;
}

export function timetableRowCrudTests(load = pureLoader, projectRoot = root) {
  const utils = load("src/app-next/appNextTimetableRowCrudUtils.ts");
  const readUtils = load("src/app-next/appNextTimetableReadonlyUtils.ts");
  const draft = { subject: "수학", teacher: "선생님", room: "교실", memo: "메모" };
  const input = (role = "manager") => ({ phase: "authenticated", workspaceId: "ws", setId: "set-a", day: "월", period: "1교시", ...draft,
    session: { uid: "actor", status: "active", currentWorkspaceId: "ws", currentWorkspaceRole: role,
      globalRole: role === "system_owner" ? "system_owner" : "user", isSystemOwner: role === "system_owner" } });
  const rowPath = "workspaces/ws/timetable/";
  function harness() {
    const data = new Map([
      ["workspaces/ws", { operationMode: "academy" }], ["workspaces/ws/settings/app", {}],
      ["workspaces/ws/timetableSets/set-a", { name: "일반 시간표", kind: "general", visiblePeriodCount: 2 }],
      ["workspaces/ws/periodTimes/p1", { period: "1교시", start: "09:00", end: "09:50" }],
    ]);
    const writes = []; const reads = []; const control = { confirmation: "", keepDeleted: false };
    const ref = (value) => ({ path: value, id: value.split("/").at(-1) });
    const snapshot = (reference, confirmation = false) => {
      let value = data.get(reference.path);
      if (confirmation && writes.length && reference.path.startsWith(rowPath)) {
        if (control.confirmation === "unavailable") throw Object.assign(new Error("private transport detail"), { code: "firestore/unavailable" });
        if (control.confirmation === "mismatch" && value) value = { ...value, subject: "different" };
      }
      return { id: reference.id, ref: reference, exists: () => value !== undefined, data: () => value,
        metadata: { fromCache: false, hasPendingWrites: false } };
    };
    let queue = Promise.resolve();
    const sdk = {
      collection: (_db, ...parts) => ref(parts.join("/")), doc: (_db, ...parts) => ref(parts.join("/")), serverTimestamp: () => "server-time",
      getDocFromServer: async (reference) => { reads.push(reference.path); return snapshot(reference, true); },
      getDocsFromServer: async (reference) => ({ docs: [...data.keys()].filter((key) => key.startsWith(`${reference.path}/`)
        && key.split("/").length === reference.path.split("/").length + 1).map((key) => snapshot(ref(key))) }),
      runTransaction: (_db, operation) => {
        const task = queue.then(async () => {
          if (control.beforeTransaction) {
            const inject = control.beforeTransaction; control.beforeTransaction = null; inject();
          }
          const staged = [];
          const result = await operation({ get: async (reference) => snapshot(reference),
            set: (reference, value) => staged.push(["create", reference.path, value]),
            update: (reference, value) => staged.push(["update", reference.path, value]),
            delete: (reference) => staged.push(["delete", reference.path]),
          });
          for (const [action, key, value] of staged) {
            writes.push([action, key]);
            if (action === "create") data.set(key, value);
            if (action === "update") data.set(key, { ...data.get(key), ...value });
            if (action === "delete" && !control.keepDeleted) data.delete(key);
          }
          return result;
        });
        queue = task.catch(() => undefined); return task;
      },
    };
    const module = { exports: {} };
    const serviceSource = readFileSync(path.join(projectRoot, "src/app-next/appNextTimetableRowCrudService.ts"), "utf8");
    vm.runInNewContext(ts.transpileModule(serviceSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
      module, exports: module.exports, require: (request) => request === "firebase/firestore" ? sdk
        : request.endsWith("firebaseProvider") ? { getFirebaseDb: () => ({}) }
          : request.endsWith("ReadonlyUtils") ? readUtils : utils,
    });
    return { service: module.exports, data, writes, reads, control };
  }
  return [
    ["timetable role policy intersects Rules with operational school scope", () => {
      for (const mode of ["school", "academy", "personal", "unknown"]) for (const role of ["system_owner", "super_manager", "manager", "teacher", "normal", "viewer", "print_account"]) {
        const policy = utils.timetableRowWritePolicy({ ...input(role), operationMode: mode });
        const privileged = ["system_owner", "super_manager"].includes(role);
        const writer = privileged || (mode !== "unknown" && (role === "normal" || (mode !== "school" && ["manager", "teacher"].includes(role))));
        assert.equal(policy.canCreate, writer, `${mode}:${role}`); assert.equal(policy.canUpdate, writer);
        assert.equal(policy.canDelete, privileged || (writer && role === "manager"));
      }
      for (const status of ["pending", "rejected", "disabled"]) {
        const context = input(); context.session.status = status;
        assert.equal(utils.timetableRowWritePolicy({ ...context, operationMode: "academy" }).canCreate, false);
      }
      const spoof = input("system_owner"); spoof.session.globalRole = "user"; spoof.session.currentWorkspaceRole = "viewer";
      assert.equal(utils.timetableRowWritePolicy({ ...spoof, operationMode: "school" }).canDelete, false);
    }],
    ["timetable set binding and periods reject inferred defaults and conflicting scopes", () => {
      assert.equal(utils.timetableRowBelongsToSet({}, "school"), true);
      assert.equal(utils.timetableRowBelongsToSet({}, "set-a"), false);
      assert.equal(utils.timetableRowBelongsToSet({ setId: "set-a", timetableSetId: "other" }, "set-a"), false);
      assert.equal(utils.activeTimetablePeriods("set-a", {}, []).length, 0);
      const periods = utils.activeTimetablePeriods("set-a", { visiblePeriodCount: 2 }, [
        { period: "1교시", time: "common" }, { setId: "set-a", period: "1교시", time: "specific" },
        { setId: "set-a", period: "2교시", active: false }, { setId: "other", period: "3교시" },
      ]);
      assert.equal(periods.length, 1); assert.equal(periods[0].time, "specific");
      assert.equal(utils.validateTimetableRowDraft({ ...draft, subject: " " }), "수업명을 입력해 주세요.");
    }],
    ["timetable create uses canonical cell id and confirms the row without set or period writes", async () => {
      const h = harness(); const result = await h.service.createAppNextTimetableRow(input());
      const created = h.data.get(rowPath + result.id);
      assert.equal(created.setId, "set-a"); assert.equal(created.period, "1교시"); assert.equal(created.workspace_id, "ws");
      assert.equal(created.programId, undefined); assert.equal(created.time, "09:00-09:50");
      assert.equal(h.reads.at(-1), rowPath + result.id);
      assert.deepEqual(h.writes, [["create", rowPath + result.id]]);
    }],
    ["timetable update preserves unknown fields and legacy binding; delete removes exactly one row", async () => {
      const h = harness();
      const old = { timetableSetId: "set-a", day: "월요일", period: "1교시", subject: "old", legacyExtra: { keep: true }, createdAt: "original" };
      h.data.set(rowPath + "legacy", old); h.data.set(rowPath + "other", { setId: "set-a", day: "화", period: "1교시", subject: "Other" });
      const setBefore = JSON.stringify(h.data.get("workspaces/ws/timetableSets/set-a"));
      const periodBefore = JSON.stringify(h.data.get("workspaces/ws/periodTimes/p1"));
      await h.service.updateAppNextTimetableRow({ ...input(), rowId: "legacy" });
      const updated = h.data.get(rowPath + "legacy");
      assert.deepEqual(updated.legacyExtra, { keep: true }); assert.equal(updated.timetableSetId, "set-a");
      assert.equal(updated.setId, undefined); assert.equal(updated.day, "월요일"); assert.equal(updated.createdAt, "original");
      assert.equal(h.reads.at(-1), rowPath + "legacy");
      await h.service.deleteAppNextTimetableRow({ ...input(), rowId: "legacy" });
      assert.equal(h.data.has(rowPath + "legacy"), false); assert.equal(h.data.has(rowPath + "other"), true);
      assert.equal(JSON.stringify(h.data.get("workspaces/ws/timetableSets/set-a")), setBefore);
      assert.equal(JSON.stringify(h.data.get("workspaces/ws/periodTimes/p1")), periodBefore);
      assert.deepEqual(h.writes.map(([action, key]) => [action, key]), [["update", rowPath + "legacy"], ["delete", rowPath + "legacy"]]);
    }],
    ["timetable duplicate preflight covers legacy rows; concurrent App Next creates cannot duplicate a cell", async () => {
      const h = harness();
      h.data.set(rowPath + "occupied", { scheduleSetId: "set-a", day: "월요일", period: "1교시" });
      await assert.rejects(h.service.createAppNextTimetableRow(input()), { code: "duplicate-cell" });
      assert.equal(h.writes.length, 0);
      const concurrent = harness();
      const results = await Promise.allSettled([concurrent.service.createAppNextTimetableRow(input()), concurrent.service.createAppNextTimetableRow(input())]);
      assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
      assert.equal(results.find((item) => item.status === "rejected").reason.code, "duplicate-cell");
      assert.equal(concurrent.writes.length, 1);
    }],
    ["timetable service fails closed for scope, set, period, inactive and read-only accounts", async () => {
      for (const [change, code] of [[{ workspaceId: "other" }, "workspace-mismatch"], [{ workspaceId: "" }, "workspace-mismatch"],
        [{ setId: "missing" }, "set-invalid"], [{ period: "99교시" }, "period-invalid"]]) {
        const h = harness(); await assert.rejects(h.service.createAppNextTimetableRow({ ...input(), ...change }), { code }); assert.equal(h.writes.length, 0);
      }
      for (const role of ["viewer", "print_account"]) await assert.rejects(harness().service.createAppNextTimetableRow(input(role)), { code: "permission-denied" });
      const h = harness(); h.data.get("workspaces/ws").operationMode = "school";
      await assert.rejects(h.service.createAppNextTimetableRow(input("teacher")), { code: "permission-denied" });
      await assert.rejects(h.service.createAppNextTimetableRow(input("manager")), { code: "permission-denied" });
      const disabled = input(); disabled.session.status = "disabled";
      await assert.rejects(h.service.createAppNextTimetableRow(disabled), { code: "session-invalid" });
      h.data.get("workspaces/ws/timetableSets/set-a").status = "archived";
      await assert.rejects(h.service.createAppNextTimetableRow(input("super_manager")), { code: "set-invalid" });
    }],
    ["timetable program rows inherit canonical set reference and never invent IDs", async () => {
      const h = harness(); h.data.set("workspaces/ws/timetableSets/set-a", { kind: "afterschool", programId: "program-1", visiblePeriodCount: 1 });
      const result = await h.service.createAppNextTimetableRow(input());
      assert.equal(h.data.get(rowPath + result.id).programId, "program-1");
      assert.equal(h.data.get(rowPath + result.id).sourceType, "afterschool");
      const invalid = harness(); invalid.data.set("workspaces/ws/timetableSets/set-a", { kind: "afterschool", name: "Program label", visiblePeriodCount: 1 });
      await assert.rejects(invalid.service.createAppNextTimetableRow(input()), { code: "program-invalid" });
      assert.equal(invalid.writes.length, 0);
    }],
    ["timetable confirmation rejects create/update mismatch, delete presence and network errors", async () => {
      const h = harness(); h.control.confirmation = "mismatch";
      await assert.rejects(h.service.createAppNextTimetableRow(input()), { code: "app-next-write-unconfirmed" });
      await assert.rejects(h.service.updateAppNextTimetableRow({ ...input(), rowId: utils.timetableCellDocumentId(input()) }), { code: "app-next-write-unconfirmed" });
      const retained = harness(); const row = await retained.service.createAppNextTimetableRow(input()); retained.control.keepDeleted = true;
      await assert.rejects(retained.service.deleteAppNextTimetableRow({ ...input(), rowId: row.id }), { code: "app-next-write-unconfirmed" });
      const offline = harness(); offline.control.confirmation = "unavailable";
      await assert.rejects(offline.service.createAppNextTimetableRow(input()), { code: "firestore/unavailable" });
      assert.match(utils.timetableRowErrorMessage({ code: "firestore/unavailable" }), /네트워크/);
      assert.match(utils.timetableRowErrorMessage({ code: "resource-exhausted" }), /한도/);
      assert.match(utils.timetableRowErrorMessage({ code: "app-next-write-unconfirmed", message: "private" }), /서버에서 확인하지 못했습니다/);
      assert.doesNotMatch(utils.timetableRowErrorMessage(new Error("private")), /private/);
    }],
    ["timetable legacy race evidence: a late arbitrary-id writer bypasses the canonical row transaction", async () => {
      const h = harness();
      // Insert after collection preflight, before the transaction reads its canonical row.
      h.control.beforeTransaction = () => h.data.set(rowPath + "legacy-arbitrary-id", {
        ...draft, workspaceId: "ws", setId: "set-a", day: "월", period: "1교시",
      });
      const created = await h.service.createAppNextTimetableRow(input());
      assert.equal(created.id, utils.timetableCellDocumentId(input()));
      const rows = [...h.data.entries()].filter(([key]) => key.startsWith(rowPath))
        .map(([key, data]) => ({ ...data, id: key.split("/").at(-1) }));
      // This passing characterization proves the limitation; it is not a uniqueness guarantee.
      assert.equal(utils.timetableCellRows(rows, input()).length, 2);
      assert.equal(h.writes.length, 1);
    }],
    ["timetable rendering and row service cannot mutate sets, periods or programs", () => {
      const component = readFileSync(path.join(projectRoot, "src/app-next/AppNextTimetableReadOnly.tsx"), "utf8");
      const editor = readFileSync(path.join(projectRoot, "src/app-next/AppNextTimetableRowEditor.tsx"), "utf8");
      const service = readFileSync(path.join(projectRoot, "src/app-next/appNextTimetableRowCrudService.ts"), "utf8");
      assert.doesNotMatch(component, /\b(setDoc|addDoc|deleteDoc|updateDoc|runTransaction)\s*\(/);
      assert.doesNotMatch(service, /transaction\.(set|update|delete)\((setRef|settingsRef|workspaceRef)/);
      assert.doesNotMatch(service, /collection\([^\n]*"(programs|students|attendance)"/);
      assert.match(service, /transaction.update\(rowRef/); assert.match(service, /transaction.delete\(rowRef\)/);
      assert.match(editor, /pending.current = true/); assert.match(editor, /if \(!await onConfirmed\(\)\)/);
      assert.match(component, /RequireWorkspaceRole allowedRoles=\{TIMETABLE_ROW_WRITE_ROLES\}/);
    }],
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const tests = timetableRowCrudTests();
  for (const [name, test] of tests) { await test(); console.log(`PASS ${name}`); }
  console.log(`${tests.length}/${tests.length} timetable row tests passed`);
}
