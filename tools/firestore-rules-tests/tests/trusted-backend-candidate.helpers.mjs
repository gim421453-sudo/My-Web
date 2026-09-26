import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export const PROFILE = process.env.PM_TRUSTED_RULES_PROFILE || "";
const PROJECT_ID = process.env.PM_TRUSTED_RULES_PROJECT_ID || "";
const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const ROOT_DIR = resolve(TEST_DIR, "..", "..", "..");
const RULES_PATHS = Object.freeze({
  transition: resolve(ROOT_DIR, "tools", "firestore-rules-tests", "fixtures", "trusted-backend-transition.rules"),
  strict: resolve(ROOT_DIR, "tools", "firestore-rules-tests", "fixtures", "trusted-backend-strict.rules"),
  live: resolve(ROOT_DIR, "firestore.rules.console-current"),
  local: resolve(ROOT_DIR, "firestore.rules"),
});
const [host, portText] = String(process.env.FIRESTORE_EMULATOR_HOST || "").split(":");

if (!(PROFILE in RULES_PATHS)) throw new Error("unknown-trusted-rules-profile");
if (PROJECT_ID !== `demo-myweb-trusted-${PROFILE}`) throw new Error("unsafe-trusted-rules-project-id");
if (host !== "127.0.0.1" || Number(portText) !== 8085) {
  throw new Error("trusted-rules-tests-require-dedicated-loopback-emulator");
}
if (process.env.PM_TRUSTED_RULES_EMULATOR !== "1") throw new Error("trusted-rules-emulator-marker-missing");
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error("application-default-credentials-forbidden");

export const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host,
    port: Number(portText),
    rules: readFileSync(RULES_PATHS[PROFILE], "utf8"),
  },
});

export const WORKSPACE_ID = "workspace-alpha";
export const OTHER_WORKSPACE_ID = "workspace-beta";
export const OWNER_UID = "owner-uid";
export const SUPER_MANAGER_UID = "super-manager-uid";
export const MANAGER_UID = "manager-uid";
export const TEACHER_UID = "teacher-uid";
export const NORMAL_UID = "normal-uid";
export const VIEWER_UID = "viewer-uid";
export const PRINT_UID = "print-uid";
export const TARGET_UID = "target-uid";
export const OTHER_UID = "other-uid";

export const now = () => Timestamp.fromMillis(1_900_000_000_000);

export function dbFor(uid, token = {}) {
  return env.authenticatedContext(uid, token).firestore();
}

export function noAuthDb() {
  return env.unauthenticatedContext().firestore();
}

export function canonicalOwner(uid = OWNER_UID, overrides = {}) {
  return {
    schemaVersion: 1,
    uid,
    status: "active",
    source: "trusted_migration",
    createdAt: now(),
    createdBy: "migration-tool",
    updatedAt: now(),
    updatedBy: "migration-tool",
    ...overrides,
  };
}

export function canonicalMembership(uid, role = "normal", workspaceId = WORKSPACE_ID, overrides = {}) {
  return {
    schemaVersion: 1,
    uid,
    workspaceId,
    role,
    status: "active",
    disabled: false,
    active: true,
    source: "trusted_migration",
    createdAt: now(),
    createdBy: "migration-tool",
    updatedAt: now(),
    updatedBy: "migration-tool",
    ...overrides,
  };
}

export function baseUser(uid, overrides = {}) {
  return {
    uid,
    email: `${uid}@example.invalid`,
    displayName: "Fixture User",
    status: "active",
    role: "normal",
    currentRole: "normal",
    globalRole: "user",
    workspaceRole: "normal",
    currentWorkspaceId: WORKSPACE_ID,
    workspaceId: WORKSPACE_ID,
    workspace_id: WORKSPACE_ID,
    disabled: false,
    updatedAt: now(),
    ...overrides,
  };
}

export function legacyMembership(uid, role = "normal", workspaceId = WORKSPACE_ID, overrides = {}) {
  return { uid, workspaceId, role, status: "active", ...overrides };
}

export function canonicalApplication(uid = NORMAL_UID, overrides = {}) {
  return {
    schemaVersion: 1,
    applicationType: "WORKSPACE_ACCESS",
    applicantUid: uid,
    workspaceId: WORKSPACE_ID,
    requestedRole: "normal",
    status: "pending",
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

export function legacyInvite(code = "invite-code", overrides = {}) {
  return {
    invitationId: code,
    code,
    workspaceId: WORKSPACE_ID,
    role: "normal",
    status: "active",
    inviterUid: MANAGER_UID,
    createdBy: MANAGER_UID,
    createdAt: now(),
    ...overrides,
  };
}

export async function seed(entries = []) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(entries.map(([path, data]) => setDoc(doc(db, path), data)));
  });
}

export async function seedCanonicalActors() {
  await seed([
    [`systemOwners/${OWNER_UID}`, canonicalOwner()],
    [`workspaces/${WORKSPACE_ID}`, { workspaceId: WORKSPACE_ID, name: "Alpha", status: "active" }],
    [`workspaces/${OTHER_WORKSPACE_ID}`, { workspaceId: OTHER_WORKSPACE_ID, name: "Beta", status: "active" }],
    [`workspaces/${WORKSPACE_ID}/members/${SUPER_MANAGER_UID}`, canonicalMembership(SUPER_MANAGER_UID, "super_manager")],
    [`workspaces/${WORKSPACE_ID}/members/${MANAGER_UID}`, canonicalMembership(MANAGER_UID, "manager")],
    [`workspaces/${WORKSPACE_ID}/members/${TEACHER_UID}`, canonicalMembership(TEACHER_UID, "teacher")],
    [`workspaces/${WORKSPACE_ID}/members/${NORMAL_UID}`, canonicalMembership(NORMAL_UID, "normal")],
    [`workspaces/${WORKSPACE_ID}/members/${VIEWER_UID}`, canonicalMembership(VIEWER_UID, "viewer")],
    [`workspaces/${WORKSPACE_ID}/members/${PRINT_UID}`, canonicalMembership(PRINT_UID, "print_account")],
    [`workspaces/${OTHER_WORKSPACE_ID}/members/${OTHER_UID}`, canonicalMembership(OTHER_UID, "manager", OTHER_WORKSPACE_ID)],
  ]);
}

export async function resetCandidateFirestore() {
  await env.clearFirestore();
}

export async function cleanupCandidateEnvironment() {
  await env.cleanup();
}

export {
  assertFails,
  assertSucceeds,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
};
