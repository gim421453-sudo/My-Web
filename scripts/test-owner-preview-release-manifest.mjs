import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function loadManifest() {
  const source = readText("shared/ownerPreviewReleaseManifest.js");
  const sandbox = {
    module: { exports: null },
    exports: {},
    globalThis: {},
    window: {},
    Object,
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, {
    filename: "shared/ownerPreviewReleaseManifest.js",
  });
  return sandbox.module.exports || sandbox.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1;
}

const manifest = loadManifest();
const files = {
  index: readText("index.html"),
  appNextHtml: readText("app-next.html"),
  app: readText("app.js"),
  appNext: readText("src/app-next/AppNext.tsx"),
  adapter: readText("src/release/ownerPreviewReleaseManifestAdapter.ts"),
  timetableReadonlyService: readText("src/app-next/appNextTimetableReadonlyService.ts"),
  schedulesReadonlyService: readText("src/app-next/appNextSchedulesReadonlyService.ts"),
  noticesReadonlyService: readText("src/app-next/appNextWorkspaceNoticesService.ts"),
};

const VALID_STAGES = new Set([
  "stable",
  "beta",
  "internal",
  "hidden",
  "planned",
  "blocked",
]);

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, status: "passed" });
  } catch (error) {
    results.push({
      name,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function decide(feature, {
  globalRole = "user",
  workspaceRole = "normal",
  workspacePresent = true,
} = {}) {
  if (!feature || !feature.enabled) return false;
  if (!["stable", "beta"].includes(feature.releaseStage)) return false;
  if (feature.releaseStage === "beta" && globalRole !== "system_owner") return false;
  const globalRoles = feature.requiredGlobalRoles || feature.globalRoles || [];
  if (!globalRoles.includes("*") && !globalRoles.includes(globalRole) && !globalRoles.includes(workspaceRole)) return false;
  if (feature.workspaceRequired && !workspacePresent && globalRole !== "system_owner") return false;
  const workspaceRoles = feature.requiredWorkspaceRoles || feature.workspaceRoles || [];
  if (workspaceRoles.length && globalRole !== "system_owner" && !workspaceRoles.includes(workspaceRole)) return false;
  return true;
}

function feature(id) {
  return manifest.features.find((item) => item.featureId === id);
}

test("manifest has one owner-preview channel", () => {
  assert.equal(manifest.releaseChannel, "owner-preview");
  assert.equal(manifest.manifestVersion, "owner-preview-v1");
  assert.ok(Array.isArray(manifest.features));
  assert.ok(manifest.features.length >= 53);
});

test("all feature ids are unique", () => {
  const ids = manifest.features.map((item) => item.featureId);
  assert.equal(new Set(ids).size, ids.length);
});

test("all stages are valid", () => {
  for (const item of manifest.features) {
    assert.ok(VALID_STAGES.has(item.releaseStage), `${item.featureId} has invalid stage ${item.releaseStage}`);
  }
});

test("route and page keys do not collide inside a system", () => {
  const keys = manifest.features
    .map((item) => `${item.system}:${item.pageKey || item.route}`)
    .filter((key) => !key.endsWith(":"));
  assert.equal(new Set(keys).size, keys.length);
});

test("stable features have no block reason", () => {
  for (const item of manifest.features.filter((entry) => entry.releaseStage === "stable")) {
    assert.equal(item.blockReason, "", `${item.featureId} should not have blockReason`);
  }
});

test("hidden planned and blocked features have a block reason", () => {
  for (const item of manifest.features.filter((entry) => ["hidden", "planned", "blocked"].includes(entry.releaseStage))) {
    assert.ok(item.blockReason, `${item.featureId} should explain why it is not exposed`);
  }
});

test("first owner preview includes stable and beta owner features only", () => {
  for (const item of manifest.features.filter((entry) => entry.firstOwnerPreviewIncluded)) {
    assert.ok(["stable", "beta"].includes(item.releaseStage), `${item.featureId} has non-preview stage`);
    assert.equal(item.enabled, true);
  }
});

test("system owner can access stable and beta preview features", () => {
  assert.equal(decide(feature("operational.systemOwner"), { globalRole: "system_owner", workspacePresent: false }), true);
  assert.equal(decide(feature("app-next.dashboard"), { globalRole: "system_owner", workspacePresent: false }), true);
  assert.equal(decide(feature("app-next.timetable-readonly"), { globalRole: "system_owner", workspacePresent: false }), true);
});

test("ordinary roles cannot access beta app-next pilot routes", () => {
  assert.equal(decide(feature("app-next.dashboard"), { globalRole: "user", workspaceRole: "normal" }), false);
  assert.equal(decide(feature("app-next.admin-preview"), { globalRole: "user", workspaceRole: "manager" }), false);
});

test("ordinary roles can access stable operational features for their role", () => {
  assert.equal(decide(feature("operational.dashboard"), { globalRole: "user", workspaceRole: "normal" }), true);
  assert.equal(decide(feature("operational.print"), { globalRole: "user", workspaceRole: "print_account" }), true);
});

test("internal hidden planned and blocked are not exposed", () => {
  assert.equal(decide(feature("app-next.workspace-required"), { globalRole: "system_owner" }), false);
  assert.equal(decide(feature("planned.workspace-invitation-links"), { globalRole: "system_owner" }), false);
});

test("operational and app-next entries load the same manifest", () => {
  assert.match(files.index, /shared\/ownerPreviewReleaseManifest\.js\?v=1/);
  assert.match(files.appNextHtml, /shared\/ownerPreviewReleaseManifest\.js\?v=1/);
});

test("operational menu and page keys are gated by manifest", () => {
  assert.match(files.app, /PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1/);
  assert.match(files.app, /authMenuKeysBeforeV122/);
  assert.match(files.app, /renderPageBeforeV122/);
  assert.match(files.app, /ownerPreviewFeatureAccessV122/);
});

test("app-next routes are gated by manifest", () => {
  assert.match(files.appNext, /decideOwnerPreviewFeatureAccess/);
  assert.match(files.appNext, /isReleaseRouteAllowed/);
  assert.match(files.appNext, /Owner Preview access blocked/);
});

test("release diagnostics are privacy safe", () => {
  assert.match(files.app, /PMReleaseManifestDiagnostics/);
  assert.match(files.adapter, /PMReleaseManifestDiagnostics/);
  assert.match(files.adapter, /sensitiveValueDetected: false/);
  assert.doesNotMatch(files.adapter, /uid|email|workspaceId|token|apiKey/i);
});

test("release gating does not add Firestore writes or listeners", () => {
  const combined = [
    files.adapter,
    readText("shared/ownerPreviewReleaseManifest.js"),
  ].join("\n");
  for (const token of ["setDoc", "addDoc", "updateDoc", "deleteDoc", "writeBatch", "runTransaction", "onSnapshot"]) {
    assert.doesNotMatch(combined, new RegExp(`\\b${token}\\b`), `${token} should not be used`);
  }
});

test("read-only pilot services remain write and listener free", () => {
  const combined = [
    files.timetableReadonlyService,
    files.schedulesReadonlyService,
    files.noticesReadonlyService,
  ].join("\n");
  for (const token of ["setDoc", "addDoc", "updateDoc", "deleteDoc", "writeBatch", "runTransaction", "onSnapshot"]) {
    assert.doesNotMatch(combined, new RegExp(`\\b${token}\\b`), `${token} should not be used`);
  }
});

test("manifest contains operational 36 page keys and app-next 17 routes", () => {
  assert.equal(manifest.features.filter((item) => item.system === "operational" && item.pageKey).length, 36);
  assert.equal(manifest.features.filter((item) => item.system === "app-next" && item.route).length, 17);
});

for (const result of results) {
  console.log(`${result.status === "passed" ? "ok" : "not ok"} - ${result.name}`);
  if (result.message) console.log(`  ${result.message}`);
}

const failed = results.filter((result) => result.status === "failed");
console.log(`${results.length - failed.length}/${results.length} owner preview release manifest tests passed.`);
if (failed.length) process.exitCode = 1;
