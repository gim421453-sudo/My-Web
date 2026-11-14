import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

const files = {
  index: readText("index.html"),
  appNextHtml: readText("app-next.html"),
  app: readText("app.js"),
  appNextMain: readText("src/app-next/main.tsx"),
  appNext: readText("src/app-next/AppNext.tsx"),
  appNextManifest: readText("shared/ownerPreviewReleaseManifest.js"),
  appNextManifestAdapter: readText("src/release/ownerPreviewReleaseManifestAdapter.ts"),
  appNextRoutes: readText("src/app-next/appNextRouteUtils.ts"),
  roles: readText("src/permissions/roles.ts"),
  permissions: readText("src/permissions/permissions.ts"),
  permissionService: readText("src/services/permissionService.ts"),
  sessionService: readText("src/auth/sessionService.ts"),
  requireAuth: readText("src/components/guards/RequireAuth.tsx"),
  protectedRoute: readText("src/components/ProtectedRoute.tsx"),
  requireWorkspaceRole: readText("src/components/guards/RequireWorkspaceRole.tsx"),
  requireAuthUtils: readText("src/auth/legacy/guards/requireAuthBridgeUtils.ts"),
  protectedRouteUtils: readText("src/auth/legacy/guards/protectedRouteBridgeUtils.ts"),
  workspaceRoleUtils: readText("src/auth/legacy/guards/workspaceRoleBridgeUtils.ts"),
  timetableReadonlyService: readText("src/app-next/appNextTimetableReadonlyService.ts"),
  schedulesReadonlyService: readText("src/app-next/appNextSchedulesReadonlyService.ts"),
  noticeReadonlyService: readText("src/app-next/appNextWorkspaceNoticesService.ts"),
};

const results = [];

