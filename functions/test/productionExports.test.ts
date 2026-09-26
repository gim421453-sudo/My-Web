import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import * as productionExports from "../src/index.js";
import { verifyActorFromRequest } from "../src/auth/verifiedActor.js";

const exportNames = Object.keys(productionExports);
const sourceEntry = readFileSync(new URL("../../src/index.ts", import.meta.url), "utf8");
const compiledEntry = readFileSync(new URL("../src/index.js", import.meta.url), "utf8");

test("production entry exports trustedBackendHealth", () => {
  assert.equal(typeof productionExports.trustedBackendHealth, "function");
});

test("production entry excludes actor probe", () => {
  assert.equal(exportNames.includes("trustedBackendActorProbe"), false);
});

test("production entry excludes verified-email probe", () => {
  assert.equal(exportNames.includes("trustedBackendVerifiedEmailProbe"), false);
});

test("P0-1 foundation adds no production operation export", () => {
  assert.deepEqual(exportNames, ["trustedBackendHealth"]);
});

test("P0-2 admin application cores are not production exports", () => {
  assert.equal(exportNames.includes("trustedCreateAdminApplication"), false);
  assert.equal(exportNames.includes("trustedApproveAdminApplication"), false);
  assert.equal(exportNames.includes("trustedRejectAdminApplication"), false);
});

test("P0-3 invitation cores are not production exports", () => {
  assert.equal(exportNames.includes("trustedCreateInvitation"), false);
  assert.equal(exportNames.includes("trustedRevokeInvitation"), false);
  assert.equal(exportNames.includes("trustedRedeemInvitation"), false);
});

test("P0-3B legacy classifier and migration dry-run are not production exports", () => {
  assert.equal(exportNames.some((name) => /LegacyInvitation|Migration/i.test(name)), false);
});

test("P0-5B1 workspace member operations are not production exports", () => {
  assert.equal(exportNames.some((name) => /trusted(Update|Set|Remove)WorkspaceMember/.test(name)), false);
  assert.doesNotMatch(sourceEntry, /trusted(Update|Set|Remove)WorkspaceMember/);
});

test("P0-5B2 account and workspace lifecycle cores are not production exports", () => {
  assert.equal(exportNames.some((name) => /trusted(Disable|Enable|Delete)UserAccount/.test(name)), false);
  assert.equal(exportNames.some((name) => /trusted(ApproveWorkspaceBootstrap|SetWorkspaceLifecycle)/.test(name)), false);
  assert.doesNotMatch(sourceEntry, /trusted(Disable|Enable|Delete)UserAccount/);
  assert.doesNotMatch(sourceEntry, /trusted(ApproveWorkspaceBootstrap|SetWorkspaceLifecycle)/);
});

test("P0-6B operation mode and management read cores are not production exports", () => {
  assert.equal(exportNames.includes("trustedSetWorkspaceOperationMode"), false);
  assert.equal(exportNames.some((name) => name.startsWith("trustedList")), false);
  assert.doesNotMatch(sourceEntry, /trustedSetWorkspaceOperationMode|trustedList/);
});

for (const forbidden of ["Probe", "Debug", "Dev", "Test"]) {
  test(`production exports contain no ${forbidden} symbol`, () => {
    assert.equal(exportNames.some((name) => name.includes(forbidden)), false);
  });
}

test("source and compiled production entries contain no probe registration", () => {
  assert.doesNotMatch(sourceEntry, /verifiedActorProbe|trustedBackendActorProbe|trustedBackendVerifiedEmailProbe/);
  assert.doesNotMatch(compiledEntry, /verifiedActorProbe|trustedBackendActorProbe|trustedBackendVerifiedEmailProbe/);
});

test("clean build removes the deployable probe wrapper artifact", () => {
  assert.equal(existsSync(new URL("../src/auth/verifiedActorProbe.js", import.meta.url)), false);
});

test("VerifiedActor core remains directly importable by the test harness", () => {
  assert.equal(typeof verifyActorFromRequest, "function");
});
