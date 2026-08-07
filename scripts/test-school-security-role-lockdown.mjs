import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const root = process.cwd();
const policy = require(resolve(root, "shared/roleSecurityPolicy.js"));
const rules = readFileSync(resolve(root, "firestore.rules"), "utf8");
const app = readFileSync(resolve(root, "app.js"), "utf8");
const authService = readFileSync(resolve(root, "services/authService.js"), "utf8");
const adminService = readFileSync(resolve(root, "services/systemAdminService.js"), "utf8");
const invitationService = readFileSync(resolve(root, "services/invitationService.js"), "utf8");
const indexHtml = readFileSync(resolve(root, "index.html"), "utf8");
const operationalSafety = readFileSync(resolve(root, "shared/operationalSafety.js"), "utf8");

let passed = 0;
function test(name, run) {
  run();
  passed += 1;
  console.log(`PASS ${passed}: ${name}`);
}

function functionBody(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `${name} source range is missing`);
  return source.slice(start, end);
}

const selfUpdate = functionBody(rules, "selfUserUpdateAllowed", "adminUserActivationAllowed");
const memberCreate = functionBody(rules, "validMembershipCreate", "validMembershipUpdate");
const memberUpdate = functionBody(rules, "validMembershipUpdate", "inviteHasAllowedFields");
const membershipFields = functionBody(rules, "membershipHasAllowedFields", "membershipHasValidTypes");
const membershipTypes = functionBody(rules, "membershipHasValidTypes", "validMembershipCreate");
const inviteFields = functionBody(rules, "inviteHasAllowedFields", "inviteHasValidTypes");
const inviteTypes = functionBody(rules, "inviteHasValidTypes", "validInviteCreate");
const inviteCreate = functionBody(rules, "validInviteCreate", "validInviteUpdate");
const inviteUpdate = functionBody(rules, "validInviteUpdate", "isWorkspaceManager");
const menuRole = functionBody(app, "effectiveMenuRoleV59", "authMenuKeysV31");
const authBootstrap = functionBody(authService, "firebaseEnsureUserStructureInternal", "firebaseRegisterDevice");
const adminRoleUpdate = functionBody(adminService, "updateUserAdminFields", "repairUserPermission");
const approveJoinRequest = functionBody(adminService, "approveJoinRequest", "rejectJoinRequest");
const ensureOwnerWorkspace = functionBody(adminService, "ensureSystemOwnerWorkspace", "targetUserId");
const disableUser = functionBody(adminService, "disableUserAccount", "enableUserAccount");
const enableUser = functionBody(adminService, "enableUserAccount", "deleteUserFirestoreProfile");
const remoteInvite = functionBody(invitationService, "acceptRemoteInviteCode", "saveRemoteMember");
const remoteInvitePayload = functionBody(invitationService, "remoteInvitePayload", "createInvite");
const legacyRoleWrite = functionBody(app, "syncRemoteMemberRoleV39", "renderAccountsV17");

test("self displayName update is allowlisted", () => assert.match(selfUpdate, /"displayName"/));
for (const field of ["role", "globalRole", "currentRole", "permissions", "extraPermissions", "workspaceId"]) {
  test(`self ${field} update is not allowlisted`, () => assert.doesNotMatch(selfUpdate, new RegExp(`"${field}"`)));
}

for (const role of ["normal", "teacher", "manager", "super_manager"]) {
  test(`self-created ${role} membership is denied by policy`, () => {
    assert.equal(policy.canGrantRole(role, role), false);
    assert.match(memberCreate, /return false/);
  });
}