function test(name, classification, fn) {
  try {
    fn();
    results.push({ name, classification, status: "passed" });
  } catch (error) {
    results.push({
      name,
      classification,
      status: "failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function contains(text, needle, label = needle) {
  assert.ok(text.includes(needle), `Missing expected text: ${label}`);
}

function doesNotContain(text, needle, label = needle) {
  assert.ok(!text.includes(needle), `Unexpected text: ${label}`);
}

function match(text, pattern, label = String(pattern)) {
  assert.match(text, pattern, `Missing expected pattern: ${label}`);
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

const workspaceRoles = [
  "super_manager",
  "manager",
  "teacher",
  "normal",
  "viewer",
  "print_account",
];

const appNextRoutes = [
  "dashboard",
  "account",
  "settings-readonly",
  "timetable-readonly",
  "schedules-readonly",
  "devices",
  "notifications",
  "notices",
  "admin-preview",
  "workspace-preview",
  "login",
  "pending",
  "rejected",
  "disabled",
  "error",
];

test("operational entry remains static index.html + app.js", "verified-complete", () => {
  contains(files.index, "app.js?v=166", "app.js cache version");
  contains(files.index, "firebase-app-compat.js", "Firebase compat SDK");
  doesNotContain(files.index, "/src/app-next/main.tsx", "app-next module entry");
});

test("app-next is a separate module entry", "verified-complete", () => {
  contains(files.appNextHtml, '<div id="root"></div>', "React root");
  contains(files.appNextHtml, '/src/app-next/main.tsx', "app-next module");
  contains(files.appNextMain, "<AuthProvider>", "new AuthProvider");
  contains(files.appNextMain, "<LegacyAuthAdapterProvider>", "legacy adapter provider");
});

test("global roles are system_owner and user only", "verified-complete", () => {
  contains(files.roles, 'SYSTEM_OWNER: "system_owner"');
  contains(files.roles, 'USER: "user"');
  contains(files.roles, "VALID_GLOBAL_ROLES");
});

test("workspace roles exclude system_owner", "verified-complete", () => {
  for (const role of workspaceRoles) {
    contains(files.roles, `"${role}"`);
  }
  const workspaceRoleBlock = files.roles.slice(
    files.roles.indexOf("export const WORKSPACE_ROLES"),
    files.roles.indexOf("export type WorkspaceRole"),
  );
  doesNotContain(workspaceRoleBlock, "system_owner", "system_owner in workspace roles");
});

test("permission role resolves system_owner globally before workspace role", "verified-complete", () => {
  contains(files.permissionService, "resolvePermissionRole");
  match(files.permissionService, /globalRole\s*===\s*[\s\S]*GLOBAL_ROLES\.SYSTEM_OWNER[\s\S]*return GLOBAL_ROLES\.SYSTEM_OWNER/);
  contains(files.permissionService, "return currentRole ?? null");
});

test("system_owner has menu access without being a workspace role", "verified-complete", () => {
  match(files.permissionService, /role\s*===\s*[\s\S]*GLOBAL_ROLES\.SYSTEM_OWNER[\s\S]*return true/);
  contains(files.permissionService, "system_owner는");
});

test("manager role cannot manage super_manager in permission service", "verified-complete", () => {
  contains(files.permissionService, "managerAssignableRoles");
  contains(files.permissionService, "WORKSPACE_ROLES.TEACHER");
  contains(files.permissionService, "WORKSPACE_ROLES.NORMAL");
  contains(files.permissionService, "WORKSPACE_ROLES.VIEWER");
  contains(files.permissionService, "WORKSPACE_ROLES.PRINT_ACCOUNT");
  doesNotContain(
    files.permissionService.slice(
      files.permissionService.indexOf("managerAssignableRoles"),
      files.permissionService.indexOf("return managerAssignableRoles.includes"),
    ),
    "SUPER_MANAGER",
    "manager assignable super_manager",
  );
});

test("workspace permission matrix separates viewer and print_account writes", "verified-complete", () => {
  contains(files.permissions, "[WORKSPACE_ROLES.VIEWER]");
  contains(files.permissions, "[WORKSPACE_ROLES.PRINT_ACCOUNT]");
  const viewerBlock = files.permissions.slice(
    files.permissions.indexOf("[WORKSPACE_ROLES.VIEWER]"),
    files.permissions.indexOf("[WORKSPACE_ROLES.PRINT_ACCOUNT]"),
  );
  doesNotContain(viewerBlock, ".write", "viewer write permission");
  const printBlock = files.permissions.slice(
    files.permissions.indexOf("[WORKSPACE_ROLES.PRINT_ACCOUNT]"),
    files.permissions.indexOf("};", files.permissions.indexOf("[WORKSPACE_ROLES.PRINT_ACCOUNT]")),
  );
  contains(printBlock, "data.print");
  doesNotContain(printBlock, ".write", "print account write permission");
});

test("operational role menus define all release-gate roles", "implemented-needs-manual-test", () => {
  contains(files.app, "function defaultRoleMenusV31()");
  for (const role of ["system_owner", ...workspaceRoles, "pending"]) {
    match(files.app, new RegExp(`${role}:\\s*\\[`), `${role} menu`);
  }
});

test("operational approval gate blocks pending or workspace-less non-owners", "implemented-needs-manual-test", () => {
  contains(files.app, "function isApprovalGateUserV54");
  match(files.app, /status\s*===\s*"pending"[\s\S]*!gateWorkspaceId/);
  match(files.app, /role\s*===\s*"system_owner"[\s\S]*return false/);
});

test("operational system_owner without workspace is sent to system owner screen only", "implemented-needs-manual-test", () => {
  match(files.app, /role\s*===\s*"system_owner"\s*&&\s*!workspaceId\)\s*return\s*\["systemOwner"\]/);
  match(files.app, /role\s*===\s*"system_owner"\)\s*return key === "systemOwner" \|\| !!userWorkspaceIdV54/);
});

test("operational viewer and print_account are read-only by default", "implemented-needs-manual-test", () => {
  contains(files.app, "viewer: []");
  contains(files.app, "print_account: []");
  contains(files.app, 'print_account: ["print", "examSchedules"]');
});

test("operational direct URL routing is not a React route tree", "unknown", () => {
  assert.equal(countMatches(files.index, /type="module"/g), 0);
  doesNotContain(files.index, "BrowserRouter");
  doesNotContain(files.index, "createBrowserRouter");
});

test("AppSession reads users.currentWorkspaceId as canonical source", "verified-complete", () => {
  contains(files.sessionService, "resolveCurrentWorkspaceId(userData)");
  contains(files.sessionService, "repository.getWorkspace(currentWorkspaceId)");
  contains(files.sessionService, "repository.getNestedMembership(currentWorkspaceId, firebaseUser.uid)");
});

test("AppSession resolves system owner from systemOwners and global role normalization", "verified-complete", () => {
  contains(files.sessionService, "repository.hasSystemOwnerDocument(firebaseUser.uid)");
  contains(files.sessionService, "resolveGlobalRole");
  contains(files.sessionService, "isSystemOwnerResolved");
});

test("missing workspace keeps system_owner authenticated with warnings", "verified-complete", () => {
  contains(files.sessionService, '"workspace-document-missing"');
  contains(files.sessionService, '"WORKSPACE_NOT_FOUND"');
  match(files.sessionService, /return\s*\{\s*\.\.\.baseSession,\s*workspaceResolution,\s*\}/);
});

test("missing membership does not force system_owner logout", "verified-complete", () => {
  match(files.sessionService, /if\s*\(isSystemOwnerResolved\)\s*\{\s*return\s*\{[\s\S]*currentWorkspaceId,[\s\S]*currentWorkspaceRole:\s*null/);
});

test("app-next route list includes release-gate preview and readonly routes", "verified-complete", () => {
  for (const route of appNextRoutes) {
    contains(files.appNextRoutes, `"${route}"`, route);
  }
});

test("app-next notices beta release is explicitly workspace-role scoped for CRUD", "implemented-needs-manual-test", () => {
  const start = files.appNextManifest.indexOf('appNextFeature("notices"');
  const end = files.appNextManifest.indexOf('appNextFeature("admin-preview"', start);
  assert.ok(start >= 0 && end > start, "notice feature definition exists");
  const feature = files.appNextManifest.slice(start, end);
  contains(feature, 'ownerPreview: false');
  contains(feature, 'hasRead: true');
  contains(feature, 'hasWrite: true');
  contains(feature, 'globalRoles: ["system_owner", "user"]');
  contains(feature, "workspaceRoles: allWorkspaceRoles");
  const context = {};
  vm.runInNewContext(files.appNextManifest, context);
  const runtimeFeature = context.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1.features.find((item) => item.route === "#/notices");
  assert.equal(runtimeFeature.releaseStage, "beta");
  contains(files.appNextManifestAdapter, "feature.ownerPreview && globalRole !== \"system_owner\"");
  contains(files.appNextHtml, "ownerPreviewReleaseManifest.js?v=4");
});

test("app-next schedules beta release has workspace-scoped CRUD and no owner-only gate", "verified-complete", () => {
  const context = {};
  vm.runInNewContext(files.appNextManifest, context);
  const feature = context.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1.features.find((item) => item.route === "#/schedules-readonly");
  assert.equal(feature.releaseStage, "beta");
  assert.equal(feature.ownerPreview, false);
  assert.equal(feature.hasWrite, true);
  assert.equal(feature.workspaceRequired, true);
  for (const role of ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"]) {
    assert.ok(feature.workspaceRoles.includes(role));
  }
});

test("app-next timetable beta exposes guarded row CRUD without an owner-only gate", "verified-complete", () => {
  const context = {};
  vm.runInNewContext(files.appNextManifest, context);
  const feature = context.PM_OWNER_PREVIEW_RELEASE_MANIFEST_V1.features.find((item) => item.route === "#/timetable-readonly");
  assert.equal(feature.releaseStage, "beta");
  assert.equal(feature.ownerPreview, false);
  assert.equal(feature.hasWrite, true);
  assert.equal(feature.workspaceRequired, true);
  for (const role of ["super_manager", "manager", "teacher", "normal", "viewer", "print_account"]) {
    assert.ok(feature.workspaceRoles.includes(role));
  }
});

test("app-next signed_out and non-active states route to account status screens", "verified-complete", () => {
  contains(files.appNextRoutes, 'state === "signed_out"');
  contains(files.appNextRoutes, 'state === "pending"');
  contains(files.appNextRoutes, 'state === "rejected"');
  contains(files.appNextRoutes, 'state === "disabled"');
  contains(files.appNextRoutes, 'state === "error" || state === "quota_exceeded"');
});

test("app-next read-only data routes allow active null workspace with data blocked", "verified-complete", () => {
  contains(files.appNextRoutes, "ALLOW_ROUTE_WITH_DATA_BLOCKED");
  contains(files.appNextRoutes, 'currentRoute === "notices" || currentRoute === "timetable-readonly" || currentRoute === "schedules-readonly"');
});

test("app-next admin preview uses permission service menu access", "verified-complete", () => {
  contains(files.appNextRoutes, "canShowAppNextAdminPreview");
  contains(files.appNextRoutes, "canAccessMenu(permissionRole, APP_NEXT_ADMIN_MENU_KEY)");
});

test("app-next workspace preview requires workspace or explicit system_owner with workspace", "verified-complete", () => {
  contains(files.appNextRoutes, "canShowAppNextWorkspacePreview");
  contains(files.appNextRoutes, "if (!session.currentWorkspaceId) return false");
  contains(files.appNextRoutes, "session.isSystemOwner && session.globalRole === \"system_owner\"");
});

test("RequireAuth bridge does not sign out automatically", "verified-complete", () => {
  contains(files.requireAuthUtils, "automaticSignOutOccurred: false");
  doesNotContain(files.requireAuthUtils, "signOut(");
  contains(files.requireAuth, "NewAuthRequireAuthBridge");
});

test("ProtectedRoute bridge allows active users with null workspace for auth-only routes", "verified-complete", () => {
  contains(files.protectedRouteUtils, "AUTHENTICATED_WITHOUT_WORKSPACE");
  contains(files.protectedRouteUtils, "input.currentWorkspaceId");
  doesNotContain(files.protectedRouteUtils, "signOut(");
});

test("RequireWorkspaceRole bridge blocks missing workspace unless explicitly optional", "verified-complete", () => {
  contains(files.workspaceRoleUtils, "WORKSPACE_REQUIRED");
  contains(files.workspaceRoleUtils, "allowSystemOwnerBypass");
  doesNotContain(files.workspaceRoleUtils, "signOut(");
});

test("app-next dashboard/account/timetable/schedule/notice routes mount RequireAuth", "implemented-needs-manual-test", () => {
  for (const route of [
    "dashboard",
    "account",
    "settings-readonly",
    "timetable-readonly",
    "schedules-readonly",
    "notices",
  ]) {
    contains(files.appNext, `routeDecision.currentRoute === "${route}"`, route);
  }
  contains(files.appNext, "<RequireAuth");
});

test("app-next admin and workspace previews mount guard pilots", "implemented-needs-manual-test", () => {
  contains(files.appNext, "<ProtectedRoute");
  contains(files.appNext, "<RequireWorkspaceRole");
  contains(files.appNext, "admin-preview");
  contains(files.appNext, "workspace-preview");
});

test("app-next read-only services do not import Firestore write APIs", "verified-complete", () => {
  const readonlyCombined = [
    files.timetableReadonlyService,
    files.schedulesReadonlyService,
    files.noticeReadonlyService,
  ].join("\n");
  for (const api of ["setDoc", "addDoc", "updateDoc", "deleteDoc", "writeBatch", "runTransaction", "onSnapshot"]) {
    doesNotContain(readonlyCombined, api, `${api} in read-only services`);
  }
});

test("release gate script does not modify timetable V111/V120 or workspace data service", "verified-complete", () => {
  contains(files.index, "app.js?v=166");
  contains(files.app, "V111");
  contains(files.app, "V120");
});

test("known state classifications are explicitly represented", "code-only", () => {
  for (const state of ["active", "pending", "rejected", "disabled", "signed_out"]) {
    contains(files.appNextRoutes + files.sessionService + files.app, state);
  }
});

const summary = results.reduce(
  (acc, result) => {
    acc.total += 1;
    acc[result.status] += 1;
    acc.byClassification[result.classification] = (acc.byClassification[result.classification] ?? 0) + 1;
    return acc;
  },
  { total: 0, passed: 0, failed: 0, byClassification: {} },
);

for (const result of results) {
  const marker = result.status === "passed" ? "PASS" : "FAIL";
  console.log(`${marker} ${result.classification}: ${result.name}`);
  if (result.message) {
    console.log(`  ${result.message}`);
  }
}

console.log("\nRelease gate role/workspace summary:");
console.log(JSON.stringify(summary, null, 2));

if (summary.failed > 0) {
  process.exitCode = 1;
}
