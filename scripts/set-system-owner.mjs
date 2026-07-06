import { existsSync, readFileSync } from "node:fs";

function loadDotEnv() {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function loadFirebaseAdmin() {
  try {
    const admin = await import("firebase-admin");
    return admin.default || admin;
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") {
      throw new Error("firebase-admin is not installed. Run npm install first.");
    }
    throw error;
  }
}

function readServiceAccount() {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inlineJson) return JSON.parse(inlineJson);
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicitPath && existsSync(explicitPath)) return JSON.parse(readFileSync(explicitPath, "utf8"));
  return null;
}

function initAdmin(admin) {
  if (admin.apps?.length) return admin.app();
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const serviceAccount = readServiceAccount();
  const options = {};
  if (projectId) options.projectId = projectId;
  if (serviceAccount) {
    return admin.initializeApp({ ...options, credential: admin.credential.cert(serviceAccount) });
  }
  return admin.initializeApp({ ...options, credential: admin.credential.applicationDefault() });
}

function argValue(name) {
  const prefix = `--${name}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) return direct.slice(prefix.length).trim();
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

function safeId(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 180);
}

async function resolveUser(auth) {
  const uid = argValue("uid");
  const email = argValue("email");
  if (uid) return auth.getUser(uid);
  if (email) return auth.getUserByEmail(email);
  throw new Error("Usage: node scripts/set-system-owner.mjs --uid UID or --email email@example.com");
}

loadDotEnv();
const admin = await loadFirebaseAdmin();
initAdmin(admin);
const auth = admin.auth();
const db = admin.firestore();
const user = await resolveUser(auth);
const now = admin.firestore.FieldValue.serverTimestamp();
const existingUserSnap = await db.collection("users").doc(user.uid).get();
const existingUser = existingUserSnap.exists ? existingUserSnap.data() || {} : {};
const displayName = user.displayName || user.email || user.uid;
const workspaceId = argValue("workspace-id") || existingUser.workspaceId || existingUser.currentWorkspaceId || safeId(`owner_ws_${user.uid}`);
const workspaceName = argValue("workspace-name") || existingUser.ownerWorkspaceName || `${displayName} workspace`;
const memberId = `${workspaceId}_${user.uid}`;

await db.collection("users").doc(user.uid).set({
  uid: user.uid,
  email: user.email || "",
  displayName,
  role: "system_owner",
  currentRole: "system_owner",
  workspaceRole: "super_manager",
  status: "active",
  disabled: false,
  workspaceId,
  currentWorkspaceId: workspaceId,
  ownerWorkspaceName: workspaceName,
  ownerWorkspaceCreatedAt: existingUser.ownerWorkspaceCreatedAt || now,
  updatedAt: now
}, { merge: true });

await db.collection("workspaces").doc(workspaceId).set({
  workspaceId,
  name: workspaceName,
  ownerUid: user.uid,
  ownerEmail: user.email || "",
  status: "active",
  createdAt: existingUser.ownerWorkspaceCreatedAt || now,
  updatedAt: now
}, { merge: true });

const memberPayload = {
  id: memberId,
  workspaceId,
  uid: user.uid,
  email: user.email || "",
  displayName,
  role: "super_manager",
  status: "active",
  ownerGlobalRole: "system_owner",
  joinedAt: now,
  updatedAt: now
};

await db.collection("workspace_members").doc(memberId).set(memberPayload, { merge: true });
await db.collection("workspaceMembers").doc(memberId).set(memberPayload, { merge: true });
await db.collection("workspaces").doc(workspaceId).collection("members").doc(user.uid).set(memberPayload, { merge: true });

await db.collection("systemOwners").doc(user.uid).set({
  uid: user.uid,
  email: user.email || "",
  displayName,
  status: "active",
  workspaceId,
  workspaceName,
  createdAt: now,
  updatedAt: now
}, { merge: true });

await db.collection("systemConfig").doc("bootstrap").set({
  ownerCreated: true,
  ownerUid: user.uid,
  ownerEmail: user.email || "",
  autoOwnerCreationLocked: true,
  updatedAt: now
}, { merge: true });

console.log(`system_owner saved: ${user.uid} ${user.email || ""}`);
console.log(`owner workspace saved: ${workspaceId} (${workspaceName})`);