test("membership without a server-verified approval is denied", () => assert.match(memberCreate, /return false/));
test("expired invitation cannot create membership directly", () => assert.doesNotMatch(remoteInvite, /collection\("members"\)|"members", uid/));
test("used invitation cannot create membership directly", () => assert.doesNotMatch(remoteInvite, /batch\.set\(.*members/));
test("email-mismatched invitation cannot create membership directly", () => assert.match(invitationService, /normalized\.email.*user\.email/));
test("invitation requested role is not activated by the invitee", () => assert.doesNotMatch(remoteInvite, /batch\.set\(userRef/));

for (const role of ["teacher", "normal", "viewer", "print_account"]) {
  test(`manager can grant ${role}`, () => assert.equal(policy.canGrantRole("manager", role), true));
}
for (const role of ["manager", "super_manager"]) {
  test(`manager cannot grant ${role}`, () => assert.equal(policy.canGrantRole("manager", role), false));
}
test("manager cannot grant capability payload", () => {
  assert.deepEqual(policy.forbiddenPayloadKeys({ capabilities: ["grade_manager"] }), ["capabilities"]);
});
test("super_manager can grant manager", () => assert.equal(policy.canGrantRole("super_manager", "manager"), true));
test("super_manager cannot grant super_manager", () => assert.equal(policy.canGrantRole("super_manager", "super_manager"), false));
test("system_owner can grant super_manager", () => assert.equal(policy.canGrantRole("system_owner", "super_manager"), true));
test("teacher cannot change roles", () => assert.equal(policy.assignableRoles("teacher").length, 0));
test("viewer cannot write memberships", () => assert.equal(policy.assignableRoles("viewer").length, 0));
test("print_account cannot write memberships", () => assert.equal(policy.assignableRoles("print_account").length, 0));

test("membership update cannot change workspaceId", () => assert.match(memberUpdate, /"workspaceId"/));
test("membership update cannot change uid", () => assert.match(memberUpdate, /"uid"/));
test("membership capability fields are rejected", () => assert.doesNotMatch(membershipFields, /"capabilities"/));
test("localStorage role cannot affect Rules", () => assert.doesNotMatch(rules, /localStorage|sessionStorage/));
test("users role fallback cannot grant app access", () => assert.doesNotMatch(menuRole, /user\.role|currentRole|globalRole/));
test("workspace menu role comes from the canonical in-memory resolver", () => {
  assert.match(menuRole, /canonicalWorkspaceRoleByUserV160/);
  assert.doesNotMatch(menuRole, /workspace_members|canonicalRoleResolved/);
});
test("system_owner login is resolved from systemOwners", () => {
  assert.match(rules, /documents\/systemOwners\/\$\(request\.auth\.uid\)/);
  assert.doesNotMatch(functionBody(rules, "isSystemOwner", "isWorkspaceMember"), /documents\/users/);
});
test("operational safety does not trust legacy role fields for system owner", () => {
  const safetyOwner = functionBody(operationalSafety, "isSystemOwner", "manifestState");
  assert.match(safetyOwner, /isSystemOwnerResolved/);
  assert.doesNotMatch(safetyOwner, /globalRole|currentRole|\.role/);
});

test("legacy membership collections are read-only", () => {
  assert.match(rules, /match \/workspace_members\/\{memberId\}[\s\S]*?allow create, update, delete: if false/);
  assert.match(rules, /match \/workspaceMembers\/\{memberId\}[\s\S]*?allow create, update, delete: if false/);
});
test("generic workspace writes cannot bypass protected collection rules", () => {
  const genericWorkspaceRule = rules.match(/match \/\{collectionId\}\/\{docId\} \{[\s\S]*?\n\s*\}/)?.[0] || "";
  for (const collectionId of ["members", "inviteCodes", "notices"]) {
    assert.match(genericWorkspaceRule, new RegExp(`"${collectionId}"`));
  }
});
test("auth bootstrap performs canonical read-only role resolution", () => {
  assert.match(authBootstrap, /canonical-session-read-only/);
  assert.doesNotMatch(authBootstrap, /writeBatch|setDoc|workspace_members|workspaceMembers/);
});
test("admin role update writes only canonical nested membership", () => {
  assert.match(adminRoleUpdate, /collection\("members"\)/);
  assert.doesNotMatch(adminRoleUpdate, /collection\("users"\)|collection\("workspace_members"\)/);
});
test("UI and service load the shared role security policy", () => {
  assert.match(indexHtml, /shared\/roleSecurityPolicy\.js\?v=2/);
  assert.match(app, /PMRoleSecurityPolicy\?\.canGrantRole/);
  assert.match(adminService, /PMRoleSecurityPolicy/);
});
test("legacy extraPermissions are not an action authority", () => {
  assert.doesNotMatch(app, /extraPermissions\?\.\[.*\] === true/);
  assert.doesNotMatch(readFileSync(resolve(root, "shared/permissions.js"), "utf8"), /extraPermissions.*=== true/);
});

// P0-01B membership approval gate and field allowlist checks.
test("membership documents use an explicit field allowlist", () => assert.match(membershipFields, /keys\(\)\.hasOnly/));
test("membership updates validate the complete resulting document", () => assert.match(memberUpdate, /membershipHasAllowedFields\(request\.resource\.data\)/));
for (const field of ["isAdmin", "systemOwner", "approved", "permissions", "extraPermissions", "capabilities", "scopes"]) {
  test(`membership allowlist rejects ${field}`, () => assert.doesNotMatch(membershipFields, new RegExp(`"${field}"`)));
}
test("membership uid is immutable", () => assert.match(memberUpdate, /"uid"/));
test("membership workspaceId is immutable", () => assert.match(memberUpdate, /"workspaceId"/));
test("membership createdBy is immutable", () => assert.match(memberUpdate, /"createdBy"/));
test("membership createdAt is immutable", () => assert.match(memberUpdate, /"createdAt"/));
test("membership privilege deletion and re-add cannot bypass the full-document allowlist", () => {
  assert.match(memberUpdate, /membershipHasAllowedFields\(request\.resource\.data\)/);
  assert.doesNotMatch(membershipFields, /"capability"|"scope"|"globalRole"/);
});
test("membership identity and timestamps have explicit types", () => {
  assert.match(membershipTypes, /data\.uid is string/);
  assert.match(membershipTypes, /optionalTimestamp\(data, "updatedAt"\)/);
});
test("membership status flags must remain internally consistent", () => {
  assert.match(membershipTypes, /data\.disabled == \(data\.status == "disabled"\)/);
  assert.match(membershipTypes, /data\.active == \(data\.status != "disabled"\)/);
});
test("invite documents use an explicit field allowlist", () => assert.match(inviteFields, /keys\(\)\.hasOnly/));
for (const field of ["capabilities", "extraPermissions", "scope"]) {
  test(`invite allowlist rejects ${field}`, () => assert.doesNotMatch(inviteFields, new RegExp(`"${field}"`)));
}
test("manager cannot create a manager invitation", () => assert.equal(policy.canGrantRole("manager", "manager"), false));
test("manager cannot create a super_manager invitation", () => assert.equal(policy.canGrantRole("manager", "super_manager"), false));
test("super_manager cannot create a super_manager invitation", () => assert.equal(policy.canGrantRole("super_manager", "super_manager"), false));
test("system_owner cannot be assigned as a workspace invitation role", () => assert.equal(policy.canGrantRole("system_owner", "system_owner"), false));
test("invite role is immutable after creation", () => assert.match(inviteUpdate, /affectedKeys\(\)\.hasOnly\(\["status"\]\)/));
test("invite workspace is immutable after creation", () => assert.doesNotMatch(inviteUpdate, /"workspaceId"\s*,/));
test("invite expiry cannot be extended by an update", () => assert.doesNotMatch(inviteUpdate, /"expiresAt"\s*,/));
test("invite consumption fields cannot be client-updated", () => {
  assert.doesNotMatch(inviteUpdate, /"usedBy"\s*,|"usedAt"\s*,|"usedCount"\s*,/);
  assert.match(rules, /match \/usedUsers\/\{uid\}[\s\S]*?allow create, update: if false/);
});
test("invite create requires an unused active document", () => {
  assert.match(inviteCreate, /status == "active"/);
  assert.match(inviteCreate, /usedCount == 0/);
});
test("updateUserAdminFields does not auto-create a membership", () => assert.doesNotMatch(adminRoleUpdate, /batch\.set\(nestedRef/));
test("updateUserAdminFields returns membership-missing", () => assert.match(adminRoleUpdate, /membershipMissingError\(\)/));
test("updateUserAdminFields uses canonical update only", () => assert.match(adminRoleUpdate, /batch\.update\(nestedRef/));
test("legacy membership role writes fail closed before Firebase access", () => {
  assert.match(legacyRoleWrite, /legacy-membership-write-disabled/);
  assert.ok(legacyRoleWrite.indexOf("throw blocked") < legacyRoleWrite.indexOf("PMFirebaseRuntime"));
});
test("role update and membership creation are separate operations", () => {
  assert.match(adminRoleUpdate, /membershipMissingError/);
  assert.match(ensureOwnerWorkspace, /membershipCreationServerRequiredError/);
});
test("canonical membership direct create is denied by default", () => assert.match(memberCreate, /return false/));
test("join approval cannot create a missing membership", () => {
  assert.match(approveJoinRequest, /membershipCreationServerRequiredError/);
  assert.doesNotMatch(approveJoinRequest, /batch\.set\(nestedRef/);
  assert.match(approveJoinRequest, /batch\.update\(nestedRef/);
});
test("invite service writes only the explicit safe payload", () => {
  assert.doesNotMatch(remoteInvitePayload, /\.\.\.invite/);
  assert.match(remoteInvitePayload, /invitationId: code/);
  assert.match(remoteInvitePayload, /forbiddenPayloadKeys/);
});
test("account status changes update canonical membership only", () => {
  for (const body of [disableUser, enableUser]) {
    assert.match(body, /batch\.update\(nestedRef/);
    assert.doesNotMatch(body, /collection\("workspace_members"\)/);
  }
});
test("storage roles cannot serve as membership approval evidence", () => assert.doesNotMatch(rules, /localStorage|sessionStorage/));

console.log(`School security role lockdown checks passed: ${passed}`);
