import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const CONFIRM_TEXT = "CONFIRM_DELETE_NON_OWNER_ACCOUNTS";
const FIRESTORE_BATCH_SIZE = 450;
const AUTH_BATCH_SIZE = 1000;
const PREVIEW_LIMIT = 80;

function loadDotEnv() {
  const envPath = new URL("../.env", import.meta.url);
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const raw = trimmed.slice(index + 1).trim();
    const value = raw.replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function readArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1] || "";
  return "";
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
  if (explicitPath && existsSync(explicitPath)) {
    return JSON.parse(readFileSync(explicitPath, "utf8"));
  }

  return null;
}

function initAdmin(admin) {
  if (admin.apps?.length) return admin.app();

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const serviceAccount = readServiceAccount();
  const options = {};
  if (projectId) options.projectId = projectId;

  if (serviceAccount) {
    return admin.initializeApp({
      ...options,
      credential: admin.credential.cert(serviceAccount)
    });
  }

  return admin.initializeApp({
    ...options,
    credential: admin.credential.applicationDefault()
  });
}

async function listAllAuthUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const result = await auth.listUsers(1000, pageToken);
    users.push(...result.users);
    pageToken = result.pageToken;
  } while (pageToken);
  return users;
}

async function resolveOwnerUid(auth, db) {
  const ownerUidArg = readArg("owner-uid").trim();
  if (ownerUidArg) return ownerUidArg;

  const ownerEmailArg = readArg("owner-email").trim().toLowerCase();
  if (ownerEmailArg) {
    const record = await auth.getUserByEmail(ownerEmailArg);
    return record.uid;
  }

  const owners = [];
  const systemOwnerDocs = await db.collection("systemOwners").where("status", "==", "active").get();
  systemOwnerDocs.docs.forEach((doc) => owners.push(doc.id));

  if (!owners.length) {
    const userOwners = await db.collection("users").where("role", "==", "system_owner").get();
    userOwners.docs.forEach((doc) => owners.push(doc.data()?.uid || doc.id));
  }

  const uniqueOwners = [...new Set(owners.filter(Boolean))];
  if (uniqueOwners.length === 1) return uniqueOwners[0];
  throw new Error("Owner is ambiguous. Pass --owner-email you@example.com or --owner-uid UID.");
}

async function listCollectionTargets(db, collectionName, ownerUid, uidField = "uid") {
  const snapshot = await db.collection(collectionName).get();
  return snapshot.docs
    .filter((doc) => doc.id !== ownerUid && doc.data()?.[uidField] !== ownerUid)
    .map((doc) => ({ label: collectionName, path: doc.ref.path, ref: doc.ref, data: doc.data() || {} }));
}

async function listCollectionGroupTargets(db, groupName, ownerUid) {
  const snapshot = await db.collectionGroup(groupName).get();
  return snapshot.docs
    .filter((doc) => doc.id !== ownerUid && doc.data()?.uid !== ownerUid)
    .map((doc) => ({ label: `**/${groupName}`, path: doc.ref.path, ref: doc.ref, data: doc.data() || {} }));
}

function workspaceMemberTargets(docs) {
  return docs.filter((doc) => {
    const parts = doc.path.split("/");
    return parts.length === 4 && parts[0] === "workspaces" && parts[2] === "members";
  });
}

async function buildFirestoreTargets(db, ownerUid) {
  const groups = {};
  groups.users = await listCollectionTargets(db, "users", ownerUid);
  groups.workspace_members = await listCollectionTargets(db, "workspace_members", ownerUid);
  groups.workspace_member_subcollections = workspaceMemberTargets(await listCollectionGroupTargets(db, "members", ownerUid));
  groups.user_devices = await listCollectionTargets(db, "user_devices", ownerUid);
  groups.notifications = await listCollectionTargets(db, "notifications", ownerUid);
  groups.workspaceJoinRequests = await listCollectionTargets(db, "workspaceJoinRequests", ownerUid);
  groups.adminApplications = await listCollectionTargets(db, "adminApplications", ownerUid);
  groups.invite_usedUsers = await listCollectionGroupTargets(db, "usedUsers", ownerUid);
  groups.invitedUsers = await listCollectionGroupTargets(db, "invitedUsers", ownerUid);
  groups.systemOwners = await listCollectionTargets(db, "systemOwners", ownerUid, "uid");
  return groups;
}

