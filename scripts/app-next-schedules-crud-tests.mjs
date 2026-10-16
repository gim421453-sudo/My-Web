import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

export function scheduleCrudTests(loadTsModule, root) {
  const utils = loadTsModule("src/app-next/appNextScheduleCrudUtils.ts");
  const context = (role = "manager") => ({
    phase: "authenticated", workspaceId: "workspace-a",
    session: { uid: "user-a", status: "active", currentWorkspaceId: "workspace-a", currentWorkspaceRole: role,
      globalRole: role === "system_owner" ? "system_owner" : "user", isSystemOwner: role === "system_owner" },
  });
  const draft = { ...utils.EMPTY_SCHEDULE_DRAFT, title: "Canonical schedule", date: "2026-10-15" };
  const source = readFileSync(path.join(root, "src/app-next/appNextScheduleCrudService.ts"), "utf8");

  // Run the real service with fake SDK calls, without Firebase access or runtime hooks.
  function serviceHarness({ readError, mismatch = false, deleteRetainsDocument = false } = {}) {
    let data;
    let reads = 0;
    const calls = [];
    const sdk = {
      collection: (...parts) => parts.slice(1).join("/"),
      doc: (...parts) => ({ id: parts.length === 1 ? "generated-id" : parts.at(-1), path: parts.length === 1 ? `${parts[0]}/generated-id` : parts.slice(1).join("/") }),
      serverTimestamp: () => "server-timestamp",
      setDoc: async (ref, value) => { calls.push(["create", ref.path]); data = value; },
      updateDoc: async (ref, value) => { calls.push(["update", ref.path]); data = { ...data, ...value }; },
      deleteDoc: async (ref) => { calls.push(["delete", ref.path]); if (!deleteRetainsDocument) data = undefined; },
      getDocFromServer: async () => {
        reads += 1;
        if (readError) throw readError;
        return { exists: () => data !== undefined, data: () => mismatch ? { ...data, title: "different" } : data, metadata: { hasPendingWrites: false } };
      },
    };
    const module = { exports: {} };
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
      module, exports: module.exports,
      require: (request) => request === "firebase/firestore" ? sdk
        : request.endsWith("firebaseProvider") ? { getFirebaseDb: () => ({}) } : utils,
    });
    return { service: module.exports, calls, reads: () => reads, data: () => data };
  }
  return [
    ["schedule CRUD roles match active Rules, with manager-only deletion", () => {
      for (const role of ["system_owner", "super_manager", "manager", "teacher", "normal", "viewer", "print_account"]) {
        const policy = utils.appNextScheduleWritePolicy(context(role));
        assert.equal(policy.canCreate, !["viewer", "print_account"].includes(role), role);
        assert.equal(policy.canUpdate, policy.canCreate, role);
        assert.equal(policy.canDelete, ["system_owner", "super_manager", "manager"].includes(role), role);
      }
      for (const status of ["pending", "rejected", "disabled"]) {
        const input = context(); input.session.status = status;
        assert.equal(utils.appNextScheduleWritePolicy(input).canCreate, false);
      }
      const spoof = context("system_owner"); spoof.session.globalRole = "user"; spoof.session.currentWorkspaceRole = "viewer";
      assert.equal(utils.appNextScheduleWritePolicy(spoof).canCreate, false);
      assert.equal(utils.appNextScheduleWritePolicy({ ...context(), phase: "signed_out" }).canDelete, false);
    }],
    ["schedule draft validates real date, clock range and bounded text", () => {
      assert.equal(utils.validateAppNextScheduleDraft(draft), null);
      for (const change of [{ title: " " }, { title: "x".repeat(121) }, { date: "2026-02-30" }, { date: "" },
        { start_time: "24:00", end_time: "25:00" }, { start_time: "09:00" },
        { start_time: "10:00", end_time: "09:00" }, { memo: "x".repeat(5001) }]) {
        assert.equal(typeof utils.validateAppNextScheduleDraft({ ...draft, ...change }), "string");
      }
      assert.equal(utils.validateAppNextScheduleDraft({ ...draft, start_time: "09:00", end_time: "10:00" }), null);
    }],
    ["schedule legacy records need no marker and alternate schemas are not migrated", () => {
      assert.ok(utils.scheduleManagementRecord("legacy", { ...draft, extra: "preserve" }, "workspace-a"));
      assert.equal(utils.scheduleManagementRecord("mixed", { ...draft, startAt: "2026-10-15T09:00:00Z" }, "workspace-a"), null);
      assert.equal(utils.scheduleManagementRecord("bad", { ...draft, workspace_id: "workspace-b" }, "workspace-a"), null);
      assert.equal(utils.scheduleManagementRecord("hidden", { ...draft, hidden: true }, "workspace-a"), null);
      assert.equal(utils.scheduleMatchesWorkspace({ workspaceId: "workspace-a", workspace_id: "workspace-b" }, "workspace-a"), false);
    }],
    ["schedule real service confirms create/update/delete at the canonical path", async () => {
      const h = serviceHarness();
      const created = await h.service.createAppNextSchedule({ ...context(), ...draft });
      assert.equal(h.reads(), 1);
      assert.equal(h.data().id, created.id);
      assert.equal(h.data().workspace_id, "workspace-a");
      assert.equal(h.data().appNextManaged, undefined);
      await h.service.updateAppNextSchedule({ ...context("teacher"), ...draft, title: "Updated", scheduleId: created.id });
      assert.equal(h.reads(), 3);
      assert.equal(h.data().title, "Updated");
      await h.service.deleteAppNextSchedule({ ...context(), scheduleId: created.id });
      assert.equal(h.reads(), 5);
      assert.equal(h.data(), undefined);
      assert.deepEqual(h.calls, ["create", "update", "delete"].map((action) => [action, "workspaces/workspace-a/schedules/generated-id"]));
    }],
    ["schedule service fails closed before SDK calls and classifies confirmation failures", async () => {
      const h = serviceHarness();
      await assert.rejects(h.service.createAppNextSchedule({ ...context(), ...draft, workspaceId: "workspace-b" }), { code: "workspace-mismatch" });
      await assert.rejects(h.service.createAppNextSchedule({ ...context("viewer"), ...draft }), { code: "permission-denied" });
      await assert.rejects(h.service.deleteAppNextSchedule({ ...context("teacher"), scheduleId: "row" }), { code: "permission-denied" });
      assert.equal(h.calls.length, 0); assert.equal(h.reads(), 0);
      const mismatched = serviceHarness({ mismatch: true });
      await assert.rejects(mismatched.service.createAppNextSchedule({ ...context(), ...draft }), { code: "app-next-write-unconfirmed" });
      await assert.rejects(mismatched.service.updateAppNextSchedule({ ...context(), ...draft, scheduleId: "generated-id" }), { code: "app-next-write-unconfirmed" });
      const retained = serviceHarness({ deleteRetainsDocument: true });
      await retained.service.createAppNextSchedule({ ...context(), ...draft });
      await assert.rejects(retained.service.deleteAppNextSchedule({ ...context(), scheduleId: "generated-id" }), { code: "app-next-write-unconfirmed" });
      const unavailable = Object.assign(new Error("private SDK diagnostic"), { code: "firestore/unavailable" });
      await assert.rejects(serviceHarness({ readError: unavailable }).service.createAppNextSchedule({ ...context(), ...draft }), unavailable);
      assert.match(utils.appNextScheduleWriteErrorMessage(unavailable), /네트워크/);
      assert.match(utils.appNextScheduleWriteErrorMessage({ code: "app-next-write-unconfirmed" }), /서버에서 확인하지 못했습니다/);
      for (const code of ["permission-denied", "session-invalid", "workspace-mismatch", "resource-exhausted", "invalid-argument", "unknown"]) {
        assert.doesNotMatch(utils.appNextScheduleWriteErrorMessage({ code, message: "private SDK diagnostic" }), /private SDK/);
      }
    }],
    ["schedule UI blocks duplicate submits and waits for server list refresh", () => {
      const ui = readFileSync(path.join(root, "src/app-next/AppNextScheduleCrud.tsx"), "utf8");
      assert.match(ui, /if \(inFlight.current \|\| disabled/);
      assert.match(ui, /inFlight.current = true/);
      assert.match(ui, /if \(!await onServerConfirmed\(\)\)/);
      const screen = readFileSync(path.join(root, "src/app-next/AppNextSchedulesReadOnly.tsx"), "utf8");
      assert.match(screen, /RequireWorkspaceRole allowedRoles=\{APP_NEXT_SCHEDULE_WRITE_ROLES\}/);
      assert.match(screen, /if \(forceRefresh && existingRequest\) \{[\s\S]*await existingRequest.catch[\s\S]*return loadSchedules\(true\)/);
    }],
  ];
}
