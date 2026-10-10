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

export const PROJECT_ID = "demo-myweb-rules";
export const WORKSPACE_ID = "workspace-alpha";
export const OWNER_UID = "owner-uid";
export const SUPER_MANAGER_UID = "super-manager-uid";
export const MANAGER_UID = "manager-uid";
export const TEACHER_UID = "teacher-uid";
export const NORMAL_UID = "normal-uid";
export const VIEWER_UID = "viewer-uid";
export const PRINT_UID = "print-uid";
export const TARGET_UID = "target-user-uid";

const TEST_DIR = fileURLToPath(new URL(".", import.meta.url));
const RULES_PATH = resolve(TEST_DIR, "..", "..", "..", "firestore.rules");
const emulatorAddress = process.env.FIRESTORE_EMULATOR_HOST || "";
const [host, portText] = emulatorAddress.split(":");

if (process.env.PM_RULES_TEST_PROJECT_ID !== PROJECT_ID) {
  throw new Error("unsafe-or-missing-rules-test-project-id");
}
if (host !== "127.0.0.1" || Number(portText) !== 8083) {
  throw new Error("rules-tests-require-dedicated-loopback-emulator");
}
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("application-default-credentials-forbidden");
}

export const rulesTestEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    host,
    port: Number(portText),
    rules: readFileSync(RULES_PATH, "utf8"),
  },
});

export const now = () => Timestamp.fromMillis(1_900_000_000_000);
export const later = () => Timestamp.fromMillis(1_900_000_001_000);

export function authedDb(uid, token = {}) {
  return rulesTestEnv.authenticatedContext(uid, token).firestore();
}

export function unauthenticatedDb() {
  return rulesTestEnv.unauthenticatedContext().firestore();
}

export function membershipPath(uid = TARGET_UID, workspaceId = WORKSPACE_ID) {
  return `workspaces/${workspaceId}/members/${uid}`;
}

export function baseUser(uid = TARGET_UID, overrides = {}) {
  return {
    uid,
    email: `${uid}@example.invalid`,
    displayName: "Fixture User",
    emailVerified: true,
    globalRole: "user",
    role: "normal",
    currentRole: "normal",
    status: "active",
    workspaceId: WORKSPACE_ID,
    currentWorkspaceId: WORKSPACE_ID,
    workspace_id: WORKSPACE_ID,
    disabled: false,
    createdAt: now(),
    updatedAt: now(),
    ...overrides,
  };
}

export function baseMembership(uid = TARGET_UID, role = "normal", overrides = {}) {
  return {
    uid,
    workspaceId: WORKSPACE_ID,
    role,
    status: "active",
    disabled: false,
    active: true,
    createdAt: now(),
    createdBy: OWNER_UID,
    updatedAt: now(),
    updatedBy: OWNER_UID,
    ...overrides,
  };
}

export function baseInvite(code = "invite-code", role = "normal", overrides = {}) {
  return {
    invitationId: code,
    code,
    workspaceId: WORKSPACE_ID,
    role,
    codeHash: `hash-${code}`,
    email: "target@example.invalid",
    maxUses: 1,
    usedCount: 0,
    expiresAt: 1_900_000_000_000,
    createdAt: now(),
    createdBy: MANAGER_UID,
    inviterUid: MANAGER_UID,
    inviterEmail: "manager@example.invalid",
    invitedBy: MANAGER_UID,
    status: "active",
    usedAt: "",
    usedBy: "",
    reusable: false,
    codePreview: "inv...code",
    ...overrides,
  };
}

export async function seedFixtures(entries = []) {
  await rulesTestEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "workspaces", WORKSPACE_ID), {
      workspaceId: WORKSPACE_ID,
      name: "Fixture Workspace",
      status: "active",
    });
    await Promise.all(entries.map(([path, data]) => setDoc(doc(db, path), data)));
  });
}

export async function seedActors() {
  await seedFixtures([
    [`users/${OWNER_UID}`, baseUser(OWNER_UID)],
    [`users/${SUPER_MANAGER_UID}`, baseUser(SUPER_MANAGER_UID)],
    [`users/${MANAGER_UID}`, baseUser(MANAGER_UID)],
    [`users/${TEACHER_UID}`, baseUser(TEACHER_UID)],
    [`users/${NORMAL_UID}`, baseUser(NORMAL_UID)],
    [`users/${VIEWER_UID}`, baseUser(VIEWER_UID)],
    [`users/${PRINT_UID}`, baseUser(PRINT_UID)],
    [`systemOwners/${OWNER_UID}`, { status: "active" }],
    [membershipPath(SUPER_MANAGER_UID), baseMembership(SUPER_MANAGER_UID, "super_manager")],
    [membershipPath(MANAGER_UID), baseMembership(MANAGER_UID, "manager")],
    [membershipPath(TEACHER_UID), baseMembership(TEACHER_UID, "teacher")],
    [membershipPath(NORMAL_UID), baseMembership(NORMAL_UID, "normal")],
    [membershipPath(VIEWER_UID), baseMembership(VIEWER_UID, "viewer")],
    [membershipPath(PRINT_UID), baseMembership(PRINT_UID, "print_account")],
  ]);
}

export async function resetFirestore() {
  await rulesTestEnv.clearFirestore();
}

export async function cleanupRulesEnvironment() {
  await rulesTestEnv.cleanup();
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