function previewAuthUsers(users) {
  console.log("\n[Authentication users to delete]");
  console.log(`count: ${users.length}`);
  users.slice(0, PREVIEW_LIMIT).forEach((user) => {
    console.log(`- ${user.uid} | ${user.email || "(no email)"}`);
  });
  if (users.length > PREVIEW_LIMIT) console.log(`... and ${users.length - PREVIEW_LIMIT} more`);
}

function previewFirestoreGroups(groups) {
  for (const [name, docs] of Object.entries(groups)) {
    console.log(`\n[Firestore ${name} docs to delete]`);
    console.log(`count: ${docs.length}`);
    docs.slice(0, PREVIEW_LIMIT).forEach((doc) => {
      const email = doc.data?.email ? ` | ${doc.data.email}` : "";
      const uid = doc.data?.uid ? ` | uid=${doc.data.uid}` : "";
      console.log(`- ${doc.path}${uid}${email}`);
    });
    if (docs.length > PREVIEW_LIMIT) console.log(`... and ${docs.length - PREVIEW_LIMIT} more`);
  }
}

async function confirmDeletion(ownerUid) {
  const rl = createInterface({ input, output });
  try {
    console.log("\nWARNING: This cannot be undone.");
    console.log(`Protected owner uid: ${ownerUid}`);
    console.log("- Deletes all Firebase Authentication users except the owner.");
    console.log("- Deletes Firestore user/member/account request documents except the owner.");
    console.log("- Does NOT delete workspace business data such as notices, schedules, exams, students, or assignments.");
    const answer = await rl.question(`\nType ${CONFIRM_TEXT} to continue: `);
    return answer.trim() === CONFIRM_TEXT;
  } finally {
    rl.close();
  }
}

async function deleteAuthUsers(auth, users) {
  let deleted = 0;
  const failures = [];
  for (let i = 0; i < users.length; i += AUTH_BATCH_SIZE) {
    const batch = users.slice(i, i + AUTH_BATCH_SIZE);
    const result = await auth.deleteUsers(batch.map((user) => user.uid));
    deleted += result.successCount;
    failures.push(...result.errors.map((error) => ({
      uid: batch[error.index]?.uid,
      error: error.error?.message || String(error.error)
    })));
  }
  return { deleted, failures };
}

async function deleteFirestoreRefs(db, refs) {
  let deleted = 0;
  for (let i = 0; i < refs.length; i += FIRESTORE_BATCH_SIZE) {
    const batch = db.batch();
    refs.slice(i, i + FIRESTORE_BATCH_SIZE).forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += Math.min(FIRESTORE_BATCH_SIZE, refs.length - i);
  }
  return deleted;
}

async function main() {
  loadDotEnv();
  const admin = await loadFirebaseAdmin();
  initAdmin(admin);

  const auth = admin.auth();
  const db = admin.firestore();
  const ownerUid = await resolveOwnerUid(auth, db);
  const ownerRecord = await auth.getUser(ownerUid).catch(() => null);
  const authTargets = (await listAllAuthUsers(auth)).filter((user) => user.uid !== ownerUid);
  const firestoreGroups = await buildFirestoreTargets(db, ownerUid);
  const firestoreRefs = [...new Map(
    Object.values(firestoreGroups)
      .flat()
      .map((item) => [item.path, item.ref])
  ).values()];

  console.log("\nDelete non-owner Firebase accounts preview");
  console.log(`Project ID: ${process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "(Application Default)"}`);
  console.log(`Owner kept: ${ownerUid} | ${ownerRecord?.email || "(email not found)"}`);
  previewAuthUsers(authTargets);
  previewFirestoreGroups(firestoreGroups);
  console.log(`\nUnique Firestore document refs to delete: ${firestoreRefs.length}`);

  const confirmed = await confirmDeletion(ownerUid);
  if (!confirmed) {
    console.log("\nCanceled. Confirmation text did not match.");
    process.exitCode = 1;
    return;
  }

  console.log("\nDeleting...");
  const authResult = await deleteAuthUsers(auth, authTargets);
  console.log(`Authentication deleted: ${authResult.deleted}/${authTargets.length}`);
  if (authResult.failures.length) {
    console.log("Authentication delete failures:");
    authResult.failures.forEach((failure) => console.log(`- ${failure.uid}: ${failure.error}`));
  }
  const firestoreDeleted = await deleteFirestoreRefs(db, firestoreRefs);
  console.log(`Firestore docs deleted: ${firestoreDeleted}/${firestoreRefs.length}`);
  console.log("\nDone. Owner account and workspace business data were kept.");
}

main().catch((error) => {
  console.error("\nDelete non-owner accounts failed");
  console.error(error?.message || error);
  process.exitCode = 1;
});
